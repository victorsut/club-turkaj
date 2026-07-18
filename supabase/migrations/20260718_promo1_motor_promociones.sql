-- ============================================================
-- Puntos Plus — PROMO-1: Motor de promociones gestionables v1 (D32)
-- ============================================================
-- Promociones creadas desde admin que se aplican automáticamente
-- al registrar compras: dobles puntos (multiplicador) o bonus fijo
-- por día de semana, fecha específica, combustible, monto mínimo,
-- estación o tier.
--
-- PIEZAS (orden de creación = orden de dependencia):
--   1. Tabla promo_rules (reglas) + RLS (SELECT abierto, escritura
--      SOLO vía RPC manage_promo_rule).
--   2. Tabla promo_applications (trazabilidad total) + RLS ídem.
--   3. Helper pick_best_promo — evalúa las reglas vigentes y
--      devuelve la de MAYOR beneficio (sin stacking, política v1).
--      REVOKE PUBLIC: solo lo llaman RPCs DEFINER internas.
--   4. register_purchase — CREATE OR REPLACE sobre la versión
--      vigente (SEC.B.6.1, byte-idéntica salvo el hook de promos).
--      Sin DROP → firma intacta → grants EXECUTE preservados.
--   5. RPC manage_promo_rule — CRUD admin con token STRICT
--      (validate_session_token) + auditoría atómica log_admin_action.
--   6. RPC preview_promo — "¿aplicaría a una compra de Q150 de
--      súper hoy en Turkaj II?" (solo admin, no persiste nada).
--
-- DECISIONES (ROADMAP §5.PROMO-1, aprobadas por el dueño 17-jul):
--   - Evaluación de fechas/días en America/Guatemala (now() es UTC;
--     sin conversión una promo de sábado arrancaría viernes 6 pm).
--   - SIN STACKING v1: si matchean varias reglas gana la de mayor
--     beneficio (empate → la más antigua). El bono de special_days
--     es independiente y NO se toca.
--   - grant_reward queda DISEÑADO pero DESHABILITADO hasta
--     F2/PROMO-2 (necesita QR universal/vouchers D20): la tabla lo
--     admite, manage_promo_rule lo rechaza y pick_best_promo lo
--     ignora.
--   - purchases.points_earned y members.points guardan los puntos
--     FINALES (base + extra); promo_applications conserva el
--     desglose base/final para auditoría.
--   - activity_log explícito: "Compra 5.2 gal super · Q160 ·
--     🎉 Dobles puntos (+16 extra)".
--   - El jsonb de retorno de register_purchase incluye la promo
--     aplicada → la UI del operador la muestra y el comprobante
--     FA-lite puede imprimirla.
--
-- SEMÁNTICA DE CONDICIONES (todas NULL = sin restricción):
--   - weekdays smallint[]  — ISO: 1=lunes … 7=domingo.
--   - specific_dates date[] — fechas puntuales (día de Guatemala).
--   - Si weekdays Y specific_dates están presentes se combinan con
--     OR (aplica ese día de semana O esa fecha exacta).
--   - fuel_types text[] ⊆ {super, regular, diesel}.
--   - tiers text[] ⊆ {ORO, PLATINO, BLACK} — tier ANTES de la compra.
--   - station_ids uuid[] — compra sin estación no matchea reglas
--     restringidas por estación.
--   - min_amount — monto mínimo en Q.
--   - max_uses_total / max_uses_per_member — contados contra
--     promo_applications dentro de la misma transacción.
--
-- REVERT copy-paste (orden inverso de dependencias):
--   -- restaurar register_purchase: re-ejecutar el bloque 1 de
--   -- 20260626_sec_b6_1_session_validation.sql
--   DROP FUNCTION IF EXISTS public.preview_promo(numeric, text, uuid, text, text);
--   DROP FUNCTION IF EXISTS public.manage_promo_rule(text, uuid, text, text, text, uuid, jsonb, text);
--   DROP FUNCTION IF EXISTS public.pick_best_promo(numeric, text, uuid, text, integer, uuid);
--   DROP TABLE IF EXISTS public.promo_applications;
--   DROP TABLE IF EXISTS public.promo_rules;
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TABLA promo_rules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.promo_rules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL CHECK (length(trim(name)) BETWEEN 3 AND 60),
  description         text,
  -- Vigencia
  starts_on           date,
  ends_on             date,
  weekdays            smallint[],   -- ISO 1=lun … 7=dom; NULL = todos
  specific_dates      date[],
  -- Condiciones
  fuel_types          text[],       -- NULL = todos los combustibles
  min_amount          numeric,      -- NULL = sin mínimo
  tiers               text[],       -- NULL = todos los tiers
  station_ids         uuid[],       -- NULL = todas las estaciones
  -- Efecto
  effect_type         text NOT NULL CHECK (effect_type IN ('points_multiplier', 'bonus_points', 'grant_reward')),
  effect_value        numeric,      -- multiplicador (x2) o puntos bonus
  reward_id           uuid REFERENCES public.rewards(id),  -- solo grant_reward (PROMO-2)
  -- Límites de uso
  max_uses_total      integer CHECK (max_uses_total IS NULL OR max_uses_total >= 1),
  max_uses_per_member integer CHECK (max_uses_per_member IS NULL OR max_uses_per_member >= 1),
  active              boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (starts_on IS NULL OR ends_on IS NULL OR ends_on >= starts_on)
);

COMMENT ON TABLE public.promo_rules IS
'PROMO-1 (D32) — Reglas de promoción gestionables desde admin. Escritura SOLO vía RPC manage_promo_rule (token admin STRICT + auditoría atómica). Aplicación server-side en register_purchase vía pick_best_promo (sin stacking). grant_reward diseñado pero deshabilitado hasta F2/PROMO-2.';

-- RLS: SELECT abierto (las promos son información pública de
-- marketing; R1b.2 las mostrará al cliente). SIN policies de
-- escritura → INSERT/UPDATE/DELETE solo vía RPC SECURITY DEFINER.
ALTER TABLE public.promo_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY promo_rules_select_all ON public.promo_rules
  FOR SELECT USING (true);

-- ============================================================
-- 2. TABLA promo_applications
-- ============================================================
-- Trazabilidad total: qué regla se aplicó a qué compra, con el
-- desglose de puntos. ON DELETE RESTRICT en promo_rule_id: una
-- regla con usos NO se borra (manage_promo_rule ofrece desactivar).
CREATE TABLE IF NOT EXISTS public.promo_applications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_rule_id uuid NOT NULL REFERENCES public.promo_rules(id) ON DELETE RESTRICT,
  member_id     uuid NOT NULL REFERENCES public.members(id),
  purchase_id   uuid NOT NULL REFERENCES public.purchases(id),
  points_base   integer NOT NULL,
  points_final  integer NOT NULL,
  effect        jsonb NOT NULL,   -- snapshot {type, value, extra_points}
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (purchase_id, promo_rule_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_apps_rule
  ON public.promo_applications (promo_rule_id);
CREATE INDEX IF NOT EXISTS idx_promo_apps_rule_member
  ON public.promo_applications (promo_rule_id, member_id);

COMMENT ON TABLE public.promo_applications IS
'PROMO-1 (D32) — Registro de cada aplicación de promoción a una compra (regla, miembro, compra, puntos base/finales, efecto jsonb). Escrito SOLO por register_purchase. UNIQUE(purchase_id, promo_rule_id).';

ALTER TABLE public.promo_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY promo_applications_select_all ON public.promo_applications
  FOR SELECT USING (true);

-- ============================================================
-- 3. HELPER pick_best_promo
-- ============================================================
-- Evalúa las reglas activas contra una compra hipotética o real y
-- devuelve jsonb con la de MAYOR beneficio en puntos extra, o NULL
-- si ninguna aplica. p_member_id NULL (preview) omite el límite
-- por miembro pero respeta el total.
--
-- SECURITY: DEFINER + REVOKE PUBLIC. Solo register_purchase y
-- preview_promo (mismo owner) lo invocan; anon NO puede llamarlo
-- directo (evita sondear reglas/límites fuera de flujo).
CREATE OR REPLACE FUNCTION public.pick_best_promo(
  p_amount      numeric,
  p_fuel_type   text,
  p_station_id  uuid,
  p_tier        text,
  p_base_points integer,
  p_member_id   uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_today  date;
  v_dow    smallint;
  v_result jsonb;
BEGIN
  -- Día calendario de GUATEMALA (now() es UTC; una promo de sábado
  -- arrancaría viernes 6 pm sin esta conversión).
  v_today := (now() AT TIME ZONE 'America/Guatemala')::date;
  v_dow   := EXTRACT(ISODOW FROM v_today)::smallint;  -- 1=lun … 7=dom

  SELECT jsonb_build_object(
           'rule_id',      c.id,
           'name',         c.name,
           'effect_type',  c.effect_type,
           'effect_value', c.effect_value,
           'extra_points', c.extra_points
         )
    INTO v_result
  FROM (
    SELECT r.id, r.name, r.effect_type, r.effect_value, r.created_at,
           CASE r.effect_type
             WHEN 'points_multiplier'
               THEN GREATEST(FLOOR(p_base_points * r.effect_value)::integer - p_base_points, 0)
             WHEN 'bonus_points'
               THEN GREATEST(FLOOR(r.effect_value)::integer, 0)
             ELSE 0  -- grant_reward: deshabilitado hasta PROMO-2
           END AS extra_points
    FROM promo_rules r
    WHERE r.active
      AND r.effect_type IN ('points_multiplier', 'bonus_points')
      AND (r.starts_on IS NULL OR v_today >= r.starts_on)
      AND (r.ends_on   IS NULL OR v_today <= r.ends_on)
      -- weekdays/specific_dates: ambos NULL = todos los días; si hay
      -- alguno, aplica ese día de semana O esa fecha exacta (OR).
      AND (
        (r.weekdays IS NULL AND r.specific_dates IS NULL)
        OR (r.weekdays       IS NOT NULL AND v_dow   = ANY (r.weekdays))
        OR (r.specific_dates IS NOT NULL AND v_today = ANY (r.specific_dates))
      )
      AND (r.fuel_types  IS NULL OR p_fuel_type  = ANY (r.fuel_types))
      AND (r.min_amount  IS NULL OR p_amount    >= r.min_amount)
      AND (r.tiers       IS NULL OR p_tier       = ANY (r.tiers))
      AND (r.station_ids IS NULL OR p_station_id = ANY (r.station_ids))
      AND (r.max_uses_total IS NULL OR
           (SELECT count(*) FROM promo_applications a
             WHERE a.promo_rule_id = r.id) < r.max_uses_total)
      AND (r.max_uses_per_member IS NULL OR p_member_id IS NULL OR
           (SELECT count(*) FROM promo_applications a
             WHERE a.promo_rule_id = r.id
               AND a.member_id = p_member_id) < r.max_uses_per_member)
  ) c
  WHERE c.extra_points > 0
  -- SIN STACKING v1: gana la de mayor beneficio; empate → la más antigua.
  ORDER BY c.extra_points DESC, c.created_at ASC
  LIMIT 1;

  RETURN v_result;  -- NULL si ninguna regla aplica
END;
$function$;

REVOKE ALL ON FUNCTION public.pick_best_promo(numeric, text, uuid, text, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pick_best_promo(numeric, text, uuid, text, integer, uuid)
  TO service_role;

COMMENT ON FUNCTION public.pick_best_promo(numeric, text, uuid, text, integer, uuid) IS
'PROMO-1 — Evalúa promo_rules contra una compra (día de Guatemala, condiciones y límites de uso) y devuelve jsonb {rule_id, name, effect_type, effect_value, extra_points} de la regla de MAYOR beneficio, o NULL. Sin stacking (v1). p_member_id NULL = preview (omite límite por miembro). Solo invocable desde RPCs DEFINER.';

-- ============================================================
-- 4. register_purchase — hook de promociones
-- ============================================================
-- CREATE OR REPLACE sobre la versión vigente (SEC.B.6.1; B.8.1 solo
-- cambió el helper de sesión). Cuerpo byte-idéntico salvo:
--   (a) DECLARE: v_promo/v_extra/v_points_final/v_promo_suffix.
--   (b) pick_best_promo tras leer el member (usa el tier PREVIO).
--   (c) points_earned/points/points_change usan v_points_final.
--   (d) INSERT en promo_applications si hubo promo.
--   (e) activity_log con sufijo "· 🎉 <nombre> (+N extra)".
--   (f) retorno con points_base + promo.
-- Sin DROP → grants EXECUTE (anon, authenticated, service_role)
-- PRESERVADOS. La invariante FB.7/FB.9 (set_config
-- app.allow_points_write ANTES del UPDATE a members) se mantiene.
CREATE OR REPLACE FUNCTION public.register_purchase(p_member_id uuid, p_operator_id uuid, p_station_id uuid, p_amount numeric, p_fuel_type text, p_invoice_no text DEFAULT NULL::text, p_session_token text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_fuel_prices  jsonb;
  v_fuel_price   numeric;
  v_gallons      numeric;
  v_points       integer;
  v_q_per_pt     integer;
  v_purchase_id  uuid;
  v_old_gallons  numeric;
  v_new_gallons  numeric;
  v_old_tier     text;
  v_new_tier     text;
  v_card_id      uuid;
  v_old_code     text;
  v_new_code     text;
  v_correlative  text;
  v_tier_prefix  text;
  v_session_role_id uuid;
  -- PROMO-1
  v_promo        jsonb;
  v_extra        integer := 0;
  v_points_final integer;
  v_promo_suffix text := '';
BEGIN
  -- SEC.B.6.1: validación de sesión (strict desde B.8.1 — RAISE 28000).
  v_session_role_id := public.validate_session_token(
    p_session_token, 'operator', 'register_purchase', false,
    jsonb_build_object('member_id', p_member_id, 'operator_id', p_operator_id, 'station_id', p_station_id)
  );

  -- Validar input
  IF p_amount IS NULL OR p_amount < 10 THEN
    RETURN jsonb_build_object('error', 'Mínimo Q10');
  END IF;

  -- Leer precios de combustible desde config
  SELECT value INTO v_fuel_prices
  FROM program_config WHERE key = 'fuel_prices';

  IF v_fuel_prices IS NULL THEN
    v_fuel_prices := '{"super": 31.49, "regular": 30.99, "diesel": 28.99}'::jsonb;
  END IF;

  v_fuel_price := COALESCE(
    (v_fuel_prices->>p_fuel_type)::numeric,
    (v_fuel_prices->>'regular')::numeric
  );

  v_gallons := ROUND(p_amount / v_fuel_price, 2);

  SELECT (value->>'qPerPt')::integer INTO v_q_per_pt
  FROM program_config WHERE key = 'general';
  IF v_q_per_pt IS NULL OR v_q_per_pt = 0 THEN
    v_q_per_pt := 10;
  END IF;

  v_points := FLOOR(p_amount / v_q_per_pt);

  SELECT gallons, card_id INTO v_old_gallons, v_card_id
  FROM members WHERE id = p_member_id;

  IF v_old_gallons IS NULL THEN
    RETURN jsonb_build_object('error', 'Miembro no encontrado');
  END IF;

  v_new_gallons := v_old_gallons + v_gallons;
  v_old_tier := public.get_member_tier(v_old_gallons);
  v_new_tier := public.get_member_tier(v_new_gallons);

  -- ── PROMO-1: elegir la promo de mayor beneficio (sin stacking).
  --    Usa el tier PREVIO a la compra. El bono de special_days es
  --    independiente y no pasa por acá. ──
  v_promo := public.pick_best_promo(
    p_amount, p_fuel_type, p_station_id, v_old_tier, v_points, p_member_id
  );
  IF v_promo IS NOT NULL THEN
    v_extra        := (v_promo->>'extra_points')::integer;
    v_promo_suffix := ' · 🎉 ' || (v_promo->>'name') || ' (+' || v_extra || ' extra)';
  END IF;
  v_points_final := v_points + v_extra;

  INSERT INTO purchases (
    member_id, operator_id, station_id,
    amount, fuel_type, gallons, points_earned, invoice_no
  )
  VALUES (
    p_member_id, p_operator_id, p_station_id,
    p_amount, p_fuel_type, v_gallons, v_points_final, p_invoice_no
  )
  RETURNING id INTO v_purchase_id;

  -- ── PROMO-1: trazabilidad (desglose base/final + snapshot del efecto) ──
  IF v_promo IS NOT NULL THEN
    INSERT INTO promo_applications (
      promo_rule_id, member_id, purchase_id,
      points_base, points_final, effect
    )
    VALUES (
      (v_promo->>'rule_id')::uuid, p_member_id, v_purchase_id,
      v_points, v_points_final,
      jsonb_build_object(
        'type',         v_promo->>'effect_type',
        'value',        (v_promo->>'effect_value')::numeric,
        'extra_points', v_extra
      )
    );
  END IF;

  -- Autoriza el trigger BEFORE UPDATE de FB.7 (cuando exista).
  PERFORM set_config('app.allow_points_write', 'true', true);

  UPDATE members SET
    points  = points + v_points_final,
    gallons = gallons + v_gallons,
    spent   = spent + p_amount,
    visits  = visits + 1,
    last_buy = now(),
    last_operator_id = p_operator_id,
    updated_at = now()
  WHERE id = p_member_id;

  INSERT INTO activity_log (
    member_id, activity_type, description, points_change, amount, station_id
  )
  VALUES (
    p_member_id, 'compra',
    'Compra ' || v_gallons || ' gal ' || p_fuel_type || ' · Q' || p_amount || v_promo_suffix,
    v_points_final, p_amount, p_station_id
  );

  IF v_old_tier <> v_new_tier AND v_card_id IS NOT NULL THEN
    SELECT card_code INTO v_old_code
    FROM physical_cards WHERE id = v_card_id;

    v_correlative := substring(v_old_code FROM '\d+$');

    IF v_correlative IS NOT NULL THEN
      v_tier_prefix := CASE v_new_tier
        WHEN 'ORO'     THEN 'CTOD'
        WHEN 'PLATINO' THEN 'CTPD'
        WHEN 'BLACK'   THEN 'CTBD'
        ELSE 'CTOD'
      END;

      v_new_code := v_tier_prefix || '-' || v_correlative;

      UPDATE physical_cards
      SET card_code = v_new_code,
          tier = v_new_tier,
          updated_at = now()
      WHERE id = v_card_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'purchase_id',   v_purchase_id,
    'points',        v_points_final,   -- FINALES (base + extra): la UI existente los muestra sin cambios
    'points_base',   v_points,
    'gallons',       v_gallons,
    'tier_changed',  v_old_tier <> v_new_tier,
    'old_tier',      v_old_tier,
    'new_tier',      v_new_tier,
    'new_card_code', v_new_code,
    'promo',         v_promo           -- NULL o {rule_id, name, effect_type, effect_value, extra_points}
  );
END;
$function$;

-- ============================================================
-- 5. RPC manage_promo_rule — CRUD admin con auditoría atómica
-- ============================================================
-- Único punto de escritura de promo_rules. Token de admin STRICT
-- (RAISE 28000 → intercepción centralizada del cliente) + reason
-- obligatorio + log_admin_action en la MISMA transacción (si el
-- log falla, rollback completo — patrón gamma de F0).
--
-- p_action: 'create' | 'update' | 'toggle' | 'delete'.
--   create/update: p_rule jsonb con el estado COMPLETO de la regla
--     (el form admin siempre manda todos los campos). Whitelist
--     estricta de claves; arrays vacíos se normalizan a NULL.
--   toggle: invierte active (no requiere p_rule).
--   delete: solo si la regla no tiene usos registrados (RESTRICT);
--     con usos → error amistoso sugiriendo desactivar.
CREATE OR REPLACE FUNCTION public.manage_promo_rule(
  p_action        text,
  p_admin_id      uuid,
  p_admin_name    text,
  p_admin_email   text,
  p_reason_text   text,
  p_rule_id       uuid  DEFAULT NULL,
  p_rule          jsonb DEFAULT NULL,
  p_session_token text  DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_key_whitelist text[] := ARRAY[
    'name', 'description', 'starts_on', 'ends_on', 'weekdays',
    'specific_dates', 'fuel_types', 'min_amount', 'tiers',
    'station_ids', 'effect_type', 'effect_value',
    'max_uses_total', 'max_uses_per_member', 'active'
  ];
  v_key            text;
  v_old            public.promo_rules%ROWTYPE;
  v_new            public.promo_rules%ROWTYPE;
  v_uses           bigint;
  v_log_id         uuid;
  -- Campos parseados de p_rule
  v_name           text;
  v_description    text;
  v_starts_on      date;
  v_ends_on        date;
  v_weekdays       smallint[];
  v_specific_dates date[];
  v_fuel_types     text[];
  v_min_amount     numeric;
  v_tiers          text[];
  v_station_ids    uuid[];
  v_effect_type    text;
  v_effect_value   numeric;
  v_max_total      integer;
  v_max_member     integer;
  v_active         boolean;
BEGIN
  -- (1) Sesión admin STRICT (RAISE 28000 si falta/inválida/expirada).
  PERFORM public.validate_session_token(
    p_session_token, 'admin', 'manage_promo_rule', false, NULL
  );

  -- (2) Validaciones comunes.
  IF p_action IS NULL OR p_action NOT IN ('create', 'update', 'toggle', 'delete') THEN
    RAISE EXCEPTION 'Acción "%" no permitida (create, update, toggle, delete)', p_action
      USING ERRCODE = '22023';
  END IF;
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es obligatorio' USING ERRCODE = '22023';
  END IF;
  IF p_reason_text IS NULL OR trim(p_reason_text) = '' THEN
    RAISE EXCEPTION 'reason_text es obligatorio' USING ERRCODE = '22023';
  END IF;
  IF p_action <> 'create' THEN
    IF p_rule_id IS NULL THEN
      RAISE EXCEPTION 'rule_id es obligatorio para %', p_action USING ERRCODE = '22023';
    END IF;
    SELECT * INTO v_old FROM public.promo_rules WHERE id = p_rule_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Regla % no existe', p_rule_id USING ERRCODE = '22023';
    END IF;
  END IF;

  -- (3) create/update: parsear y validar p_rule completo.
  IF p_action IN ('create', 'update') THEN
    IF p_rule IS NULL OR jsonb_typeof(p_rule) <> 'object' THEN
      RAISE EXCEPTION 'rule debe ser un objeto JSON' USING ERRCODE = '22023';
    END IF;
    FOR v_key IN SELECT jsonb_object_keys(p_rule) LOOP
      IF NOT (v_key = ANY (v_key_whitelist)) THEN
        RAISE EXCEPTION 'Campo "%" no permitido en rule', v_key USING ERRCODE = '22023';
      END IF;
    END LOOP;

    -- Nombre (aparece en activity_log y comprobantes)
    v_name := trim(p_rule->>'name');
    IF v_name IS NULL OR length(v_name) < 3 OR length(v_name) > 60 THEN
      RAISE EXCEPTION 'name es obligatorio (3-60 caracteres)' USING ERRCODE = '22023';
    END IF;
    v_description := NULLIF(trim(COALESCE(p_rule->>'description', '')), '');

    -- Efecto
    v_effect_type := p_rule->>'effect_type';
    IF v_effect_type = 'grant_reward' THEN
      RAISE EXCEPTION 'El efecto grant_reward está diseñado pero deshabilitado hasta PROMO-2 (necesita vouchers/QR universal)'
        USING ERRCODE = '22023';
    END IF;
    IF v_effect_type IS NULL OR v_effect_type NOT IN ('points_multiplier', 'bonus_points') THEN
      RAISE EXCEPTION 'effect_type debe ser points_multiplier o bonus_points' USING ERRCODE = '22023';
    END IF;
    v_effect_value := (p_rule->>'effect_value')::numeric;
    IF v_effect_value IS NULL THEN
      RAISE EXCEPTION 'effect_value es obligatorio' USING ERRCODE = '22023';
    END IF;
    IF v_effect_type = 'points_multiplier' AND (v_effect_value <= 1 OR v_effect_value > 10) THEN
      RAISE EXCEPTION 'El multiplicador debe ser mayor a 1 y hasta 10 (ej: 2 = dobles puntos)' USING ERRCODE = '22023';
    END IF;
    IF v_effect_type = 'bonus_points' AND (v_effect_value < 1 OR v_effect_value > 10000) THEN
      RAISE EXCEPTION 'El bonus debe estar entre 1 y 10000 puntos' USING ERRCODE = '22023';
    END IF;

    -- Vigencia
    v_starts_on := (p_rule->>'starts_on')::date;
    v_ends_on   := (p_rule->>'ends_on')::date;
    IF v_starts_on IS NOT NULL AND v_ends_on IS NOT NULL AND v_ends_on < v_starts_on THEN
      RAISE EXCEPTION 'ends_on no puede ser anterior a starts_on' USING ERRCODE = '22023';
    END IF;

    -- Arrays (vacíos → NULL = sin restricción)
    IF p_rule ? 'weekdays' AND jsonb_typeof(p_rule->'weekdays') = 'array' THEN
      v_weekdays := ARRAY(SELECT jsonb_array_elements_text(p_rule->'weekdays')::smallint);
      IF array_length(v_weekdays, 1) IS NULL THEN v_weekdays := NULL; END IF;
      IF v_weekdays IS NOT NULL AND EXISTS (
        SELECT 1 FROM unnest(v_weekdays) d WHERE d < 1 OR d > 7
      ) THEN
        RAISE EXCEPTION 'weekdays debe contener valores ISO 1 (lunes) a 7 (domingo)' USING ERRCODE = '22023';
      END IF;
    END IF;

    IF p_rule ? 'specific_dates' AND jsonb_typeof(p_rule->'specific_dates') = 'array' THEN
      v_specific_dates := ARRAY(SELECT jsonb_array_elements_text(p_rule->'specific_dates')::date);
      IF array_length(v_specific_dates, 1) IS NULL THEN v_specific_dates := NULL; END IF;
    END IF;

    IF p_rule ? 'fuel_types' AND jsonb_typeof(p_rule->'fuel_types') = 'array' THEN
      v_fuel_types := ARRAY(SELECT jsonb_array_elements_text(p_rule->'fuel_types'));
      IF array_length(v_fuel_types, 1) IS NULL THEN v_fuel_types := NULL; END IF;
      IF v_fuel_types IS NOT NULL AND EXISTS (
        SELECT 1 FROM unnest(v_fuel_types) f WHERE f NOT IN ('super', 'regular', 'diesel')
      ) THEN
        RAISE EXCEPTION 'fuel_types solo admite super, regular, diesel' USING ERRCODE = '22023';
      END IF;
    END IF;

    IF p_rule ? 'tiers' AND jsonb_typeof(p_rule->'tiers') = 'array' THEN
      v_tiers := ARRAY(SELECT jsonb_array_elements_text(p_rule->'tiers'));
      IF array_length(v_tiers, 1) IS NULL THEN v_tiers := NULL; END IF;
      IF v_tiers IS NOT NULL AND EXISTS (
        SELECT 1 FROM unnest(v_tiers) t WHERE t NOT IN ('ORO', 'PLATINO', 'BLACK')
      ) THEN
        RAISE EXCEPTION 'tiers solo admite ORO, PLATINO, BLACK' USING ERRCODE = '22023';
      END IF;
    END IF;

    IF p_rule ? 'station_ids' AND jsonb_typeof(p_rule->'station_ids') = 'array' THEN
      v_station_ids := ARRAY(SELECT jsonb_array_elements_text(p_rule->'station_ids')::uuid);
      IF array_length(v_station_ids, 1) IS NULL THEN v_station_ids := NULL; END IF;
      IF v_station_ids IS NOT NULL AND EXISTS (
        SELECT 1 FROM unnest(v_station_ids) s
        WHERE NOT EXISTS (SELECT 1 FROM public.stations st WHERE st.id = s)
      ) THEN
        RAISE EXCEPTION 'station_ids contiene una estación inexistente' USING ERRCODE = '22023';
      END IF;
    END IF;

    -- Numéricos opcionales
    v_min_amount := (p_rule->>'min_amount')::numeric;
    IF v_min_amount IS NOT NULL AND v_min_amount <= 0 THEN
      RAISE EXCEPTION 'min_amount debe ser mayor a 0' USING ERRCODE = '22023';
    END IF;
    v_max_total  := (p_rule->>'max_uses_total')::integer;
    v_max_member := (p_rule->>'max_uses_per_member')::integer;
    IF (v_max_total IS NOT NULL AND v_max_total < 1)
       OR (v_max_member IS NOT NULL AND v_max_member < 1) THEN
      RAISE EXCEPTION 'Los límites de uso deben ser al menos 1' USING ERRCODE = '22023';
    END IF;

    v_active := COALESCE((p_rule->>'active')::boolean, true);
  END IF;

  -- (4) Ejecutar la acción + auditoría atómica.
  IF p_action = 'create' THEN
    INSERT INTO public.promo_rules (
      name, description, starts_on, ends_on, weekdays, specific_dates,
      fuel_types, min_amount, tiers, station_ids,
      effect_type, effect_value, max_uses_total, max_uses_per_member, active
    )
    VALUES (
      v_name, v_description, v_starts_on, v_ends_on, v_weekdays, v_specific_dates,
      v_fuel_types, v_min_amount, v_tiers, v_station_ids,
      v_effect_type, v_effect_value, v_max_total, v_max_member, v_active
    )
    RETURNING * INTO v_new;

    v_log_id := public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => 'create_promo_rule',
      p_entity_type => 'promo_rule',
      p_entity_id   => v_new.id::text,
      p_reason_text => p_reason_text,
      p_old_value   => NULL,
      p_new_value   => to_jsonb(v_new)
    );

  ELSIF p_action = 'update' THEN
    UPDATE public.promo_rules SET
      name                = v_name,
      description         = v_description,
      starts_on           = v_starts_on,
      ends_on             = v_ends_on,
      weekdays            = v_weekdays,
      specific_dates      = v_specific_dates,
      fuel_types          = v_fuel_types,
      min_amount          = v_min_amount,
      tiers               = v_tiers,
      station_ids         = v_station_ids,
      effect_type         = v_effect_type,
      effect_value        = v_effect_value,
      max_uses_total      = v_max_total,
      max_uses_per_member = v_max_member,
      active              = v_active,
      updated_at          = now()
    WHERE id = p_rule_id
    RETURNING * INTO v_new;

    v_log_id := public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => 'update_promo_rule',
      p_entity_type => 'promo_rule',
      p_entity_id   => p_rule_id::text,
      p_reason_text => p_reason_text,
      p_old_value   => to_jsonb(v_old),
      p_new_value   => to_jsonb(v_new)
    );

  ELSIF p_action = 'toggle' THEN
    UPDATE public.promo_rules SET
      active     = NOT v_old.active,
      updated_at = now()
    WHERE id = p_rule_id
    RETURNING * INTO v_new;

    v_log_id := public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => 'toggle_promo_rule_active',
      p_entity_type => 'promo_rule',
      p_entity_id   => p_rule_id::text,
      p_reason_text => p_reason_text,
      p_old_value   => jsonb_build_object('active', v_old.active),
      p_new_value   => jsonb_build_object('active', v_new.active)
    );

  ELSIF p_action = 'delete' THEN
    SELECT count(*) INTO v_uses
    FROM public.promo_applications WHERE promo_rule_id = p_rule_id;
    IF v_uses > 0 THEN
      RAISE EXCEPTION 'La regla tiene % uso(s) registrados y no puede borrarse — desactivala en su lugar', v_uses
        USING ERRCODE = '22023';
    END IF;

    DELETE FROM public.promo_rules WHERE id = p_rule_id;

    v_log_id := public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => 'delete_promo_rule',
      p_entity_type => 'promo_rule',
      p_entity_id   => p_rule_id::text,
      p_reason_text => p_reason_text,
      p_old_value   => to_jsonb(v_old),
      p_new_value   => NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'ok',     true,
    'action', p_action,
    'log_id', v_log_id,
    'rule',   CASE WHEN p_action = 'delete' THEN NULL ELSE to_jsonb(v_new) END
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.manage_promo_rule(text, uuid, text, text, text, uuid, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manage_promo_rule(text, uuid, text, text, text, uuid, jsonb, text)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.manage_promo_rule(text, uuid, text, text, text, uuid, jsonb, text) IS
'PROMO-1 — CRUD de promo_rules (create/update/toggle/delete) con sesión admin STRICT (28000), reason obligatorio y log_admin_action atómico. grant_reward rechazado hasta PROMO-2. delete bloqueado si la regla tiene usos. EXECUTE: anon (admins usan anon key), authenticated, service_role.';

-- ============================================================
-- 6. RPC preview_promo — simulador admin
-- ============================================================
-- "¿Aplicaría a una compra de Q150 de súper hoy en Turkaj II?"
-- Reusa pick_best_promo con member NULL (omite límite por miembro)
-- y calcula los puntos base con la misma config que register_purchase.
-- No persiste nada.
CREATE OR REPLACE FUNCTION public.preview_promo(
  p_amount        numeric,
  p_fuel_type     text,
  p_station_id    uuid DEFAULT NULL,
  p_tier          text DEFAULT 'ORO',
  p_session_token text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_q_per_pt integer;
  v_points   integer;
  v_promo    jsonb;
BEGIN
  PERFORM public.validate_session_token(
    p_session_token, 'admin', 'preview_promo', false, NULL
  );

  IF p_amount IS NULL OR p_amount < 10 THEN
    RETURN jsonb_build_object('error', 'Mínimo Q10');
  END IF;

  SELECT (value->>'qPerPt')::integer INTO v_q_per_pt
  FROM program_config WHERE key = 'general';
  IF v_q_per_pt IS NULL OR v_q_per_pt = 0 THEN
    v_q_per_pt := 10;
  END IF;

  v_points := FLOOR(p_amount / v_q_per_pt);
  v_promo  := public.pick_best_promo(
    p_amount, p_fuel_type, p_station_id, p_tier, v_points, NULL
  );

  RETURN jsonb_build_object(
    'base_points',  v_points,
    'final_points', v_points + COALESCE((v_promo->>'extra_points')::integer, 0),
    'promo',        v_promo
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.preview_promo(numeric, text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_promo(numeric, text, uuid, text, text)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.preview_promo(numeric, text, uuid, text, text) IS
'PROMO-1 — Simula qué promoción aplicaría HOY a una compra hipotética (monto/combustible/estación/tier) sin persistir nada. Sesión admin STRICT (28000). Devuelve {base_points, final_points, promo|null}.';

COMMIT;

-- ============================================================
-- VERIFICACIÓN POST-APLICACIÓN (correr a mano en el SQL Editor):
--
--   SELECT tablename, rowsecurity FROM pg_tables
--   WHERE tablename IN ('promo_rules', 'promo_applications');
--   -- esperado: ambas con rowsecurity = true
--
--   SELECT proname FROM pg_proc
--   WHERE proname IN ('pick_best_promo', 'manage_promo_rule', 'preview_promo');
--   -- esperado: 3 filas
-- ============================================================

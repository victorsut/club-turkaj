-- ============================================================
-- Puntos Plus — PROMO-1b: habilitar grant_reward (premio gratis)
-- ============================================================
-- Pedido del dueño (18-jul, post R1b.2): el motor debe poder otorgar
-- PREMIOS CANJEABLES como promoción (café en tienda, lavado gratis —
-- ambos del catálogo rewards), además de los efectos de puntos.
--
-- POR QUÉ SE PUEDE ADELANTAR (estaba diferido a PROMO-2/F2 "por
-- vouchers D20"): NO hace falta infraestructura nueva — se reutiliza
-- `redemptions` con points_spent = 0. El canje-regalo nace igual que
-- un canje normal (código TK-XXXXXX, confirm_status 'none') y viaja
-- por TODO el flujo existente: aparece en la lista del cliente
-- (Realtime FULL), el operador lo entrega/confirma en OpRedeem y el
-- comprobante se imprime con FA-lite. Los vouchers D20 quedan para
-- F2 como formato adicional; esto NO los reemplaza.
--
-- REGLAS DEL EFECTO:
--   - Comparación sin stacking: el "beneficio" de grant_reward es el
--     points_cost del premio (su valor en puntos) vs. los puntos
--     extra de los otros efectos. Gana el mayor; empate → la más
--     antigua. extra_points del ganador grant = 0 (el cliente recibe
--     premio, no puntos).
--   - El premio debe existir y estar ACTIVO al momento de la compra;
--     si el admin lo desactiva después, la regla deja de matchear
--     sola (sin error).
--   - La exclusividad de tier del premio NO se valida acá: el admin
--     restringe con la condición tiers[] de la regla si lo necesita.
--   - Límites max_uses_total / max_uses_per_member funcionan igual
--     (vía promo_applications).
--   - activity_log: "Compra … · 🎁 Café gratis" (points_change =
--     puntos base; el regalo no suma puntos).
--   - redemptions.operator_id = NULL (nadie lo procesó — lo entrega
--     el operador que lo cobre, flujo normal de OpRedeem).
--
-- PIEZAS (CREATE OR REPLACE, sin DROP → grants preservados):
--   1. pick_best_promo — considera grant_reward (JOIN rewards),
--      campo benefit para la comparación, devuelve reward_*.
--   2. register_purchase — al ganar un grant: INSERT en redemptions
--      (cost 0) + redeemed_count, sufijo 🎁 y retorno con el código.
--   3. manage_promo_rule — acepta effect_type grant_reward con
--      reward_id validado (whitelist + INSERT/UPDATE con la columna).
--
-- REVERT copy-paste: re-ejecutar los bloques 3/4/5 de
--   20260718_promo1_motor_promociones.sql (pick_best_promo /
--   register_purchase de 20260718_promo1_fix_lectura_y_sufijo.sql /
--   manage_promo_rule) — vuelven a la versión solo-puntos.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. pick_best_promo — grant_reward entra a la comparación
-- ============================================================
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
  -- Día calendario de GUATEMALA (now() es UTC).
  v_today := (now() AT TIME ZONE 'America/Guatemala')::date;
  v_dow   := EXTRACT(ISODOW FROM v_today)::smallint;  -- 1=lun … 7=dom

  SELECT jsonb_build_object(
           'rule_id',      c.id,
           'name',         c.name,
           'effect_type',  c.effect_type,
           'effect_value', c.effect_value,
           'extra_points', c.extra_points,
           'reward_id',    c.reward_id,
           'reward_name',  c.reward_name,
           'reward_icon',  c.reward_icon
         )
    INTO v_result
  FROM (
    SELECT r.id, r.name, r.effect_type, r.effect_value, r.created_at,
           rw.id AS reward_id, rw.name AS reward_name, rw.icon AS reward_icon,
           -- Puntos que efectivamente se suman (grant no suma puntos)
           CASE r.effect_type
             WHEN 'points_multiplier'
               THEN GREATEST(FLOOR(p_base_points * r.effect_value)::integer - p_base_points, 0)
             WHEN 'bonus_points'
               THEN GREATEST(FLOOR(r.effect_value)::integer, 0)
             ELSE 0
           END AS extra_points,
           -- Beneficio para la comparación sin stacking: los efectos
           -- de puntos valen sus puntos extra; el premio gratis vale
           -- su points_cost (valor del premio en puntos).
           CASE r.effect_type
             WHEN 'points_multiplier'
               THEN GREATEST(FLOOR(p_base_points * r.effect_value)::integer - p_base_points, 0)
             WHEN 'bonus_points'
               THEN GREATEST(FLOOR(r.effect_value)::integer, 0)
             WHEN 'grant_reward'
               THEN COALESCE(rw.points_cost, 0)
             ELSE 0
           END AS benefit
    FROM promo_rules r
    LEFT JOIN rewards rw
      ON rw.id = r.reward_id AND COALESCE(rw.active, true)
    WHERE r.active
      AND r.effect_type IN ('points_multiplier', 'bonus_points', 'grant_reward')
      -- grant_reward exige premio existente y activo HOY
      AND (r.effect_type <> 'grant_reward' OR rw.id IS NOT NULL)
      AND (r.starts_on IS NULL OR v_today >= r.starts_on)
      AND (r.ends_on   IS NULL OR v_today <= r.ends_on)
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
  WHERE c.benefit > 0
  -- SIN STACKING: gana el mayor beneficio; empate → la más antigua.
  ORDER BY c.benefit DESC, c.created_at ASC
  LIMIT 1;

  RETURN v_result;  -- NULL si ninguna regla aplica
END;
$function$;

COMMENT ON FUNCTION public.pick_best_promo(numeric, text, uuid, text, integer, uuid) IS
'PROMO-1b — Evalúa promo_rules contra una compra (día de Guatemala, condiciones y límites) y devuelve la de MAYOR beneficio: puntos extra para multiplier/bonus, points_cost del premio para grant_reward (extra_points=0). Devuelve también reward_id/name/icon. Sin stacking. Solo invocable desde RPCs DEFINER.';

-- ============================================================
-- 2. register_purchase — otorga el premio vía redemptions cost-0
-- ============================================================
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
  -- PROMO-1b (grant_reward)
  v_redemption_code text;
  v_redemption_id   uuid;
  v_grant_count     integer := 0;
  v_effect          jsonb;
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
  --    Usa el tier PREVIO a la compra. ──
  v_promo := public.pick_best_promo(
    p_amount, p_fuel_type, p_station_id, v_old_tier, v_points, p_member_id
  );
  IF v_promo IS NOT NULL THEN
    v_extra := (v_promo->>'extra_points')::integer;
    IF v_promo->>'effect_type' = 'grant_reward' THEN
      -- PROMO-1b: premio gratis — el sufijo lo anuncia; los puntos no cambian.
      v_promo_suffix := ' · 🎁 ' || (v_promo->>'reward_name') || ' gratis';
    ELSIF v_promo->>'effect_type' = 'points_multiplier' THEN
      v_promo_suffix := ' · 🎉 x' || (v_promo->>'effect_value') || ' (+' || v_extra || ')';
    ELSE
      v_promo_suffix := ' · 🎉 +' || v_extra;
    END IF;
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

  -- ── PROMO-1b: premio gratis → canje cost-0 por el flujo NORMAL de
  --    redemptions (código TK, Realtime al cliente, entrega en
  --    OpRedeem, comprobante FA-lite). operator_id NULL: lo procesa
  --    quien lo entregue. ──
  IF v_promo IS NOT NULL AND v_promo->>'effect_type' = 'grant_reward' THEN
    v_redemption_code := 'TK-' || upper(substring(md5(random()::text || clock_timestamp()::text), 1, 6));
    INSERT INTO redemptions (
      member_id, reward_id, operator_id,
      points_spent, discount_applied, redemption_code
    )
    VALUES (
      p_member_id, (v_promo->>'reward_id')::uuid, NULL,
      0, 0, v_redemption_code
    )
    RETURNING id INTO v_redemption_id;
    v_grant_count := 1;
    v_promo := v_promo || jsonb_build_object(
      'redemption_code', v_redemption_code,
      'redemption_id',   v_redemption_id
    );
  END IF;

  -- ── PROMO-1: trazabilidad (desglose base/final + snapshot del efecto) ──
  IF v_promo IS NOT NULL THEN
    v_effect := jsonb_build_object(
      'type',         v_promo->>'effect_type',
      'value',        (v_promo->>'effect_value')::numeric,
      'extra_points', v_extra
    );
    IF v_grant_count = 1 THEN
      v_effect := v_effect || jsonb_build_object(
        'reward_id',       v_promo->>'reward_id',
        'reward_name',     v_promo->>'reward_name',
        'redemption_id',   v_redemption_id,
        'redemption_code', v_redemption_code
      );
    END IF;
    INSERT INTO promo_applications (
      promo_rule_id, member_id, purchase_id,
      points_base, points_final, effect
    )
    VALUES (
      (v_promo->>'rule_id')::uuid, p_member_id, v_purchase_id,
      v_points, v_points_final, v_effect
    );
  END IF;

  -- Autoriza el trigger BEFORE UPDATE de FB.7 (cuando exista).
  PERFORM set_config('app.allow_points_write', 'true', true);

  UPDATE members SET
    points  = points + v_points_final,
    gallons = gallons + v_gallons,
    spent   = spent + p_amount,
    visits  = visits + 1,
    redeemed_count = COALESCE(redeemed_count, 0) + v_grant_count,
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
    'points',        v_points_final,   -- FINALES (base + extra)
    'points_base',   v_points,
    'gallons',       v_gallons,
    'tier_changed',  v_old_tier <> v_new_tier,
    'old_tier',      v_old_tier,
    'new_tier',      v_new_tier,
    'new_card_code', v_new_code,
    -- NULL o {rule_id, name, effect_type, effect_value, extra_points,
    --         reward_*, redemption_code/redemption_id si fue grant}
    'promo',         v_promo
  );
END;
$function$;

-- ============================================================
-- 3. manage_promo_rule — acepta grant_reward con reward_id
-- ============================================================
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
    'station_ids', 'effect_type', 'effect_value', 'reward_id',
    'max_uses_total', 'max_uses_per_member', 'active'
  ];
  v_key            text;
  v_old            public.promo_rules%ROWTYPE;
  v_new            public.promo_rules%ROWTYPE;
  v_uses           bigint;
  v_log_id         uuid;
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
  v_reward_id      uuid;
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

    -- Efecto (PROMO-1b: grant_reward habilitado)
    v_effect_type := p_rule->>'effect_type';
    IF v_effect_type IS NULL OR v_effect_type NOT IN ('points_multiplier', 'bonus_points', 'grant_reward') THEN
      RAISE EXCEPTION 'effect_type debe ser points_multiplier, bonus_points o grant_reward' USING ERRCODE = '22023';
    END IF;
    IF v_effect_type = 'grant_reward' THEN
      v_effect_value := NULL;
      v_reward_id := (p_rule->>'reward_id')::uuid;
      IF v_reward_id IS NULL THEN
        RAISE EXCEPTION 'grant_reward requiere elegir un premio del catálogo' USING ERRCODE = '22023';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.rewards WHERE id = v_reward_id AND COALESCE(active, true)
      ) THEN
        RAISE EXCEPTION 'El premio elegido no existe o está inactivo' USING ERRCODE = '22023';
      END IF;
    ELSE
      v_reward_id := NULL;
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
      effect_type, effect_value, reward_id,
      max_uses_total, max_uses_per_member, active
    )
    VALUES (
      v_name, v_description, v_starts_on, v_ends_on, v_weekdays, v_specific_dates,
      v_fuel_types, v_min_amount, v_tiers, v_station_ids,
      v_effect_type, v_effect_value, v_reward_id,
      v_max_total, v_max_member, v_active
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
      reward_id           = v_reward_id,
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

COMMENT ON FUNCTION public.manage_promo_rule(text, uuid, text, text, text, uuid, jsonb, text) IS
'PROMO-1b — CRUD de promo_rules con sesión admin STRICT (28000), reason obligatorio y auditoría atómica. Efectos: points_multiplier, bonus_points y grant_reward (premio del catálogo, validado activo). delete bloqueado si la regla tiene usos.';

COMMIT;

-- ============================================================
-- VERIFICACIÓN POST-APLICACIÓN (correr a mano en el SQL Editor):
--
--   SELECT pg_get_functiondef('public.pick_best_promo(numeric,text,uuid,text,integer,uuid)'::regprocedure)
--     LIKE '%grant_reward%' AS pick_ok;
--   -- esperado: true
-- ============================================================

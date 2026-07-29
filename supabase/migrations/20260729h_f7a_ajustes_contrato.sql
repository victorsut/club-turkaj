-- ═══════════════════════════════════════════════════════════════
-- F7a.1 — AJUSTES AL CONTRATO DE LA API (29-jul-2026)
-- Correcciones del dueño tras repasar el flujo real de PROPER:
--
--  1. NO INTERVENIR EN SU DINÁMICA. La factura se emite PRIMERO y
--     nosotros validamos DESPUÉS. `GET /members` deja de ser un paso
--     previo del flujo (queda como consulta opcional de diagnóstico).
--     Si el NIT no cumple, el mensaje explica al CLIENTE qué debe
--     corregir en su app — no se le pide nada al POS.
--
--  2. FACTURAS MIXTAS (combustible + tienda): los puntos se calculan
--     SOLO sobre el consumo de COMBUSTIBLE. Nuevo `p_fuel_amount`
--     (obligatorio) y `p_total_amount` (opcional, solo conciliación).
--     `purchases.total_amount` guarda el total facturado; `amount`
--     sigue siendo la porción de combustible (la que da puntos y
--     alimenta members.spent).
--
--  3. PRECIOS: el cálculo ya NO usa nuestros precios de lista. PROPER
--     tiene su propia configuración (editada por nosotros) y nos manda
--     galones y monto REALES — confiamos en esos valores.
--
--  4. ESTACIÓN POR COLABORADOR: cada colaborador tiene su estación
--     asignada en PROPER y porta su propio POS. Ya no se exige
--     `station_id`: se resuelve desde el colaborador (código de
--     estación de PROPER → `stations.external_code`, o por nombre).
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Total facturado (conciliación) y mapeo de estaciones ────
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS total_amount numeric;
COMMENT ON COLUMN public.purchases.total_amount IS
'F7a.1: total de la factura externa cuando incluye productos además de
combustible. `amount` es SOLO la porción de combustible (la que otorga
puntos). NULL en las compras registradas desde la app.';

ALTER TABLE public.stations
  ADD COLUMN IF NOT EXISTS external_code text;
CREATE UNIQUE INDEX IF NOT EXISTS stations_external_code_idx
  ON public.stations (external_code) WHERE external_code IS NOT NULL;
COMMENT ON COLUMN public.stations.external_code IS
'F7a.1: código de la estación en el sistema externo (PROPER). Permite
que el POS mande su propio identificador y nosotros lo mapeemos.';

-- ── 2. Resolución de estación externa ──────────────────────────
CREATE OR REPLACE FUNCTION public.api_resolve_station(p_station_ext text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id  uuid;
  v_txt text := trim(COALESCE(p_station_ext, ''));
BEGIN
  IF v_txt = '' THEN RETURN NULL; END IF;
  -- a) uuid nuestro (si alguna vez lo mandan tal cual)
  BEGIN
    v_id := v_txt::uuid;
    IF EXISTS (SELECT 1 FROM stations WHERE id = v_id) THEN RETURN v_id; END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    v_id := NULL;
  END;
  -- b) código externo configurado por nosotros
  SELECT id INTO v_id FROM stations WHERE external_code = v_txt;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  -- c) por nombre, tolerante ("Turkaj 1" / "turkaj i" / "TURKAJ I")
  SELECT id INTO v_id FROM stations
  WHERE lower(regexp_replace(name, '\s+', '', 'g')) = lower(regexp_replace(v_txt, '\s+', '', 'g'))
  LIMIT 1;
  RETURN v_id;
END;
$function$;

-- ── 3. Operador espejo con su estación de PROPER ───────────────
CREATE OR REPLACE FUNCTION public.api_upsert_operator(
  p_external_id  text,
  p_name         text,
  p_station_id   uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM operators
  WHERE external_source = 'proper' AND external_id = p_external_id;

  IF v_id IS NULL THEN
    INSERT INTO operators (
      name, username, password_hash, dpi, gafete,
      station_id, active, external_id, external_source
    ) VALUES (
      COALESCE(NULLIF(trim(p_name), ''), 'Colaborador PROPER'),
      'proper_' || regexp_replace(lower(p_external_id), '[^a-z0-9]', '', 'g'),
      '!',                       -- hash imposible: no puede loguearse en la app
      NULL, 'PROPER-' || p_external_id,
      p_station_id, true, p_external_id, 'proper'
    )
    RETURNING id INTO v_id;
  ELSE
    -- El colaborador puede cambiar de estación en PROPER: se refleja.
    UPDATE operators SET
      name       = COALESCE(NULLIF(trim(p_name), ''), name),
      station_id = COALESCE(p_station_id, station_id),
      updated_at = now()
    WHERE id = v_id;
  END IF;

  RETURN v_id;
END;
$function$;

-- ── 4. Registro de compra v2 ───────────────────────────────────
DROP FUNCTION IF EXISTS public.api_register_purchase(uuid, text, numeric, numeric, text, text, text, uuid, text, text);

CREATE OR REPLACE FUNCTION public.api_register_purchase(
  p_api_client_id  uuid,
  p_card_code      text,
  p_fuel_amount    numeric,   -- SOLO combustible: base de puntos
  p_gallons        numeric,   -- galones reales del surtidor
  p_fuel_type      text,
  p_nit            text,
  p_invoice_no     text,
  p_operator_ext   text,      -- colaborador de PROPER (trae su estación)
  p_operator_name  text    DEFAULT NULL,
  p_station_ext    text    DEFAULT NULL,   -- código/nombre de estación en PROPER
  p_total_amount   numeric DEFAULT NULL    -- total facturado (conciliación)
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_member      RECORD;
  v_code        text := upper(trim(COALESCE(p_card_code, '')));
  v_nit         text := public.normalize_nit(p_nit);
  v_member_nit  text;
  v_operator_id uuid;
  v_station_id  uuid;
  v_fuel        text := lower(COALESCE(p_fuel_type, 'regular'));
  v_q_per_pt    integer;
  v_points      integer;
  v_extra       integer := 0;
  v_points_final integer;
  v_promo       jsonb;
  v_promo_suffix text := '';
  v_purchase_id uuid;
  v_old_gal     numeric;
  v_new_gal     numeric;
  v_old_tier    text;
  v_new_tier    text;
  v_card_id     uuid;
  v_old_code    text;
  v_new_code    text;
  v_correlative text;
  v_prefix      text;
  v_red_code    text;
  v_red_id      uuid;
  v_grant       integer := 0;
  v_effect      jsonb;
BEGIN
  -- ── Validaciones de entrada ──
  IF v_code !~ '^CT[OPB]D-[0-9]+$' THEN
    RETURN jsonb_build_object('error', 'invalid_card_code');
  END IF;
  IF p_fuel_amount IS NULL OR p_fuel_amount <= 0 THEN
    RETURN jsonb_build_object('error', 'no_fuel_in_invoice',
      'detail', 'La factura no incluye consumo de combustible: no acumula puntos');
  END IF;
  IF p_fuel_amount < 10 THEN
    RETURN jsonb_build_object('error', 'amount_too_low',
      'detail', 'El consumo mínimo de combustible para acumular es Q10');
  END IF;
  IF p_gallons IS NULL OR p_gallons <= 0 THEN
    RETURN jsonb_build_object('error', 'invalid_gallons');
  END IF;
  IF v_fuel NOT IN ('super', 'regular', 'diesel') THEN
    RETURN jsonb_build_object('error', 'invalid_fuel_type',
      'detail', 'Valores válidos: super, regular, diesel');
  END IF;
  IF COALESCE(trim(p_operator_ext), '') = '' THEN
    RETURN jsonb_build_object('error', 'missing_operator');
  END IF;

  SELECT m.id, m.nit, m.gallons, m.card_id, m.name
    INTO v_member
  FROM physical_cards pc
  JOIN members m ON m.id = pc.assigned_to
  WHERE pc.card_code = v_code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'member_not_found');
  END IF;

  -- ── REGLA DE NIT ──
  -- La factura YA se emitió: el mensaje le explica al CLIENTE qué
  -- debe ajustar en su app para la próxima (no se le pide nada al POS).
  v_member_nit := public.normalize_nit(v_member.nit);
  IF v_member.nit IS NULL OR trim(v_member.nit) = '' THEN
    IF v_nit <> 'CF' THEN
      RETURN jsonb_build_object(
        'error', 'nit_not_registered',
        'detail', 'Esta factura se emitió con NIT, pero el cliente no tiene NIT registrado en Puntos Plus. '
               || 'Puede agregarlo desde su app en Menú → Mi Cuenta, o pedir la factura con CF.',
        'member_name', v_member.name,
        'invoice_nit', v_nit);
    END IF;
  ELSE
    IF v_nit <> 'CF' AND v_nit <> v_member_nit THEN
      RETURN jsonb_build_object(
        'error', 'nit_mismatch',
        'detail', 'El NIT de la factura no coincide con el registrado por el cliente en Puntos Plus. '
               || 'Solo acumulan las facturas con su propio NIT o con CF.',
        'member_name', v_member.name,
        'invoice_nit', v_nit,
        'registered_nit_masked', '****' || right(v_member_nit, 4));
    END IF;
  END IF;

  -- ── Estación: del colaborador (PROPER se la asigna) ──
  v_station_id := public.api_resolve_station(p_station_ext);
  v_operator_id := public.api_upsert_operator(trim(p_operator_ext), p_operator_name, v_station_id);
  IF v_station_id IS NULL THEN
    -- Sin código válido: la que ya tenga el colaborador espejo.
    SELECT station_id INTO v_station_id FROM operators WHERE id = v_operator_id;
  END IF;
  IF v_station_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unknown_station',
      'detail', 'No pudimos determinar la estación del colaborador. '
             || 'Configurá su código de estación en Puntos Plus o envialo en station.');
  END IF;

  -- ── Puntos: SOLO sobre el consumo de combustible (Q10 = 1 punto) ──
  SELECT (value->>'qPerPt')::integer INTO v_q_per_pt FROM program_config WHERE key = 'general';
  IF v_q_per_pt IS NULL OR v_q_per_pt = 0 THEN v_q_per_pt := 10; END IF;
  v_points := FLOOR(p_fuel_amount / v_q_per_pt);

  v_old_gal  := v_member.gallons;
  v_card_id  := v_member.card_id;
  v_new_gal  := v_old_gal + p_gallons;
  v_old_tier := public.get_member_tier(v_old_gal);
  v_new_tier := public.get_member_tier(v_new_gal);

  -- PROMO-1: misma selección sin stacking que el flujo del operador,
  -- evaluada sobre el consumo de combustible.
  v_promo := public.pick_best_promo(p_fuel_amount, v_fuel, v_station_id, v_old_tier, v_points, v_member.id);
  IF v_promo IS NOT NULL THEN
    v_extra := (v_promo->>'extra_points')::integer;
    IF v_promo->>'effect_type' = 'grant_reward' THEN
      v_promo_suffix := ' · 🎁 ' || (v_promo->>'reward_name') || ' gratis';
    ELSIF v_promo->>'effect_type' = 'points_multiplier' THEN
      v_promo_suffix := ' · 🎉 x' || (v_promo->>'effect_value') || ' (+' || v_extra || ')';
    ELSE
      v_promo_suffix := ' · 🎉 +' || v_extra;
    END IF;
  END IF;
  v_points_final := v_points + v_extra;

  INSERT INTO purchases (member_id, operator_id, station_id, amount, total_amount,
                         fuel_type, gallons, points_earned, invoice_no)
  VALUES (v_member.id, v_operator_id, v_station_id, p_fuel_amount, p_total_amount,
          v_fuel, p_gallons, v_points_final, p_invoice_no)
  RETURNING id INTO v_purchase_id;

  IF v_promo IS NOT NULL AND v_promo->>'effect_type' = 'grant_reward' THEN
    v_red_code := 'TK-' || upper(substring(md5(random()::text || clock_timestamp()::text), 1, 6));
    INSERT INTO redemptions (member_id, reward_id, operator_id, points_spent, discount_applied, redemption_code)
    VALUES (v_member.id, (v_promo->>'reward_id')::uuid, NULL, 0, 0, v_red_code)
    RETURNING id INTO v_red_id;
    v_grant := 1;
    v_promo := v_promo || jsonb_build_object('redemption_code', v_red_code, 'redemption_id', v_red_id);
  END IF;

  IF v_promo IS NOT NULL THEN
    v_effect := jsonb_build_object('type', v_promo->>'effect_type',
                                   'value', (v_promo->>'effect_value')::numeric,
                                   'extra_points', v_extra);
    IF v_grant = 1 THEN
      v_effect := v_effect || jsonb_build_object(
        'reward_id', v_promo->>'reward_id', 'reward_name', v_promo->>'reward_name',
        'redemption_id', v_red_id, 'redemption_code', v_red_code);
    END IF;
    INSERT INTO promo_applications (promo_rule_id, member_id, purchase_id, points_base, points_final, effect)
    VALUES ((v_promo->>'rule_id')::uuid, v_member.id, v_purchase_id, v_points, v_points_final, v_effect);
  END IF;

  PERFORM set_config('app.allow_points_write', 'true', true);
  UPDATE members SET
    points  = points + v_points_final,
    gallons = gallons + p_gallons,
    spent   = spent + p_fuel_amount,   -- consumo de combustible
    visits  = visits + 1,
    redeemed_count = COALESCE(redeemed_count, 0) + v_grant,
    last_buy = now(),
    last_operator_id = v_operator_id,
    updated_at = now()
  WHERE id = v_member.id;

  INSERT INTO activity_log (member_id, activity_type, description, points_change, amount, station_id)
  VALUES (v_member.id, 'compra',
          'Compra ' || p_gallons || ' gal ' || v_fuel || ' · Q' || p_fuel_amount || v_promo_suffix,
          v_points_final, p_fuel_amount, v_station_id);

  IF v_old_tier <> v_new_tier AND v_card_id IS NOT NULL THEN
    SELECT card_code INTO v_old_code FROM physical_cards WHERE id = v_card_id;
    v_correlative := substring(v_old_code FROM '\d+$');
    IF v_correlative IS NOT NULL THEN
      v_prefix := CASE v_new_tier WHEN 'ORO' THEN 'CTOD' WHEN 'PLATINO' THEN 'CTPD'
                                  WHEN 'BLACK' THEN 'CTBD' ELSE 'CTOD' END;
      v_new_code := v_prefix || '-' || v_correlative;
      UPDATE physical_cards SET card_code = v_new_code, tier = v_new_tier, updated_at = now()
      WHERE id = v_card_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'purchase_id',   v_purchase_id,
    'member_name',   v_member.name,
    'points_earned', v_points_final,
    'points_base',   v_points,
    'points_promo',  v_extra,
    'points_balance',(SELECT points FROM members WHERE id = v_member.id),
    'gallons',       p_gallons,
    'fuel_amount',   p_fuel_amount,
    'station',       (SELECT name FROM stations WHERE id = v_station_id),
    'tier',          v_new_tier,
    'tier_changed',  v_old_tier <> v_new_tier,
    'new_card_code', v_new_code,
    'promo',         v_promo
  );
END;
$function$;

COMMENT ON FUNCTION public.api_register_purchase IS
'F7a.1: acumulación desde el POS externo DESPUÉS de emitir la factura.
Puntos SOLO sobre el consumo de combustible (facturas mixtas), galones y
monto reales de PROPER (no usamos nuestros precios de lista), estación
derivada del colaborador y regla de NIT con mensaje accionable para el
cliente.';

-- ── 5. Seed opcional del mapeo de estaciones ───────────────────
-- Descomentar y ajustar cuando PROPER confirme sus códigos:
-- UPDATE public.stations SET external_code = '1' WHERE name = 'Turkaj I';
-- UPDATE public.stations SET external_code = '2' WHERE name = 'Turkaj II';
-- UPDATE public.stations SET external_code = '3' WHERE name = 'Turkaj III';

-- ============================================================
-- F2.1 (6-ago-2026) — PUNTOS POR NIVEL + EVENTOS POR NIVEL + CORE COMPARTIDO
-- ============================================================
-- Decisión del dueño (6-ago-2026):
--   · Conversión por tier (sin multiplicadores con decimales):
--       ORO     Q10 = 1 punto
--       PLATINO Q8  = 1 punto
--       BLACK   Q6  = 1 punto
--   · Eventos especiales por tier: ORO 25 · PLATINO 35 · BLACK 50 pts
--     (los puntos por día de special_days.points quedan de FALLBACK;
--      la fuente es program_config 'tiers' → evtPts).
--   · Ambos editables desde Admin → Configuración (RPC set_loyalty_config
--     con sesión de admin + auditoría, patrón set_company_info).
--
-- Además paga la deuda técnica anotada desde F7a: la lógica de
-- puntos/promos vivía DUPLICADA en register_purchase (app operador)
-- y api_register_purchase (PROPER). Ahora ambas llaman al core
-- compartido register_purchase_core — un solo lugar para tocar
-- puntos/promos de aquí en adelante (PROMO-2 lo extenderá).
--
-- REGLA: el divisor Q-por-punto se decide con el tier PREVIO a la
-- compra (igual que la evaluación de promos — los galones de esta
-- misma compra no cambian su propia conversión).
-- ============================================================

-- ── 1) Seed: qPerPt por tier + nuevos evtPts ─────────────────
UPDATE program_config SET value =
  jsonb_set(jsonb_set(jsonb_set(value,
    '{oro}',     COALESCE(value->'oro',     '{}'::jsonb) || '{"qPerPt":10,"evtPts":25}'::jsonb),
    '{platino}', COALESCE(value->'platino', '{}'::jsonb) || '{"qPerPt":8,"evtPts":35}'::jsonb),
    '{black}',   COALESCE(value->'black',   '{}'::jsonb) || '{"qPerPt":6,"evtPts":50}'::jsonb)
WHERE key = 'tiers';

-- ── 2) Helpers internos (solo los llaman funciones DEFINER) ──
CREATE OR REPLACE FUNCTION public.tier_q_per_pt(p_tier text)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    NULLIF((SELECT (value -> lower(COALESCE(p_tier, 'oro')) ->> 'qPerPt')::integer
              FROM program_config WHERE key = 'tiers'), 0),
    NULLIF((SELECT (value ->> 'qPerPt')::integer
              FROM program_config WHERE key = 'general'), 0),
    10);
$$;

CREATE OR REPLACE FUNCTION public.tier_evt_pts(p_tier text)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- NULL si no hay config: el caller cae al fallback (special_days.points).
  SELECT (SELECT (value -> lower(COALESCE(p_tier, 'oro')) ->> 'evtPts')::integer
            FROM program_config WHERE key = 'tiers');
$$;

REVOKE ALL ON FUNCTION public.tier_q_per_pt(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tier_evt_pts(text)  FROM PUBLIC, anon, authenticated;

-- ── 3) CORE COMPARTIDO del registro de compra ────────────────
-- Todo lo que era idéntico entre register_purchase y
-- api_register_purchase: puntos por tier, promo sin stacking,
-- insert de purchase, premio de promo (grant_reward), traza en
-- promo_applications, update del miembro, activity_log y cambio
-- de prefijo de tarjeta al subir de nivel.
CREATE OR REPLACE FUNCTION public.register_purchase_core(
  p_member_id   uuid,
  p_operator_id uuid,
  p_station_id  uuid,
  p_fuel_amount numeric,   -- base de puntos y de promos (solo combustible)
  p_total_amount numeric,  -- factura completa (conciliación; NULL en la app)
  p_gallons     numeric,   -- galones REALES (API) o derivados del precio (app)
  p_fuel_type   text,
  p_invoice_no  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
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
  v_promo        jsonb;
  v_extra        integer := 0;
  v_points_final integer;
  v_promo_suffix text := '';
  v_redemption_code text;
  v_redemption_id   uuid;
  v_grant_count     integer := 0;
  v_effect          jsonb;
BEGIN
  SELECT gallons, card_id INTO v_old_gallons, v_card_id
  FROM members WHERE id = p_member_id;

  IF v_old_gallons IS NULL THEN
    RETURN jsonb_build_object('error', 'member_not_found');
  END IF;

  v_new_gallons := v_old_gallons + p_gallons;
  v_old_tier := public.get_member_tier(v_old_gallons);
  v_new_tier := public.get_member_tier(v_new_gallons);

  -- F2.1: conversión por TIER (previo a la compra). ORO Q10 ·
  -- PLATINO Q8 · BLACK Q6 (editable en admin).
  v_q_per_pt := public.tier_q_per_pt(v_old_tier);
  v_points := FLOOR(p_fuel_amount / v_q_per_pt);

  -- PROMO-1: la promo de mayor beneficio (sin stacking), tier previo.
  v_promo := public.pick_best_promo(
    p_fuel_amount, p_fuel_type, p_station_id, v_old_tier, v_points, p_member_id
  );
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

  INSERT INTO purchases (
    member_id, operator_id, station_id, amount, total_amount,
    fuel_type, gallons, points_earned, invoice_no
  )
  VALUES (
    p_member_id, p_operator_id, p_station_id, p_fuel_amount, p_total_amount,
    p_fuel_type, p_gallons, v_points_final, p_invoice_no
  )
  RETURNING id INTO v_purchase_id;

  -- PROMO-1b: premio gratis → canje cost-0 por el flujo NORMAL de
  -- redemptions (código TK, entrega app/POS, comprobante al entregar).
  IF v_promo IS NOT NULL AND v_promo->>'effect_type' = 'grant_reward' THEN
    v_redemption_code := 'TK-' || upper(substring(md5(random()::text || clock_timestamp()::text), 1, 6));
    INSERT INTO redemptions (
      member_id, reward_id, operator_id,
      points_spent, discount_applied, redemption_code
    )
    VALUES (p_member_id, (v_promo->>'reward_id')::uuid, NULL, 0, 0, v_redemption_code)
    RETURNING id INTO v_redemption_id;
    v_grant_count := 1;
    v_promo := v_promo || jsonb_build_object(
      'redemption_code', v_redemption_code,
      'redemption_id',   v_redemption_id
    );
  END IF;

  -- PROMO-1: trazabilidad (desglose base/final + snapshot del efecto)
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
      promo_rule_id, member_id, purchase_id, points_base, points_final, effect
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
    gallons = gallons + p_gallons,
    spent   = spent + p_fuel_amount,
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
    'Compra ' || p_gallons || ' gal ' || p_fuel_type || ' · Q' || p_fuel_amount || v_promo_suffix,
    v_points_final, p_fuel_amount, p_station_id
  );

  IF v_old_tier <> v_new_tier AND v_card_id IS NOT NULL THEN
    SELECT card_code INTO v_old_code FROM physical_cards WHERE id = v_card_id;
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
      SET card_code = v_new_code, tier = v_new_tier, updated_at = now()
      WHERE id = v_card_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'purchase_id',    v_purchase_id,
    'points_final',   v_points_final,
    'points_base',    v_points,
    'points_extra',   v_extra,
    'gallons',        p_gallons,
    'old_tier',       v_old_tier,
    'new_tier',       v_new_tier,
    'tier_changed',   v_old_tier <> v_new_tier,
    'new_card_code',  v_new_code,
    'promo',          v_promo,
    'points_balance', (SELECT points FROM members WHERE id = p_member_id)
  );
END;
$$;

-- Interno: solo lo invocan register_purchase y api_register_purchase
-- (SECURITY DEFINER); nunca directo desde la API abierta.
REVOKE ALL ON FUNCTION public.register_purchase_core(uuid, uuid, uuid, numeric, numeric, numeric, text, text)
  FROM PUBLIC, anon, authenticated;

-- ── 4) register_purchase (app del operador) = wrapper del core ──
-- Misma firma y mismo contrato de retorno de siempre; conserva sus
-- grants (CREATE OR REPLACE no toca ACLs). Deriva galones del precio
-- configurado (la app no conoce los galones reales del surtidor).
CREATE OR REPLACE FUNCTION public.register_purchase(
  p_member_id uuid, p_operator_id uuid, p_station_id uuid,
  p_amount numeric, p_fuel_type text,
  p_invoice_no text DEFAULT NULL::text,
  p_session_token text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_fuel_prices jsonb;
  v_fuel_price  numeric;
  v_gallons     numeric;
  v_core        jsonb;
BEGIN
  -- SEC.B.6.1: validación de sesión (strict desde B.8.1 — RAISE 28000).
  PERFORM public.validate_session_token(
    p_session_token, 'operator', 'register_purchase', false,
    jsonb_build_object('member_id', p_member_id, 'operator_id', p_operator_id, 'station_id', p_station_id)
  );

  IF p_amount IS NULL OR p_amount < 10 THEN
    RETURN jsonb_build_object('error', 'Mínimo Q10');
  END IF;

  SELECT value INTO v_fuel_prices FROM program_config WHERE key = 'fuel_prices';
  IF v_fuel_prices IS NULL THEN
    v_fuel_prices := '{"super": 31.49, "regular": 30.99, "diesel": 28.99}'::jsonb;
  END IF;
  v_fuel_price := COALESCE(
    (v_fuel_prices->>p_fuel_type)::numeric,
    (v_fuel_prices->>'regular')::numeric
  );
  v_gallons := ROUND(p_amount / v_fuel_price, 2);

  v_core := public.register_purchase_core(
    p_member_id, p_operator_id, p_station_id,
    p_amount, NULL, v_gallons, p_fuel_type, p_invoice_no
  );
  IF v_core ? 'error' THEN
    RETURN jsonb_build_object('error', 'Miembro no encontrado');
  END IF;

  RETURN jsonb_build_object(
    'purchase_id',   v_core->'purchase_id',
    'points',        v_core->'points_final',   -- FINALES (base + extra)
    'points_base',   v_core->'points_base',
    'gallons',       v_core->'gallons',
    'tier_changed',  v_core->'tier_changed',
    'old_tier',      v_core->'old_tier',
    'new_tier',      v_core->'new_tier',
    'new_card_code', v_core->'new_card_code',
    'promo',         v_core->'promo'
  );
END;
$$;

-- ── 5) api_register_purchase (PROPER) = wrapper del core ─────
-- Conserva firma, validaciones propias (tarjeta, NIT, estación,
-- colaborador espejo) y contrato de respuesta v1.3.
CREATE OR REPLACE FUNCTION public.api_register_purchase(
  p_api_client_id uuid, p_card_code text, p_fuel_amount numeric,
  p_gallons numeric, p_fuel_type text, p_nit text, p_invoice_no text,
  p_operator_ext text, p_operator_name text DEFAULT NULL::text,
  p_station_ext text DEFAULT NULL::text, p_total_amount numeric DEFAULT NULL::numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_member      RECORD;
  v_code        text := upper(trim(COALESCE(p_card_code, '')));
  v_nit         text := public.normalize_nit(p_nit);
  v_member_nit  text;
  v_operator_id uuid;
  v_station_id  uuid;
  v_fuel        text := lower(COALESCE(p_fuel_type, 'regular'));
  v_core        jsonb;
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

  -- ── Estación: de la FACTURA (viaja con el colaborador) ──
  v_station_id := public.api_resolve_station(p_station_ext);
  v_operator_id := public.api_upsert_operator(trim(p_operator_ext), p_operator_name, v_station_id);
  IF v_station_id IS NULL THEN
    -- Sin código válido: la última donde despachó el colaborador espejo.
    SELECT station_id INTO v_station_id FROM operators WHERE id = v_operator_id;
  END IF;
  IF v_station_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unknown_station',
      'detail', 'No pudimos determinar la estación del colaborador. '
             || 'Configurá su código de estación en Puntos Plus o envialo en station.');
  END IF;

  -- ── Núcleo compartido: puntos por tier + promos + persistencia ──
  v_core := public.register_purchase_core(
    v_member.id, v_operator_id, v_station_id,
    p_fuel_amount, p_total_amount, p_gallons, v_fuel, p_invoice_no
  );
  IF v_core ? 'error' THEN
    RETURN jsonb_build_object('error', 'member_not_found');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'purchase_id',   v_core->'purchase_id',
    'member_name',   v_member.name,
    'points_earned', v_core->'points_final',
    'points_base',   v_core->'points_base',
    'points_promo',  v_core->'points_extra',
    'points_balance',v_core->'points_balance',
    'gallons',       p_gallons,
    'fuel_amount',   p_fuel_amount,
    'station',       (SELECT name FROM stations WHERE id = v_station_id),
    'tier',          v_core->'new_tier',
    'tier_changed',  v_core->'tier_changed',
    'new_card_code', v_core->'new_card_code',
    'promo',         v_core->'promo',
    -- Campos INTERNOS para el push server-side del endpoint (el
    -- endpoint los quita antes de responder a PROPER):
    'member_id',     v_member.id,
    'operator_id',   v_operator_id,
    'operator_name', (SELECT name FROM operators WHERE id = v_operator_id)
  );
END;
$$;

-- ── 6) grant_special_day_bonus: puntos por TIER del miembro ──
-- ORO 25 · PLATINO 35 · BLACK 50 (config 'tiers' → evtPts); los
-- points por día de special_days quedan SOLO de fallback si la
-- config no existe. Cada evento del día otorga el monto del tier
-- (cumpleaños + festivo el mismo día = 2× el monto, como antes
-- sumaban sus points individuales).
CREATE OR REPLACE FUNCTION public.grant_special_day_bonus(p_member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_member      public.members%ROWTYPE;
  v_sd          public.special_days%ROWTYPE;
  v_today_month integer := EXTRACT(MONTH FROM CURRENT_DATE)::integer;
  v_today_day   integer := EXTRACT(DAY   FROM CURRENT_DATE)::integer;
  v_total_bonus integer := 0;
  v_events      jsonb   := '[]'::jsonb;
  v_bday_raw    text;
  v_bday_parts  integer;
  v_bday_month  integer;
  v_bday_day    integer;
  v_names       text[]  := ARRAY[]::text[];
  v_description text;
  v_tier        text;
  v_tier_pts    integer;
  v_evt_pts     integer;
  i             integer;
BEGIN
  -- ── V1: member existe ───────────────────────────────────────
  SELECT * INTO v_member FROM public.members WHERE id = p_member_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'member_not_found');
  END IF;

  -- ── V2: already_granted (comparacion directa con CURRENT_DATE)
  IF v_member.last_special_bonus = CURRENT_DATE THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_granted');
  END IF;

  -- ── F2.1: monto por TIER del miembro (NULL → fallback por día) ──
  v_tier     := public.get_member_tier(COALESCE(v_member.gallons, 0));
  v_tier_pts := public.tier_evt_pts(v_tier);

  -- ── V4: cumpleaños (defensivo: cualquier error de formato de
  --        birthday se ignora y se continua con festivos).
  --        Acepta 'MM-DD' (miembros antiguos) y 'YYYY-MM-DD'
  --        (fecha completa, registros desde jul-2026). ──────────
  BEGIN
    IF v_member.birthday IS NOT NULL AND btrim(v_member.birthday::text) <> '' THEN
      v_bday_raw   := btrim(v_member.birthday::text);
      v_bday_parts := array_length(string_to_array(v_bday_raw, '-'), 1);
      IF v_bday_parts = 2 THEN
        v_bday_month := split_part(v_bday_raw, '-', 1)::integer;
        v_bday_day   := split_part(v_bday_raw, '-', 2)::integer;
      ELSIF v_bday_parts = 3 THEN
        v_bday_month := split_part(v_bday_raw, '-', 2)::integer;
        v_bday_day   := split_part(v_bday_raw, '-', 3)::integer;
      END IF;
      IF v_bday_month IS NOT NULL
         AND v_bday_month = v_today_month
         AND v_bday_day   = v_today_day THEN
        SELECT * INTO v_sd FROM public.special_days
          WHERE month = 0 AND day = 0 AND active = true
          LIMIT 1;
        IF FOUND THEN
          v_evt_pts := COALESCE(v_tier_pts, v_sd.points, 0);
          v_total_bonus := v_total_bonus + v_evt_pts;
          v_events := v_events || jsonb_build_array(jsonb_build_object(
            'id',          v_sd.id,
            'name',        v_sd.name,
            'icon',        v_sd.icon,
            'points',      v_evt_pts,
            'message',     v_sd.message,
            'is_birthday', true
          ));
        END IF;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Formato de birthday invalido: se omite el bonus de cumpleaños.
    NULL;
  END;

  -- ── V5: festivos de fecha fija que aplican hoy ──────────────
  FOR v_sd IN
    SELECT * FROM public.special_days
    WHERE active = true
      AND month = v_today_month
      AND day   = v_today_day
  LOOP
    v_evt_pts := COALESCE(v_tier_pts, v_sd.points, 0);
    v_total_bonus := v_total_bonus + v_evt_pts;
    v_events := v_events || jsonb_build_array(jsonb_build_object(
      'id',          v_sd.id,
      'name',        v_sd.name,
      'icon',        v_sd.icon,
      'points',      v_evt_pts,
      'message',     v_sd.message,
      'is_birthday', false
    ));
  END LOOP;

  -- ── V6: nada que otorgar hoy ────────────────────────────────
  IF v_total_bonus = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_bonus_today');
  END IF;

  -- ── V7: mutacion atomica ────────────────────────────────────
  -- Autoriza al trigger BEFORE UPDATE de FB.7 (cuando exista).
  PERFORM set_config('app.allow_points_write', 'true', true);

  UPDATE public.members SET
    points             = points + v_total_bonus,
    last_special_bonus = CURRENT_DATE,
    updated_at         = now()
  WHERE id = p_member_id;

  -- Descripcion consolidada: "Bonus especial: 🎂 Cumpleaños + 🇬🇹 Independencia"
  FOR i IN 0 .. jsonb_array_length(v_events) - 1 LOOP
    v_names := array_append(
      v_names,
      btrim(COALESCE(v_events -> i ->> 'icon', '') || ' ' || COALESCE(v_events -> i ->> 'name', ''))
    );
  END LOOP;
  v_description := 'Bonus especial: ' || array_to_string(v_names, ' + ');

  INSERT INTO public.activity_log (
    member_id, activity_type, description, points_change
  ) VALUES (
    p_member_id, 'evento', v_description, v_total_bonus
  );

  -- ── V8: exito ───────────────────────────────────────────────
  RETURN jsonb_build_object(
    'ok',          true,
    'bonus',       v_total_bonus,
    'events',      v_events,
    'member_name', v_member.name
  );
END;
$$;

-- ── 7) set_loyalty_config: edición auditada desde el panel ───
-- Patrón set_company_info: sesión de admin obligatoria, whitelist
-- (solo qPerPt/evtPts de oro/platino/black — gal y descuentos NO
-- se tocan desde acá), merge que preserva el resto del objeto y
-- auditoría atómica.
CREATE OR REPLACE FUNCTION public.set_loyalty_config(
  p_session_token text,
  p_data jsonb,
  p_admin_id uuid DEFAULT NULL::uuid,
  p_admin_name text DEFAULT NULL::text,
  p_admin_email text DEFAULT NULL::text,
  p_reason_text text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old   jsonb;
  v_new   jsonb;
  v_tier  text;
  v_raw   text;
  v_patch jsonb;
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'set_loyalty_config', false, NULL);

  SELECT value INTO v_old FROM program_config WHERE key = 'tiers';
  v_new := COALESCE(v_old, '{}'::jsonb);

  FOREACH v_tier IN ARRAY ARRAY['oro', 'platino', 'black'] LOOP
    IF p_data ? v_tier THEN
      v_patch := '{}'::jsonb;

      IF p_data -> v_tier ? 'qPerPt' THEN
        v_raw := p_data -> v_tier ->> 'qPerPt';
        IF v_raw !~ '^[0-9]+$' OR v_raw::integer < 1 OR v_raw::integer > 100 THEN
          RETURN jsonb_build_object('error', 'Quetzales por punto: entero entre 1 y 100 (' || v_tier || ')');
        END IF;
        v_patch := v_patch || jsonb_build_object('qPerPt', v_raw::integer);
      END IF;

      IF p_data -> v_tier ? 'evtPts' THEN
        v_raw := p_data -> v_tier ->> 'evtPts';
        IF v_raw !~ '^[0-9]+$' OR v_raw::integer > 1000 THEN
          RETURN jsonb_build_object('error', 'Puntos de evento: entero entre 0 y 1000 (' || v_tier || ')');
        END IF;
        v_patch := v_patch || jsonb_build_object('evtPts', v_raw::integer);
      END IF;

      IF v_patch <> '{}'::jsonb THEN
        v_new := jsonb_set(v_new, ARRAY[v_tier], COALESCE(v_new -> v_tier, '{}'::jsonb) || v_patch);
      END IF;
    END IF;
  END LOOP;

  IF v_new = COALESCE(v_old, '{}'::jsonb) THEN
    RETURN jsonb_build_object('error', 'Nada que actualizar');
  END IF;

  INSERT INTO program_config (key, value) VALUES ('tiers', v_new)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  PERFORM public.log_admin_action(
    p_admin_id    => p_admin_id,
    p_admin_name  => p_admin_name,
    p_admin_email => p_admin_email,
    p_action      => 'update_loyalty_config',
    p_entity_type => 'config',
    p_entity_id   => 'tiers',
    p_reason_text => p_reason_text,
    p_old_value   => v_old,
    p_new_value   => v_new
  );

  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_loyalty_config(text, jsonb, uuid, text, text, text) TO anon, authenticated;

-- ============================================================
-- VERIFICAR tras ejecutar:
--   1. SELECT value FROM program_config WHERE key='tiers';
--      → oro {qPerPt:10, evtPts:25}, platino {8,35}, black {6,50}
--   2. Compra de operador a un PLATINO: Q80 → 10 pts (antes 8).
--   3. Compra por API PROPER (fuel_amount) con la misma regla.
--   4. Bonus de festivo/cumpleaños otorga 25/35/50 según nivel.
--   5. Editar valores en Admin → Configuración → auditoría en el log.
-- ============================================================

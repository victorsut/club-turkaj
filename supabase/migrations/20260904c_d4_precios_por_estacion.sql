-- ============================================================
-- D4 — Precios de combustible GLOBALES o POR ESTACIÓN (4-sep-2026)
-- ============================================================
-- Decisión D4 (ROADMAP §2): el admin elige si los precios son iguales
-- en todas las estaciones o si cada una tiene los suyos. Hasta hoy
-- solo existía program_config('fuel_prices') global, que
-- register_purchase usa para convertir los Q del operador a galones.
--
-- Esta migración:
--   1. program_config('fuel_prices_mode') = {"per_station": false}
--      (interruptor; RPC set_fuel_prices_mode con sesión admin +
--      auditoría). Lectura pública como el resto de la config.
--   2. stations.fuel_prices jsonb {super, regular, diesel} — NULL =
--      la estación usa los precios globales. RPC
--      update_station_fuel_prices (sesión admin, rangos Q1–Q100,
--      auditoría; p_prices NULL vuelve a los globales).
--   3. fuel_price_for(station, fuel): precio vigente para una compra —
--      con el modo por estación encendido y precio propio definido,
--      manda el de la estación; si no, el global (fallback regular).
--      register_purchase lo usa (el operador sigue mandando solo Q).
--   La API de PROPER no cambia: recibe galones REALES de la factura.
-- ============================================================

-- ── 1. interruptor ────────────────────────────────────────────
INSERT INTO public.program_config (key, value)
VALUES ('fuel_prices_mode', '{"per_station": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.set_fuel_prices_mode(
  p_session_token text,
  p_per_station   boolean,
  p_admin_id      uuid DEFAULT NULL,
  p_admin_name    text DEFAULT NULL,
  p_admin_email   text DEFAULT NULL,
  p_reason_text   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old   jsonb;
  v_value jsonb;
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'set_fuel_prices_mode', true, NULL);
  IF p_per_station IS NULL THEN
    RETURN jsonb_build_object('error', 'Modo requerido');
  END IF;

  SELECT value INTO v_old FROM program_config WHERE key = 'fuel_prices_mode';
  v_value := jsonb_build_object('per_station', p_per_station);

  INSERT INTO program_config (key, value) VALUES ('fuel_prices_mode', v_value)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  PERFORM public.log_admin_action(
    p_admin_id    => p_admin_id,
    p_admin_name  => p_admin_name,
    p_admin_email => p_admin_email,
    p_action      => 'set_fuel_prices_mode',
    p_entity_type => 'fuel_prices',
    p_entity_id   => 'fuel_prices_mode',
    p_reason_text => p_reason_text,
    p_old_value   => v_old,
    p_new_value   => v_value
  );

  RETURN v_value;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.set_fuel_prices_mode(text, boolean, uuid, text, text, text) TO anon, authenticated;

-- ── 2. precios propios por estación ───────────────────────────
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS fuel_prices jsonb;

CREATE OR REPLACE FUNCTION public.update_station_fuel_prices(
  p_session_token text,
  p_station_id    uuid,
  p_prices        jsonb,
  p_admin_id      uuid DEFAULT NULL,
  p_admin_name    text DEFAULT NULL,
  p_admin_email   text DEFAULT NULL,
  p_reason_text   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old     jsonb;
  v_value   jsonb;
  v_name    text;
  v_super   numeric;
  v_regular numeric;
  v_diesel  numeric;
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'update_station_fuel_prices', true, NULL);

  SELECT name, fuel_prices INTO v_name, v_old FROM stations WHERE id = p_station_id;
  IF v_name IS NULL THEN
    RETURN jsonb_build_object('error', 'Estación no encontrada');
  END IF;

  IF p_prices IS NULL OR p_prices = 'null'::jsonb THEN
    v_value := NULL; -- vuelve a los precios globales
  ELSE
    IF NOT (p_prices ? 'super' AND p_prices ? 'regular' AND p_prices ? 'diesel') THEN
      RETURN jsonb_build_object('error', 'Faltan precios: super, regular y diesel');
    END IF;
    v_super   := (p_prices->>'super')::numeric;
    v_regular := (p_prices->>'regular')::numeric;
    v_diesel  := (p_prices->>'diesel')::numeric;
    IF v_super < 1 OR v_super > 100 OR v_regular < 1 OR v_regular > 100 OR v_diesel < 1 OR v_diesel > 100 THEN
      RETURN jsonb_build_object('error', 'Cada precio debe estar entre Q1.00 y Q100.00');
    END IF;
    v_value := jsonb_build_object('super', v_super, 'regular', v_regular, 'diesel', v_diesel);
  END IF;

  UPDATE stations SET fuel_prices = v_value WHERE id = p_station_id;

  PERFORM public.log_admin_action(
    p_admin_id    => p_admin_id,
    p_admin_name  => p_admin_name,
    p_admin_email => p_admin_email,
    p_action      => 'update_station_fuel_prices',
    p_entity_type => 'station',
    p_entity_id   => p_station_id::text,
    p_reason_text => p_reason_text,
    p_old_value   => jsonb_build_object('station', v_name, 'fuel_prices', v_old),
    p_new_value   => jsonb_build_object('station', v_name, 'fuel_prices', v_value)
  );

  RETURN jsonb_build_object('ok', true, 'station_id', p_station_id, 'fuel_prices', v_value);
END;
$function$;
GRANT EXECUTE ON FUNCTION public.update_station_fuel_prices(text, uuid, jsonb, uuid, text, text, text) TO anon, authenticated;

-- ── 3. precio vigente para una compra ─────────────────────────
CREATE OR REPLACE FUNCTION public.fuel_price_for(p_station_id uuid, p_fuel_type text)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_global  jsonb;
  v_station jsonb;
  v_per     boolean;
  v_price   numeric;
BEGIN
  SELECT COALESCE((value->>'per_station')::boolean, false) INTO v_per
  FROM program_config WHERE key = 'fuel_prices_mode';

  IF COALESCE(v_per, false) AND p_station_id IS NOT NULL THEN
    SELECT fuel_prices INTO v_station FROM stations WHERE id = p_station_id;
    IF v_station IS NOT NULL THEN
      v_price := (v_station->>p_fuel_type)::numeric;
      IF v_price IS NOT NULL AND v_price > 0 THEN
        RETURN v_price;
      END IF;
    END IF;
  END IF;

  SELECT value INTO v_global FROM program_config WHERE key = 'fuel_prices';
  IF v_global IS NULL THEN
    v_global := '{"super": 31.49, "regular": 30.99, "diesel": 28.99}'::jsonb;
  END IF;
  RETURN COALESCE((v_global->>p_fuel_type)::numeric, (v_global->>'regular')::numeric);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.fuel_price_for(uuid, text) FROM anon, authenticated, PUBLIC;

-- register_purchase: mismo cuerpo, precio por fuel_price_for
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
AS $function$
DECLARE
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

  -- D4: precio de la estación si el modo por estación está encendido
  -- y la estación tiene precio propio; si no, el global.
  v_fuel_price := public.fuel_price_for(p_station_id, p_fuel_type);
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
    'points',        v_core->'points_final',
    'points_base',   v_core->'points_base',
    'gallons',       v_core->'gallons',
    'tier_changed',  v_core->'tier_changed',
    'old_tier',      v_core->'old_tier',
    'new_tier',      v_core->'new_tier',
    'new_card_code', v_core->'new_card_code',
    'promo',         v_core->'promo'
  );
END;
$function$;

-- ============================================================
-- VERIFICAR tras ejecutar:
--   1. SELECT value FROM program_config WHERE key = 'fuel_prices_mode';
--      → {"per_station": false}
--   2. Admin → Configuración → Precios de Combustible: encender
--      "Precios por estación" → fila cambia y admin_audit_log registra
--      set_fuel_prices_mode; editar Turkaj III → stations.fuel_prices.
--   3. Con el modo encendido: SELECT public.fuel_price_for('<id Turkaj
--      III>', 'regular') (como service key) → el precio propio; con el
--      modo apagado → el global. Una compra del operador en esa estación
--      calcula los galones con ese precio.
-- ============================================================

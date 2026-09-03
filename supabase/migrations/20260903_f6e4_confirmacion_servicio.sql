-- ============================================================
-- F6 E4 — CONFIRMACIÓN DE SERVICIO (3-sep-2026)
-- ============================================================
-- Pedido del dueño: al tocar el push de servicio la app abre la
-- ventana VEHÍCULOS y permite CONFIRMAR que el servicio se hizo y
-- anotar el próximo; mientras no se confirme, los recordatorios
-- SIGUEN llegando (antes se cortaban a los 30 días / 3,000 km).
--
--   1. vehicles.last_service / last_service_km — registro del último
--      servicio confirmado (historial mínimo; base para proponer el
--      intervalo del siguiente).
--   2. list_my_vehicles expone ambos campos.
--   3. RPC confirm_my_vehicle_service (sesión de miembro): estampa el
--      servicio hecho, actualiza el odómetro si la lectura es mayor y
--      programa el próximo (fecha y/o km — al menos uno).
--   4. list_vehicle_service_alerts SIN techo: vencidos por fecha o km
--      siguen siendo candidatos hasta que el socio confirme (la
--      cadencia la pone el cron: vencido cada 7 días, km cada 14).
-- ============================================================

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS last_service    date;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS last_service_km integer;

-- ── 2. list_my_vehicles: + last_service / last_service_km ─────
CREATE OR REPLACE FUNCTION public.list_my_vehicles(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mid  uuid;
  v_cfg  jsonb;
  v_beta boolean;
  v_rows jsonb;
BEGIN
  v_mid := public.validate_session_token(p_session_token, 'member', 'list_my_vehicles', false, NULL);

  SELECT value INTO v_cfg FROM program_config WHERE key = 'vehicles_beta';
  v_beta := COALESCE((v_cfg->>'enabled')::boolean, false)
            OR EXISTS (SELECT 1 FROM vehicles_beta b WHERE b.member_id = v_mid);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', t.id, 'vtype', t.vtype, 'brand', t.brand, 'model', t.model,
           'version', t.version, 'color', t.color, 'plate', t.plate,
           'km', t.km, 'km_updated_at', t.km_updated_at,
           'oil_type', t.oil_type, 'next_service', t.next_service,
           'next_service_km', t.next_service_km,
           'last_service', t.last_service, 'last_service_km', t.last_service_km,
           'tank_gal', t.tank_gal, 'fuel_pref', t.fuel_pref,
           'last_fuel_at', t.last_fuel_at, 'created_at', t.created_at
         ) ORDER BY t.last_fuel_at DESC NULLS LAST, t.created_at ASC), '[]'::jsonb)
    INTO v_rows
  FROM vehicles t
  WHERE t.member_id = v_mid;

  RETURN jsonb_build_object('ok', true, 'beta', v_beta, 'vehicles', v_rows);
END;
$function$;

-- ── 3. confirm_my_vehicle_service ─────────────────────────────
CREATE OR REPLACE FUNCTION public.confirm_my_vehicle_service(
  p_session_token   text,
  p_vehicle_id      uuid,
  p_done_on         date,
  p_km              integer DEFAULT NULL,
  p_next_service    date    DEFAULT NULL,
  p_next_service_km integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mid uuid;
  v_row vehicles%ROWTYPE;
BEGIN
  v_mid := public.validate_session_token(p_session_token, 'member', 'confirm_my_vehicle_service', false, NULL);

  IF p_vehicle_id IS NULL THEN
    RAISE EXCEPTION 'Vehículo requerido' USING ERRCODE = '22023';
  END IF;
  IF p_done_on IS NULL OR p_done_on > current_date OR p_done_on < current_date - 365 THEN
    RAISE EXCEPTION 'Fecha del servicio inválida' USING ERRCODE = '22023';
  END IF;
  IF p_km IS NOT NULL AND (p_km < 0 OR p_km > 2000000) THEN
    RAISE EXCEPTION 'Kilometraje fuera de rango' USING ERRCODE = '22023';
  END IF;
  IF p_next_service IS NULL AND p_next_service_km IS NULL THEN
    RAISE EXCEPTION 'Anota el próximo servicio (fecha o kilometraje)' USING ERRCODE = '22023';
  END IF;
  IF p_next_service IS NOT NULL AND p_next_service <= p_done_on THEN
    RAISE EXCEPTION 'El próximo servicio debe ser posterior al realizado' USING ERRCODE = '22023';
  END IF;
  IF p_next_service_km IS NOT NULL AND (p_next_service_km < 0 OR p_next_service_km > 2000000) THEN
    RAISE EXCEPTION 'Kilometraje de servicio fuera de rango' USING ERRCODE = '22023';
  END IF;
  IF p_next_service_km IS NOT NULL AND p_km IS NOT NULL AND p_next_service_km <= p_km THEN
    RAISE EXCEPTION 'El kilometraje del próximo servicio debe ser mayor al actual' USING ERRCODE = '22023';
  END IF;

  UPDATE vehicles SET
    last_service    = p_done_on,
    last_service_km = COALESCE(p_km, last_service_km),
    -- el odómetro solo AVANZA (una lectura menor que la última no lo retrocede)
    km              = CASE WHEN p_km IS NOT NULL AND (km IS NULL OR p_km >= km) THEN p_km ELSE km END,
    km_updated_at   = CASE WHEN p_km IS NOT NULL AND (km IS NULL OR p_km >= km) THEN now() ELSE km_updated_at END,
    next_service    = p_next_service,
    next_service_km = p_next_service_km,
    updated_at      = now()
  WHERE id = p_vehicle_id AND member_id = v_mid
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Vehículo no encontrado' USING ERRCODE = '22023';
  END IF;

  RETURN jsonb_build_object('ok', true, 'vehicle', jsonb_build_object(
    'id', v_row.id, 'vtype', v_row.vtype, 'brand', v_row.brand, 'model', v_row.model,
    'version', v_row.version, 'color', v_row.color, 'plate', v_row.plate,
    'km', v_row.km, 'km_updated_at', v_row.km_updated_at,
    'oil_type', v_row.oil_type, 'next_service', v_row.next_service,
    'next_service_km', v_row.next_service_km,
    'last_service', v_row.last_service, 'last_service_km', v_row.last_service_km,
    'tank_gal', v_row.tank_gal, 'fuel_pref', v_row.fuel_pref,
    'last_fuel_at', v_row.last_fuel_at, 'created_at', v_row.created_at
  ));
END;
$function$;
GRANT EXECUTE ON FUNCTION public.confirm_my_vehicle_service(text, uuid, date, integer, date, integer) TO anon, authenticated;

-- ── 4. list_vehicle_service_alerts: recordar HASTA confirmar ──
-- Sin el techo de 30 días / 3,000 km: un servicio vencido sigue
-- generando candidatos; el cron decide la cadencia (vencido por fecha
-- cada 7 días, por km cada 14) y el socio lo corta al confirmar.
CREATE OR REPLACE FUNCTION public.list_vehicle_service_alerts()
RETURNS TABLE (
  member_id uuid,
  vehicle_id uuid,
  vehicle_name text,
  kind text,
  days_left integer,
  km_left integer,
  next_service date,
  next_service_km integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT v.member_id, v.id,
         COALESCE(NULLIF(trim(concat_ws(' ', v.brand, v.model)), ''), 'tu vehículo'),
         'fecha'::text,
         (v.next_service - current_date)::integer,
         NULL::integer,
         v.next_service, v.next_service_km
  FROM vehicles v
  WHERE v.next_service IS NOT NULL
    AND (v.next_service - current_date) <= 7
  UNION ALL
  SELECT v.member_id, v.id,
         COALESCE(NULLIF(trim(concat_ws(' ', v.brand, v.model)), ''), 'tu vehículo'),
         'km'::text,
         NULL::integer,
         (v.next_service_km - v.km)::integer,
         v.next_service, v.next_service_km
  FROM vehicles v
  WHERE v.next_service_km IS NOT NULL AND v.km IS NOT NULL
    AND (v.next_service_km - v.km) <= 500;
$function$;
REVOKE EXECUTE ON FUNCTION public.list_vehicle_service_alerts() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_vehicle_service_alerts() TO service_role;

-- ============================================================
-- VERIFICAR tras ejecutar:
--   1. list_my_vehicles → cada vehículo trae last_service y
--      last_service_km (NULL al inicio).
--   2. confirm_my_vehicle_service(token, id, current_date, 52000,
--      NULL, 57000) → ok; km del vehículo = 52000, last_service = hoy,
--      next_service_km = 57000, next_service = NULL.
--      Sin fecha ni km próximos → error 'Anota el próximo servicio'.
--   3. list_vehicle_service_alerts() con service key → un vehículo
--      con next_service vencido hace 45 días SIGUE apareciendo.
-- ============================================================

-- ============================================================
-- F6 E3d (2-sep-2026) — TELEMETRÍA PLUS + ALERTAS DE SERVICIO
-- ============================================================
-- Aprobado por el dueño (de las recomendaciones E3):
--   6. vehicles.tank_gal  — capacidad del tanque (galones) →
--      autonomía estimada (tanque × km/gal) y validación suave
--      de cargas mayores al tanque.
--   7. vehicles.fuel_pref — combustible habitual (regular/super/
--      diesel) → detector de cargas con combustible DISTINTO al
--      habitual (probable mala asignación) en el historial.
--   9. (D24/E3) list_vehicle_service_alerts — candidatos del cron
--      diario de push "próximo servicio" por FECHA o por KM; la
--      cadencia y el dedupe viven en api/vehicle-service-alerts.
-- Se recrean list_my_vehicles / save_my_vehicle con los campos
-- nuevos (mismas validaciones y sesión del 20260815b).
-- ============================================================

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS tank_gal numeric,
  ADD COLUMN IF NOT EXISTS fuel_pref text;

COMMENT ON COLUMN public.vehicles.tank_gal IS
'F6-E3d: capacidad del tanque en galones (autonomía estimada + validación de cargas).';
COMMENT ON COLUMN public.vehicles.fuel_pref IS
'F6-E3d: combustible habitual (regular|super|diesel) — detector de cargas mal asignadas.';

-- ── list_my_vehicles: expone tank_gal y fuel_pref ────────────
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
           'tank_gal', t.tank_gal, 'fuel_pref', t.fuel_pref,
           'last_fuel_at', t.last_fuel_at, 'created_at', t.created_at
         ) ORDER BY t.last_fuel_at DESC NULLS LAST, t.created_at ASC), '[]'::jsonb)
    INTO v_rows
  FROM vehicles t
  WHERE t.member_id = v_mid;

  RETURN jsonb_build_object('ok', true, 'beta', v_beta, 'vehicles', v_rows);
END;
$function$;

-- ── save_my_vehicle: acepta y devuelve los campos nuevos ─────
CREATE OR REPLACE FUNCTION public.save_my_vehicle(
  p_session_token text,
  p_vehicle jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mid     uuid;
  v_id      uuid;
  v_count   integer;
  v_vtype   text;
  v_color   text;
  v_km      integer;
  v_next    date;
  v_next_km integer;
  v_tank    numeric;
  v_fuel    text;
  v_row     vehicles%ROWTYPE;
BEGIN
  v_mid := public.validate_session_token(p_session_token, 'member', 'save_my_vehicle', false, NULL);

  v_vtype := COALESCE(NULLIF(p_vehicle->>'vtype', ''), 'liviano');
  IF v_vtype NOT IN ('camion','camion_ligero','picop','microbus','liviano','mototaxi','moto','otro') THEN
    RAISE EXCEPTION 'Tipo de vehículo inválido' USING ERRCODE = '22023';
  END IF;

  v_color := NULLIF(p_vehicle->>'color', '');
  IF v_color IS NOT NULL AND v_color !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Color inválido' USING ERRCODE = '22023';
  END IF;

  v_km := NULL;
  IF NULLIF(p_vehicle->>'km', '') IS NOT NULL THEN
    v_km := (p_vehicle->>'km')::integer;
    IF v_km < 0 OR v_km > 2000000 THEN
      RAISE EXCEPTION 'Kilometraje fuera de rango' USING ERRCODE = '22023';
    END IF;
  END IF;

  v_next_km := NULL;
  IF NULLIF(p_vehicle->>'next_service_km', '') IS NOT NULL THEN
    v_next_km := (p_vehicle->>'next_service_km')::integer;
    IF v_next_km < 0 OR v_next_km > 2000000 THEN
      RAISE EXCEPTION 'Kilometraje de servicio fuera de rango' USING ERRCODE = '22023';
    END IF;
  END IF;

  v_tank := NULL;
  IF NULLIF(p_vehicle->>'tank_gal', '') IS NOT NULL THEN
    v_tank := (p_vehicle->>'tank_gal')::numeric;
    IF v_tank <= 0 OR v_tank > 200 THEN
      RAISE EXCEPTION 'Capacidad del tanque fuera de rango' USING ERRCODE = '22023';
    END IF;
    v_tank := round(v_tank, 1);
  END IF;

  v_fuel := NULLIF(p_vehicle->>'fuel_pref', '');
  IF v_fuel IS NOT NULL AND v_fuel NOT IN ('regular','super','diesel') THEN
    RAISE EXCEPTION 'Combustible inválido' USING ERRCODE = '22023';
  END IF;

  v_next := NULL;
  IF NULLIF(p_vehicle->>'next_service', '') IS NOT NULL THEN
    v_next := (p_vehicle->>'next_service')::date;
  END IF;

  IF length(COALESCE(p_vehicle->>'brand', ''))    > 40  OR
     length(COALESCE(p_vehicle->>'model', ''))    > 60  OR
     length(COALESCE(p_vehicle->>'version', ''))  > 40  OR
     length(COALESCE(p_vehicle->>'oil_type', '')) > 40  OR
     length(COALESCE(p_vehicle->>'plate', ''))    > 12 THEN
    RAISE EXCEPTION 'Campo demasiado largo' USING ERRCODE = '22023';
  END IF;

  v_id := NULLIF(p_vehicle->>'id', '')::uuid;

  IF v_id IS NULL THEN
    SELECT count(*) INTO v_count FROM vehicles WHERE member_id = v_mid;
    IF v_count >= 10 THEN
      RAISE EXCEPTION 'Máximo 10 vehículos por cuenta' USING ERRCODE = '22023';
    END IF;
    INSERT INTO vehicles (member_id, vtype, brand, model, version, color, plate, km, km_updated_at, oil_type, next_service, next_service_km, tank_gal, fuel_pref)
    VALUES (
      v_mid, v_vtype,
      NULLIF(p_vehicle->>'brand', ''), NULLIF(p_vehicle->>'model', ''),
      NULLIF(p_vehicle->>'version', ''), v_color,
      NULLIF(p_vehicle->>'plate', ''), v_km,
      CASE WHEN v_km IS NULL THEN NULL ELSE now() END,
      NULLIF(p_vehicle->>'oil_type', ''), v_next, v_next_km, v_tank, v_fuel
    )
    RETURNING * INTO v_row;
  ELSE
    UPDATE vehicles SET
      vtype = v_vtype,
      brand = NULLIF(p_vehicle->>'brand', ''),
      model = NULLIF(p_vehicle->>'model', ''),
      version = NULLIF(p_vehicle->>'version', ''),
      color = v_color,
      plate = NULLIF(p_vehicle->>'plate', ''),
      km = v_km,
      km_updated_at = CASE WHEN v_km IS DISTINCT FROM km THEN now() ELSE km_updated_at END,
      oil_type = NULLIF(p_vehicle->>'oil_type', ''),
      next_service = v_next,
      next_service_km = v_next_km,
      tank_gal = v_tank,
      fuel_pref = v_fuel,
      updated_at = now()
    WHERE id = v_id AND member_id = v_mid
    RETURNING * INTO v_row;
    IF v_row.id IS NULL THEN
      RAISE EXCEPTION 'Vehículo no encontrado' USING ERRCODE = '22023';
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'vehicle', jsonb_build_object(
    'id', v_row.id, 'vtype', v_row.vtype, 'brand', v_row.brand, 'model', v_row.model,
    'version', v_row.version, 'color', v_row.color, 'plate', v_row.plate,
    'km', v_row.km, 'km_updated_at', v_row.km_updated_at,
    'oil_type', v_row.oil_type, 'next_service', v_row.next_service,
    'next_service_km', v_row.next_service_km,
    'tank_gal', v_row.tank_gal, 'fuel_pref', v_row.fuel_pref,
    'last_fuel_at', v_row.last_fuel_at, 'created_at', v_row.created_at
  ));
END;
$function$;

-- ── D24/E3: candidatos del cron de alertas de servicio ───────
-- Devuelve vehículos con servicio próximo o vencido:
--   por FECHA: faltan ≤7 días o ya venció (hasta 30 días de gracia)
--   por KM:    faltan ≤500 km o ya se pasó (con el odómetro conocido)
-- La cadencia exacta (7/3/1/0/vencido cada 7 días; km una sola vez
-- por cruce) y el dedupe por `notifications` viven en el endpoint.
-- SOLO service_role: lo consume el cron con la service key.
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
    AND (current_date - v.next_service) <= 30
  UNION ALL
  SELECT v.member_id, v.id,
         COALESCE(NULLIF(trim(concat_ws(' ', v.brand, v.model)), ''), 'tu vehículo'),
         'km'::text,
         NULL::integer,
         (v.next_service_km - v.km)::integer,
         v.next_service, v.next_service_km
  FROM vehicles v
  WHERE v.next_service_km IS NOT NULL AND v.km IS NOT NULL
    AND (v.next_service_km - v.km) <= 500
    AND (v.km - v.next_service_km) <= 3000;
$function$;

REVOKE EXECUTE ON FUNCTION public.list_vehicle_service_alerts() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_vehicle_service_alerts() TO service_role;

-- ============================================================
-- VERIFICAR tras ejecutar:
--   1. save_my_vehicle con {"tank_gal":"12.5","fuel_pref":"regular"}
--      → persiste y devuelve ambos; list_my_vehicles los incluye;
--      fuel_pref fuera de la whitelist → error controlado.
--   2. list_vehicle_service_alerts() con service key → filas de
--      vehículos con servicio a ≤7 días / ≤500 km o vencido;
--      como anon → permiso denegado.
-- ============================================================

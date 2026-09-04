-- ============================================================
-- D24 flecos — UMBRALES EDITABLES por admin + SILENCIO por vehículo
-- (4-sep-2026, cierre de la decisión D24 tras el rollout de F6)
-- ============================================================
-- Hasta hoy los umbrales de las alertas push de servicio vivían FIJOS
-- en código (7 días / 500 km; vencido cada 7 días; km cada 14) y el
-- socio no podía silenciar un vehículo. Esta migración:
--   1. program_config('service_alerts') = umbrales globales editables
--      desde Admin → Configuración (RPC set_service_alerts_config,
--      sesión de admin + auditoría). Lectura pública (un jsonb de
--      números no expone nada): el cliente los usa para pintar el aviso
--      naranja y el botón "¿Ya hiciste el servicio?" con el MISMO
--      umbral que el push.
--   2. vehicles.alerts_muted — el socio apaga los recordatorios de ESE
--      vehículo desde Datos y ajustes (save_my_vehicle lo acepta;
--      list_my_vehicles / confirm_my_vehicle_service lo devuelven).
--   3. list_vehicle_service_alerts lee los umbrales de la config y
--      EXCLUYE los vehículos silenciados; el cron lee la misma config
--      para la cadencia de los recordatorios.
-- ============================================================

-- ── 1. umbrales globales ──────────────────────────────────────
INSERT INTO public.program_config (key, value)
VALUES ('service_alerts', '{"days": 7, "km": 500, "overdue_every_days": 7, "km_every_days": 14}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.set_service_alerts_config(
  p_session_token text,
  p_data          jsonb,
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
  v_days  integer := NULLIF(p_data->>'days', '')::integer;
  v_km    integer := NULLIF(p_data->>'km', '')::integer;
  v_over  integer := NULLIF(p_data->>'overdue_every_days', '')::integer;
  v_kmev  integer := NULLIF(p_data->>'km_every_days', '')::integer;
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'set_service_alerts_config', true, NULL);

  IF v_days IS NULL OR v_km IS NULL OR v_over IS NULL OR v_kmev IS NULL THEN
    RETURN jsonb_build_object('error', 'Los cuatro valores son obligatorios');
  END IF;
  IF v_days < 1 OR v_days > 60 THEN
    RETURN jsonb_build_object('error', 'Aviso por fecha: entre 1 y 60 días');
  END IF;
  IF v_km < 50 OR v_km > 5000 THEN
    RETURN jsonb_build_object('error', 'Aviso por kilometraje: entre 50 y 5,000 km');
  END IF;
  IF v_over < 1 OR v_over > 30 THEN
    RETURN jsonb_build_object('error', 'Recordatorio de vencido: entre 1 y 30 días');
  END IF;
  IF v_kmev < 1 OR v_kmev > 60 THEN
    RETURN jsonb_build_object('error', 'Recordatorio por km: entre 1 y 60 días');
  END IF;

  SELECT value INTO v_old FROM program_config WHERE key = 'service_alerts';
  v_value := jsonb_build_object(
    'days', v_days, 'km', v_km,
    'overdue_every_days', v_over, 'km_every_days', v_kmev
  );

  INSERT INTO program_config (key, value) VALUES ('service_alerts', v_value)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  PERFORM public.log_admin_action(
    p_admin_id    => p_admin_id,
    p_admin_name  => p_admin_name,
    p_admin_email => p_admin_email,
    p_action      => 'update_service_alerts',
    p_entity_type => 'config',
    p_entity_id   => 'service_alerts',
    p_reason_text => p_reason_text,
    p_old_value   => v_old,
    p_new_value   => v_value
  );

  RETURN v_value;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.set_service_alerts_config(text, jsonb, uuid, text, text, text) TO anon, authenticated;

-- ── 2. silencio por vehículo ──────────────────────────────────
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS alerts_muted boolean NOT NULL DEFAULT false;

-- list_my_vehicles: + alerts_muted (conserva 'beta': true de
-- compatibilidad del rollout 20260904)
CREATE OR REPLACE FUNCTION public.list_my_vehicles(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mid  uuid;
  v_rows jsonb;
BEGIN
  v_mid := public.validate_session_token(p_session_token, 'member', 'list_my_vehicles', false, NULL);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', t.id, 'vtype', t.vtype, 'brand', t.brand, 'model', t.model,
           'version', t.version, 'color', t.color, 'plate', t.plate,
           'km', t.km, 'km_updated_at', t.km_updated_at,
           'oil_type', t.oil_type, 'next_service', t.next_service,
           'next_service_km', t.next_service_km,
           'last_service', t.last_service, 'last_service_km', t.last_service_km,
           'tank_gal', t.tank_gal, 'fuel_pref', t.fuel_pref,
           'alerts_muted', t.alerts_muted,
           'last_fuel_at', t.last_fuel_at, 'created_at', t.created_at
         ) ORDER BY t.last_fuel_at DESC NULLS LAST, t.created_at ASC), '[]'::jsonb)
    INTO v_rows
  FROM vehicles t
  WHERE t.member_id = v_mid;

  RETURN jsonb_build_object('ok', true, 'beta', true, 'vehicles', v_rows);
END;
$function$;

-- save_my_vehicle: + alerts_muted en la whitelist (misma validación del
-- resto de campos, 20260902c)
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
  v_muted   boolean;
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

  -- D24: silencio de recordatorios de ESTE vehículo (ausente = false)
  v_muted := COALESCE((NULLIF(p_vehicle->>'alerts_muted', ''))::boolean, false);

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
    INSERT INTO vehicles (member_id, vtype, brand, model, version, color, plate, km, km_updated_at, oil_type, next_service, next_service_km, tank_gal, fuel_pref, alerts_muted)
    VALUES (
      v_mid, v_vtype,
      NULLIF(p_vehicle->>'brand', ''), NULLIF(p_vehicle->>'model', ''),
      NULLIF(p_vehicle->>'version', ''), v_color,
      NULLIF(p_vehicle->>'plate', ''), v_km,
      CASE WHEN v_km IS NULL THEN NULL ELSE now() END,
      NULLIF(p_vehicle->>'oil_type', ''), v_next, v_next_km, v_tank, v_fuel, v_muted
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
      alerts_muted = v_muted,
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
    'last_service', v_row.last_service, 'last_service_km', v_row.last_service_km,
    'tank_gal', v_row.tank_gal, 'fuel_pref', v_row.fuel_pref,
    'alerts_muted', v_row.alerts_muted,
    'last_fuel_at', v_row.last_fuel_at, 'created_at', v_row.created_at
  ));
END;
$function$;

-- confirm_my_vehicle_service: mismo cuerpo del 20260903_f6e4, payload
-- de vuelta con alerts_muted
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
    'alerts_muted', v_row.alerts_muted,
    'last_fuel_at', v_row.last_fuel_at, 'created_at', v_row.created_at
  ));
END;
$function$;

-- ── 3. candidatos: umbrales de la config + sin silenciados ────
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
  WITH cfg AS (
    SELECT COALESCE((value->>'days')::integer, 7) AS days,
           COALESCE((value->>'km')::integer, 500)  AS km
    FROM program_config WHERE key = 'service_alerts'
    UNION ALL SELECT 7, 500
    LIMIT 1
  )
  SELECT v.member_id, v.id,
         COALESCE(NULLIF(trim(concat_ws(' ', v.brand, v.model)), ''), 'tu vehículo'),
         'fecha'::text,
         (v.next_service - current_date)::integer,
         NULL::integer,
         v.next_service, v.next_service_km
  FROM vehicles v, cfg
  WHERE v.next_service IS NOT NULL
    AND NOT v.alerts_muted
    AND (v.next_service - current_date) <= cfg.days
  UNION ALL
  SELECT v.member_id, v.id,
         COALESCE(NULLIF(trim(concat_ws(' ', v.brand, v.model)), ''), 'tu vehículo'),
         'km'::text,
         NULL::integer,
         (v.next_service_km - v.km)::integer,
         v.next_service, v.next_service_km
  FROM vehicles v, cfg
  WHERE v.next_service_km IS NOT NULL AND v.km IS NOT NULL
    AND NOT v.alerts_muted
    AND (v.next_service_km - v.km) <= cfg.km;
$function$;
REVOKE EXECUTE ON FUNCTION public.list_vehicle_service_alerts() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_vehicle_service_alerts() TO service_role;

-- ============================================================
-- VERIFICAR tras ejecutar:
--   1. SELECT value FROM program_config WHERE key = 'service_alerts';
--      → {"days":7,"km":500,"overdue_every_days":7,"km_every_days":14}
--   2. Admin → Configuración → Alertas de servicio: cambiar días a 10 y
--      guardar → la fila cambia y admin_audit_log registra
--      update_service_alerts.
--   3. En la app, Datos y ajustes de un vehículo → apagar "Recordatorios
--      de servicio" → vehicles.alerts_muted = true y
--      list_vehicle_service_alerts() (service key) ya no lo lista.
-- ============================================================

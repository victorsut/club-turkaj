-- ============================================================
-- F6 E1.1 (15-ago-2026) — PRÓXIMO SERVICIO POR FECHA **O** POR KM
-- ============================================================
-- Pedido del dueño: hay clientes que van al servicio por FECHA y
-- otros por KILOMETRAJE ("al llegar a 50,000 km"). Nueva columna
-- vehicles.next_service_km (objetivo de odómetro); pueden convivir
-- ambos (fecha Y km) — la UI muestra el más urgente. Se recrean
-- list_my_vehicles y save_my_vehicle para incluir el campo (mismas
-- validaciones y sesión de miembro del 20260815_f6e1).
-- ============================================================

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS next_service_km integer;

-- ── list_my_vehicles: expone next_service_km ─────────────────
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
           'last_fuel_at', t.last_fuel_at, 'created_at', t.created_at
         ) ORDER BY t.last_fuel_at DESC NULLS LAST, t.created_at ASC), '[]'::jsonb)
    INTO v_rows
  FROM vehicles t
  WHERE t.member_id = v_mid;

  RETURN jsonb_build_object('ok', true, 'beta', v_beta, 'vehicles', v_rows);
END;
$function$;

-- ── save_my_vehicle: acepta y devuelve next_service_km ───────
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
    INSERT INTO vehicles (member_id, vtype, brand, model, version, color, plate, km, km_updated_at, oil_type, next_service, next_service_km)
    VALUES (
      v_mid, v_vtype,
      NULLIF(p_vehicle->>'brand', ''), NULLIF(p_vehicle->>'model', ''),
      NULLIF(p_vehicle->>'version', ''), v_color,
      NULLIF(p_vehicle->>'plate', ''), v_km,
      CASE WHEN v_km IS NULL THEN NULL ELSE now() END,
      NULLIF(p_vehicle->>'oil_type', ''), v_next, v_next_km
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
    'last_fuel_at', v_row.last_fuel_at, 'created_at', v_row.created_at
  ));
END;
$function$;

-- ============================================================
-- VERIFICAR tras ejecutar:
--   1. save_my_vehicle con {"next_service_km": 50000} → lo persiste y
--      lo devuelve; list_my_vehicles lo incluye.
--   2. Ambos (fecha y km) pueden convivir en la misma fila.
-- ============================================================

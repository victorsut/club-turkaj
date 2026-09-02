-- ============================================================
-- F6 E3a (2-sep-2026) — HISTORIAL DE COMBUSTIBLE + REASIGNACIÓN
-- ============================================================
-- Pedido del dueño: la ventana Vehículos debe tener ANÁLISIS de
-- rendimiento por carga, historial de consumo y un editor del
-- historial — si el modal de calificación no apareció (sin
-- conexión), la carga se auto-asigna al vehículo equivocado y el
-- cliente debe poder corregirla después.
--
-- Piezas:
--   1. list_my_fuel_history — cargas recientes del miembro con su
--      vehículo asignado, estación y lectura de odómetro (base del
--      historial y del rendimiento por tramo en el cliente).
--   2. assign_purchase_vehicle — ventana de reasignación ampliada
--      de 7 a 30 días (la carga mal atribuida puede notarse días
--      después al revisar el historial).
-- ============================================================

-- ── 1. list_my_fuel_history ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.list_my_fuel_history(
  p_session_token text,
  p_limit integer DEFAULT 40
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mid  uuid;
  v_rows jsonb;
BEGIN
  v_mid := public.validate_session_token(p_session_token, 'member', 'list_my_fuel_history', false, NULL);

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    p_limit := 40;
  END IF;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT p.created_at,
           jsonb_build_object(
             'id', p.id,
             'created_at', p.created_at,
             'station_id', p.station_id,
             'station_name', s.name,
             'fuel_type', p.fuel_type,
             'gallons', round(p.gallons::numeric, 2),
             'amount', round(p.amount::numeric, 2),
             'vehicle_id', p.vehicle_id,
             'km_reading', p.km_reading
           ) AS row_data
    FROM purchases p
    LEFT JOIN stations s ON s.id = p.station_id
    WHERE p.member_id = v_mid
    ORDER BY p.created_at DESC
    LIMIT p_limit
  ) t;

  -- editable_days: ventana vigente de reasignación (el cliente
  -- deshabilita el editor en filas más viejas)
  RETURN jsonb_build_object('ok', true, 'loads', v_rows, 'editable_days', 30);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.list_my_fuel_history(text, integer) TO anon, authenticated;

-- ── 2. assign_purchase_vehicle — ventana 7 → 30 días ─────────
-- Misma firma y lógica de 20260819_f6e2; solo cambia la ventana.
CREATE OR REPLACE FUNCTION public.assign_purchase_vehicle(
  p_session_token text,
  p_purchase_id uuid,
  p_vehicle_id uuid,
  p_km integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mid uuid;
  v_p   purchases%ROWTYPE;
  v_row vehicles%ROWTYPE;
BEGIN
  v_mid := public.validate_session_token(p_session_token, 'member', 'assign_purchase_vehicle', false, NULL);

  SELECT * INTO v_p FROM purchases WHERE id = p_purchase_id AND member_id = v_mid;
  IF v_p.id IS NULL THEN
    RAISE EXCEPTION 'Compra no encontrada' USING ERRCODE = '22023';
  END IF;
  -- ventana de reasignación (E3a: 30 días — la carga mal atribuida
  -- por falta de conexión puede notarse días después en el historial)
  IF v_p.created_at < now() - interval '30 days' THEN
    RAISE EXCEPTION 'Esta compra ya no se puede reasignar' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM vehicles WHERE id = p_vehicle_id AND member_id = v_mid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehículo no encontrado' USING ERRCODE = '22023';
  END IF;

  IF p_km IS NOT NULL AND (p_km < 0 OR p_km > 2000000) THEN
    RAISE EXCEPTION 'Kilometraje fuera de rango' USING ERRCODE = '22023';
  END IF;

  UPDATE purchases SET
    vehicle_id = p_vehicle_id,
    km_reading = COALESCE(p_km, CASE WHEN vehicle_id IS DISTINCT FROM p_vehicle_id THEN NULL ELSE km_reading END)
  WHERE id = p_purchase_id;

  UPDATE vehicles SET
    last_fuel_at  = GREATEST(COALESCE(last_fuel_at, '-infinity'::timestamptz), v_p.created_at),
    km            = CASE WHEN p_km IS NOT NULL THEN p_km ELSE km END,
    km_updated_at = CASE WHEN p_km IS NOT NULL THEN now() ELSE km_updated_at END,
    updated_at    = now()
  WHERE id = p_vehicle_id
  RETURNING * INTO v_row;

  IF v_p.vehicle_id IS NOT NULL AND v_p.vehicle_id <> p_vehicle_id THEN
    UPDATE vehicles v SET
      last_fuel_at = (SELECT max(p2.created_at) FROM purchases p2 WHERE p2.vehicle_id = v.id),
      updated_at = now()
    WHERE v.id = v_p.vehicle_id AND v.member_id = v_mid;
  END IF;

  RETURN jsonb_build_object('ok', true, 'vehicle', jsonb_build_object(
    'id', v_row.id, 'km', v_row.km, 'km_updated_at', v_row.km_updated_at,
    'last_fuel_at', v_row.last_fuel_at
  ));
END;
$function$;

GRANT EXECUTE ON FUNCTION public.assign_purchase_vehicle(text, uuid, uuid, integer) TO anon, authenticated;

-- ============================================================
-- VERIFICAR tras ejecutar:
--   1. list_my_fuel_history(<token miembro>) → { ok, loads: [...],
--      editable_days: 30 } — cada fila con id, created_at,
--      station_name, gallons, amount, vehicle_id, km_reading;
--      máx 40 filas, más recientes primero.
--   2. Reasignar una compra de 10 días → OK (antes fallaba a los 7);
--      una de >30 días → error controlado.
--   3. Como anon sin token → error de sesión en ambas.
-- ============================================================

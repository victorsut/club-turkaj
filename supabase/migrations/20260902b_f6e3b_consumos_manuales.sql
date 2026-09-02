-- ============================================================
-- F6 E3b (2-sep-2026) — CONSUMOS MANUALES (fuera de Turkaj)
-- ============================================================
-- Pedido del dueño: registrar un consumo para un vehículo aunque
-- no haya cargado en nuestras estaciones, para poder comparar el
-- rendimiento. IMPORTANTE (indicación explícita): un consumo NO
-- implica tanque lleno antes ni después — puede ser un llenado
-- PARCIAL. La telemetría lo toma en cuenta porque NUNCA asume
-- niveles de tanque: el rendimiento se calcula como km recorridos
-- entre dos lecturas de odómetro ÷ TODO el combustible registrado
-- entre ambas (compras Turkaj + consumos manuales); el nivel del
-- tanque en cada lectura solo aporta un error de borde que se
-- diluye conforme el historial crece.
--
-- Piezas:
--   1. Tabla vehicle_fuel_logs (CERRADA a la API abierta).
--   2. add_my_fuel_log / delete_my_fuel_log (sesión de miembro).
--   3. list_my_fuel_history — ahora UNE compras Turkaj y consumos
--      manuales (campo source: 'turkaj' | 'manual').
--   4. list_my_vehicle_stats — totales y rendimiento sobre la
--      UNIÓN (los galones externos cuentan entre lecturas).
-- ============================================================

-- ── 1. Tabla ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehicle_fuel_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  gallons numeric NOT NULL CHECK (gallons > 0 AND gallons <= 200),
  amount numeric CHECK (amount >= 0 AND amount <= 100000),
  km_reading integer CHECK (km_reading >= 0 AND km_reading <= 2000000),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.vehicle_fuel_logs IS
'F6-E3b: consumos de combustible registrados MANUALMENTE por el miembro (cargas fuera de Turkaj) para completar la telemetría. Puede ser llenado parcial — el rendimiento nunca asume tanque lleno.';

CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle
  ON public.vehicle_fuel_logs (vehicle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_member
  ON public.vehicle_fuel_logs (member_id, created_at DESC);

-- cerrada a la API abierta (patrón SEC.C: solo RPCs con sesión)
ALTER TABLE public.vehicle_fuel_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vehicle_fuel_logs FROM anon, authenticated;

-- ── 2a. add_my_fuel_log ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_my_fuel_log(
  p_session_token text,
  p_vehicle_id uuid,
  p_gallons numeric,
  p_amount numeric DEFAULT NULL,
  p_km integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mid uuid;
  v_log vehicle_fuel_logs%ROWTYPE;
  v_row vehicles%ROWTYPE;
BEGIN
  v_mid := public.validate_session_token(p_session_token, 'member', 'add_my_fuel_log', false, NULL);

  PERFORM 1 FROM vehicles WHERE id = p_vehicle_id AND member_id = v_mid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehículo no encontrado' USING ERRCODE = '22023';
  END IF;
  IF p_gallons IS NULL OR p_gallons <= 0 OR p_gallons > 200 THEN
    RAISE EXCEPTION 'Galones fuera de rango' USING ERRCODE = '22023';
  END IF;
  IF p_amount IS NOT NULL AND (p_amount < 0 OR p_amount > 100000) THEN
    RAISE EXCEPTION 'Monto fuera de rango' USING ERRCODE = '22023';
  END IF;
  IF p_km IS NOT NULL AND (p_km < 0 OR p_km > 2000000) THEN
    RAISE EXCEPTION 'Kilometraje fuera de rango' USING ERRCODE = '22023';
  END IF;

  INSERT INTO vehicle_fuel_logs (member_id, vehicle_id, gallons, amount, km_reading)
  VALUES (v_mid, p_vehicle_id, round(p_gallons, 2), round(p_amount, 2), p_km)
  RETURNING * INTO v_log;

  -- el consumo manual también estampa el vehículo (PRINCIPAL del
  -- carrusel) y actualiza su odómetro si vino lectura
  UPDATE vehicles SET
    last_fuel_at  = GREATEST(COALESCE(last_fuel_at, '-infinity'::timestamptz), v_log.created_at),
    km            = CASE WHEN p_km IS NOT NULL THEN p_km ELSE km END,
    km_updated_at = CASE WHEN p_km IS NOT NULL THEN now() ELSE km_updated_at END,
    updated_at    = now()
  WHERE id = p_vehicle_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('ok', true,
    'log', jsonb_build_object('id', v_log.id, 'created_at', v_log.created_at,
      'gallons', v_log.gallons, 'amount', v_log.amount,
      'vehicle_id', v_log.vehicle_id, 'km_reading', v_log.km_reading),
    'vehicle', jsonb_build_object('id', v_row.id, 'km', v_row.km,
      'km_updated_at', v_row.km_updated_at, 'last_fuel_at', v_row.last_fuel_at));
END;
$function$;

GRANT EXECUTE ON FUNCTION public.add_my_fuel_log(text, uuid, numeric, numeric, integer) TO anon, authenticated;

-- ── 2b. delete_my_fuel_log ───────────────────────────────────
-- Un registro manual equivocado envenena la telemetría — el
-- miembro puede borrarlo (solo los SUYOS; las compras Turkaj no
-- se tocan por aquí). last_fuel_at del vehículo se recalcula.
CREATE OR REPLACE FUNCTION public.delete_my_fuel_log(
  p_session_token text,
  p_log_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mid uuid;
  v_vid uuid;
BEGIN
  v_mid := public.validate_session_token(p_session_token, 'member', 'delete_my_fuel_log', false, NULL);

  DELETE FROM vehicle_fuel_logs
  WHERE id = p_log_id AND member_id = v_mid
  RETURNING vehicle_id INTO v_vid;
  IF v_vid IS NULL THEN
    RAISE EXCEPTION 'Registro no encontrado' USING ERRCODE = '22023';
  END IF;

  UPDATE vehicles v SET
    last_fuel_at = (
      SELECT max(t.created_at) FROM (
        SELECT p.created_at FROM purchases p WHERE p.vehicle_id = v.id
        UNION ALL
        SELECT l.created_at FROM vehicle_fuel_logs l WHERE l.vehicle_id = v.id
      ) t),
    updated_at = now()
  WHERE v.id = v_vid AND v.member_id = v_mid;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.delete_my_fuel_log(text, uuid) TO anon, authenticated;

-- ── 3. list_my_fuel_history — unión Turkaj + manuales ────────
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
    SELECT u.created_at, u.row_data FROM (
      SELECT p.created_at,
             jsonb_build_object(
               'id', p.id, 'source', 'turkaj',
               'created_at', p.created_at,
               'station_id', p.station_id, 'station_name', s.name,
               'fuel_type', p.fuel_type,
               'gallons', round(p.gallons::numeric, 2),
               'amount', round(p.amount::numeric, 2),
               'vehicle_id', p.vehicle_id, 'km_reading', p.km_reading
             ) AS row_data
      FROM purchases p
      LEFT JOIN stations s ON s.id = p.station_id
      WHERE p.member_id = v_mid
      UNION ALL
      SELECT l.created_at,
             jsonb_build_object(
               'id', l.id, 'source', 'manual',
               'created_at', l.created_at,
               'station_id', NULL, 'station_name', NULL,
               'fuel_type', NULL,
               'gallons', round(l.gallons, 2),
               'amount', round(l.amount, 2),
               'vehicle_id', l.vehicle_id, 'km_reading', l.km_reading
             ) AS row_data
      FROM vehicle_fuel_logs l
      WHERE l.member_id = v_mid
    ) u
    ORDER BY u.created_at DESC
    LIMIT p_limit
  ) t;

  RETURN jsonb_build_object('ok', true, 'loads', v_rows, 'editable_days', 30);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.list_my_fuel_history(text, integer) TO anon, authenticated;

-- ── 4. list_my_vehicle_stats — telemetría sobre la UNIÓN ─────
-- Totales, lecturas de odómetro y galones-entre-lecturas incluyen
-- los consumos manuales: con llenados parciales el rendimiento
-- solo es correcto si TODO el combustible entre lecturas cuenta.
CREATE OR REPLACE FUNCTION public.list_my_vehicle_stats(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mid   uuid;
  v_out   jsonb := '{}'::jsonb;
  r       record;
  v_first record;
  v_last  record;
  v_gal   numeric;
  v_kmgal numeric;
  v_kmday numeric;
  v_days  numeric;
BEGIN
  v_mid := public.validate_session_token(p_session_token, 'member', 'list_my_vehicle_stats', false, NULL);

  FOR r IN
    SELECT f.vehicle_id AS vid,
           count(*) AS n,
           round(sum(f.gallons)::numeric, 2) AS gal,
           round(sum(COALESCE(f.amount, 0))::numeric, 2) AS amt,
           max(f.created_at) AS last_at
    FROM (
      SELECT p.vehicle_id, p.created_at, p.gallons, p.amount FROM purchases p WHERE p.vehicle_id IS NOT NULL
      UNION ALL
      SELECT l.vehicle_id, l.created_at, l.gallons, l.amount FROM vehicle_fuel_logs l
    ) f
    JOIN vehicles v ON v.id = f.vehicle_id
    WHERE v.member_id = v_mid
    GROUP BY f.vehicle_id
  LOOP
    v_kmgal := NULL; v_kmday := NULL;

    SELECT km_reading, created_at INTO v_first
    FROM (
      SELECT p.km_reading, p.created_at FROM purchases p WHERE p.vehicle_id = r.vid AND p.km_reading IS NOT NULL
      UNION ALL
      SELECT l.km_reading, l.created_at FROM vehicle_fuel_logs l WHERE l.vehicle_id = r.vid AND l.km_reading IS NOT NULL
    ) k ORDER BY created_at ASC LIMIT 1;

    SELECT km_reading, created_at INTO v_last
    FROM (
      SELECT p.km_reading, p.created_at FROM purchases p WHERE p.vehicle_id = r.vid AND p.km_reading IS NOT NULL
      UNION ALL
      SELECT l.km_reading, l.created_at FROM vehicle_fuel_logs l WHERE l.vehicle_id = r.vid AND l.km_reading IS NOT NULL
    ) k ORDER BY created_at DESC LIMIT 1;

    IF v_first.km_reading IS NOT NULL AND v_last.km_reading IS NOT NULL
       AND v_last.created_at > v_first.created_at
       AND v_last.km_reading > v_first.km_reading THEN
      SELECT COALESCE(sum(gallons), 0) INTO v_gal
      FROM (
        SELECT p.gallons, p.created_at FROM purchases p WHERE p.vehicle_id = r.vid
        UNION ALL
        SELECT l.gallons, l.created_at FROM vehicle_fuel_logs l WHERE l.vehicle_id = r.vid
      ) g
      WHERE g.created_at > v_first.created_at
        AND g.created_at <= v_last.created_at;
      IF v_gal > 0 THEN
        v_kmgal := round((v_last.km_reading - v_first.km_reading) / v_gal, 1);
      END IF;
      v_days := EXTRACT(EPOCH FROM (v_last.created_at - v_first.created_at)) / 86400.0;
      IF v_days >= 1 THEN
        v_kmday := round((v_last.km_reading - v_first.km_reading) / v_days, 1);
      END IF;
    END IF;

    v_out := v_out || jsonb_build_object(r.vid::text, jsonb_build_object(
      'fuel_count', r.n,
      'total_gallons', r.gal,
      'total_amount', r.amt,
      'last_fuel_at', r.last_at,
      'km_per_gal', v_kmgal,
      'km_per_day', v_kmday
    ));
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'stats', v_out);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.list_my_vehicle_stats(text) TO anon, authenticated;

-- ============================================================
-- VERIFICAR tras ejecutar:
--   1. add_my_fuel_log(<token>, <vehículo>, 8.5, 320, 45900) →
--      { ok, log, vehicle } — el vehículo actualiza km y
--      last_fuel_at (pasa a PRINCIPAL si es el más reciente).
--   2. list_my_fuel_history → la fila manual aparece con
--      source='manual' y sin estación, intercalada por fecha.
--   3. list_my_vehicle_stats → total_gallons/fuel_count incluyen
--      el manual; km/gal usa los galones de AMBAS fuentes entre
--      lecturas de odómetro.
--   4. delete_my_fuel_log(<token>, <log de otro miembro>) →
--      error controlado; con el propio → ok y last_fuel_at
--      recalculado.
--   5. Como anon: SELECT/INSERT directo a vehicle_fuel_logs
--      denegado.
-- ============================================================

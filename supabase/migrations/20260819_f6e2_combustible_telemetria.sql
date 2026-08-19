-- ============================================================
-- F6 ETAPA 2 (19-ago-2026) — COMBUSTIBLE + TELEMETRÍA
-- ============================================================
-- Decisiones del dueño (15-ago): el km lo ingresa el CLIENTE al
-- asignar combustible; la asignación vive en el modal de
-- calificación (reabrible por push/campanita); si ignora todo,
-- la carga va AUTOMÁTICA al último vehículo usado.
--
-- Piezas:
--   1. purchases.vehicle_id + purchases.km_reading (cerradas a la
--      API abierta — los grants por columna de SEC.C.2 no las
--      incluyen; todo viaja por RPCs con sesión).
--   2. TRIGGER de auto-asignación al insertar la compra (cubre el
--      flujo del operador Y el de PROPER sin tocar
--      register_purchase_core) + estampado de vehicles.last_fuel_at
--      (define el PRINCIPAL del carrusel).
--   3. assign_purchase_vehicle — el cliente confirma/cambia el
--      vehículo de una compra y opcionalmente reporta el odómetro
--      (ventana de 7 días; todo validado como SUYO).
--   4. list_my_vehicle_stats — telemetría por vehículo: cargas,
--      galones, Q, rendimiento (km/gal) y ritmo (km/día) para la
--      predicción del próximo servicio por km.
--
-- NOTA: members.vehicles (jsonb) sigue intacto (wizard/Mi Cuenta);
-- la unificación queda para una etapa aparte (E2b).
-- ============================================================

-- ── 1. Columnas ──────────────────────────────────────────────
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS km_reading integer;

COMMENT ON COLUMN public.purchases.vehicle_id IS
'F6-E2: vehículo al que se asignó la carga. Auto = último usado (trigger); el cliente puede cambiarlo desde el modal de calificación (assign_purchase_vehicle).';
COMMENT ON COLUMN public.purchases.km_reading IS
'F6-E2: lectura de odómetro reportada por el cliente AL ASIGNAR la carga (base del rendimiento km/gal).';

CREATE INDEX IF NOT EXISTS idx_purchases_vehicle
  ON public.purchases (vehicle_id, created_at DESC)
  WHERE vehicle_id IS NOT NULL;

-- ── 2. Triggers: auto-asignación + last_fuel_at ──────────────
-- BEFORE INSERT: si la compra no trae vehículo, va al último usado
-- del miembro (last_fuel_at DESC = el PRINCIPAL). Si no tiene
-- vehículos queda NULL (sin efecto).
CREATE OR REPLACE FUNCTION public.purchases_auto_vehicle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.member_id IS NOT NULL AND NEW.vehicle_id IS NULL THEN
    SELECT v.id INTO NEW.vehicle_id
    FROM vehicles v
    WHERE v.member_id = NEW.member_id
    ORDER BY v.last_fuel_at DESC NULLS LAST, v.created_at ASC
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_purchases_auto_vehicle ON public.purchases;
CREATE TRIGGER trg_purchases_auto_vehicle
  BEFORE INSERT ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.purchases_auto_vehicle();

-- AFTER INSERT: la carga estampa last_fuel_at del vehículo asignado
-- (nunca retrocede — GREATEST protege contra inserts con fecha vieja).
CREATE OR REPLACE FUNCTION public.purchases_stamp_fuel()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.vehicle_id IS NOT NULL THEN
    UPDATE vehicles SET
      last_fuel_at = GREATEST(COALESCE(last_fuel_at, '-infinity'::timestamptz),
                              COALESCE(NEW.created_at, now())),
      updated_at = now()
    WHERE id = NEW.vehicle_id;
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_purchases_stamp_fuel ON public.purchases;
CREATE TRIGGER trg_purchases_stamp_fuel
  AFTER INSERT ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.purchases_stamp_fuel();

-- ── 3. assign_purchase_vehicle ───────────────────────────────
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
  -- ventana de reasignación: el modal reabre por push/campanita los
  -- primeros días; después la telemetría queda sellada
  IF v_p.created_at < now() - interval '7 days' THEN
    RAISE EXCEPTION 'Esta compra ya no se puede reasignar' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM vehicles WHERE id = p_vehicle_id AND member_id = v_mid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehículo no encontrado' USING ERRCODE = '22023';
  END IF;

  IF p_km IS NOT NULL AND (p_km < 0 OR p_km > 2000000) THEN
    RAISE EXCEPTION 'Kilometraje fuera de rango' USING ERRCODE = '22023';
  END IF;

  -- km_reading: lo dado; si cambió de vehículo sin km nuevo, se limpia
  -- (la lectura vieja pertenecía al otro vehículo); si es el mismo, se conserva.
  UPDATE purchases SET
    vehicle_id = p_vehicle_id,
    km_reading = COALESCE(p_km, CASE WHEN vehicle_id IS DISTINCT FROM p_vehicle_id THEN NULL ELSE km_reading END)
  WHERE id = p_purchase_id;

  -- estampa el vehículo elegido (last_fuel_at nunca retrocede) y
  -- actualiza su odómetro si vino lectura
  UPDATE vehicles SET
    last_fuel_at  = GREATEST(COALESCE(last_fuel_at, '-infinity'::timestamptz), v_p.created_at),
    km            = CASE WHEN p_km IS NOT NULL THEN p_km ELSE km END,
    km_updated_at = CASE WHEN p_km IS NOT NULL THEN now() ELSE km_updated_at END,
    updated_at    = now()
  WHERE id = p_vehicle_id
  RETURNING * INTO v_row;

  -- si la compra estaba en OTRO vehículo (auto-asignada), su
  -- last_fuel_at se recalcula de sus compras restantes
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

-- ── 4. list_my_vehicle_stats — telemetría por vehículo ───────
-- Por cada vehículo del miembro: nº de cargas, galones y Q totales,
-- última carga, y —si hay ≥2 lecturas de odómetro— rendimiento
-- (km/gal con los galones cargados ENTRE ambas lecturas) y ritmo
-- (km/día) para estimar el próximo servicio por km.
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
    SELECT p.vehicle_id AS vid,
           count(*) AS n,
           round(sum(p.gallons)::numeric, 2) AS gal,
           round(sum(p.amount)::numeric, 2) AS amt,
           max(p.created_at) AS last_at
    FROM purchases p
    JOIN vehicles v ON v.id = p.vehicle_id
    WHERE v.member_id = v_mid
    GROUP BY p.vehicle_id
  LOOP
    v_kmgal := NULL; v_kmday := NULL;

    SELECT km_reading, created_at INTO v_first
    FROM purchases WHERE vehicle_id = r.vid AND km_reading IS NOT NULL
    ORDER BY created_at ASC LIMIT 1;

    SELECT km_reading, created_at INTO v_last
    FROM purchases WHERE vehicle_id = r.vid AND km_reading IS NOT NULL
    ORDER BY created_at DESC LIMIT 1;

    IF v_first.km_reading IS NOT NULL AND v_last.km_reading IS NOT NULL
       AND v_last.created_at > v_first.created_at
       AND v_last.km_reading > v_first.km_reading THEN
      -- galones cargados DESPUÉS de la primera lectura y hasta la última
      SELECT COALESCE(sum(gallons), 0) INTO v_gal
      FROM purchases
      WHERE vehicle_id = r.vid
        AND created_at > v_first.created_at
        AND created_at <= v_last.created_at;
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
--   1. Registrar una compra a un miembro CON vehículos →
--      purchases.vehicle_id = su vehículo principal y
--      vehicles.last_fuel_at estampado; miembro SIN vehículos →
--      vehicle_id NULL (sin error en operador ni en PROPER).
--   2. assign_purchase_vehicle(<token miembro>, <purchase>, <otro
--      vehículo>, 12345) → la compra cambia de vehículo, km y
--      km_updated_at del elegido se actualizan, y el last_fuel_at
--      del vehículo anterior se recalcula.
--   3. Con compra de OTRO miembro o >7 días → error controlado.
--   4. list_my_vehicle_stats(<token>) → { ok, stats: { <vid>:
--      { fuel_count, total_gallons, total_amount, last_fuel_at,
--        km_per_gal, km_per_day } } } — km_per_gal/km_per_day solo
--      con ≥2 lecturas de odómetro crecientes.
--   5. Como anon: SELECT vehicle_id/km_reading de purchases sigue
--      denegado (los grants por columna de SEC.C.2 no las incluyen).
-- ============================================================

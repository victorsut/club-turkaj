-- ============================================================
-- F6 ROLLOUT — Vehículos para TODOS los socios (4-sep-2026)
-- ============================================================
-- Decisión del dueño (4-sep): "la ventana sí va para todos". Se
-- retira la BETA controlada de la E1 (15-ago): list_my_vehicles deja
-- de consultar program_config('vehicles_beta') y la tabla
-- vehicles_beta; se eliminan las RPCs de gestión de la beta y la
-- tarjeta de Admin → Configuración que las usaba (mismo commit).
-- El frontend monta VehiclesHome directo (VehiclesScreen sustituye
-- al placeholder VehiclesSoon).
--
-- Además: limpieza de la placa DUPLICADA del socio de pruebas
-- "Fulano de tal" (dos filas ABC123 heredadas del backfill del 3-sep).
-- ============================================================

-- ── 1. list_my_vehicles sin compuerta ─────────────────────────
-- Se conserva 'beta': true en el payload SOLO por compatibilidad con
-- clientes que aún tengan cacheado el placeholder VehiclesSoon (leía
-- data.beta); ningún código nuevo lo consume. Retirarlo en una
-- migración posterior.
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
           'last_fuel_at', t.last_fuel_at, 'created_at', t.created_at
         ) ORDER BY t.last_fuel_at DESC NULLS LAST, t.created_at ASC), '[]'::jsonb)
    INTO v_rows
  FROM vehicles t
  WHERE t.member_id = v_mid;

  RETURN jsonb_build_object('ok', true, 'beta', true, 'vehicles', v_rows);
END;
$function$;

-- ── 2. retirar la gestión de la beta ──────────────────────────
DROP FUNCTION IF EXISTS public.admin_set_vehicles_beta(text, uuid, boolean, boolean, uuid, text, text, text);
DROP FUNCTION IF EXISTS public.admin_list_vehicles_beta(text);
DROP TABLE IF EXISTS public.vehicles_beta;
DELETE FROM public.program_config WHERE key = 'vehicles_beta';

-- ── 3. placa duplicada de "Fulano de tal" ─────────────────────
-- Conserva la fila más antigua (por created_at, luego id) de cada
-- (socio, placa) y borra las repetidas. Hoy solo afecta ABC123 del
-- socio de pruebas; las compras ligadas a la fila borrada (ninguna)
-- quedarían con vehicle_id NULL por el FK SET NULL.
DELETE FROM public.vehicles v
 USING (
   SELECT id, row_number() OVER (
            PARTITION BY member_id, public.plate_norm(plate)
            ORDER BY created_at ASC, id ASC) AS rn
     FROM public.vehicles
    WHERE NULLIF(trim(plate), '') IS NOT NULL
 ) d
 WHERE d.id = v.id AND d.rn > 1;

-- ============================================================
-- VERIFICAR tras ejecutar:
--   1. SELECT count(*) FROM vehicles WHERE public.plate_norm(plate) = 'ABC123';  → 1
--   2. SELECT to_regclass('public.vehicles_beta');  → NULL
--   3. SELECT key FROM program_config WHERE key = 'vehicles_beta';  → 0 filas
--   4. En la PWA, cualquier socio (no beta) abre la pestaña Vehículos
--      y ve la ventana real, no PRÓXIMAMENTE.
-- ============================================================

-- ============================================================
-- F6 E2b.2 — REPARACIÓN del backfill de 20260903b (3-sep-2026)
-- ============================================================
-- ERROR de la migración anterior (asumido por Claude): el backfill
-- reconcilió la tabla desde el jsonb (paso D.2) ANTES de igualar el
-- espejo tabla→jsonb (paso D.3). Como el jsonb estaba DESACTUALIZADO
-- (no traía los vehículos agregados desde la ventana Vehículos), la
-- regla "placa que el jsonb ya no trae → borrar" ELIMINÓ 2 vehículos:
--   · Ezer Adbeel Morales González — Hero Eco Deluxe, placa M673JSH
--     (3 compras del 27/28-ago quedaron sin vehículo por el FK SET NULL)
--   · Fernando Morales — Hero Eco 100, placa M425DKD (sin compras)
-- Perdido sin recuperación: color, km, aceite, próximo servicio,
-- tanque y combustible habitual de ambos (el socio debe reingresarlos).
--
-- Esta migración: (1) endurece la regla de borrado — SOLO se borran
-- filas "legadas" (sin marca/modelo/telemetría); una ficha completa
-- nunca se borra por un jsonb; (2) recrea ambos vehículos; (3) re-liga
-- las 3 compras de Ezer y restaura su last_fuel_at.
-- ============================================================

-- ── 1. regla de borrado endurecida ───────────────────────────
CREATE OR REPLACE FUNCTION public.vehicles_sync_from_json(p_member_id uuid, p_json jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_json jsonb := public.vehicles_json_norm(p_json);
  e      jsonb;
  v_type text;
  v_plate text;
BEGIN
  IF p_member_id IS NULL THEN RETURN; END IF;

  -- placas del jsonb que faltan en la tabla → INSERT (ficha mínima)
  FOR e IN SELECT x FROM jsonb_array_elements(v_json) x WHERE jsonb_typeof(x) = 'object' LOOP
    v_plate := NULLIF(trim(e->>'plate'), '');
    IF v_plate IS NULL THEN CONTINUE; END IF;
    v_type := COALESCE(NULLIF(e->>'type', ''), 'liviano');
    IF v_type NOT IN ('camion','camion_ligero','picop','microbus','liviano','mototaxi','moto','otro') THEN
      v_type := 'liviano';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM vehicles v
                    WHERE v.member_id = p_member_id AND public.plate_norm(v.plate) = public.plate_norm(v_plate)) THEN
      INSERT INTO vehicles (member_id, vtype, plate) VALUES (p_member_id, v_type, v_plate);
    ELSE
      UPDATE vehicles v SET vtype = v_type, updated_at = now()
       WHERE v.member_id = p_member_id AND public.plate_norm(v.plate) = public.plate_norm(v_plate)
         AND v.brand IS NULL AND v.model IS NULL AND v.vtype IS DISTINCT FROM v_type;
    END IF;
  END LOOP;

  -- Solo se borran filas LEGADAS (sin marca, modelo ni telemetría) cuya
  -- placa el jsonb ya no trae. Una ficha completa de la ventana
  -- Vehículos NUNCA se borra desde el jsonb (lección del 3-sep).
  DELETE FROM vehicles v
   WHERE v.member_id = p_member_id
     AND NULLIF(trim(v.plate), '') IS NOT NULL
     AND v.brand IS NULL AND v.model IS NULL
     AND v.last_fuel_at IS NULL AND v.km IS NULL
     AND v.next_service IS NULL AND v.next_service_km IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_array_elements(v_json) x
        WHERE jsonb_typeof(x) = 'object'
          AND public.plate_norm(x->>'plate') = public.plate_norm(v.plate)
     );
END;
$function$;

-- ── 2. recrear los dos vehículos borrados ─────────────────────
INSERT INTO public.vehicles (member_id, vtype, brand, model, plate, created_at)
SELECT '7b448d64-d3a4-40f3-a86f-cdb674435ae9', 'moto', 'Hero', 'Eco Deluxe', 'M673JSH', '2026-08-27 22:00:00+00'
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE member_id = '7b448d64-d3a4-40f3-a86f-cdb674435ae9' AND public.plate_norm(plate) = 'M673JSH');

INSERT INTO public.vehicles (member_id, vtype, brand, model, plate, created_at)
SELECT 'cbdbe06d-b53b-4a55-b9cc-a2abade10b1f', 'moto', 'Hero', 'Eco 100', 'M425DKD', now()
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE member_id = 'cbdbe06d-b53b-4a55-b9cc-a2abade10b1f' AND public.plate_norm(plate) = 'M425DKD');

-- ── 3. re-ligar las 3 compras de Ezer y restaurar last_fuel_at ─
UPDATE public.purchases p
   SET vehicle_id = (SELECT id FROM vehicles WHERE member_id = '7b448d64-d3a4-40f3-a86f-cdb674435ae9' AND public.plate_norm(plate) = 'M673JSH' LIMIT 1)
 WHERE p.id IN ('cbcda2eb-bbb1-49f2-a5c0-f4c05b8b1734', 'f4cf70a6-1dfc-4987-b516-d7c472eceaf8', '71a6fb55-875b-4ae2-a322-6fa9e6dd4e30')
   AND p.vehicle_id IS NULL;

UPDATE public.vehicles v
   SET last_fuel_at = (SELECT max(created_at) FROM purchases p WHERE p.vehicle_id = v.id)
 WHERE v.member_id = '7b448d64-d3a4-40f3-a86f-cdb674435ae9' AND public.plate_norm(v.plate) = 'M673JSH';

-- ============================================================
-- VERIFICAR tras ejecutar:
--   1. SELECT brand, model, plate, last_fuel_at FROM vehicles
--      WHERE plate IN ('M673JSH','M425DKD');  → 2 filas, la primera
--      con last_fuel_at = 2026-08-28 15:46
--   2. SELECT count(*) FROM purchases WHERE vehicle_id IS NULL AND
--      member_id = '7b448d64-...' AND created_at >= '2026-08-19';  → 0
--   3. get_my_member de Ezer → vehicles = [Eco Deluxe (principal), Navi]
--   4. Pedir a Ezer y a Fernando que reingresen color, km, aceite y
--      próximo servicio en la ventana Vehículos.
-- ============================================================

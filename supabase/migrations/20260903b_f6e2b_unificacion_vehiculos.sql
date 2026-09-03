-- ============================================================
-- F6 E2b — UNIFICACIÓN de vehículos: la TABLA `vehicles` es la
-- fuente de verdad y `members.vehicles` (jsonb legado) queda como
-- ESPEJO derivado (3-sep-2026). Prerrequisito del rollout de la
-- ventana Vehículos a todos los socios.
-- ============================================================
-- Situación al 3-sep: 30 socios; 7 con vehículos en el jsonb (todos
-- ya copiados a la tabla por el seed de 20260815_f6e1, salvo UN socio
-- cuyo jsonb quedó guardado como TEXTO doblemente codificado y el seed
-- lo saltó); la tabla tiene además 2 vehículos de la beta que el jsonb
-- no refleja. Escritores del jsonb hoy: register_member (wizard),
-- update_my_profile (Mi cuenta → Vehículos) y update_member_with_audit
-- (admin). Lectores: get_my_member, reportes (vehicles->0->>'type'),
-- ficha del admin y el placeholder "Próximamente".
--
-- Diseño (sin tocar esos RPCs ni el frontend):
--   A. vehicles_json_norm(jsonb): normaliza el jsonb (array; el caso
--      texto doble-codificado se decodifica).
--   B. Trigger en members (AFTER INSERT / UPDATE OF vehicles, solo a
--      profundidad 1): RECONCILIA la tabla desde el jsonb — inserta
--      placas nuevas, borra filas cuya placa ya no está (las filas SIN
--      placa nunca se tocan: no son representables en el jsonb).
--   C. Trigger en vehicles (AFTER INSERT/UPDATE/DELETE): reconstruye el
--      ESPEJO members.vehicles (+ members.plate = placa del principal)
--      a partir de la tabla, en el orden del principal (last_fuel_at).
--   D. Backfill único: decodifica el texto, reconcilia e iguala espejos.
-- Sin bucles: B se salta cuando lo dispara C (pg_trigger_depth() > 1) y
-- C solo escribe si el espejo cambia.
-- ============================================================

-- ── A. normalizador del jsonb legado ─────────────────────────
CREATE OR REPLACE FUNCTION public.vehicles_json_norm(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  v jsonb := p;
BEGIN
  IF v IS NULL THEN RETURN '[]'::jsonb; END IF;
  -- texto doblemente codificado: '"[{\"type\":...}]"'
  IF jsonb_typeof(v) = 'string' THEN
    BEGIN
      v := (v #>> '{}')::jsonb;
    EXCEPTION WHEN others THEN
      RETURN '[]'::jsonb;
    END;
  END IF;
  -- objeto {"0": {...}, "1": {...}} → array de sus valores
  IF jsonb_typeof(v) = 'object' THEN
    SELECT COALESCE(jsonb_agg(x.value), '[]'::jsonb) INTO v FROM jsonb_each(v) x;
  END IF;
  IF jsonb_typeof(v) <> 'array' THEN RETURN '[]'::jsonb; END IF;
  RETURN v;
END;
$function$;

-- placa comparable: solo letras y dígitos, en mayúsculas
CREATE OR REPLACE FUNCTION public.plate_norm(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT upper(regexp_replace(COALESCE(p, ''), '[^A-Za-z0-9]', '', 'g'));
$function$;

-- ── C. espejo tabla → members.vehicles / members.plate ────────
CREATE OR REPLACE FUNCTION public.vehicles_mirror_to_member(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_json  jsonb;
  v_plate text;
BEGIN
  IF p_member_id IS NULL OR NOT EXISTS (SELECT 1 FROM members WHERE id = p_member_id) THEN
    RETURN; -- cascada de borrado del socio: nada que reflejar
  END IF;
  -- Solo vehículos CON placa (el jsonb legado exige placa); orden =
  -- principal primero (último que cargó combustible), luego antigüedad.
  SELECT COALESCE(jsonb_agg(jsonb_build_object('type', t.vtype, 'plate', t.plate)
                            ORDER BY t.last_fuel_at DESC NULLS LAST, t.created_at ASC), '[]'::jsonb),
         (array_agg(t.plate ORDER BY t.last_fuel_at DESC NULLS LAST, t.created_at ASC))[1]
    INTO v_json, v_plate
  FROM vehicles t
  WHERE t.member_id = p_member_id AND NULLIF(trim(t.plate), '') IS NOT NULL;

  UPDATE members
     SET vehicles = v_json,
         plate    = v_plate
   WHERE id = p_member_id
     AND (vehicles IS DISTINCT FROM v_json OR plate IS DISTINCT FROM v_plate);
END;
$function$;

CREATE OR REPLACE FUNCTION public.vehicles_mirror_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.vehicles_mirror_to_member(OLD.member_id);
    RETURN OLD;
  END IF;
  PERFORM public.vehicles_mirror_to_member(NEW.member_id);
  IF TG_OP = 'UPDATE' AND NEW.member_id IS DISTINCT FROM OLD.member_id THEN
    PERFORM public.vehicles_mirror_to_member(OLD.member_id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_vehicles_mirror ON public.vehicles;
CREATE TRIGGER trg_vehicles_mirror
AFTER INSERT OR DELETE OR UPDATE OF vtype, plate, last_fuel_at, member_id ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.vehicles_mirror_trigger();

-- ── B. reconciliar la tabla desde el jsonb legado ─────────────
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

  -- 1. placas del jsonb que faltan en la tabla → INSERT (ficha mínima)
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
      -- el tipo solo se corrige en filas "legadas" (sin marca/modelo):
      -- una ficha completa de la ventana Vehículos manda sobre el jsonb
      UPDATE vehicles v SET vtype = v_type, updated_at = now()
       WHERE v.member_id = p_member_id AND public.plate_norm(v.plate) = public.plate_norm(v_plate)
         AND v.brand IS NULL AND v.model IS NULL AND v.vtype IS DISTINCT FROM v_type;
    END IF;
  END LOOP;

  -- 2. filas CON placa que el jsonb ya no trae → el socio (o el admin)
  --    las quitó. Las filas SIN placa no se tocan.
  DELETE FROM vehicles v
   WHERE v.member_id = p_member_id
     AND NULLIF(trim(v.plate), '') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_array_elements(v_json) x
        WHERE jsonb_typeof(x) = 'object'
          AND public.plate_norm(x->>'plate') = public.plate_norm(v.plate)
     );
END;
$function$;

CREATE OR REPLACE FUNCTION public.members_sync_vehicles_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Disparado por el espejo (C) → ya está consistente, no reconciliar
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.vehicles IS NOT DISTINCT FROM OLD.vehicles THEN RETURN NEW; END IF;
  PERFORM public.vehicles_sync_from_json(NEW.id, NEW.vehicles);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_members_sync_vehicles ON public.members;
CREATE TRIGGER trg_members_sync_vehicles
AFTER INSERT OR UPDATE OF vehicles ON public.members
FOR EACH ROW EXECUTE FUNCTION public.members_sync_vehicles_trigger();

-- ── D. backfill único ─────────────────────────────────────────
-- 1. decodificar los jsonb guardados como texto/objeto
UPDATE members
   SET vehicles = public.vehicles_json_norm(vehicles)
 WHERE vehicles IS NOT NULL AND jsonb_typeof(vehicles) <> 'array';
-- (ese UPDATE ya dispara B para esos socios)

-- 2. reconciliar a TODOS (idempotente: solo inserta placas faltantes)
DO $do$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, vehicles FROM members WHERE vehicles IS NOT NULL LOOP
    PERFORM public.vehicles_sync_from_json(r.id, r.vehicles);
  END LOOP;
END;
$do$;

-- 3. igualar el espejo de todos los socios con filas en la tabla
DO $do$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT member_id FROM vehicles LOOP
    PERFORM public.vehicles_mirror_to_member(r.member_id);
  END LOOP;
END;
$do$;

-- ============================================================
-- VERIFICAR tras ejecutar:
--   1. SELECT count(*) FROM members WHERE vehicles IS NOT NULL AND
--      jsonb_typeof(vehicles) <> 'array';   → 0
--   2. Ningún vehículo del jsonb sin fila en la tabla y viceversa
--      (para filas con placa):
--      SELECT m.id FROM members m, jsonb_array_elements(m.vehicles) e
--       WHERE NOT EXISTS (SELECT 1 FROM vehicles v WHERE v.member_id=m.id
--         AND plate_norm(v.plate)=plate_norm(e->>'plate'));   → 0 filas
--   3. Agregar un vehículo desde Mi cuenta → Vehículos (jsonb) → aparece
--      en vehicles; borrarlo ahí → desaparece de vehicles.
--   4. Agregar/editar desde la ventana Vehículos (beta) → el jsonb del
--      socio (get_my_member) lo refleja y members.plate = placa del
--      principal.
--   5. Registrar un socio nuevo con vehículo en el wizard → fila en
--      vehicles al instante.
-- ============================================================

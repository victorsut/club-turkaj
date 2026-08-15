-- ============================================================
-- F6 ETAPA 1 (15-ago-2026) — VEHÍCULOS COMO ENTIDAD + BETA
-- ============================================================
-- Los vehículos dejan de ser jsonb mínimo ({type, plate} en
-- members.vehicles) y pasan a TABLA propia con la ficha completa:
-- marca/modelo/versión, color de la ilustración, kilometraje,
-- aceite y próximo servicio. Acceso SOLO por RPCs con sesión de
-- miembro (patrón SEC.C — la tabla queda cerrada a la API abierta).
--
-- BETA CONTROLADA (pedido del dueño 15-ago): la ventana nueva del
-- cliente solo se habilita para miembros de una lista en
-- program_config('vehicles_beta') — la decisión la toma el SERVER
-- (list_my_vehicles devuelve beta:true/false; la lista nunca viaja
-- al cliente). El resto sigue viendo el placeholder PRÓXIMAMENTE.
-- Gestión de la lista desde Admin → Configuración (RPC auditado).
--
-- NOTA de compatibilidad: members.vehicles (jsonb) NO se toca —
-- el wizard de registro y Mi Cuenta siguen escribiendo ahí hasta
-- el rollout general (la unificación llega con la E2). El seed
-- copia los jsonb existentes a la tabla una sola vez (idempotente
-- por member_id+plate).
--
-- E2 (futuro): purchases.vehicle_id + lecturas de km por compra.
-- ============================================================

-- ── 1. Tabla ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehicles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  vtype         text NOT NULL DEFAULT 'liviano',   -- catálogo VEHICLE_TYPES del frontend
  brand         text,                              -- marca (catálogo híbrido D23: sugerida o libre)
  model         text,                              -- modelo/línea
  version       text,                              -- versión/año
  color         text,                              -- hex de la ilustración (#RRGGBB)
  plate         text,                              -- placa cruda (P123ABC — el display formatea)
  km            integer,                           -- última lectura de odómetro
  km_updated_at timestamptz,                       -- cuándo se leyó
  oil_type      text,                              -- tipo de aceite que usa
  next_service  date,                              -- próximo servicio (manual en E1)
  last_fuel_at  timestamptz,                       -- última asignación de combustible (E2) → define el PRINCIPAL
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_member ON public.vehicles (member_id, last_fuel_at DESC NULLS LAST);

COMMENT ON TABLE public.vehicles IS
'F6-E1 (15-ago-2026): ficha completa de vehículos del miembro. Cerrada a la API abierta — lectura/escritura SOLO por RPCs con sesión de miembro (list_my_vehicles / save_my_vehicle / delete_my_vehicle). last_fuel_at lo estampará la E2 (asignación de combustible).';

-- Cerrada a la API abierta (el event trigger auto_enable_rls ya agrega
-- la policy RESTRICTIVA deny-all a tablas nuevas; esto lo hace explícito).
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vehicles FROM anon, authenticated;

-- ── 2. Seed: copiar los jsonb existentes (una vez, idempotente) ──
INSERT INTO public.vehicles (member_id, vtype, plate, created_at)
SELECT m.id,
       COALESCE(NULLIF(v->>'type', ''), 'liviano'),
       NULLIF(v->>'plate', ''),
       now()
FROM public.members m,
     LATERAL jsonb_array_elements(
       CASE WHEN jsonb_typeof(m.vehicles) = 'array' THEN m.vehicles ELSE '[]'::jsonb END
     ) AS v
WHERE NOT EXISTS (
  SELECT 1 FROM public.vehicles ex
  WHERE ex.member_id = m.id
    AND COALESCE(ex.plate, '') = COALESCE(NULLIF(v->>'plate', ''), '')
);

-- ── 3. Beta: interruptor global + lista CERRADA de miembros ──
-- El interruptor global vive en program_config (SELECT abierto — un
-- boolean no filtra nada). La LISTA de miembros beta va en tabla
-- CERRADA a la API abierta: program_config es legible por anon y ahí
-- los uuid de los probadores quedarían expuestos.
INSERT INTO public.program_config (key, value)
VALUES ('vehicles_beta', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.vehicles_beta (
  member_id uuid PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  added_at  timestamptz NOT NULL DEFAULT now(),
  added_by  text
);
ALTER TABLE public.vehicles_beta ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vehicles_beta FROM anon, authenticated;

-- ── 4. list_my_vehicles — ficha + decisión de beta server-side ──
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
           'last_fuel_at', t.last_fuel_at, 'created_at', t.created_at
         ) ORDER BY t.last_fuel_at DESC NULLS LAST, t.created_at ASC), '[]'::jsonb)
    INTO v_rows
  FROM vehicles t
  WHERE t.member_id = v_mid;

  RETURN jsonb_build_object('ok', true, 'beta', v_beta, 'vehicles', v_rows);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.list_my_vehicles(text) TO anon, authenticated;

-- ── 5. save_my_vehicle — alta/edición con whitelist ───────────
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
  v_mid   uuid;
  v_id    uuid;
  v_count integer;
  v_vtype text;
  v_color text;
  v_km    integer;
  v_next  date;
  v_row   vehicles%ROWTYPE;
BEGIN
  v_mid := public.validate_session_token(p_session_token, 'member', 'save_my_vehicle', false, NULL);

  -- Whitelist + validaciones (el resto de campos del jsonb se ignora)
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
    INSERT INTO vehicles (member_id, vtype, brand, model, version, color, plate, km, km_updated_at, oil_type, next_service)
    VALUES (
      v_mid, v_vtype,
      NULLIF(p_vehicle->>'brand', ''), NULLIF(p_vehicle->>'model', ''),
      NULLIF(p_vehicle->>'version', ''), v_color,
      NULLIF(p_vehicle->>'plate', ''), v_km,
      CASE WHEN v_km IS NULL THEN NULL ELSE now() END,
      NULLIF(p_vehicle->>'oil_type', ''), v_next
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
      updated_at = now()
    WHERE id = v_id AND member_id = v_mid   -- solo lo SUYO
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
    'last_fuel_at', v_row.last_fuel_at, 'created_at', v_row.created_at
  ));
END;
$function$;

GRANT EXECUTE ON FUNCTION public.save_my_vehicle(text, jsonb) TO anon, authenticated;

-- ── 6. delete_my_vehicle ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_my_vehicle(
  p_session_token text,
  p_vehicle_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mid uuid;
  v_n   integer;
BEGIN
  v_mid := public.validate_session_token(p_session_token, 'member', 'delete_my_vehicle', false, NULL);
  DELETE FROM vehicles WHERE id = p_vehicle_id AND member_id = v_mid;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'Vehículo no encontrado' USING ERRCODE = '22023';
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.delete_my_vehicle(text, uuid) TO anon, authenticated;

-- ── 7. admin_set_vehicles_beta — gestión de la beta (auditada) ──
-- p_member_id + p_add: agrega/quita un miembro de la lista cerrada.
-- p_enabled (opcional): enciende/apaga el rollout GLOBAL.
CREATE OR REPLACE FUNCTION public.admin_set_vehicles_beta(
  p_session_token text,
  p_member_id uuid DEFAULT NULL,
  p_add boolean DEFAULT true,
  p_enabled boolean DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL,
  p_admin_name text DEFAULT NULL,
  p_admin_email text DEFAULT NULL,
  p_reason_text text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old jsonb;
  v_new jsonb;
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'admin_set_vehicles_beta', true, NULL);

  IF p_member_id IS NOT NULL THEN
    IF p_add THEN
      INSERT INTO vehicles_beta (member_id, added_by)
      VALUES (p_member_id, COALESCE(p_admin_name, p_admin_email))
      ON CONFLICT (member_id) DO NOTHING;
    ELSE
      DELETE FROM vehicles_beta WHERE member_id = p_member_id;
    END IF;
  END IF;

  IF p_enabled IS NOT NULL THEN
    SELECT value INTO v_old FROM program_config WHERE key = 'vehicles_beta';
    v_new := jsonb_build_object('enabled', p_enabled);
    INSERT INTO program_config (key, value) VALUES ('vehicles_beta', v_new)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  END IF;

  -- Auditoría (misma familia que el resto de config del programa).
  -- Notación NOMBRADA: no depende del orden posicional de log_admin_action.
  IF p_admin_id IS NOT NULL THEN
    PERFORM public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => 'vehicles_beta_update',
      p_entity_type => 'config',
      p_reason_text => p_reason_text,
      p_old_value   => jsonb_build_object('member_id', p_member_id, 'enabled_change', v_old),
      p_new_value   => jsonb_build_object('member_id', p_member_id, 'add', p_add, 'enabled', p_enabled)
    );
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_set_vehicles_beta(text, uuid, boolean, boolean, uuid, text, text, text) TO anon, authenticated;

-- ── 8. admin_list_vehicles_beta — lista para el panel ────────
CREATE OR REPLACE FUNCTION public.admin_list_vehicles_beta(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cfg  jsonb;
  v_rows jsonb;
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'admin_list_vehicles_beta', true, NULL);

  SELECT value INTO v_cfg FROM program_config WHERE key = 'vehicles_beta';

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'member_id', b.member_id,
           'name', m.name,
           'added_at', b.added_at
         ) ORDER BY b.added_at DESC), '[]'::jsonb)
    INTO v_rows
  FROM vehicles_beta b
  JOIN members m ON m.id = b.member_id;

  RETURN jsonb_build_object(
    'ok', true,
    'enabled', COALESCE((v_cfg->>'enabled')::boolean, false),
    'members', v_rows
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_list_vehicles_beta(text) TO anon, authenticated;

-- ============================================================
-- VERIFICAR tras ejecutar:
--   1. SELECT * FROM vehicles;  → filas seed con los jsonb migrados.
--   2. Como anon: SELECT sobre vehicles y vehicles_beta → denegado/0 filas.
--   3. list_my_vehicles(<token miembro>) → { ok, beta:false, vehicles:[...] }.
--   4. admin_set_vehicles_beta(<token admin>, '<member uuid>', true, ...) →
--      fila en vehicles_beta; list_my_vehicles de ESE miembro → beta:true;
--      admin_list_vehicles_beta(<token admin>) → lo lista con nombre.
--   5. save_my_vehicle / delete_my_vehicle con token de miembro → OK solo
--      sobre vehículos propios.
-- ============================================================

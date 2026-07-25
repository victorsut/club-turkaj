-- ============================================================
-- 20260725d — Vehículos editables desde el admin (auditados)
-- ============================================================
-- Pedido del dueño (25-jul-2026): en el panel admin los vehículos
-- del miembro se editan INDIVIDUALMENTE (agregar/editar/eliminar),
-- aparte del form de datos del usuario.
--
-- update_member_with_audit gana el campo `vehicles` en su whitelist
-- de profile: array jsonb [{type, plate}, ...] que REEMPLAZA la
-- lista completa (el cliente manda la lista resultante de la
-- operación individual). El campo legacy `plate` se sigue enviando
-- por separado (ya estaba en whitelist) = placa del primer vehículo,
-- misma convención que Mi Cuenta del cliente.
--
-- El resto del cuerpo es IDÉNTICO al vigente (SEC.B.6.1; el corte
-- strict de B.8 vive en validate_session_token y no se toca).
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_member_with_audit(p_member_id uuid, p_admin_id uuid, p_admin_name text, p_admin_email text, p_reason_text text, p_changes jsonb, p_session_token text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_profile_whitelist text[] := ARRAY[
    'name', 'phone', 'dpi', 'plate', 'email', 'nit', 'birthday', 'vehicles'
  ];
  v_member      public.members%ROWTYPE;
  v_profile     jsonb := p_changes -> 'profile';
  v_has_profile boolean;
  v_has_points  boolean := p_changes ? 'points';
  v_has_gallons boolean := p_changes ? 'gallons';
  v_key         text;
  v_top_key     text;
  v_old_profile jsonb;
  v_old_points  jsonb;
  v_old_gallons jsonb;
  v_logs        uuid[] := ARRAY[]::uuid[];
  v_cats        text[] := ARRAY[]::text[];
  v_log_id      uuid;
  v_bad_vehicles integer;
  v_session_role_id uuid;
BEGIN
  -- SEC.B.6.1: validación de sesión (modo warn — registra, no bloquea).
  v_session_role_id := public.validate_session_token(
    p_session_token, 'admin', 'update_member_with_audit', false,
    jsonb_build_object('member_id', p_member_id, 'admin_id', p_admin_id)
  );

  -- ── Validacion 1: parametros obligatorios ───────────────────
  IF p_member_id IS NULL THEN
    RAISE EXCEPTION 'member_id es obligatorio' USING ERRCODE = '22023';
  END IF;
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es obligatorio' USING ERRCODE = '22023';
  END IF;
  IF p_reason_text IS NULL OR trim(p_reason_text) = '' THEN
    RAISE EXCEPTION 'reason_text es obligatorio' USING ERRCODE = '22023';
  END IF;
  IF p_changes IS NULL OR jsonb_typeof(p_changes) <> 'object' THEN
    RAISE EXCEPTION 'changes debe ser un objeto JSON no nulo' USING ERRCODE = '22023';
  END IF;

  -- ── Validacion 2: solo categorias conocidas en el top-level ──
  FOR v_top_key IN SELECT jsonb_object_keys(p_changes) LOOP
    IF v_top_key NOT IN ('profile', 'points', 'gallons') THEN
      RAISE EXCEPTION 'Categoria "%" no permitida (solo profile, points, gallons)', v_top_key
        USING ERRCODE = '22023';
    END IF;
  END LOOP;

  -- ── Validacion 3: tipos por categoria ───────────────────────
  IF p_changes ? 'profile' AND jsonb_typeof(v_profile) <> 'object' THEN
    RAISE EXCEPTION 'changes.profile debe ser un objeto JSON' USING ERRCODE = '22023';
  END IF;
  IF v_has_points AND jsonb_typeof(p_changes -> 'points') <> 'number' THEN
    RAISE EXCEPTION 'changes.points debe ser un numero' USING ERRCODE = '22023';
  END IF;
  IF v_has_gallons AND jsonb_typeof(p_changes -> 'gallons') <> 'number' THEN
    RAISE EXCEPTION 'changes.gallons debe ser un numero' USING ERRCODE = '22023';
  END IF;

  -- profile cuenta como cambio solo si es un objeto con >= 1 clave
  v_has_profile := (p_changes ? 'profile')
                   AND jsonb_typeof(v_profile) = 'object'
                   AND v_profile <> '{}'::jsonb;

  -- ── Validacion 4: al menos una categoria valida ─────────────
  IF NOT (v_has_profile OR v_has_points OR v_has_gallons) THEN
    RAISE EXCEPTION 'changes no contiene ninguna categoria valida con cambios' USING ERRCODE = '22023';
  END IF;

  -- ── Validacion 5: whitelist estricta de campos en profile ───
  IF v_has_profile THEN
    FOR v_key IN SELECT jsonb_object_keys(v_profile) LOOP
      IF NOT (v_key = ANY(v_profile_whitelist)) THEN
        RAISE EXCEPTION 'Campo "%" no permitido en profile', v_key USING ERRCODE = '22023';
      END IF;
    END LOOP;
  END IF;

  -- ── Validacion 5b (25-jul): vehicles = array de {type, plate} ─
  IF v_has_profile AND v_profile ? 'vehicles' THEN
    IF jsonb_typeof(v_profile -> 'vehicles') <> 'array' THEN
      RAISE EXCEPTION 'profile.vehicles debe ser un array JSON' USING ERRCODE = '22023';
    END IF;
    SELECT count(*) INTO v_bad_vehicles
    FROM jsonb_array_elements(v_profile -> 'vehicles') e
    WHERE jsonb_typeof(e) <> 'object'
       OR trim(COALESCE(e ->> 'plate', '')) = ''
       OR trim(COALESCE(e ->> 'type',  '')) = '';
    IF v_bad_vehicles > 0 THEN
      RAISE EXCEPTION 'Cada vehiculo debe ser un objeto con type y plate no vacios' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- ── Lectura del estado actual (y verificacion de existencia) ─
  SELECT * INTO v_member FROM public.members WHERE id = p_member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Miembro % no existe', p_member_id USING ERRCODE = '22023';
  END IF;

  -- old_value de profile SIMETRICO: solo los campos que cambian.
  v_old_profile := '{}'::jsonb;
  IF v_profile ? 'name'     THEN v_old_profile := v_old_profile || jsonb_build_object('name', v_member.name); END IF;
  IF v_profile ? 'phone'    THEN v_old_profile := v_old_profile || jsonb_build_object('phone', v_member.phone); END IF;
  IF v_profile ? 'dpi'      THEN v_old_profile := v_old_profile || jsonb_build_object('dpi', v_member.dpi); END IF;
  IF v_profile ? 'plate'    THEN v_old_profile := v_old_profile || jsonb_build_object('plate', v_member.plate); END IF;
  IF v_profile ? 'email'    THEN v_old_profile := v_old_profile || jsonb_build_object('email', v_member.email); END IF;
  IF v_profile ? 'nit'      THEN v_old_profile := v_old_profile || jsonb_build_object('nit', v_member.nit); END IF;
  IF v_profile ? 'birthday' THEN v_old_profile := v_old_profile || jsonb_build_object('birthday', v_member.birthday); END IF;
  IF v_profile ? 'vehicles' THEN v_old_profile := v_old_profile || jsonb_build_object('vehicles', COALESCE(v_member.vehicles, '[]'::jsonb)); END IF;

  v_old_points  := jsonb_build_object('points',  v_member.points);
  v_old_gallons := jsonb_build_object('gallons', v_member.gallons);

  -- ── Autoriza el trigger BEFORE UPDATE de FB.7 (cuando exista). ──
  PERFORM set_config('app.allow_points_write', 'true', true);

  -- ── UPDATE atomico (static SQL, sin EXECUTE dinamico). ──
  BEGIN
    UPDATE public.members SET
      name     = CASE WHEN v_profile ? 'name'     THEN v_profile ->> 'name'                    ELSE name     END,
      phone    = CASE WHEN v_profile ? 'phone'    THEN v_profile ->> 'phone'                   ELSE phone    END,
      dpi      = CASE WHEN v_profile ? 'dpi'      THEN v_profile ->> 'dpi'                     ELSE dpi      END,
      plate    = CASE WHEN v_profile ? 'plate'    THEN v_profile ->> 'plate'                   ELSE plate    END,
      email    = CASE WHEN v_profile ? 'email'    THEN v_profile ->> 'email'                   ELSE email    END,
      nit      = CASE WHEN v_profile ? 'nit'      THEN v_profile ->> 'nit'                     ELSE nit      END,
      birthday = CASE WHEN v_profile ? 'birthday' THEN NULLIF(v_profile ->> 'birthday', '') ELSE birthday END,
      vehicles = CASE WHEN v_profile ? 'vehicles' THEN v_profile -> 'vehicles'                 ELSE vehicles END,
      points   = CASE WHEN v_has_points  THEN (p_changes ->> 'points')::integer  ELSE points  END,
      gallons  = CASE WHEN v_has_gallons THEN (p_changes ->> 'gallons')::numeric ELSE gallons END,
      updated_at = now()
    WHERE id = p_member_id;
  EXCEPTION
    WHEN unique_violation THEN
      IF SQLERRM LIKE '%phone%' OR SQLERRM LIKE '%members_phone_key%' THEN
        RAISE EXCEPTION 'El telefono ya esta registrado para otro cliente' USING ERRCODE = '23505';
      ELSIF SQLERRM LIKE '%dpi%' OR SQLERRM LIKE '%members_dpi_key%' THEN
        RAISE EXCEPTION 'El DPI ya esta registrado para otro cliente' USING ERRCODE = '23505';
      ELSE
        RAISE;
      END IF;
  END;

  -- ── Auditoria: 1 log por categoria modificada ───────────────
  IF v_has_profile THEN
    v_log_id := public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => 'update_member_profile',
      p_entity_type => 'member',
      p_entity_id   => p_member_id::text,
      p_reason_text => p_reason_text,
      p_old_value   => v_old_profile,
      p_new_value   => v_profile
    );
    v_logs := array_append(v_logs, v_log_id);
    v_cats := array_append(v_cats, 'profile');
  END IF;

  IF v_has_points THEN
    v_log_id := public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => 'update_member_points',
      p_entity_type => 'member',
      p_entity_id   => p_member_id::text,
      p_reason_text => p_reason_text,
      p_old_value   => v_old_points,
      p_new_value   => jsonb_build_object('points', (p_changes ->> 'points')::integer)
    );
    v_logs := array_append(v_logs, v_log_id);
    v_cats := array_append(v_cats, 'points');
  END IF;

  IF v_has_gallons THEN
    v_log_id := public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => 'update_member_gallons',
      p_entity_type => 'member',
      p_entity_id   => p_member_id::text,
      p_reason_text => p_reason_text,
      p_old_value   => v_old_gallons,
      p_new_value   => jsonb_build_object('gallons', (p_changes ->> 'gallons')::numeric)
    );
    v_logs := array_append(v_logs, v_log_id);
    v_cats := array_append(v_cats, 'gallons');
  END IF;

  RETURN jsonb_build_object(
    'ok',                 true,
    'logs_created',       to_jsonb(v_logs),
    'categories_updated', to_jsonb(v_cats)
  );
END;
$function$;

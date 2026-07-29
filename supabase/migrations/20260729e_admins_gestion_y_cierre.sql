-- ═══════════════════════════════════════════════════════════════
-- OBJETIVO #1 (CLAUDE.md) — CREDENCIALES DE ADMINS EN LA BD
-- Gestión por RPC + cierre de admins/operators   (29-jul-2026)
--
-- El login de admin ya validaba contra `admins` con bcrypt server-side
-- (authenticate_admin, may-2026). Lo que faltaba para cerrar el
-- objetivo — el equivalente de lo que operators tuvo en mayo:
--
--  A. GESTIÓN de admins por RPC con sesión + auditoría:
--     list_admins / create_admin / update_admin_password /
--     toggle_admin_active. Hasta hoy solo se podían crear o cambiar
--     por SQL manual en el dashboard de Supabase.
--
--  B. CIERRE de las dos tablas de credenciales, que estaban con
--     policy ALL abierta y grants completos para anon/authenticated:
--       · admins    → cualquiera con la anon key podía LEER los
--                     bcrypt e INSERTAR un admin nuevo (o cambiarle
--                     el hash a uno existente) y entrar al panel.
--                     Cierre TOTAL: solo RPCs.
--       · operators → mismo riesgo de escritura + hash legible. Se
--                     conserva la lectura de columnas NO sensibles
--                     (el cliente resuelve el nombre del operador
--                     para el modal de calificación) y la escritura
--                     pasa a update_operator_profile.
--
--  C. update_operator_profile: sustituye el UPDATE directo de
--     OpManagement, con auditoría atómica (antes era client-first:
--     si el log fallaba, el cambio quedaba sin rastro).
--
-- ⚠️ EJECUTAR INMEDIATO tras el deploy (van en pareja).
-- ⚠️ Los admins se autogestionan: cualquier admin activo puede crear
--    otro o resetear contraseñas. No hay jerarquía de super-admin —
--    si el dueño la quiere, es una columna `role` + chequeo acá.
-- ═══════════════════════════════════════════════════════════════

-- ── A.1 list_admins ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.list_admins(p_session_token text)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'list_admins', false, NULL);
  RETURN QUERY
    SELECT jsonb_build_object(
      'id', a.id, 'name', a.name, 'dpi', a.dpi, 'gafete', a.gafete,
      'email', a.email, 'active', a.active, 'created_at', a.created_at
    )
    FROM admins a
    ORDER BY a.created_at;  -- nunca password_hash
END;
$function$;

COMMENT ON FUNCTION public.list_admins(text) IS
'Objetivo #1: lista de administradores para el panel (sin password_hash).
Exige sesión de admin — la tabla admins quedó cerrada a la API abierta.';

-- ── A.2 create_admin ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_admin(
  p_session_token text,
  p_name          text,
  p_dpi           text,
  p_gafete        text,
  p_email         text,
  p_password      text,
  p_admin_id      uuid DEFAULT NULL,
  p_admin_name    text DEFAULT NULL,
  p_admin_email   text DEFAULT NULL,
  p_reason_text   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_email text := lower(trim(COALESCE(p_email, '')));
  v_row   admins%ROWTYPE;
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'create_admin', false, NULL);

  IF COALESCE(trim(p_name), '') = '' THEN
    RETURN jsonb_build_object('error', 'El nombre es obligatorio');
  END IF;
  IF COALESCE(trim(p_dpi), '') = '' OR COALESCE(trim(p_gafete), '') = '' THEN
    RETURN jsonb_build_object('error', 'DPI y gafete son obligatorios');
  END IF;
  IF v_email = '' THEN
    RETURN jsonb_build_object('error', 'El correo es obligatorio');
  END IF;
  IF length(COALESCE(p_password, '')) < 8 THEN
    RETURN jsonb_build_object('error', 'La contraseña debe tener al menos 8 caracteres');
  END IF;
  IF EXISTS (SELECT 1 FROM admins WHERE lower(email) = v_email) THEN
    RETURN jsonb_build_object('error', 'Ya existe un administrador con ese correo');
  END IF;
  IF EXISTS (SELECT 1 FROM admins WHERE dpi = trim(p_dpi)) THEN
    RETURN jsonb_build_object('error', 'Ya existe un administrador con ese DPI');
  END IF;

  INSERT INTO admins (name, dpi, gafete, email, password_hash, active)
  VALUES (trim(p_name), trim(p_dpi), trim(p_gafete), v_email,
          extensions.crypt(p_password, extensions.gen_salt('bf', 6)), true)
  RETURNING * INTO v_row;

  IF p_admin_id IS NOT NULL THEN
    -- Whitelist explícita: NUNCA password_hash.
    PERFORM public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => 'create_admin',
      p_entity_type => 'admin',
      p_entity_id   => v_row.id::text,
      p_reason_text => p_reason_text,
      p_old_value   => NULL,
      p_new_value   => jsonb_build_object(
        'id', v_row.id, 'name', v_row.name, 'dpi', v_row.dpi,
        'gafete', v_row.gafete, 'email', v_row.email, 'active', v_row.active)
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'admin', jsonb_build_object(
    'id', v_row.id, 'name', v_row.name, 'dpi', v_row.dpi,
    'gafete', v_row.gafete, 'email', v_row.email, 'active', v_row.active,
    'created_at', v_row.created_at));
END;
$function$;

-- ── A.3 update_admin_password ──────────────────────────────────
-- Resetear a OTRO admin exige razón (queda auditado). Cambiar la
-- PROPIA exige la contraseña actual (p_current_password).
CREATE OR REPLACE FUNCTION public.update_admin_password(
  p_session_token    text,
  p_target_id        uuid,
  p_new_password     text,
  p_current_password text DEFAULT NULL,
  p_admin_id         uuid DEFAULT NULL,
  p_admin_name       text DEFAULT NULL,
  p_admin_email      text DEFAULT NULL,
  p_reason_text      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_session_admin uuid;
  v_target        admins%ROWTYPE;
BEGIN
  v_session_admin := public.validate_session_token(p_session_token, 'admin', 'update_admin_password', false, NULL);

  IF length(COALESCE(p_new_password, '')) < 8 THEN
    RETURN jsonb_build_object('error', 'La contraseña debe tener al menos 8 caracteres');
  END IF;

  SELECT * INTO v_target FROM admins WHERE id = p_target_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Administrador no encontrado');
  END IF;

  -- Cambio de la PROPIA contraseña: verificar la actual.
  IF p_target_id = v_session_admin THEN
    IF COALESCE(p_current_password, '') = '' THEN
      RETURN jsonb_build_object('error', 'Ingresá tu contraseña actual');
    END IF;
    IF v_target.password_hash <> extensions.crypt(p_current_password, v_target.password_hash) THEN
      RETURN jsonb_build_object('error', 'La contraseña actual es incorrecta');
    END IF;
  END IF;

  UPDATE admins
     SET password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf', 6))
   WHERE id = p_target_id;

  IF p_admin_id IS NOT NULL THEN
    PERFORM public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => CASE WHEN p_target_id = v_session_admin
                            THEN 'change_own_admin_password'
                            ELSE 'reset_admin_password' END,
      p_entity_type => 'admin',
      p_entity_id   => p_target_id::text,
      p_reason_text => p_reason_text,
      p_old_value   => NULL,
      -- La contraseña NUNCA se escribe en la auditoría (solo el hecho).
      p_new_value   => jsonb_build_object(
        'admin_id', p_target_id, 'admin_email', v_target.email, 'password_changed', true)
    );
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- ── A.4 toggle_admin_active ────────────────────────────────────
-- Guardas: nadie se desactiva a sí mismo y siempre queda ≥1 activo
-- (evita dejar el panel sin acceso).
CREATE OR REPLACE FUNCTION public.toggle_admin_active(
  p_session_token text,
  p_target_id     uuid,
  p_new_active    boolean,
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
  v_session_admin uuid;
  v_email         text;
  v_actives       integer;
BEGIN
  v_session_admin := public.validate_session_token(p_session_token, 'admin', 'toggle_admin_active', false, NULL);

  IF p_target_id = v_session_admin AND p_new_active = false THEN
    RETURN jsonb_build_object('error', 'No podés desactivar tu propia cuenta');
  END IF;

  SELECT email INTO v_email FROM admins WHERE id = p_target_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Administrador no encontrado');
  END IF;

  IF p_new_active = false THEN
    SELECT count(*) INTO v_actives FROM admins WHERE active = true AND id <> p_target_id;
    IF v_actives = 0 THEN
      RETURN jsonb_build_object('error', 'Debe quedar al menos un administrador activo');
    END IF;
  END IF;

  UPDATE admins SET active = p_new_active WHERE id = p_target_id;

  IF p_admin_id IS NOT NULL THEN
    PERFORM public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => 'toggle_admin_active',
      p_entity_type => 'admin',
      p_entity_id   => p_target_id::text,
      p_reason_text => p_reason_text,
      p_old_value   => jsonb_build_object('active', NOT p_new_active),
      p_new_value   => jsonb_build_object('admin_email', v_email, 'active', p_new_active)
    );
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- ── C. update_operator_profile (auditoría atómica) ─────────────
CREATE OR REPLACE FUNCTION public.update_operator_profile(
  p_session_token text,
  p_id            uuid,
  p_updates       jsonb,
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
  v_old operators%ROWTYPE;
  v_new operators%ROWTYPE;
  v_snap jsonb;
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'update_operator_profile', false, NULL);

  SELECT * INTO v_old FROM operators WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Operador no encontrado');
  END IF;

  -- Whitelist: password_hash y active NO se tocan acá (tienen sus
  -- propios RPCs: update_operator_password / toggle_operator_active).
  UPDATE operators SET
    name       = CASE WHEN p_updates ? 'name'       THEN trim(p_updates->>'name') ELSE name END,
    username   = CASE WHEN p_updates ? 'username'   THEN lower(trim(p_updates->>'username')) ELSE username END,
    dpi        = CASE WHEN p_updates ? 'dpi'        THEN p_updates->>'dpi' ELSE dpi END,
    gafete     = CASE WHEN p_updates ? 'gafete'     THEN p_updates->>'gafete' ELSE gafete END,
    phone      = CASE WHEN p_updates ? 'phone'      THEN NULLIF(p_updates->>'phone', '') ELSE phone END,
    email      = CASE WHEN p_updates ? 'email'      THEN NULLIF(p_updates->>'email', '') ELSE email END,
    station_id = CASE WHEN p_updates ? 'station_id' THEN NULLIF(p_updates->>'station_id', '')::uuid ELSE station_id END,
    bomba      = CASE WHEN p_updates ? 'bomba'      THEN NULLIF(p_updates->>'bomba', '') ELSE bomba END,
    turno      = CASE WHEN p_updates ? 'turno'      THEN NULLIF(p_updates->>'turno', '') ELSE turno END,
    updated_at = now()
  WHERE id = p_id
  RETURNING * INTO v_new;

  IF p_admin_id IS NOT NULL THEN
    v_snap := jsonb_build_object(
      'operator_id', v_old.id, 'operator_username', v_old.username,
      'name', v_old.name, 'dpi', v_old.dpi, 'gafete', v_old.gafete,
      'phone', v_old.phone, 'email', v_old.email,
      'station_id', v_old.station_id, 'bomba', v_old.bomba, 'turno', v_old.turno);
    PERFORM public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => 'update_operator',
      p_entity_type => 'operator',
      p_entity_id   => p_id::text,
      p_reason_text => p_reason_text,
      p_old_value   => v_snap,
      p_new_value   => jsonb_build_object(
        'operator_id', v_new.id, 'operator_username', v_new.username,
        'name', v_new.name, 'dpi', v_new.dpi, 'gafete', v_new.gafete,
        'phone', v_new.phone, 'email', v_new.email,
        'station_id', v_new.station_id, 'bomba', v_new.bomba, 'turno', v_new.turno)
    );
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- ── D. list_operators_full: ficha de operadores para el admin ──
CREATE OR REPLACE FUNCTION public.list_operators_full(p_session_token text, p_role text)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_role NOT IN ('operator', 'admin') THEN
    RAISE EXCEPTION 'Sesión inválida' USING ERRCODE = '28000', DETAIL = 'invalid_role';
  END IF;
  PERFORM public.validate_session_token(p_session_token, p_role, 'list_operators_full', false, NULL);
  RETURN QUERY
    SELECT jsonb_build_object(
      'id', o.id, 'name', o.name, 'username', o.username,
      'dpi', o.dpi, 'gafete', o.gafete, 'phone', o.phone, 'email', o.email,
      'station_id', o.station_id, 'station_name', s.name,
      'bomba', o.bomba, 'turno', o.turno, 'active', o.active
    )
    FROM operators o
    LEFT JOIN stations s ON s.id = o.station_id
    ORDER BY o.name;  -- nunca password_hash
END;
$function$;

-- ── E. Cierres ─────────────────────────────────────────────────
-- admins: CERRADA del todo (login y gestión solo por RPC DEFINER).
DROP POLICY IF EXISTS admins_all ON public.admins;
REVOKE ALL ON public.admins FROM anon, authenticated;

-- operators: sin escritura directa; lectura de columnas NO sensibles
-- (el cliente resuelve el nombre del operador que atendió su compra;
-- dpi/gafete/phone/email/password_hash dejan de viajar).
DROP POLICY IF EXISTS operators_all ON public.operators;
CREATE POLICY operators_select_public ON public.operators
  FOR SELECT USING (true);
REVOKE ALL ON public.operators FROM anon, authenticated;
GRANT SELECT (id, name, username, station_id, bomba, turno, active)
  ON public.operators TO anon, authenticated;

-- ============================================================
-- Establecer contraseña con la sesión de Google (27-jul-2026)
-- ============================================================
-- Los miembros registrados con Google (sobre todo los de la época
-- previa al paso "Crear contraseña" del wizard) no conocen su
-- contraseña. Su sesión de Supabase Auth ES una prueba de identidad
-- verificada por el servidor: este RPC permite establecer una
-- contraseña nueva SIN conocer la actual, únicamente para la cuenta
-- vinculada al auth.uid() de la sesión que llama.
--
-- Seguridad: EXECUTE solo para `authenticated` (los logins por
-- teléfono no tienen sesión de Supabase Auth → no pueden llamarlo);
-- el UPDATE apunta solo al miembro cuyo auth_provider_id coincide
-- con la sesión. bcrypt server-side como el resto de SEC-lite.
-- ============================================================

CREATE OR REPLACE FUNCTION set_member_password_oauth(p_new_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid text;
  v_member_id uuid;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL OR v_uid = '' THEN
    RETURN jsonb_build_object('error', 'Necesitás una sesión de Google activa');
  END IF;

  IF p_new_password IS NULL OR length(p_new_password) < 6 THEN
    RETURN jsonb_build_object('error', 'La contraseña debe tener al menos 6 caracteres');
  END IF;

  SELECT id INTO v_member_id
    FROM members
   WHERE auth_provider_id = v_uid;

  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No hay una cuenta vinculada a esta sesión de Google');
  END IF;

  UPDATE members
     SET password_hash = crypt(p_new_password, gen_salt('bf', 6))
   WHERE id = v_member_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION set_member_password_oauth(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_member_password_oauth(text) TO authenticated;

COMMENT ON FUNCTION set_member_password_oauth(text) IS
  'Establece contraseña nueva usando la sesión OAuth (auth.uid) como prueba de identidad — para cuentas Google sin contraseña conocida.';

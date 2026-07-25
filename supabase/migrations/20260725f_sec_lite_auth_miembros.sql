-- ============================================================
-- 20260725f — SEC-lite: autenticación REAL de miembros (bcrypt)
-- ============================================================
-- Estado previo (25-jul-2026):
--   · doLogin del cliente NO verificaba la contraseña — solo buscaba
--     el teléfono en la lista local de miembros.
--   · members.password_hash guardaba 'pw:' + base64(contraseña) —
--     REVERSIBLE (no es un hash), escrito por el registro y por
--     Mi Cuenta, y legible por el SELECT abierto de members.
--
-- SEC-lite (mismo patrón que operadores/admins):
--   1. authenticate_member(phone, password): verificación server-side
--      con bcrypt; acepta hashes legados ('pw:base64' y texto plano)
--      y los AUTO-MIGRA a bcrypt en el primer login exitoso.
--   2. hash_member_password(password): bcrypt para el alta del
--      registro (el wizard ya no inserta base64).
--   3. update_member_password(member, actual, nueva): cambio de
--      contraseña verificando la ACTUAL, hash bcrypt server-side.
--   4. Migración one-time de TODOS los hashes existentes a bcrypt.
--
-- DEUDA RESTANTE (SEC.C, documentada): members sigue siendo legible
-- con SELECT abierto — password_hash viaja al cliente, pero ahora es
-- bcrypt (no reversible). El cierre completo (data-minimization +
-- sesiones de miembro) es el proyecto SEC.C.
-- ============================================================

-- ── Helper interno: verifica una contraseña contra un hash en
--    cualquiera de los 3 formatos históricos. SOLO para las RPCs
--    definer (revocado para clientes). ──
CREATE OR REPLACE FUNCTION public.member_password_matches(p_hash text, p_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF p_hash IS NULL OR p_hash = '' OR p_password IS NULL OR p_password = '' THEN
    RETURN false;
  END IF;
  IF p_hash LIKE '$2%' THEN
    -- bcrypt (formato actual)
    RETURN crypt(p_password, p_hash) = p_hash;
  ELSIF p_hash LIKE 'pw:%' THEN
    -- legado: 'pw:' + base64(contraseña) — btoa() del cliente
    RETURN p_hash = 'pw:' || encode(convert_to(p_password, 'UTF8'), 'base64');
  ELSE
    -- legado: texto plano
    RETURN p_hash = p_password;
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.member_password_matches(text, text) FROM PUBLIC, anon, authenticated;

-- ── 1. Login de miembro (server-side) ──
CREATE OR REPLACE FUNCTION public.authenticate_member(p_phone text, p_password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_m RECORD;
BEGIN
  IF COALESCE(trim(p_phone), '') = '' OR COALESCE(p_password, '') = '' THEN
    RETURN jsonb_build_object('error', 'Ingresa teléfono y contraseña');
  END IF;

  SELECT id, name, password_hash INTO v_m
  FROM members WHERE phone = trim(p_phone);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Número no registrado');
  END IF;

  IF NOT public.member_password_matches(v_m.password_hash, p_password) THEN
    RETURN jsonb_build_object('error', 'Contraseña incorrecta');
  END IF;

  -- Auto-migración: hash legado verificado → re-guardar como bcrypt.
  IF v_m.password_hash NOT LIKE '$2%' THEN
    UPDATE members SET password_hash = crypt(p_password, gen_salt('bf', 6)), updated_at = now()
    WHERE id = v_m.id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'member_id', v_m.id, 'name', v_m.name);
END;
$function$;

COMMENT ON FUNCTION public.authenticate_member(text, text) IS
'SEC-lite: login de miembro por teléfono + contraseña, verificación bcrypt
server-side (acepta y auto-migra hashes legados pw:base64/plano). Devuelve
{ok, member_id, name} o {error}. La contraseña nunca se compara en el cliente.';

-- ── 2. Hash para el alta del registro ──
CREATE OR REPLACE FUNCTION public.hash_member_password(p_password text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'La contraseña debe tener al menos 6 caracteres' USING ERRCODE = '22023';
  END IF;
  RETURN crypt(p_password, gen_salt('bf', 6));
END;
$function$;

COMMENT ON FUNCTION public.hash_member_password(text) IS
'SEC-lite: bcrypt server-side para el alta de miembros (wizard de registro).
Sustituye al ''pw:'' + btoa() reversible del cliente.';

-- ── 3. Cambio de contraseña (verifica la actual) ──
CREATE OR REPLACE FUNCTION public.update_member_password(p_member_id uuid, p_current_password text, p_new_password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_hash text;
BEGIN
  IF p_member_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Miembro no especificado');
  END IF;
  IF p_new_password IS NULL OR length(p_new_password) < 6 THEN
    RETURN jsonb_build_object('error', 'La nueva contraseña debe tener al menos 6 caracteres');
  END IF;

  SELECT password_hash INTO v_hash FROM members WHERE id = p_member_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Miembro no encontrado');
  END IF;

  IF NOT public.member_password_matches(v_hash, p_current_password) THEN
    RETURN jsonb_build_object('error', 'La contraseña actual es incorrecta');
  END IF;

  UPDATE members SET password_hash = crypt(p_new_password, gen_salt('bf', 6)), updated_at = now()
  WHERE id = p_member_id;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

COMMENT ON FUNCTION public.update_member_password(uuid, text, text) IS
'SEC-lite: cambio de contraseña de miembro verificando la ACTUAL; bcrypt
server-side. Sustituye al UPDATE directo de password_hash desde Mi Cuenta.';

-- ── 4. Migración one-time: TODOS los hashes existentes → bcrypt ──
-- Por fila con manejo de errores: un base64 corrupto no aborta el resto
-- (queda en formato legado y se auto-migra en su primer login).
DO $$
DECLARE
  r RECORD;
  v_plain text;
  v_migrated integer := 0;
BEGIN
  FOR r IN
    SELECT id, password_hash FROM members
    WHERE password_hash IS NOT NULL AND password_hash <> '' AND password_hash NOT LIKE '$2%'
  LOOP
    BEGIN
      IF r.password_hash LIKE 'pw:%' THEN
        v_plain := convert_from(decode(substr(r.password_hash, 4), 'base64'), 'UTF8');
      ELSE
        v_plain := r.password_hash;
      END IF;
      UPDATE members
      SET password_hash = extensions.crypt(v_plain, extensions.gen_salt('bf', 6)), updated_at = now()
      WHERE id = r.id;
      v_migrated := v_migrated + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'No se pudo migrar el password del miembro %: %', r.id, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'SEC-lite: % contraseñas migradas a bcrypt', v_migrated;
END $$;

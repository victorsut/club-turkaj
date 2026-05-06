-- ============================================================
-- Club Turkaj — RPCs para crear y actualizar operadores con bcrypt
-- ============================================================
-- Sustituye las inserciones directas desde el cliente que estaban
-- guardando 'pw:base64' en operators.password_hash, formato que
-- no matchea con crypt() y dejaba al operador sin login.
--
-- Espejo del patrón de authenticate_operator (SECURITY DEFINER + crypt).
-- ============================================================

-- pgcrypto debe estar habilitado (usado por crypt() y gen_salt()).
-- Si ya está creado por authenticate_operator, esta línea es no-op.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ─────────────────────────────────────────────────────────────
-- create_operator: alta con password hasheado server-side
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_operator(
  p_name        text,
  p_username    text,
  p_password    text,
  p_dpi         text,
  p_gafete      text,
  p_station_id  uuid    DEFAULT NULL,
  p_phone       text    DEFAULT NULL,
  p_email       text    DEFAULT NULL,
  p_bomba       text    DEFAULT NULL,
  p_turno       text    DEFAULT 'Matutino'
)
RETURNS TABLE (
  id          uuid,
  name        text,
  username    text,
  dpi         text,
  gafete      text,
  phone       text,
  email       text,
  station_id  uuid,
  bomba       text,
  turno       text,
  active      boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_username text := lower(trim(p_username));
BEGIN
  IF coalesce(trim(p_password), '') = '' THEN
    RAISE EXCEPTION 'La contraseña no puede estar vacía';
  END IF;
  IF length(p_password) < 4 THEN
    RAISE EXCEPTION 'La contraseña es demasiado corta';
  END IF;

  RETURN QUERY
  INSERT INTO public.operators (
    name, username, password_hash, dpi, gafete,
    phone, email, station_id, bomba, turno, active
  )
  VALUES (
    p_name,
    v_username,
    extensions.crypt(p_password, extensions.gen_salt('bf', 6)),
    p_dpi,
    p_gafete,
    p_phone,
    p_email,
    p_station_id,
    p_bomba,
    coalesce(p_turno, 'Matutino'),
    true
  )
  RETURNING
    operators.id, operators.name, operators.username, operators.dpi,
    operators.gafete, operators.phone, operators.email,
    operators.station_id, operators.bomba, operators.turno, operators.active;
END;
$$;

REVOKE ALL ON FUNCTION public.create_operator(
  text, text, text, text, text, uuid, text, text, text, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_operator(
  text, text, text, text, text, uuid, text, text, text, text
) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- update_operator_password: reset de contraseña (server-side)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_operator_password(
  p_id           uuid,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_count integer;
BEGIN
  IF coalesce(trim(p_new_password), '') = '' THEN
    RAISE EXCEPTION 'La contraseña no puede estar vacía';
  END IF;
  IF length(p_new_password) < 4 THEN
    RAISE EXCEPTION 'La contraseña es demasiado corta';
  END IF;

  UPDATE public.operators
     SET password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf', 6)),
         updated_at    = now()
   WHERE id = p_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.update_operator_password(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_operator_password(uuid, text) TO anon, authenticated;

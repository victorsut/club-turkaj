-- ============================================================
-- Club Turkaj + / Puntos+ — F0.3.4: RPCs de operadores con auditoría
-- ============================================================
-- Extiende create_operator y update_operator_password (de la
-- migración 20260505) con 4 parámetros opcionales de auditoría
-- (admin_id, admin_name, admin_email, reason_text) para registrar
-- la acción en admin_audit_log vía log_admin_action, EN LA MISMA
-- TRANSACCIÓN.
--
-- BACKWARD COMPATIBILITY:
--   - p_admin_id IS NULL → comportamiento legacy idéntico (sin log).
--   - p_admin_id NOT NULL → ejecuta la operación y llama a
--     log_admin_action. Si el reason es inválido para una acción
--     sensible, el RAISE de log_admin_action revierte todo.
--
-- SENSIBILIDAD (según lista hardcodeada en log_admin_action):
--   - create_operator           → NO sensible (reason opcional).
--   - update_operator_password  → SÍ sensible (reason obligatorio).
--
-- SEGURIDAD: nunca se loguea password_hash. create_operator loguea
-- el operador creado sin el hash; update_operator_password solo
-- loguea { operator_id, operator_username, password_changed }.
--
-- NOTA TÉCNICA: agregar parámetros con DEFAULT crea un OVERLOAD
-- nuevo, no reemplaza. Con dos firmas vivas, PostgREST no resolvería
-- la llamada original ("function not unique"). Por eso DROP de las
-- firmas viejas antes de CREATE OR REPLACE.
-- ============================================================

BEGIN;

-- pgcrypto (crypt / gen_salt). No-op si ya está habilitado.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Firmas viejas (overload obligatorio de eliminar).
DROP FUNCTION IF EXISTS public.create_operator(
  text, text, text, text, text, uuid, text, text, text, text
);
DROP FUNCTION IF EXISTS public.update_operator_password(uuid, text);

-- ─────────────────────────────────────────────────────────────
-- create_operator: alta con password hasheado + auditoría opcional
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
  p_turno       text    DEFAULT 'Matutino',
  -- Auditoría (F0.3.4)
  p_admin_id    uuid    DEFAULT NULL,
  p_admin_name  text    DEFAULT NULL,
  p_admin_email text    DEFAULT NULL,
  p_reason_text text    DEFAULT NULL
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
  v_username  text := lower(trim(p_username));
  v_row       operators%ROWTYPE;
  v_new_value jsonb;
BEGIN
  IF coalesce(trim(p_password), '') = '' THEN
    RAISE EXCEPTION 'La contraseña no puede estar vacía';
  END IF;
  IF length(p_password) < 4 THEN
    RAISE EXCEPTION 'La contraseña es demasiado corta';
  END IF;

  -- Alta del operador (captura la fila completa para auditoría).
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
  RETURNING * INTO v_row;

  -- Auditoría opcional EN LA MISMA TRANSACCIÓN (sin password_hash).
  IF p_admin_id IS NOT NULL THEN
    -- WHITELIST EXPLICITA: nunca incluir password_hash ni otros datos
    -- sensibles que se agreguen a operators en el futuro. Si se agregan
    -- columnas nuevas, decidir explicitamente si auditarlas.
    v_new_value := jsonb_build_object(
      'id',         v_row.id,
      'name',       v_row.name,
      'username',   v_row.username,
      'dpi',        v_row.dpi,
      'gafete',     v_row.gafete,
      'phone',      v_row.phone,
      'email',      v_row.email,
      'station_id', v_row.station_id,
      'bomba',      v_row.bomba,
      'turno',      v_row.turno,
      'active',     v_row.active
    );
    PERFORM public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => 'create_operator',
      p_entity_type => 'operator',
      p_entity_id   => v_row.id::text,
      p_reason_text => p_reason_text,
      p_old_value   => NULL,
      p_new_value   => v_new_value
    );
  END IF;

  -- Retorno: mismas 11 columnas del TABLE original (sin password_hash).
  RETURN QUERY SELECT
    v_row.id, v_row.name, v_row.username, v_row.dpi, v_row.gafete,
    v_row.phone, v_row.email, v_row.station_id, v_row.bomba,
    v_row.turno, v_row.active;
END;
$$;

REVOKE ALL ON FUNCTION public.create_operator(
  text, text, text, text, text, uuid, text, text, text, text,
  uuid, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_operator(
  text, text, text, text, text, uuid, text, text, text, text,
  uuid, text, text, text
) TO anon, authenticated;

COMMENT ON FUNCTION public.create_operator(
  text, text, text, text, text, uuid, text, text, text, text,
  uuid, text, text, text
) IS
'F0.3.4 — Alta de operador con bcrypt server-side. Si p_admin_id no es NULL, registra create_operator en admin_audit_log (sin password_hash) en la misma transaccion. create_operator NO es accion sensible: reason opcional server-side.';

-- ─────────────────────────────────────────────────────────────
-- update_operator_password: reset de contraseña + auditoría opcional
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_operator_password(
  p_id           uuid,
  p_new_password text,
  -- Auditoría (F0.3.4)
  p_admin_id     uuid  DEFAULT NULL,
  p_admin_name   text  DEFAULT NULL,
  p_admin_email  text  DEFAULT NULL,
  p_reason_text  text  DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_count     integer;
  v_username  text;
  v_new_value jsonb;
BEGIN
  IF coalesce(trim(p_new_password), '') = '' THEN
    RAISE EXCEPTION 'La contraseña no puede estar vacía';
  END IF;
  IF length(p_new_password) < 4 THEN
    RAISE EXCEPTION 'La contraseña es demasiado corta';
  END IF;

  -- UPDATE + captura del username en una sola pasada (RETURNING).
  UPDATE public.operators
     SET password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf', 6)),
         updated_at    = now()
   WHERE id = p_id
   RETURNING username INTO v_username;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Auditoría solo si el operador existía (v_count > 0) y hay admin.
  -- Nunca se loguea el hash ni la contraseña.
  IF v_count > 0 AND p_admin_id IS NOT NULL THEN
    -- v_username ya fue capturado por el RETURNING del UPDATE.
    v_new_value := jsonb_build_object(
      'operator_id',       p_id,
      'operator_username', v_username,
      'password_changed',  true
    );
    PERFORM public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => 'update_operator_password',
      p_entity_type => 'operator',
      p_entity_id   => p_id::text,
      p_reason_text => p_reason_text,
      p_old_value   => NULL,
      p_new_value   => v_new_value
    );
  END IF;

  RETURN v_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.update_operator_password(
  uuid, text, uuid, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_operator_password(
  uuid, text, uuid, text, text, text
) TO anon, authenticated;

COMMENT ON FUNCTION public.update_operator_password(
  uuid, text, uuid, text, text, text
) IS
'F0.3.4 — Reset de contraseña de operador con bcrypt server-side. Si p_admin_id no es NULL y el operador existe, registra update_operator_password en admin_audit_log (sin hash: solo operator_id/username/password_changed) en la misma transaccion. Accion sensible: reason obligatorio.';

COMMIT;

-- ── Fin ───────────────────────────────────────────────────────

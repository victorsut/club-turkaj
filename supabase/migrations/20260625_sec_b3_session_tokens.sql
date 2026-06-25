-- ============================================================
-- Club Turkaj + / Puntos+ — SEC.B.3: Tokens de sesión
-- ============================================================
-- Crea la infraestructura de tokens de sesión para operadores
-- y admins:
--
-- 1. Tabla operator_sessions: tokens activos de operadores.
-- 2. Tabla admin_sessions: tokens activos de admins.
-- 3. Tabla session_violations: registro de llamadas a RPCs
--    sensibles sin token o con token inválido (auditoría
--    durante el período warn de SEC.B.7-B.8).
-- 4. authenticate_operator modificada: emite token al login.
-- 5. authenticate_admin modificada: emite token al login.
--
-- PROPÓSITO ARQUITECTÓNICO:
--
-- Las 4 RPCs sensibles de operador/admin (register_purchase,
-- buy_raffle_tickets vector operador, update_member_with_audit,
-- modify_member_points) van a exigir p_session_token como
-- parámetro en SEC.B.6. Hasta SEC.B.7 corren en modo 'warn'
-- (registran violations sin rechazar). En SEC.B.8 pasan a
-- 'strict' (RAISE EXCEPTION).
--
-- Las RPCs cliente (redeem_reward, complete_survey,
-- grant_special_day_bonus, vector cliente de
-- buy_raffle_tickets) se cierran por separado en SEC.C
-- usando auth.uid() (Google OAuth) + decisión separada para
-- vector teléfono.
--
-- DEPENDENCIAS:
-- - operators y admins ya existen.
-- - extensions.crypt (bcrypt) ya disponible.
--
-- POST-SEC.B.3:
-- - SEC.B.4: actualizar loginOperator/loginAdmin para guardar
--   token en localStorage.
-- - SEC.B.5: helper getSessionToken(role) + inyección en 4
--   call sites.
-- - SEC.B.6: modificar 4 RPCs sensibles (modo warn).
-- - SEC.B.7: período de observación.
-- - SEC.B.8: pasar a modo strict.
-- - SEC.B.9: REVOKE EXECUTE FROM anon.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. operator_sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.operator_sessions (
  token         text PRIMARY KEY,
  operator_id   uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  revoked_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_operator_sessions_operator_id
  ON public.operator_sessions(operator_id);

CREATE INDEX IF NOT EXISTS idx_operator_sessions_expires_at
  ON public.operator_sessions(expires_at);

COMMENT ON TABLE public.operator_sessions IS
'SEC.B.3 — Tokens de sesión activos para operadores. Emitidos
por authenticate_operator con TTL de 18 horas. Validados por
las RPCs sensibles que requieren autorización de operador
(register_purchase, buy_raffle_tickets vector operador).';

-- Permisos: solo service_role puede leer/escribir directo.
REVOKE ALL ON TABLE public.operator_sessions FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.operator_sessions
  TO service_role;

-- ============================================================
-- 2. admin_sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_sessions (
  token         text PRIMARY KEY,
  admin_id      uuid NOT NULL REFERENCES public.admins(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  revoked_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id
  ON public.admin_sessions(admin_id);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at
  ON public.admin_sessions(expires_at);

COMMENT ON TABLE public.admin_sessions IS
'SEC.B.3 — Tokens de sesión activos para admins. Emitidos
por authenticate_admin con TTL de 18 horas. Validados por las
RPCs sensibles que requieren autorización de admin
(update_member_with_audit, modify_member_points).';

REVOKE ALL ON TABLE public.admin_sessions FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_sessions
  TO service_role;

-- ============================================================
-- 3. session_violations
-- ============================================================

CREATE TABLE IF NOT EXISTS public.session_violations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rpc_name     text NOT NULL,
  reason       text NOT NULL,  -- 'no_token' | 'invalid_token' | 'expired_token'
  params       jsonb,
  occurred_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_violations_occurred_at
  ON public.session_violations(occurred_at);

CREATE INDEX IF NOT EXISTS idx_session_violations_rpc_name
  ON public.session_violations(rpc_name);

COMMENT ON TABLE public.session_violations IS
'SEC.B.3 — Registra llamadas a RPCs sensibles sin token o con
token inválido durante el período warn (SEC.B.6 a SEC.B.7).
En SEC.B.8 (modo strict) estas llamadas serán rechazadas con
ERRCODE 42501. La tabla permite auditoría estructurada para
detectar writers olvidados durante observación.';

REVOKE ALL ON TABLE public.session_violations FROM PUBLIC;
GRANT SELECT, INSERT ON TABLE public.session_violations
  TO service_role;

-- ============================================================
-- 4. authenticate_operator modificada
-- ============================================================

-- DROP previo: CREATE OR REPLACE no puede cambiar RETURNS TABLE
-- (agregamos session_token + session_expires_at). El DROP +
-- recreación va dentro del BEGIN/COMMIT, así que si algo falla
-- la función original queda intacta por rollback.
DROP FUNCTION IF EXISTS public.authenticate_operator(text, text, text, text);

CREATE OR REPLACE FUNCTION public.authenticate_operator(
  p_gafete text,
  p_dpi text,
  p_username text,
  p_password text
)
RETURNS TABLE(
  id uuid,
  name text,
  username text,
  gafete text,
  dpi text,
  station_id uuid,
  station_name text,
  bomba text,
  turno text,
  session_token text,
  session_expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_operator    operators%ROWTYPE;
  v_station_name text;
  v_token       text;
  v_expires_at  timestamptz;
BEGIN
  -- 1. Validar credenciales (lógica idéntica al original)
  SELECT * INTO v_operator
  FROM operators o
  WHERE o.gafete = p_gafete
    AND o.dpi = p_dpi
    AND o.username = p_username
    AND o.password_hash = extensions.crypt(p_password, o.password_hash)
    AND o.active = true;

  IF NOT FOUND THEN
    -- Login falla: retornar 0 filas
    RETURN;
  END IF;

  -- 2. Obtener station_name (lookup separado)
  SELECT s.name INTO v_station_name
  FROM stations s
  WHERE s.id = v_operator.station_id;

  -- 3. Emitir token de sesión (TTL: 18 horas)
  v_token := gen_random_uuid()::text;
  v_expires_at := now() + interval '18 hours';

  INSERT INTO operator_sessions (token, operator_id, expires_at)
  VALUES (v_token, v_operator.id, v_expires_at);

  -- 4. Retornar todo incluyendo el token
  RETURN QUERY SELECT
    v_operator.id,
    v_operator.name,
    v_operator.username,
    v_operator.gafete,
    v_operator.dpi,
    v_operator.station_id,
    v_station_name,
    v_operator.bomba,
    v_operator.turno,
    v_token,
    v_expires_at;
END;
$function$;

-- Re-otorgar EXECUTE: el DROP anterior eliminó los grants de la
-- función original. El login ocurre pre-autenticación, por eso
-- anon debe poder ejecutarla.
REVOKE ALL ON FUNCTION public.authenticate_operator(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authenticate_operator(text, text, text, text)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.authenticate_operator(text, text, text, text) IS
'SEC.B.3 — Autentica un operador con credenciales (gafete +
dpi + username + password). Si las credenciales son válidas y
el operador está activo, emite un token de sesión con TTL de
18 horas guardado en operator_sessions, y lo retorna junto con
los datos del operador.';

-- ============================================================
-- 5. authenticate_admin modificada
-- ============================================================

-- DROP previo: misma razón que authenticate_operator (cambio
-- de RETURNS TABLE). Dentro del BEGIN/COMMIT → rollback seguro.
DROP FUNCTION IF EXISTS public.authenticate_admin(text, text, text, text);

CREATE OR REPLACE FUNCTION public.authenticate_admin(
  p_dpi text,
  p_gafete text,
  p_email text,
  p_password text
)
RETURNS TABLE(
  id uuid,
  name text,
  dpi text,
  gafete text,
  email text,
  session_token text,
  session_expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_admin       admins%ROWTYPE;
  v_token       text;
  v_expires_at  timestamptz;
BEGIN
  -- 1. Validar credenciales (lógica idéntica al original)
  SELECT * INTO v_admin
  FROM public.admins a
  WHERE a.dpi = p_dpi
    AND a.gafete = p_gafete
    AND lower(a.email) = lower(p_email)
    AND a.active = true
    AND a.password_hash = crypt(p_password, a.password_hash);

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 2. Emitir token de sesión (TTL: 18 horas)
  v_token := gen_random_uuid()::text;
  v_expires_at := now() + interval '18 hours';

  INSERT INTO admin_sessions (token, admin_id, expires_at)
  VALUES (v_token, v_admin.id, v_expires_at);

  -- 3. Retornar todo incluyendo el token
  RETURN QUERY SELECT
    v_admin.id,
    v_admin.name,
    v_admin.dpi,
    v_admin.gafete,
    v_admin.email,
    v_token,
    v_expires_at;
END;
$function$;

-- Re-otorgar EXECUTE: el DROP eliminó los grants originales.
-- El login de admin también ocurre pre-autenticación.
REVOKE ALL ON FUNCTION public.authenticate_admin(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authenticate_admin(text, text, text, text)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.authenticate_admin(text, text, text, text) IS
'SEC.B.3 — Autentica un admin con credenciales (dpi + gafete +
email + password). Si las credenciales son válidas y el admin
está activo, emite un token de sesión con TTL de 18 horas
guardado en admin_sessions, y lo retorna junto con los datos
del admin.';

COMMIT;

-- Fin

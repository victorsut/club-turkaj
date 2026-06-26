-- ============================================================
-- Club Turkaj / Puntos+ — SEC.B.6.2: revocación de sesión server-side
-- ============================================================
-- Agrega 2 RPCs NUEVAS para revocar tokens de sesión poblando
-- revoked_at en operator_sessions / admin_sessions. Habilita la
-- revocación en logout (deuda diferida desde SEC.B.4), que el
-- cliente conectará en SEC.B.6.3.
--
-- Esta sub-fase es PURAMENTE ADITIVA: NO toca las 4 RPCs de FB,
-- NI el helper validate_session_token (SEC.B.6.1), NI ninguna
-- función existente. Solo crea 2 funciones nuevas. Por eso no
-- hubo pre-flight: no hay cuerpo vigente que preservar.
--
-- DISEÑO (decisiones confirmadas en la investigación de SEC.B.6):
-- - El token ES el secreto: poseerlo = poder revocarlo. Las RPCs
--   NO validan quién llama. Un token (UUID random) solo vive en
--   el localStorage de su propia sesión; revocar "el de otro"
--   exigiría conocerlo (equivalente a haberlo robado, fuera de
--   alcance). No abre vector de escalación: solo puebla
--   revoked_at, es idempotente, y no retorna datos.
-- - No-op silencioso si el token no existe: el UPDATE que no
--   matchea no afecta filas y no lanza error → no se filtra la
--   existencia de tokens.
-- - Idempotencia: el `AND revoked_at IS NULL` evita pisar un
--   revoked_at previo si se revoca dos veces (preserva el
--   instante de la PRIMERA revocación).
-- - RETURNS void: no se retornan datos de la sesión (ni siquiera
--   si afectó filas — refuerza el no-op silencioso).
--
-- SECURITY: SECURITY DEFINER (necesita escribir operator_sessions
-- / admin_sessions, ambas con REVOKE ALL FROM PUBLIC + grants
-- solo a service_role). GRANT EXECUTE a anon/authenticated/
-- service_role porque el logout puede ocurrir con apikey anon.
--
-- LOOP CON B.6.1: el helper validate_session_token ya tiene la
-- rama revoked_token (chequea revoked_at IS NOT NULL antes que
-- expiración). B.6.2 la HABILITA: tras revocar un token a mano,
-- reusarlo en una RPC sensible genera reason='revoked_token' en
-- session_violations (modo warn — sigue sin bloquear; el corte es
-- B.8).
--
-- DEPENDENCIAS: operator_sessions, admin_sessions (SEC.B.3).
-- ============================================================

BEGIN;

-- ============================================================
-- 1. revoke_operator_session
-- ============================================================
CREATE OR REPLACE FUNCTION public.revoke_operator_session(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Idempotente: el AND revoked_at IS NULL preserva el instante de
  -- la primera revocación. No-op silencioso si el token no existe
  -- (UPDATE sin match no afecta filas y no lanza error).
  UPDATE operator_sessions
  SET revoked_at = now()
  WHERE token = p_token
    AND revoked_at IS NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.revoke_operator_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_operator_session(text)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.revoke_operator_session(text) IS
'SEC.B.6.2 — Revoca un token de sesión de operador poblando
revoked_at en operator_sessions. Idempotente (no pisa una
revocación previa). No valida quién llama (el token es el
secreto). No-op silencioso si el token no existe. Conectada al
logout en SEC.B.6.3.';

-- ============================================================
-- 2. revoke_admin_session (espejo exacto sobre admin_sessions)
-- ============================================================
CREATE OR REPLACE FUNCTION public.revoke_admin_session(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Idempotente: el AND revoked_at IS NULL preserva el instante de
  -- la primera revocación. No-op silencioso si el token no existe.
  UPDATE admin_sessions
  SET revoked_at = now()
  WHERE token = p_token
    AND revoked_at IS NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.revoke_admin_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_admin_session(text)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.revoke_admin_session(text) IS
'SEC.B.6.2 — Revoca un token de sesión de admin poblando
revoked_at en admin_sessions. Idempotente (no pisa una
revocación previa). No valida quién llama (el token es el
secreto). No-op silencioso si el token no existe. Conectada al
logout en SEC.B.6.3.';

COMMIT;

-- Fin

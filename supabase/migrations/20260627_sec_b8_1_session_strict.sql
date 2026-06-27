-- ============================================================
-- Club Turkaj / Puntos+ — SEC.B.8.1: validación de sesión (modo STRICT)
-- ============================================================
-- Flip de WARN → STRICT del helper validate_session_token. A partir
-- de este deploy, las ramas de token presente-pero-inválido (y de
-- token ausente cuando NO se permite NULL) pasan de INSERT +
-- RETURN NULL (warn, no bloquea) a RAISE EXCEPTION con
-- ERRCODE 28000 (invalid_authorization_specification) → la RPC se
-- aborta y el cliente recibe el error.
--
-- ALCANCE: recrea SOLO el helper. NO toca las 4 RPCs sensibles
-- (register_purchase, buy_raffle_tickets, update_member_with_audit,
-- modify_member_points) — ellas llaman al helper sin cambios. El
-- corte vive en un único lugar, por eso se centralizó en B.6.1.
--
-- SESSION_VIOLATIONS EN STRICT: las ramas que ahora hacen RAISE ya
-- NO insertan en session_violations. Un INSERT seguido de RAISE en
-- la misma transacción se revierte siempre (el RAISE aborta la tx),
-- así que registrar ahí sería código muerto que da la falsa
-- impresión de que la tabla se puebla. Se eliminó. Post-strict, el
-- rastro de un intento con token malo es el error PostgREST en los
-- logs, no una fila. (El histórico de la fase warn queda intacto.)
--
-- VECTOR CLIENTE — FRONTERA DE B.6 INTACTA: buy_raffle_tickets
-- llama con p_allow_null=true. La rama (1a) (p_token NULL AND
-- p_allow_null → RETURN NULL) NO se modifica y sigue siendo el
-- PRIMER chequeo, antes de cualquier RAISE. Un cliente con token
-- NULL sigue comprando boletos sin RAISE. El raffle del cliente
-- SIGUE SIN PROTECCIÓN DE TOKEN tras B.8 — su cierre es SEC.C.
-- Nadie debe creer que B.8 cierra ese vector.
--
-- PRIVILEGIOS: CREATE OR REPLACE sin DROP y sin cambio de firma →
-- Postgres reemplaza el cuerpo en sitio y PRESERVA los grants
-- existentes (REVOKE ALL FROM PUBLIC + GRANT EXECUTE TO
-- service_role, de B.6.1). Por eso esta migración NO re-emite
-- REVOKE/GRANT. Solo cambia el cuerpo + el COMMENT.
--
-- p_rpc_name / p_params: en strict quedan SIN USO (eran para el
-- INSERT eliminado), pero se mantienen en la firma — cambiarla
-- rompería el CREATE OR REPLACE sin DROP y obligaría a recrear las
-- 4 RPCs que llaman con esos args. Parámetros aceptados-e-ignorados.
--
-- IDEMPOTENTE: CREATE OR REPLACE. Sin BEGIN/COMMIT explícito (el
-- SQL Editor auto-commitea; una sola ejecución).
--
-- DEPENDENCIAS: operator_sessions, admin_sessions (SEC.B.3). El
-- helper existe desde B.6.1; esta migración solo cambia su cuerpo.
-- ============================================================
--
-- ╔══════════════════════════════════════════════════════════╗
-- ║  REVERT B.8.1 → WARN                                      ║
-- ║  Si strict bloquea un flujo legítimo, copiá-pegá el       ║
-- ║  bloque de abajo en el SQL Editor y ejecutalo. Restaura   ║
-- ║  el helper al cuerpo WARN de B.6.1 (INSERT + RETURN NULL, ║
-- ║  sin RAISE). NO toca las 4 RPCs. Efecto inmediato, sin    ║
-- ║  redeploy del front. Un solo CREATE OR REPLACE.           ║
-- ╚══════════════════════════════════════════════════════════╝
--
-- CREATE OR REPLACE FUNCTION public.validate_session_token(
--   p_token      text,
--   p_role       text,
--   p_rpc_name   text,
--   p_allow_null boolean DEFAULT false,
--   p_params     jsonb DEFAULT NULL
-- )
-- RETURNS uuid
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path TO 'public'
-- AS $function$
-- DECLARE
--   v_role_id    uuid;
--   v_expires_at timestamptz;
--   v_revoked_at timestamptz;
-- BEGIN
--   IF p_token IS NULL THEN
--     IF p_allow_null THEN
--       RETURN NULL;
--     END IF;
--     INSERT INTO session_violations (rpc_name, reason, params)
--     VALUES (p_rpc_name, 'no_token', p_params);
--     RETURN NULL;
--   END IF;
--
--   IF p_role = 'operator' THEN
--     SELECT operator_id, expires_at, revoked_at
--       INTO v_role_id, v_expires_at, v_revoked_at
--     FROM operator_sessions
--     WHERE token = p_token;
--   ELSIF p_role = 'admin' THEN
--     SELECT admin_id, expires_at, revoked_at
--       INTO v_role_id, v_expires_at, v_revoked_at
--     FROM admin_sessions
--     WHERE token = p_token;
--   ELSE
--     INSERT INTO session_violations (rpc_name, reason, params)
--     VALUES (p_rpc_name, 'invalid_token', p_params);
--     RETURN NULL;
--   END IF;
--
--   IF NOT FOUND THEN
--     INSERT INTO session_violations (rpc_name, reason, params)
--     VALUES (p_rpc_name, 'invalid_token', p_params);
--     RETURN NULL;
--   END IF;
--
--   IF v_revoked_at IS NOT NULL THEN
--     INSERT INTO session_violations (rpc_name, reason, params)
--     VALUES (p_rpc_name, 'revoked_token', p_params);
--     RETURN NULL;
--   END IF;
--
--   IF v_expires_at <= now() THEN
--     INSERT INTO session_violations (rpc_name, reason, params)
--     VALUES (p_rpc_name, 'expired_token', p_params);
--     RETURN NULL;
--   END IF;
--
--   RETURN v_role_id;
-- END;
-- $function$;
--
-- COMMENT ON FUNCTION public.validate_session_token(text, text, text, boolean, jsonb) IS
-- 'SEC.B.6.1 — Valida un token de sesión (operador/admin) en modo
-- WARN: registra no_token/invalid_token/revoked_token/expired_token
-- en session_violations sin bloquear, y devuelve el role_id en
-- éxito o NULL en fallo. p_allow_null=true (buy_raffle_tickets)
-- permite NULL legítimo del vector cliente sin registrar. El corte
-- a strict (RAISE) es SEC.B.8. NO valida el vector cliente del
-- raffle — eso es SEC.C.';
--
-- ╚═══════════════════ FIN DEL REVERT ═══════════════════════╝
-- ============================================================


-- ============================================================
-- HELPER — validate_session_token (modo STRICT)
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_session_token(
  p_token      text,
  p_role       text,
  p_rpc_name   text,
  p_allow_null boolean DEFAULT false,
  p_params     jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role_id    uuid;
  v_expires_at timestamptz;
  v_revoked_at timestamptz;
BEGIN
  -- (1) Token ausente
  IF p_token IS NULL THEN
    IF p_allow_null THEN
      -- (1a) Vector cliente (buy_raffle_tickets): NULL es legítimo.
      -- INTACTA en strict: skip silencioso, sin RAISE. Frontera de B.6,
      -- su cierre es SEC.C. NO MODIFICAR — bloquearía clientes legítimos.
      RETURN NULL;
    END IF;
    -- (1b) Operador/admin sin token: en strict, RECHAZO.
    RAISE EXCEPTION 'Sesión no autenticada'
      USING ERRCODE = '28000', DETAIL = 'no_token';
  END IF;

  -- (2) Lookup según rol (token es PK → index scan)
  IF p_role = 'operator' THEN
    SELECT operator_id, expires_at, revoked_at
      INTO v_role_id, v_expires_at, v_revoked_at
    FROM operator_sessions
    WHERE token = p_token;
  ELSIF p_role = 'admin' THEN
    SELECT admin_id, expires_at, revoked_at
      INTO v_role_id, v_expires_at, v_revoked_at
    FROM admin_sessions
    WHERE token = p_token;
  ELSE
    -- Rol desconocido (defensivo): en strict, RECHAZO.
    RAISE EXCEPTION 'Sesión inválida'
      USING ERRCODE = '28000', DETAIL = 'invalid_token';
  END IF;

  -- (3) No existe en la tabla de sesiones
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesión inválida'
      USING ERRCODE = '28000', DETAIL = 'invalid_token';
  END IF;

  -- (4) Revocado (ANTES que expiración: señal más fuerte — un
  --     logout deliberado cuyo token sigue circulando)
  IF v_revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Sesión revocada'
      USING ERRCODE = '28000', DETAIL = 'revoked_token';
  END IF;

  -- (5) Expirado (TTL vencido)
  IF v_expires_at <= now() THEN
    RAISE EXCEPTION 'Sesión expirada'
      USING ERRCODE = '28000', DETAIL = 'expired_token';
  END IF;

  -- (6) Éxito: token válido, no revocado, no expirado.
  RETURN v_role_id;
END;
$function$;

COMMENT ON FUNCTION public.validate_session_token(text, text, text, boolean, jsonb) IS
'SEC.B.8.1 — Valida un token de sesión (operador/admin) en modo
STRICT: ante no_token (sin allow_null) / invalid_token /
revoked_token / expired_token hace RAISE EXCEPTION con ERRCODE
28000 (invalid_authorization_specification) y subtipo en DETAIL,
abortando la RPC. p_allow_null=true (buy_raffle_tickets) permite
NULL legítimo del vector cliente vía RETURN NULL (rama 1a, sin
RAISE). En strict NO se puebla session_violations (el RAISE
revierte el INSERT, por eso se eliminó). NO valida el vector
cliente del raffle — eso es SEC.C. Revert a WARN = restaurar el
cuerpo de B.6.1 (un solo CREATE OR REPLACE, en el header de esta
migración).';

-- Fin

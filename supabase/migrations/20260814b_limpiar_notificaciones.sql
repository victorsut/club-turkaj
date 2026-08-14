-- ============================================================
-- 20260814b — LIMPIAR NOTIFICACIONES del inbox (pedido del dueño)
-- ============================================================
-- La campana del cliente permite limpiar notificaciones una por una
-- o todas de una vez. La limpieza es SOFT (cleared_at): la fila NUNCA
-- se borra porque `notifications` es también el registro/dedupe del
-- motor de push (api/_lib/push.js) — un DELETE rompería el dedupe y
-- perdería el historial de envíos.
--
--   1. Columna notifications.cleared_at (timestamptz, NULL = visible).
--   2. get_my_notifications filtra cleared_at IS NULL.
--   3. RPC clear_my_notifications(p_session_token, p_notification_id):
--      con id limpia ESA (si es del miembro); NULL limpia TODAS las
--      visibles. Limpiar implica leer (estampa read_at si faltaba,
--      para que el badge no cuente fantasmas).
--
-- Patrón de sesión: validate_session_token 'member' (SEC.C.6, igual
-- que get_my_notifications / mark_my_notifications_read).
--
-- REVERT copy-paste:
--   DROP FUNCTION IF EXISTS public.clear_my_notifications(text, uuid);
--   -- get_my_notifications: re-ejecutar el bloque 2 de
--   --   20260811f_sec_c6_notifications_inbox.sql
--   ALTER TABLE public.notifications DROP COLUMN IF EXISTS cleared_at;
-- ============================================================

BEGIN;

-- ── 1. Columna de limpieza (soft) ────────────────────────────
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS cleared_at timestamptz;

-- ── 2. get_my_notifications — solo las NO limpiadas ──────────
CREATE OR REPLACE FUNCTION public.get_my_notifications(
  p_session_token text,
  p_limit integer DEFAULT 50
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mid uuid;
BEGIN
  v_mid := public.validate_session_token(p_session_token, 'member', 'get_my_notifications', false, NULL);
  RETURN QUERY
    SELECT jsonb_build_object(
      'id', n.id, 'type', n.type, 'title', n.title, 'body', n.body,
      'data', n.data, 'sent_at', n.sent_at, 'read_at', n.read_at
    )
    FROM notifications n
    WHERE n.member_id = v_mid
      AND n.cleared_at IS NULL
    ORDER BY n.sent_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_my_notifications(text, integer) TO anon, authenticated;

-- ── 3. clear_my_notifications — una (por id) o todas (NULL) ──
CREATE OR REPLACE FUNCTION public.clear_my_notifications(
  p_session_token text,
  p_notification_id uuid DEFAULT NULL
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
  v_mid := public.validate_session_token(p_session_token, 'member', 'clear_my_notifications', false, NULL);
  UPDATE notifications
  SET cleared_at = now(),
      read_at    = COALESCE(read_at, now())  -- limpiar implica leer
  WHERE member_id = v_mid
    AND cleared_at IS NULL
    AND (p_notification_id IS NULL OR id = p_notification_id);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'cleared', v_n);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.clear_my_notifications(text, uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.clear_my_notifications(text, uuid) IS
'Inbox de la campana (14-ago): limpia notificaciones del propio miembro — soft delete (cleared_at, la fila sobrevive como log/dedupe del motor de push). Con p_notification_id limpia esa; con NULL limpia todas las visibles. Sesión de miembro obligatoria.';

COMMIT;

-- ============================================================
-- VERIFICAR tras ejecutar (SQL Editor):
--   1. \d notifications → columna cleared_at presente.
--   2. Con un token de miembro:
--      SELECT public.clear_my_notifications('<token>', '<id de una suya>');
--      → {ok:true, cleared:1} y get_my_notifications ya no la lista.
--   3. SELECT public.clear_my_notifications('<token>');  -- todas
--      → get_my_notifications devuelve 0 filas; las filas SIGUEN en la
--        tabla (SELECT count(*) como service role no cambia).
--   4. Un id ajeno → cleared:0 (no toca filas de otros).
-- El INSERT del motor (service key) no se ve afectado.
-- ============================================================

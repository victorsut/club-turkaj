-- ============================================================
-- SEC.C.6 (bloque 1B) — CERRAR EL INBOX `notifications`
-- ============================================================
-- Auditoría 11-ago: la tabla `notifications` tenía SELECT abierto
-- (policy USING(true) + GRANT a anon/authenticated) — cualquiera con
-- el anon key leía la bandeja de TODOS los miembros (nombre del
-- operador, puntos, montos, cambios de nivel, premios). Fuga de PII
-- equivalente a la que SEC.C.2 cerró en activity_log/purchases.
--
-- CIERRE (patrón get_my_redemptions): se revoca la lectura/escritura
-- directa; el cliente lee su propia bandeja y marca leídas por RPC con
-- sesión de miembro. El motor de push sigue INSERTando con la service
-- key (bypassa RLS) — no se toca.
-- ============================================================

-- ── 1. Revocar lectura/escritura directa ─────────────────────
DROP POLICY IF EXISTS notifications_select_open ON public.notifications;
DROP POLICY IF EXISTS notifications_mark_read   ON public.notifications;
REVOKE SELECT              ON public.notifications FROM anon, authenticated;
REVOKE UPDATE (read_at)    ON public.notifications FROM anon, authenticated;
REVOKE UPDATE              ON public.notifications FROM anon, authenticated;

-- ── 2. get_my_notifications — inbox del propio miembro ───────
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
    ORDER BY n.sent_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_my_notifications(text, integer) TO anon, authenticated;

-- ── 3. mark_my_notifications_read — marca las no leídas ──────
CREATE OR REPLACE FUNCTION public.mark_my_notifications_read(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mid uuid;
  v_n   integer;
BEGIN
  v_mid := public.validate_session_token(p_session_token, 'member', 'mark_my_notifications_read', false, NULL);
  UPDATE notifications SET read_at = now()
  WHERE member_id = v_mid AND read_at IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'marked', v_n);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.mark_my_notifications_read(text) TO anon, authenticated;

-- ============================================================
-- VERIFICAR tras ejecutar:
--   1. Como anon (anon key), SELECT sobre notifications → 0 filas o
--      permission denied (antes: todas las filas de todos).
--   2. get_my_notifications(<token de miembro>) → solo las suyas.
--   3. La campana del cliente sigue mostrando su inbox (frontend nuevo).
-- El INSERT del motor (pushToMembers, service key) NO se ve afectado.
-- ⚠️ Ejecutar junto con el deploy del frontend que usa los RPCs; entre
-- ambos, la campana de un cliente cacheado queda vacía hasta recargar.
-- ============================================================

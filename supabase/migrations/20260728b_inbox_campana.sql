-- ═══════════════════════════════════════════════════════════════
-- CAMPANA + INBOX DE NOTIFICACIONES (28-jul-2026)
--
-- El cliente consulta sus notificaciones desde el ícono de campana
-- del inicio y las marca como leídas al abrir el inbox.
--
-- 1. Se dropea la policy restrictiva "Deny all by default" (gotcha
--    del proyecto: el event trigger ensure_rls la agrega a toda
--    tabla nueva y anula las permisivas).
-- 2. SELECT abierto — mismo modelo de lectura que el resto de las
--    tablas del cliente (SEC.C endurecerá todas juntas cuando haya
--    sesiones de miembro).
-- 3. UPDATE permitido pero SOLO sobre la columna read_at (grant a
--    nivel de columna): el cliente puede marcar leído y nada más.
--    INSERT/DELETE quedan sin policy → solo la service key escribe.
-- 4. La tabla entra a la publicación Realtime: el badge de la
--    campana se actualiza en vivo cuando el motor inserta.
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Deny all by default" ON public.notifications;

CREATE POLICY notifications_select_open ON public.notifications
  FOR SELECT USING (true);

CREATE POLICY notifications_mark_read ON public.notifications
  FOR UPDATE USING (true) WITH CHECK (true);

-- Column-level: el cliente solo puede tocar read_at
REVOKE UPDATE ON public.notifications FROM anon, authenticated;
GRANT UPDATE (read_at) ON public.notifications TO anon, authenticated;

-- Realtime para el badge en vivo (idempotente)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

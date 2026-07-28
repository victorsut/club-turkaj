-- ═══════════════════════════════════════════════════════════════
-- FIX CRÍTICO: re-suscripción push bloqueada (28-jul-2026)
--
-- push_subscriptions tenía la policy RESTRICTIVA "Deny all by
-- default" (event trigger ensure_rls) CONVIVIENDO con la permisiva
-- push_subscriptions_open — la restrictiva ANULA la permisiva
-- (gotcha conocido del proyecto), así que el upsert de suscripción
-- del cliente (anon key) FALLABA EN SILENCIO en cada apertura.
--
-- Consecuencia observada hoy: cuando los endpoints viejos expiraron
-- y el motor los limpió (410 → delete con service key), NADIE pudo
-- volver a suscribirse → tabla vacía → sent:0 → ninguna notificación
-- llega a ningún dispositivo.
--
-- El fix: dropear la restrictiva. La permisiva existente queda como
-- única policy (mismo modelo abierto del resto de tablas cliente;
-- SEC.C endurecerá todas juntas).
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Deny all by default" ON public.push_subscriptions;

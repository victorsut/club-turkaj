-- ═══════════════════════════════════════════════════════════════
-- MOTOR DE NOTIFICACIONES (28-jul-2026)
--
-- 1. Tabla `notifications` — registro de toda notificación push
--    enviada a un miembro. Sirve para:
--      · dedupe (no repetir la misma alerta el mismo día)
--      · base del futuro centro de notificaciones in-app
--        (campana + inbox, Apéndice C del ROADMAP): read_at ya
--        existe para marcar leídas.
--    Solo la escribe/lee la service key (serverless de Vercel).
--    El event trigger ensure_rls le pondrá la policy restrictiva
--    "Deny all by default" — CORRECTO acá: el cliente no la toca.
--    Cuando se construya el inbox, agregar policy de SELECT por
--    miembro en esa migración.
--
-- 2. RPC `list_degradation_alerts()` — candidatos a alerta de
--    inactividad (día >= 11). Calca el cálculo de actividad de
--    apply_due_degradations (GREATEST de last_buy, activity_log
--    de tipos activos y enabled_at) para que el aviso y el motor
--    nunca discrepen. Devuelve vacío si el motor está APAGADO
--    (program_config.degradation_enabled) — el cron de Vercel
--    puede correr siempre; no molesta a nadie hasta el encendido.
--    EXECUTE revocado a anon/authenticated: solo service key.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Tabla de notificaciones ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  type       text NOT NULL DEFAULT 'general',
  title      text,
  body       text,
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at    timestamptz NOT NULL DEFAULT now(),
  read_at    timestamptz
);

CREATE INDEX IF NOT EXISTS notifications_member_sent_idx
  ON public.notifications (member_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS notifications_dedupe_idx
  ON public.notifications (member_id, type, sent_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.notifications IS
'Registro de notificaciones push enviadas (motor 28-jul-2026). Escrita solo
por la service key desde los endpoints de Vercel. read_at reservado para el
futuro inbox in-app (campana, Apéndice C).';

-- ── 2. RPC de candidatos a alerta de degradación ───────────────
CREATE OR REPLACE FUNCTION public.list_degradation_alerts()
RETURNS TABLE (
  member_id     uuid,
  member_name   text,
  base_tier     text,     -- tier de ORIGEN del ciclo (define umbrales)
  days_inactive integer,  -- días desde la última actividad (o enabled_at)
  reset_day     integer,  -- día del reinicio total: BLACK 75 · PLATINO 60 · ORO 45
  gallons       numeric,
  points        integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cfg        jsonb;
  v_enabled_at timestamptz;
  v_black_gal  numeric := 500;
  v_plat_gal   numeric := 150;
BEGIN
  -- Motor apagado → sin alertas (mismo interruptor del motor real)
  SELECT value INTO v_cfg FROM program_config WHERE key = 'degradation_enabled';
  IF v_cfg IS NULL OR COALESCE((v_cfg ->> 'enabled')::boolean, false) IS NOT TRUE THEN
    RETURN;
  END IF;
  v_enabled_at := COALESCE((v_cfg ->> 'enabled_at')::timestamptz, now());

  SELECT COALESCE((value -> 'black'   ->> 'gal')::numeric, 500),
         COALESCE((value -> 'platino' ->> 'gal')::numeric, 150)
    INTO v_black_gal, v_plat_gal
  FROM program_config WHERE key = 'tiers';

  RETURN QUERY
  SELECT
    m.id,
    m.name,
    t.tier,
    d.days,
    CASE t.tier WHEN 'BLACK' THEN 75 WHEN 'PLATINO' THEN 60 ELSE 45 END,
    m.gallons,
    m.points
  FROM members m
  CROSS JOIN LATERAL (
    -- Misma definición de ACTIVIDAD que apply_due_degradations
    SELECT floor(extract(epoch FROM (now() - GREATEST(
      COALESCE(m.last_buy, m.created_at),
      COALESCE((
        SELECT max(a.created_at) FROM activity_log a
        WHERE a.member_id = m.id
          AND (a.activity_type IN ('compra', 'encuesta', 'canje', 'entrega')
               OR (a.activity_type = 'rifa' AND COALESCE(a.points_change, 0) < 0))
      ), '-infinity'::timestamptz),
      v_enabled_at
    ))) / 86400)::integer AS days
  ) d
  CROSS JOIN LATERAL (
    SELECT CASE WHEN COALESCE(m.degrade_base_gal, m.gallons) >= v_black_gal THEN 'BLACK'
                WHEN COALESCE(m.degrade_base_gal, m.gallons) >= v_plat_gal  THEN 'PLATINO'
                ELSE 'ORO' END AS tier
  ) t
  WHERE m.degrade_stage < 3   -- ya reiniciados: nada que avisar
    AND d.days >= 11;         -- las alertas arrancan el día 11 (decisión 28-jul)
END;
$function$;

COMMENT ON FUNCTION public.list_degradation_alerts() IS
'Candidatos a alerta push de degradación (día >= 11 de inactividad, decisión
28-jul-2026). Mismo cálculo de actividad y mismo interruptor que
apply_due_degradations — apagado el motor, devuelve vacío. Solo service key:
la consume /api/degradation-alerts (cron diario de Vercel).';

-- Solo la service key puede ejecutarla
REVOKE EXECUTE ON FUNCTION public.list_degradation_alerts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_degradation_alerts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_degradation_alerts() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.list_degradation_alerts() TO service_role;

-- ═══════════════════════════════════════════════════════════════
-- FIX — activity_type 'entrega' en el CHECK de activity_log
-- (29-jul-2026, reporte del dueño: "Error al entregar: ... violates
--  check constraint activity_log_activity_type_check")
--
-- El CHECK nunca incluyó 'entrega': el INSERT viejo del cliente
-- (logActivity de OpRedeem) llevaba FALLANDO EN SILENCIO desde el
-- inicio (fire-and-forget — hay CERO filas 'entrega' en la tabla).
-- Al mover el registro al servidor (deliver_redemption, SEC.C.3) el
-- error se volvió visible y bloqueaba la entrega.
--
-- 1. Se amplía el CHECK con 'entrega'.
-- 2. BACKFILL: se reconstruyen las entregas históricas desde
--    redemptions (collected + collected_at) — el rastro que nunca se
--    guardó. Idempotente: no duplica si ya existe una fila 'entrega'
--    del miembro con esa fecha.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.activity_log
  DROP CONSTRAINT IF EXISTS activity_log_activity_type_check;
ALTER TABLE public.activity_log
  ADD CONSTRAINT activity_log_activity_type_check
  CHECK (activity_type = ANY (ARRAY[
    'compra'::text, 'canje'::text, 'encuesta'::text, 'rifa'::text,
    'referido'::text, 'registro'::text, 'evento'::text, 'wifi'::text,
    'degradacion'::text, 'vehiculo'::text, 'registro_vehiculos'::text,
    'entrega'::text
  ]));

-- Backfill de entregas históricas (rastro perdido por el CHECK)
INSERT INTO public.activity_log (member_id, activity_type, description, points_change, created_at)
SELECT rd.member_id, 'entrega',
       'Premio entregado: ' || COALESCE(rw.name, 'Premio'), 0, rd.collected_at
FROM public.redemptions rd
LEFT JOIN public.rewards rw ON rw.id = rd.reward_id
WHERE rd.collected = true
  AND rd.collected_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.activity_log a
    WHERE a.member_id = rd.member_id
      AND a.activity_type = 'entrega'
      AND a.created_at = rd.collected_at
  );

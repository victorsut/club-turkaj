-- ============================================================
-- 20260725c — Modal de ganador de rifa visto (cross-device)
-- ============================================================
-- Bug reportado por el dueño (25-jul-2026): el modal de felicitación
-- al ganador se marcaba como visto SOLO en localStorage
-- (pp_rafwin_<id>), que es por dispositivo — al abrir la app en otro
-- celular volvía a aparecer.
--
-- Fix: la marca vive en el servidor. El modal se muestra únicamente
-- si winner_seen_at IS NULL; al cerrarlo, el cliente lo estampa.
-- localStorage queda como guarda instantánea secundaria.
-- ============================================================

ALTER TABLE raffle_calendar ADD COLUMN IF NOT EXISTS winner_seen_at timestamptz;

COMMENT ON COLUMN raffle_calendar.winner_seen_at IS
'Momento en que el GANADOR cerró el modal de felicitación. NULL = aún no lo ha visto (el modal aparecerá al abrir la app). Cross-device.';

-- Backfill: los ganadores de rifas ya sorteadas ya vieron su modal en
-- algún dispositivo (el bug era justamente que reaparecía en otros).
-- Se marcan como vistos para que el deploy no les repita la felicitación.
-- Si se quisiera re-mostrar a alguno: UPDATE ... SET winner_seen_at = NULL WHERE id = ...
UPDATE raffle_calendar SET winner_seen_at = now()
WHERE winner_id IS NOT NULL AND winner_seen_at IS NULL;

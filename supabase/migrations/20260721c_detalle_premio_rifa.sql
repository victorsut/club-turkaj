-- 20260721c — Detalle largo del premio de la rifa (texto libre):
-- descripción del regalo y dónde pasar a recogerlo. Se muestra SOLO en
-- el modal de felicitación del GANADOR (RaffleWinnerModal); NO aparece
-- en la ventana de Rifa. Editable desde el admin (form de rifas).

ALTER TABLE raffle_calendar ADD COLUMN IF NOT EXISTS prize_detail text;
COMMENT ON COLUMN raffle_calendar.prize_detail IS 'Detalle solo para el ganador: descripción del regalo y lugar de entrega (pre-line).';

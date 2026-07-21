-- 20260721 — Horarios de atención por estación (modal Ubicación).
-- Dato de empresa configurable en la tabla stations (sin hardcoding).
-- El cliente lo lee vía fetchStations (select *); si está NULL la fila
-- de horario simplemente no se muestra.

ALTER TABLE stations ADD COLUMN IF NOT EXISTS schedule text;

COMMENT ON COLUMN stations.schedule IS 'Horario de atención mostrado en el modal Ubicación (texto libre, ej. "5:00 am – 9:30 pm")';

UPDATE stations SET schedule = '5:00 am – 9:30 pm'  WHERE name = 'Turkaj I';
UPDATE stations SET schedule = '5:00 am – 9:00 pm'  WHERE name = 'Turkaj II';
UPDATE stations SET schedule = '5:00 am – 10:00 pm' WHERE name = 'Turkaj III';

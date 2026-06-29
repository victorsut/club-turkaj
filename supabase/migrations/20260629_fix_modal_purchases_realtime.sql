-- ============================================================
-- Club Turkaj / Puntos+ — FIX-MODAL: publicar `purchases` en Realtime
-- ============================================================
-- CONTEXTO: el modal de calificación de operador (estrellas) se
-- disparaba mal en compras de rifa (y potencialmente canje/encuesta/
-- bono). Causa raíz confirmada con log de producción: el handler
-- Realtime de `members` infiere "hubo combustible" por el delta
-- `newVisits > prevVisits`, comparando contra una línea base
-- (lastVisitsRef) que solo refleja los eventos que el device alcanzó
-- a procesar — no la verdad de la DB. Cuando el ref queda stale-bajo
-- (evento de combustible perdido por suspensión del socket, o seed
-- desde caché vieja), el SIGUIENTE UPDATE cualquiera de `members`
-- (la rifa, que solo cambia points/tickets) entrega el `visits` real
-- (más alto) y tripea la condición, abriendo el modal con el
-- `last_operator_id` pegajoso (operador equivocado).
--
-- FIX DE FONDO (opción b): reemplazar la inferencia por delta de
-- visits con una suscripción Realtime a INSERT de `purchases`. Una
-- fila de `purchases` se crea SOLO por register_purchase (combustible)
-- y trae operator_id + station_id directos. Así rifa/canje/encuesta
-- quedan ESTRUCTURALMENTE incapaces de abrir el modal, y el operador
-- calificado sale de la compra real (sin last_operator_id pegajoso,
-- sin delta de visits, sin ref stale).
--
-- ESTA MIGRACIÓN (PARTE A): es el pre-requisito del cambio de cliente.
-- Agrega `purchases` a la publicación `supabase_realtime` para que el
-- cliente reciba los INSERT de SUS compras. SIN esto, el cliente se
-- suscribe pero no recibe nada (fallo silencioso) → se aplica ANTES
-- que el código del cliente.
--
-- RLS: `purchases` ya tiene 2 policies abiertas (using=true) → el
-- cliente recibe sus filas por Realtime (Realtime respeta RLS de
-- SELECT). NO hace falta policy nueva en esta migración.
--
-- IDEMPOTENTE: re-ejecutable sin error (chequea pg_publication_tables
-- antes de agregar). ALTER PUBLICATION ... ADD TABLE falla si la tabla
-- ya está publicada, de ahí el guard.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname   = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'purchases'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.purchases;
    RAISE NOTICE 'FIX-MODAL: public.purchases agregada a supabase_realtime.';
  ELSE
    RAISE NOTICE 'FIX-MODAL: public.purchases ya estaba en supabase_realtime — no-op.';
  END IF;
END $$;

-- ============================================================
-- VERIFICACIÓN POST-APLICACIÓN (correr a mano en el SQL Editor):
--
--   SELECT schemaname, tablename
--   FROM pg_publication_tables
--   WHERE pubname = 'supabase_realtime'
--     AND tablename = 'purchases';
--
-- Debe devolver exactamente 1 fila: (public, purchases).
-- Si devuelve 0 filas, la publicación no se aplicó y el modal nuevo
-- NO recibirá eventos.
-- ============================================================

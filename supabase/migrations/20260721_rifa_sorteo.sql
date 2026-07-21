-- 20260721 — Rifa mensual: imagen real del premio + sorteo automático
-- ponderado por boletos + premio como canje exclusivo del ganador.
--
-- SORTEO "PEREZOSO": draw_due_raffles() se invoca en cada apertura de la
-- app (App.jsx, antes de cargar raffle_calendar). Sortea toda rifa cuyo
-- mes YA TERMINÓ (hora de Guatemala) y aún no tiene ganador, ponderando
-- por cantidad de boletos comprados (más boletos = más probabilidad).
-- Idempotente + FOR UPDATE SKIP LOCKED: dos clientes simultáneos no
-- pueden sortear dos veces. El ganador se entera al abrir la app al día
-- siguiente (modal de felicitación estilo día festivo) y su premio queda
-- como redemption costo-0 (código TK, entrega normal en estación).
-- Nota: la app LEE los boletos desde raffle_tickets (la tabla que llena
-- el RPC buy_raffle_tickets); raffle_entries quedó obsoleta.

-- 1) Imagen real del premio (opcional; si es NULL el cliente muestra el
--    ícono SVG adecuado según el nombre del premio)
ALTER TABLE raffle_calendar ADD COLUMN IF NOT EXISTS prize_image_url text;
COMMENT ON COLUMN raffle_calendar.prize_image_url IS 'URL de la imagen real del premio (Storage o externa). NULL = fallback a ícono.';

-- 2) Sorteo ponderado de rifas vencidas
CREATE OR REPLACE FUNCTION public.draw_due_raffles()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  r            record;
  v_total      integer;
  v_pick       integer;
  v_winner     uuid;
  v_reward_id  uuid;
  v_code       text;
  v_month_name text;
  v_drawn      integer := 0;
  months       text[] := ARRAY['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
BEGIN
  FOR r IN
    SELECT rc.* FROM raffle_calendar rc
    WHERE rc.winner_id IS NULL
      -- el mes de la rifa ya terminó en hora de Guatemala
      AND (make_date(rc.year, rc.month, 1) + interval '1 month') <= ((now() AT TIME ZONE 'America/Guatemala')::date)
      AND EXISTS (SELECT 1 FROM raffle_tickets rt WHERE rt.raffle_id = rc.id)
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT COALESCE(SUM(quantity), 0) INTO v_total
    FROM raffle_tickets WHERE raffle_id = r.id;
    IF v_total <= 0 THEN CONTINUE; END IF;

    -- Boleto ganador al azar en [1..total]; el ganador es el miembro en
    -- cuyo rango acumulado cae — ponderación exacta por boletos.
    v_pick := floor(random() * v_total)::integer + 1;

    SELECT member_id INTO v_winner
    FROM (
      SELECT member_id, SUM(SUM(quantity)) OVER (ORDER BY member_id) AS cum
      FROM raffle_tickets
      WHERE raffle_id = r.id
      GROUP BY member_id
    ) s
    WHERE s.cum >= v_pick
    ORDER BY s.cum
    LIMIT 1;

    IF v_winner IS NULL THEN CONTINUE; END IF;

    UPDATE raffle_calendar SET winner_id = v_winner, drawn_at = now()
    WHERE id = r.id;

    v_month_name := months[r.month];

    -- Premio como canje EXCLUSIVO del ganador: reward oculto del catálogo
    -- (active=false) + redemption costo 0 con código TK estándar.
    INSERT INTO rewards (name, icon, points_cost, category, active, description)
    VALUES (
      r.prize_name, COALESCE(r.prize_icon, '🎁'), 0, 'merch', false,
      'Premio de la rifa de ' || v_month_name || ' ' || r.year ||
      ' (Q' || r.prize_value || '). Exclusivo del ganador del sorteo.'
    )
    RETURNING id INTO v_reward_id;

    v_code := 'TK-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));

    INSERT INTO redemptions (member_id, reward_id, points_spent, redemption_code, collected, confirm_status)
    VALUES (v_winner, v_reward_id, 0, v_code, false, 'none');

    INSERT INTO activity_log (member_id, activity_type, description, points_change)
    VALUES (
      v_winner, 'rifa',
      'Ganaste la rifa de ' || v_month_name || ': ' || r.prize_name, 0
    );

    v_drawn := v_drawn + 1;
  END LOOP;

  RETURN jsonb_build_object('drawn', v_drawn);
END;
$$;

GRANT EXECUTE ON FUNCTION public.draw_due_raffles() TO anon, authenticated;

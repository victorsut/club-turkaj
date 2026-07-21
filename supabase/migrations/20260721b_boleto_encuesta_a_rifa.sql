-- 20260721b — El boleto GRATIS de la 5ª encuesta debe participar en la
-- rifa del MES EN CURSO. Antes complete_survey solo incrementaba
-- members.tickets (contador de por vida) y el boleto nunca entraba a
-- raffle_tickets — no contaba en ningún sorteo ni aparecía en la
-- pestaña Rifa. Regla confirmada por el dueño (21-jul): cada premio se
-- sortea SOLO entre los boletos comprados/ganados en su propio mes.

CREATE OR REPLACE FUNCTION public.complete_survey(p_member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_today_count    integer;
  v_daily_limit    integer;
  v_pts            integer;
  v_bonus          boolean := false;
  v_member_points  integer;
  v_member_tickets integer;
  v_raffle_id      uuid;
BEGIN
  SELECT
    (value->>'surveyDaily')::integer,
    (value->>'surveyPts')::integer
  INTO v_daily_limit, v_pts
  FROM program_config WHERE key = 'general';

  IF v_daily_limit IS NULL THEN v_daily_limit := 5; END IF;
  IF v_pts IS NULL THEN v_pts := 3; END IF;

  SELECT COUNT(*) INTO v_today_count
  FROM surveys
  WHERE member_id = p_member_id AND DATE(created_at) = CURRENT_DATE;

  IF v_today_count >= v_daily_limit THEN
    RETURN jsonb_build_object('error', 'Límite diario alcanzado');
  END IF;

  v_bonus := (v_today_count + 1) >= v_daily_limit;

  INSERT INTO surveys (member_id, points_earned, bonus_ticket)
  VALUES (p_member_id, v_pts, v_bonus);

  SELECT points, tickets INTO v_member_points, v_member_tickets
  FROM members WHERE id = p_member_id;

  -- Autoriza el trigger BEFORE UPDATE de FB.7 (cuando exista).
  PERFORM set_config('app.allow_points_write', 'true', true);

  UPDATE members SET
    points     = points + v_pts,
    tickets    = CASE WHEN v_bonus THEN COALESCE(tickets, 0) + 1 ELSE tickets END,
    updated_at = now()
  WHERE id = p_member_id;

  -- Boleto bonus → rifa del mes en curso (hora de Guatemala). Si no hay
  -- rifa configurada para el mes, el boleto solo queda en el contador.
  IF v_bonus THEN
    SELECT id INTO v_raffle_id
    FROM raffle_calendar
    WHERE month = EXTRACT(MONTH FROM (now() AT TIME ZONE 'America/Guatemala'))::integer
      AND year  = EXTRACT(YEAR  FROM (now() AT TIME ZONE 'America/Guatemala'))::integer
    LIMIT 1;

    IF v_raffle_id IS NOT NULL THEN
      INSERT INTO raffle_tickets (member_id, raffle_id, quantity, points_spent)
      VALUES (p_member_id, v_raffle_id, 1, 0);
    END IF;
  END IF;

  INSERT INTO activity_log (
    member_id, activity_type, description, points_change
  )
  VALUES (
    p_member_id, 'encuesta',
    'Encuesta completada' || CASE WHEN v_bonus THEN ' + Boleto bonus' ELSE '' END,
    v_pts
  );

  RETURN jsonb_build_object(
    'points',           v_pts,
    'count',            v_today_count + 1,
    'limit',            v_daily_limit,
    'bonus_ticket',     v_bonus,
    'remaining_points', COALESCE(v_member_points, 0) + v_pts,
    'new_ticket_total', COALESCE(v_member_tickets, 0) + (CASE WHEN v_bonus THEN 1 ELSE 0 END)
  );
END;
$function$;

-- ============================================================
-- 20260725 — Costo de boleto CONFIGURABLE POR RIFA
-- ============================================================
-- Pedido del dueño (25-jul-2026): cada rifa mensual (cada premio)
-- puede tener su propio costo de boleto en puntos.
--
-- 1. raffle_calendar.ticket_points (integer, NULL) — costo de UN
--    boleto para ESA rifa. NULL = usa el ticketPts global de
--    program_config (default 5), igual que hasta hoy. Las rifas
--    existentes quedan en NULL → cero cambio de comportamiento
--    hasta que el admin fije un costo propio.
--
-- 2. buy_raffle_tickets: resuelve el costo desde la fila de la
--    rifa (COALESCE con el global). El cuerpo es el de SEC.B.6.1
--    con ese único cambio — la validación de sesión (p_allow_null
--    = true, vector cliente con token NULL legítimo) queda INTACTA.
-- ============================================================

ALTER TABLE raffle_calendar ADD COLUMN IF NOT EXISTS ticket_points integer;

COMMENT ON COLUMN raffle_calendar.ticket_points IS
'Costo en puntos de 1 boleto para ESTA rifa. NULL = usa el ticketPts global de program_config (default 5).';

CREATE OR REPLACE FUNCTION public.buy_raffle_tickets(p_member_id uuid, p_raffle_id uuid, p_quantity integer, p_session_token text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_ticket_pts     integer;
  v_raffle_pts     integer;
  v_cost           integer;
  v_member_points  integer;
  v_member_tickets integer;
  v_session_role_id uuid;
BEGIN
  -- SEC.B.6.1: validación de sesión. p_allow_null=true:
  -- token NULL = vector cliente legítimo → skip silencioso (SEC.C).
  v_session_role_id := public.validate_session_token(
    p_session_token, 'operator', 'buy_raffle_tickets', true,
    jsonb_build_object('member_id', p_member_id, 'raffle_id', p_raffle_id, 'quantity', p_quantity)
  );

  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RETURN jsonb_build_object('error', 'Cantidad inválida');
  END IF;

  -- Costo por rifa (25-jul-2026): la fila de la rifa manda; si su
  -- ticket_points es NULL cae al global de program_config.
  SELECT ticket_points INTO v_raffle_pts
  FROM raffle_calendar WHERE id = p_raffle_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Rifa no encontrada');
  END IF;

  IF v_raffle_pts IS NOT NULL AND v_raffle_pts >= 1 THEN
    v_ticket_pts := v_raffle_pts;
  ELSE
    SELECT (value->>'ticketPts')::integer INTO v_ticket_pts
    FROM program_config WHERE key = 'general';
    IF v_ticket_pts IS NULL THEN v_ticket_pts := 5; END IF;
  END IF;

  v_cost := p_quantity * v_ticket_pts;

  SELECT points, tickets INTO v_member_points, v_member_tickets
  FROM members WHERE id = p_member_id;

  IF v_member_points IS NULL THEN
    RETURN jsonb_build_object('error', 'Miembro no encontrado');
  END IF;

  IF v_member_points < v_cost THEN
    RETURN jsonb_build_object('error', 'Puntos insuficientes');
  END IF;

  INSERT INTO raffle_tickets (member_id, raffle_id, quantity, points_spent)
  VALUES (p_member_id, p_raffle_id, p_quantity, v_cost);

  -- Autoriza el trigger BEFORE UPDATE de FB.7 (cuando exista).
  PERFORM set_config('app.allow_points_write', 'true', true);

  UPDATE members SET
    points     = points - v_cost,
    tickets    = COALESCE(tickets, 0) + p_quantity,
    updated_at = now()
  WHERE id = p_member_id;

  INSERT INTO activity_log (
    member_id, activity_type, description, points_change
  )
  VALUES (
    p_member_id, 'rifa',
    'Compró ' || p_quantity || ' boleto' || CASE WHEN p_quantity > 1 THEN 's' ELSE '' END || ' de rifa',
    -v_cost
  );

  RETURN jsonb_build_object(
    'tickets',          p_quantity,
    'cost',             v_cost,
    'remaining_points', v_member_points - v_cost,
    'new_ticket_total', COALESCE(v_member_tickets, 0) + p_quantity
  );
END;
$function$;

COMMENT ON FUNCTION public.buy_raffle_tickets(uuid, uuid, integer, text) IS
'Compra de boletos de rifa (doble vector cliente/operador). Costo por
boleto: raffle_calendar.ticket_points de la rifa, o ticketPts global de
program_config si es NULL (default 5). Valida puntos, descuenta, inserta
en raffle_tickets y registra activity_log ''rifa''. Sesión: SEC.B.6.1
con p_allow_null=true (token NULL legítimo del vector cliente).';

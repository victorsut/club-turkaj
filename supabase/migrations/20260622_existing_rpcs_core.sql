-- ============================================================
-- Club Turkaj + / Puntos+ — FB.1.5a: Versionado de RPCs core
-- ============================================================
-- Este archivo documenta el estado ACTUAL (snapshot del
-- 2026-06-22) de las 4 RPCs de negocio que modifican
-- members.points:
--
--   - register_purchase  (+pts por compra de combustible)
--   - redeem_reward      (-pts por canje de premio)
--   - buy_raffle_tickets (-pts por compra de boletos de rifa)
--   - complete_survey    (+pts por completar encuesta)
--
-- PROPOSITO: traer al repo el codigo que solo existia en
-- Supabase Dashboard. Permite:
-- 1. Tener historico versionado en git.
-- 2. Base para los cambios de FB.5 (agregar SET LOCAL y
--    SECURITY DEFINER cuando se active el trigger BEFORE
--    UPDATE en members.points).
-- 3. Revision de codigo y diff cuando se modifiquen.
--
-- IMPORTANTE: este archivo NO debe ejecutarse en Supabase. Las
-- funciones YA EXISTEN en BD. Si se ejecuta, sobrescribira con
-- el mismo codigo (CREATE OR REPLACE es idempotente).
--
-- ESTADO ACTUAL OBSERVADO:
--
-- 1. Las 4 RPCs son SECURITY INVOKER (no DEFINER). FB.5 las
--    convertira a DEFINER para mayor control de permisos.
--
-- 2. Ninguna tiene SET search_path. FB.5 lo agregara para
--    defensa en profundidad.
--
-- 3. Las 4 son atomicas (UPDATE members + INSERT activity_log
--    en misma transaccion). Esto descarta que el caso Angel
--    Macario (+21 pts sin trazabilidad) haya venido de estas
--    RPCs.
--
-- 4. Permisos actuales: EXECUTE a anon y authenticated. Riesgo:
--    cliente no autenticado puede llamar register_purchase.
--    Deuda de seguridad SEPARADA de FB (anotada para revision).
--
-- 5. activity_log es el unico log que escriben. NO escriben en
--    admin_audit_log (correcto: son flujos de negocio, no de
--    admin). FB.7 (trigger) las marcara como autorizadas via
--    session variable.
--
-- 6. register_purchase incluye logica de tier change que
--    actualiza physical_cards (UPDATE adicional). El trigger
--    de FB.7 debe permitir esto porque NO toca points.
--
-- DEUDA ANOTADA (FUERA DE ALCANCE FB):
--
-- - Permisos a anon en RPCs de negocio (riesgo de spam de
--   compras falsas). Resolver con autenticacion JWT.
-- - SET search_path ausente. Fortalecimiento de seguridad
--   general.
-- ============================================================


-- ============================================================
-- 1. register_purchase
-- ============================================================
-- Caso de uso: operador registra una compra del cliente.
-- Calcula galones, otorga puntos, actualiza balances, detecta
-- cambio de tier y actualiza physical_cards si aplica.
-- ============================================================

CREATE OR REPLACE FUNCTION public.register_purchase(p_member_id uuid, p_operator_id uuid, p_station_id uuid, p_amount numeric, p_fuel_type text, p_invoice_no text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_fuel_prices  jsonb;
  v_fuel_price   numeric;
  v_gallons      numeric;
  v_points       integer;
  v_q_per_pt     integer;
  v_purchase_id  uuid;
  v_old_gallons  numeric;
  v_new_gallons  numeric;
  v_old_tier     text;
  v_new_tier     text;
  v_card_id      uuid;
  v_old_code     text;
  v_new_code     text;
  v_correlative  text;
  v_tier_prefix  text;
BEGIN
  -- Validar input
  IF p_amount IS NULL OR p_amount < 10 THEN
    RETURN jsonb_build_object('error', 'Mínimo Q10');
  END IF;

  -- Leer precios de combustible desde config
  SELECT value INTO v_fuel_prices
  FROM program_config WHERE key = 'fuel_prices';

  IF v_fuel_prices IS NULL THEN
    -- Fallback si la key no existe
    v_fuel_prices := '{"super": 31.49, "regular": 30.99, "diesel": 28.99}'::jsonb;
  END IF;

  v_fuel_price := COALESCE(
    (v_fuel_prices->>p_fuel_type)::numeric,
    (v_fuel_prices->>'regular')::numeric
  );

  -- Calcular galones y puntos
  v_gallons := ROUND(p_amount / v_fuel_price, 2);

  SELECT (value->>'qPerPt')::integer INTO v_q_per_pt
  FROM program_config WHERE key = 'general';
  IF v_q_per_pt IS NULL OR v_q_per_pt = 0 THEN
    v_q_per_pt := 10; -- fallback
  END IF;

  v_points := FLOOR(p_amount / v_q_per_pt);

  -- Snapshot de galones actuales para detectar tier change
  SELECT gallons, card_id INTO v_old_gallons, v_card_id
  FROM members WHERE id = p_member_id;

  IF v_old_gallons IS NULL THEN
    RETURN jsonb_build_object('error', 'Miembro no encontrado');
  END IF;

  v_new_gallons := v_old_gallons + v_gallons;
  v_old_tier := get_member_tier(v_old_gallons);
  v_new_tier := get_member_tier(v_new_gallons);

  -- 1. Crear registro de compra
  INSERT INTO purchases (
    member_id, operator_id, station_id,
    amount, fuel_type, gallons, points_earned, invoice_no
  )
  VALUES (
    p_member_id, p_operator_id, p_station_id,
    p_amount, p_fuel_type, v_gallons, v_points, p_invoice_no
  )
  RETURNING id INTO v_purchase_id;

  -- 2. Actualizar miembro
  UPDATE members SET
    points  = points + v_points,
    gallons = gallons + v_gallons,
    spent   = spent + p_amount,
    visits  = visits + 1,
    last_buy = now(),
    last_operator_id = p_operator_id,
    updated_at = now()
  WHERE id = p_member_id;

  -- 3. Actividad
  INSERT INTO activity_log (
    member_id, activity_type, description, points_change, amount, station_id
  )
  VALUES (
    p_member_id, 'compra',
    'Compra ' || v_gallons || ' gal ' || p_fuel_type || ' · Q' || p_amount,
    v_points, p_amount, p_station_id
  );

  -- 4. Si hay cambio de tier → actualizar physical_cards
  IF v_old_tier <> v_new_tier AND v_card_id IS NOT NULL THEN
    SELECT card_code INTO v_old_code
    FROM physical_cards WHERE id = v_card_id;

    -- Extraer correlativo (parte numérica) del código viejo
    v_correlative := substring(v_old_code FROM '\d+$');

    IF v_correlative IS NOT NULL THEN
      v_tier_prefix := CASE v_new_tier
        WHEN 'ORO'     THEN 'CTOD'
        WHEN 'PLATINO' THEN 'CTPD'
        WHEN 'BLACK'   THEN 'CTBD'
        ELSE 'CTOD'
      END;

      v_new_code := v_tier_prefix || '-' || v_correlative;

      UPDATE physical_cards
      SET card_code = v_new_code,
          tier = v_new_tier,
          updated_at = now()
      WHERE id = v_card_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'purchase_id',   v_purchase_id,
    'points',        v_points,
    'gallons',       v_gallons,
    'tier_changed',  v_old_tier <> v_new_tier,
    'old_tier',      v_old_tier,
    'new_tier',      v_new_tier,
    'new_card_code', v_new_code
  );
END;
$function$;


-- ============================================================
-- 2. redeem_reward
-- ============================================================
-- Caso de uso: cliente o operador canjea puntos por premio.
-- Aplica descuento por tier (BLACK 15%, PLATINO 10%), valida
-- exclusividad de tier, genera codigo unico de canje y
-- descuenta puntos.
-- ============================================================

CREATE OR REPLACE FUNCTION public.redeem_reward(p_member_id uuid, p_reward_id uuid, p_operator_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_reward    rewards%ROWTYPE;
  v_member    members%ROWTYPE;
  v_tier      text;
  v_discount  numeric;
  v_cost      integer;
  v_code      text;
  v_redemption_id uuid;
BEGIN
  SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id AND COALESCE(active, true) = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Premio no disponible');
  END IF;

  SELECT * INTO v_member FROM members WHERE id = p_member_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Miembro no encontrado');
  END IF;

  v_tier := get_member_tier(v_member.gallons);

  -- Descuento por tier
  v_discount := CASE v_tier
    WHEN 'BLACK'   THEN 0.15
    WHEN 'PLATINO' THEN 0.10
    ELSE 0
  END;

  v_cost := ROUND(v_reward.points_cost * (1 - v_discount));

  IF v_member.points < v_cost THEN
    RETURN jsonb_build_object('error', 'Puntos insuficientes');
  END IF;

  -- Exclusividad de tier
  IF v_reward.tier_exclusive IS NOT NULL
     AND v_tier <> v_reward.tier_exclusive
     AND NOT (v_reward.tier_exclusive = 'PLATINO' AND v_tier = 'BLACK') THEN
    RETURN jsonb_build_object(
      'error', 'Premio exclusivo para ' || v_reward.tier_exclusive
    );
  END IF;

  -- Generar código
  v_code := 'TK-' || upper(substring(md5(random()::text || clock_timestamp()::text), 1, 6));

  -- Crear canje (confirm_status = 'none' por default)
  INSERT INTO redemptions (
    member_id, reward_id, operator_id,
    points_spent, discount_applied, redemption_code
  )
  VALUES (
    p_member_id, p_reward_id, p_operator_id,
    v_cost, v_discount, v_code
  )
  RETURNING id INTO v_redemption_id;

  -- Descontar puntos
  UPDATE members SET
    points          = points - v_cost,
    redeemed_count  = COALESCE(redeemed_count, 0) + 1,
    updated_at      = now()
  WHERE id = p_member_id;

  -- Actividad
  INSERT INTO activity_log (
    member_id, activity_type, description, points_change
  )
  VALUES (
    p_member_id, 'canje',
    'Canjeó: ' || v_reward.name || ' ' || COALESCE(v_reward.icon, ''),
    -v_cost
  );

  RETURN jsonb_build_object(
    'redemption_id', v_redemption_id,
    'code',          v_code,
    'cost',          v_cost,
    'discount',      v_discount,
    'reward_name',   v_reward.name,
    'reward_icon',   v_reward.icon
  );
END;
$function$;


-- ============================================================
-- 3. buy_raffle_tickets
-- ============================================================
-- Caso de uso: cliente compra boletos de rifa. Cada boleto
-- cuesta ticketPts (configurable, default 5). Descuenta puntos
-- e incrementa contador de tickets.
-- ============================================================

CREATE OR REPLACE FUNCTION public.buy_raffle_tickets(p_member_id uuid, p_raffle_id uuid, p_quantity integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_ticket_pts     integer;
  v_cost           integer;
  v_member_points  integer;
  v_member_tickets integer;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RETURN jsonb_build_object('error', 'Cantidad inválida');
  END IF;

  -- Validar que la rifa exista
  IF NOT EXISTS (SELECT 1 FROM raffle_calendar WHERE id = p_raffle_id) THEN
    RETURN jsonb_build_object('error', 'Rifa no encontrada');
  END IF;

  SELECT (value->>'ticketPts')::integer INTO v_ticket_pts
  FROM program_config WHERE key = 'general';
  IF v_ticket_pts IS NULL THEN v_ticket_pts := 5; END IF;

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


-- ============================================================
-- 4. complete_survey
-- ============================================================
-- Caso de uso: cliente completa encuesta de satisfaccion.
-- Otorga puntos (default 3) y un boleto bonus cada N encuestas
-- (default 5). Valida limite diario.
-- ============================================================

CREATE OR REPLACE FUNCTION public.complete_survey(p_member_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_today_count   integer;
  v_daily_limit   integer;
  v_pts           integer;
  v_bonus         boolean := false;
  v_member_points integer;
  v_member_tickets integer;
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

  UPDATE members SET
    points     = points + v_pts,
    tickets    = CASE WHEN v_bonus THEN COALESCE(tickets, 0) + 1 ELSE tickets END,
    updated_at = now()
  WHERE id = p_member_id;

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


-- ============================================================
-- PERMISOS ACTUALES (DOCUMENTADOS)
-- ============================================================
-- Las 4 funciones tienen estos permisos en BD al 2026-06-22:
--
--   permissions: {
--     =X/postgres,
--     postgres=X/postgres,
--     anon=X/postgres,
--     authenticated=X/postgres,
--     service_role=X/postgres
--   }
--
-- En FB.5 ajustaremos a:
--   REVOKE ALL FROM PUBLIC;
--   GRANT EXECUTE TO authenticated, service_role;
-- ============================================================

-- Fin del archivo

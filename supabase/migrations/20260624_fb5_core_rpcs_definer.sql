-- ============================================================
-- Club Turkaj + / Puntos+ — FB.5: RPCs core a DEFINER + flag
-- ============================================================
-- Convierte las 4 RPCs de negocio que escriben members.points a
-- SECURITY DEFINER con search_path explicito, y agrega a las 5
-- RPCs escritoras de points el flag transaction-local
-- app.allow_points_write (preparacion para el trigger BEFORE
-- UPDATE de FB.7).
--
-- BLOQUES:
--   1. register_purchase   (core) -> DEFINER + search_path + flag
--   2. redeem_reward       (core) -> DEFINER + search_path + flag
--   3. buy_raffle_tickets  (core) -> DEFINER + search_path + flag
--   4. complete_survey     (core) -> DEFINER + search_path + flag
--   5. update_member_with_audit   -> SOLO flag (ya era DEFINER +
--      search_path desde F0.3.8; permisos sin cambios).
--
-- CAMBIOS POR BLOQUE (core 1-4):
--   - Header: + SECURITY DEFINER, + SET search_path = public, extensions.
--   - PERFORM set_config('app.allow_points_write','true',true) antes
--     del UPDATE members.
--   - REVOKE ALL FROM PUBLIC + GRANT a anon, authenticated,
--     service_role (mismos roles actuales; anon es OBLIGATORIO:
--     los operadores usan anon key via authenticate_operator).
--   - register_purchase / redeem_reward: get_member_tier()
--     calificado a public.get_member_tier() (defensa en profundidad).
--
-- ATOMICIDAD: las 5 redefiniciones van en una sola transaccion.
-- Si una falla, ninguna se aplica (rollback total). CREATE OR
-- REPLACE es idempotente; el rollback operativo es reaplicar el
-- snapshot 20260622 (core) y 20260617 (audit).
--
-- COMPATIBILIDAD: ninguna signature cambia. Los call sites del
-- cliente (rpcServices.js) NO requieren cambios.
--
-- DEPENDENCIAS:
--   - public.get_member_tier(numeric) existe (schema public).
--   - members, purchases, redemptions, raffle_tickets, surveys,
--     activity_log, physical_cards, program_config existentes.
--   - log_admin_action (usada por update_member_with_audit).
--
-- POST-FB.5:
--   - FB.6: eliminar 3 bypasses cliente (checkSpecialDayBonus ->
--     wrapper grant_special_day_bonus; OpRaffle.doBuy ->
--     buy_raffle_tickets; syncMember deja de usarse para points).
--   - FB.7: trigger BEFORE UPDATE on members, column-aware sobre
--     points (WHEN OLD.points IS DISTINCT FROM NEW.points), que
--     rechaza UPDATEs donde app.allow_points_write <> 'true'.
--   - FB.8/9: testing integral + activacion estricta.
--
-- NOTA: este archivo SI debe ejecutarse en Supabase (a diferencia
-- de 20260622, que solo documentaba el snapshot).
-- ============================================================

BEGIN;

-- ============================================================
-- BLOQUE 1 — register_purchase  (core: DEFINER + search_path + flag)
-- ============================================================
CREATE OR REPLACE FUNCTION public.register_purchase(p_member_id uuid, p_operator_id uuid, p_station_id uuid, p_amount numeric, p_fuel_type text, p_invoice_no text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions
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
  v_old_tier := public.get_member_tier(v_old_gallons);
  v_new_tier := public.get_member_tier(v_new_gallons);

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
  -- Autoriza el trigger BEFORE UPDATE de FB.7 (cuando exista).
  PERFORM set_config('app.allow_points_write', 'true', true);

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

REVOKE ALL ON FUNCTION public.register_purchase(uuid, uuid, uuid, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_purchase(uuid, uuid, uuid, numeric, text, text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.register_purchase(uuid, uuid, uuid, numeric, text, text) IS
'FB.5 — Registra compra de combustible (atomica). DEFINER + search_path=public,extensions. Setea app.allow_points_write antes del UPDATE members (prep trigger FB.7). EXECUTE: anon (operadores usan anon key), authenticated, service_role.';


-- ============================================================
-- BLOQUE 2 — redeem_reward  (core: DEFINER + search_path + flag)
-- ============================================================
CREATE OR REPLACE FUNCTION public.redeem_reward(p_member_id uuid, p_reward_id uuid, p_operator_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions
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

  v_tier := public.get_member_tier(v_member.gallons);

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
  -- Autoriza el trigger BEFORE UPDATE de FB.7 (cuando exista).
  PERFORM set_config('app.allow_points_write', 'true', true);

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

REVOKE ALL ON FUNCTION public.redeem_reward(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_reward(uuid, uuid, uuid) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.redeem_reward(uuid, uuid, uuid) IS
'FB.5 — Canjea premio por puntos (atomica). DEFINER + search_path=public,extensions. Setea app.allow_points_write antes del UPDATE members (prep trigger FB.7). EXECUTE: anon (operadores), authenticated, service_role.';


-- ============================================================
-- BLOQUE 3 — buy_raffle_tickets  (core: DEFINER + search_path + flag)
-- ============================================================
CREATE OR REPLACE FUNCTION public.buy_raffle_tickets(p_member_id uuid, p_raffle_id uuid, p_quantity integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions
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

REVOKE ALL ON FUNCTION public.buy_raffle_tickets(uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buy_raffle_tickets(uuid, uuid, integer) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.buy_raffle_tickets(uuid, uuid, integer) IS
'FB.5 — Compra boletos de rifa (atomica). DEFINER + search_path=public,extensions. Setea app.allow_points_write antes del UPDATE members (prep trigger FB.7). EXECUTE: anon, authenticated, service_role.';


-- ============================================================
-- BLOQUE 4 — complete_survey  (core: DEFINER + search_path + flag)
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_survey(p_member_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions
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

  -- Autoriza el trigger BEFORE UPDATE de FB.7 (cuando exista).
  PERFORM set_config('app.allow_points_write', 'true', true);

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

REVOKE ALL ON FUNCTION public.complete_survey(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_survey(uuid) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.complete_survey(uuid) IS
'FB.5 — Completa encuesta diaria (atomica). DEFINER + search_path=public,extensions. Setea app.allow_points_write antes del UPDATE members (prep trigger FB.7). EXECUTE: anon, authenticated, service_role.';


-- ============================================================
-- BLOQUE 5 — update_member_with_audit  (SOLO flag)
-- ============================================================
-- YA era SECURITY DEFINER + search_path=public,extensions desde
-- F0.3.8 (20260617). Unico cambio FB.5: PERFORM set_config antes
-- del UPDATE members. Permisos SIN cambios (CREATE OR REPLACE
-- preserva el ACL existente: anon, authenticated). COMMENT
-- conservado verbatim de F0.3.8 + coletilla FB.5.
CREATE OR REPLACE FUNCTION public.update_member_with_audit(
  p_member_id   uuid,
  p_admin_id    uuid,
  p_admin_name  text,
  p_admin_email text,
  p_reason_text text,
  p_changes     jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_profile_whitelist text[] := ARRAY[
    'name', 'phone', 'dpi', 'plate', 'email', 'nit', 'birthday'
  ];
  v_member      public.members%ROWTYPE;
  v_profile     jsonb := p_changes -> 'profile';
  v_has_profile boolean;
  v_has_points  boolean := p_changes ? 'points';
  v_has_gallons boolean := p_changes ? 'gallons';
  v_key         text;
  v_top_key     text;
  v_old_profile jsonb;
  v_old_points  jsonb;
  v_old_gallons jsonb;
  v_logs        uuid[] := ARRAY[]::uuid[];
  v_cats        text[] := ARRAY[]::text[];
  v_log_id      uuid;
BEGIN
  -- ── Validacion 1: parametros obligatorios ───────────────────
  IF p_member_id IS NULL THEN
    RAISE EXCEPTION 'member_id es obligatorio' USING ERRCODE = '22023';
  END IF;
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es obligatorio' USING ERRCODE = '22023';
  END IF;
  IF p_reason_text IS NULL OR trim(p_reason_text) = '' THEN
    RAISE EXCEPTION 'reason_text es obligatorio' USING ERRCODE = '22023';
  END IF;
  IF p_changes IS NULL OR jsonb_typeof(p_changes) <> 'object' THEN
    RAISE EXCEPTION 'changes debe ser un objeto JSON no nulo' USING ERRCODE = '22023';
  END IF;

  -- ── Validacion 2: solo categorias conocidas en el top-level ──
  FOR v_top_key IN SELECT jsonb_object_keys(p_changes) LOOP
    IF v_top_key NOT IN ('profile', 'points', 'gallons') THEN
      RAISE EXCEPTION 'Categoria "%" no permitida (solo profile, points, gallons)', v_top_key
        USING ERRCODE = '22023';
    END IF;
  END LOOP;

  -- ── Validacion 3: tipos por categoria ───────────────────────
  IF p_changes ? 'profile' AND jsonb_typeof(v_profile) <> 'object' THEN
    RAISE EXCEPTION 'changes.profile debe ser un objeto JSON' USING ERRCODE = '22023';
  END IF;
  IF v_has_points AND jsonb_typeof(p_changes -> 'points') <> 'number' THEN
    RAISE EXCEPTION 'changes.points debe ser un numero' USING ERRCODE = '22023';
  END IF;
  IF v_has_gallons AND jsonb_typeof(p_changes -> 'gallons') <> 'number' THEN
    RAISE EXCEPTION 'changes.gallons debe ser un numero' USING ERRCODE = '22023';
  END IF;

  -- profile cuenta como cambio solo si es un objeto con >= 1 clave
  v_has_profile := (p_changes ? 'profile')
                   AND jsonb_typeof(v_profile) = 'object'
                   AND v_profile <> '{}'::jsonb;

  -- ── Validacion 4: al menos una categoria valida ─────────────
  IF NOT (v_has_profile OR v_has_points OR v_has_gallons) THEN
    RAISE EXCEPTION 'changes no contiene ninguna categoria valida con cambios' USING ERRCODE = '22023';
  END IF;

  -- ── Validacion 5: whitelist estricta de campos en profile ───
  IF v_has_profile THEN
    FOR v_key IN SELECT jsonb_object_keys(v_profile) LOOP
      IF NOT (v_key = ANY(v_profile_whitelist)) THEN
        RAISE EXCEPTION 'Campo "%" no permitido en profile', v_key USING ERRCODE = '22023';
      END IF;
    END LOOP;
  END IF;

  -- ── Lectura del estado actual (y verificacion de existencia) ─
  SELECT * INTO v_member FROM public.members WHERE id = p_member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Miembro % no existe', p_member_id USING ERRCODE = '22023';
  END IF;

  -- old_value de profile SIMETRICO: solo los campos que cambian.
  v_old_profile := '{}'::jsonb;
  IF v_profile ? 'name'     THEN v_old_profile := v_old_profile || jsonb_build_object('name', v_member.name); END IF;
  IF v_profile ? 'phone'    THEN v_old_profile := v_old_profile || jsonb_build_object('phone', v_member.phone); END IF;
  IF v_profile ? 'dpi'      THEN v_old_profile := v_old_profile || jsonb_build_object('dpi', v_member.dpi); END IF;
  IF v_profile ? 'plate'    THEN v_old_profile := v_old_profile || jsonb_build_object('plate', v_member.plate); END IF;
  IF v_profile ? 'email'    THEN v_old_profile := v_old_profile || jsonb_build_object('email', v_member.email); END IF;
  IF v_profile ? 'nit'      THEN v_old_profile := v_old_profile || jsonb_build_object('nit', v_member.nit); END IF;
  IF v_profile ? 'birthday' THEN v_old_profile := v_old_profile || jsonb_build_object('birthday', v_member.birthday); END IF;

  v_old_points  := jsonb_build_object('points',  v_member.points);
  v_old_gallons := jsonb_build_object('gallons', v_member.gallons);

  -- ── Autoriza el trigger BEFORE UPDATE de FB.7 (cuando exista).
  --    Se setea aunque el cambio sea solo de perfil: si points no
  --    cambia, el trigger column-aware no dispara y el flag es
  --    inocuo. ──
  PERFORM set_config('app.allow_points_write', 'true', true);

  -- ── UPDATE atomico (static SQL: cada columna solo cambia si su
  --    clave esta presente en p_changes; sin EXECUTE dinamico).
  --    Envuelto en sub-bloque para traducir UNIQUE violations. ──
  BEGIN
    UPDATE public.members SET
      name     = CASE WHEN v_profile ? 'name'     THEN v_profile ->> 'name'                    ELSE name     END,
      phone    = CASE WHEN v_profile ? 'phone'    THEN v_profile ->> 'phone'                   ELSE phone    END,
      dpi      = CASE WHEN v_profile ? 'dpi'      THEN v_profile ->> 'dpi'                     ELSE dpi      END,
      plate    = CASE WHEN v_profile ? 'plate'    THEN v_profile ->> 'plate'                   ELSE plate    END,
      email    = CASE WHEN v_profile ? 'email'    THEN v_profile ->> 'email'                   ELSE email    END,
      nit      = CASE WHEN v_profile ? 'nit'      THEN v_profile ->> 'nit'                     ELSE nit      END,
      birthday = CASE WHEN v_profile ? 'birthday' THEN NULLIF(v_profile ->> 'birthday', '') ELSE birthday END,
      points   = CASE WHEN v_has_points  THEN (p_changes ->> 'points')::integer  ELSE points  END,
      gallons  = CASE WHEN v_has_gallons THEN (p_changes ->> 'gallons')::numeric ELSE gallons END,
      updated_at = now()
    WHERE id = p_member_id;
  EXCEPTION
    WHEN unique_violation THEN
      IF SQLERRM LIKE '%phone%' OR SQLERRM LIKE '%members_phone_key%' THEN
        RAISE EXCEPTION 'El telefono ya esta registrado para otro cliente' USING ERRCODE = '23505';
      ELSIF SQLERRM LIKE '%dpi%' OR SQLERRM LIKE '%members_dpi_key%' THEN
        RAISE EXCEPTION 'El DPI ya esta registrado para otro cliente' USING ERRCODE = '23505';
      ELSE
        RAISE;
      END IF;
  END;

  -- ── Auditoria: 1 log por categoria modificada ───────────────
  IF v_has_profile THEN
    v_log_id := public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => 'update_member_profile',
      p_entity_type => 'member',
      p_entity_id   => p_member_id::text,
      p_reason_text => p_reason_text,
      p_old_value   => v_old_profile,
      p_new_value   => v_profile
    );
    v_logs := array_append(v_logs, v_log_id);
    v_cats := array_append(v_cats, 'profile');
  END IF;

  IF v_has_points THEN
    v_log_id := public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => 'update_member_points',
      p_entity_type => 'member',
      p_entity_id   => p_member_id::text,
      p_reason_text => p_reason_text,
      p_old_value   => v_old_points,
      p_new_value   => jsonb_build_object('points', (p_changes ->> 'points')::integer)
    );
    v_logs := array_append(v_logs, v_log_id);
    v_cats := array_append(v_cats, 'points');
  END IF;

  IF v_has_gallons THEN
    v_log_id := public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => 'update_member_gallons',
      p_entity_type => 'member',
      p_entity_id   => p_member_id::text,
      p_reason_text => p_reason_text,
      p_old_value   => v_old_gallons,
      p_new_value   => jsonb_build_object('gallons', (p_changes ->> 'gallons')::numeric)
    );
    v_logs := array_append(v_logs, v_log_id);
    v_cats := array_append(v_cats, 'gallons');
  END IF;

  RETURN jsonb_build_object(
    'ok',                 true,
    'logs_created',       to_jsonb(v_logs),
    'categories_updated', to_jsonb(v_cats)
  );
END;
$$;

COMMENT ON FUNCTION public.update_member_with_audit(
  uuid, uuid, text, text, text, jsonb
) IS
'F0.3.8 — Actualiza un miembro (categorias profile/points/gallons) en una transaccion atomica y emite 1-3 logs en admin_audit_log via log_admin_action. Whitelist estricta de campos en profile (rechaza no-whitelisted con RAISE). old_value de profile es simetrico (solo campos cambiados). UNIQUE violations de phone/dpi traducidas a mensajes en espanol. Las 3 acciones son sensibles: reason_text obligatorio. Retorna { ok, logs_created[], categories_updated[] }. Balances queda fuera de alcance (futuro). FB.5: setea app.allow_points_write antes del UPDATE (prep trigger FB.7).';

COMMIT;

-- ── Fin ───────────────────────────────────────────────────────

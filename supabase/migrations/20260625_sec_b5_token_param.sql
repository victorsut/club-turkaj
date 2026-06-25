-- ============================================================
-- Club Turkaj / Puntos+ — SEC.B.5.1: parámetro p_session_token
-- ============================================================
-- Agrega `p_session_token text DEFAULT NULL` como ÚLTIMO argumento
-- a las 4 RPCs sensibles de operador/admin, para que el cliente
-- (SEC.B.5.2 / B.5.3) pueda ENVIAR el token de sesión emitido en
-- SEC.B.3. En esta sub-fase el parámetro se ACEPTA y se IGNORA:
-- cero validación. La validación (modo warn → strict) y la
-- revocación (poblar revoked_at) son SEC.B.6.
--
-- POR QUÉ DROP + CREATE (y no CREATE OR REPLACE solo):
-- Agregar un argumento CAMBIA la firma de la función. CREATE OR
-- REPLACE sobre una firma distinta crea un OVERLOAD nuevo en vez
-- de reemplazar — quedarían dos funciones coexistiendo. Por eso
-- cada bloque hace DROP de la firma vieja exacta y luego recrea.
--
-- INVARIANTE: el cuerpo de cada función se reproduce FIEL desde
-- pg_get_functiondef() de producción (pre-flight SEC.B.5.1).
-- Se preservan SECURITY DEFINER, SET search_path, y CRÍTICAMENTE
-- el PERFORM set_config('app.allow_points_write','true',true) que
-- autoriza al trigger guardián de FB.7/FB.9 (modo strict). Lo
-- único que cambia es la firma (+ p_session_token al final).
--
-- GRANTS (camino feliz — replicación exacta):
-- El pre-flight confirmó que las 4 tienen grants EXPLÍCITOS:
-- anon, authenticated, service_role (+ postgres owner). El DROP
-- borra los grants; un CREATE pelado daría EXECUTE a PUBLIC por
-- default. Para dejar el estado IDÉNTICO al actual, cada función
-- hace REVOKE ALL FROM PUBLIC + GRANT a los 3 roles. No se
-- endurece ni afloja nada más.
--
-- CONDICIÓN QUE ARRASTRA A SEC.B.6 (no olvidar):
-- buy_raffle_tickets tiene DOBLE VECTOR — operador (OpRaffle.jsx,
-- manda token) y cliente (App.jsx, NO manda token, va por Supabase
-- Auth / auth.uid()). Por eso un p_session_token NULL en
-- buy_raffle_tickets es LEGÍTIMO (cliente), mientras que en las
-- RPCs operador/admin puras (register_purchase,
-- update_member_with_audit, modify_member_points) un token NULL es
-- SOSPECHOSO. B.6 DEBE tratar buy_raffle_tickets distinto: si no,
-- el modo warn registraría cada compra de boletos del cliente como
-- session_violation (falso positivo) y la tabla perdería valor
-- como canario para decidir el corte a strict en B.8.
--
-- DEPENDENCIAS: las 4 RPCs ya existen (FB.5 definer). El DROP no
-- usa CASCADE a propósito — si algo dependiera de ellas, preferimos
-- que la transacción falle y enterarnos, no arrastrar drops.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. register_purchase (vector operador)
-- ============================================================

DROP FUNCTION IF EXISTS public.register_purchase(uuid, uuid, uuid, numeric, text, text);

CREATE OR REPLACE FUNCTION public.register_purchase(p_member_id uuid, p_operator_id uuid, p_station_id uuid, p_amount numeric, p_fuel_type text, p_invoice_no text DEFAULT NULL::text, p_session_token text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
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

REVOKE ALL ON FUNCTION public.register_purchase(uuid, uuid, uuid, numeric, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_purchase(uuid, uuid, uuid, numeric, text, text, text)
  TO anon, authenticated, service_role;

-- ============================================================
-- 2. buy_raffle_tickets (DOBLE VECTOR — ver nota B.6 en cabecera)
-- ============================================================

DROP FUNCTION IF EXISTS public.buy_raffle_tickets(uuid, uuid, integer);

CREATE OR REPLACE FUNCTION public.buy_raffle_tickets(p_member_id uuid, p_raffle_id uuid, p_quantity integer, p_session_token text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
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

REVOKE ALL ON FUNCTION public.buy_raffle_tickets(uuid, uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buy_raffle_tickets(uuid, uuid, integer, text)
  TO anon, authenticated, service_role;

-- ============================================================
-- 3. update_member_with_audit (vector admin)
-- ============================================================

DROP FUNCTION IF EXISTS public.update_member_with_audit(uuid, uuid, text, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.update_member_with_audit(p_member_id uuid, p_admin_id uuid, p_admin_name text, p_admin_email text, p_reason_text text, p_changes jsonb, p_session_token text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.update_member_with_audit(uuid, uuid, text, text, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_member_with_audit(uuid, uuid, text, text, text, jsonb, text)
  TO anon, authenticated, service_role;

-- ============================================================
-- 4. modify_member_points (vector admin)
-- ============================================================

DROP FUNCTION IF EXISTS public.modify_member_points(uuid, uuid, text, text, text, integer, integer, text);

CREATE OR REPLACE FUNCTION public.modify_member_points(p_member_id uuid, p_admin_id uuid, p_admin_name text, p_admin_email text, p_reason_text text, p_delta integer DEFAULT NULL::integer, p_set_to integer DEFAULT NULL::integer, p_action_type text DEFAULT 'manual_adjustment'::text, p_session_token text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_action_whitelist text[] := ARRAY[
    'manual_adjustment',
    'special_day_bonus',
    'compensation',
    'correction',
    'promotional_grant'
  ];
  v_old_points    integer;
  v_new_points    integer;
  v_delta_applied integer;
  v_log_id        uuid;
BEGIN
  -- ── V1: parametros obligatorios ─────────────────────────────
  IF p_member_id IS NULL THEN
    RAISE EXCEPTION 'member_id es obligatorio' USING ERRCODE = '22023';
  END IF;
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es obligatorio' USING ERRCODE = '22023';
  END IF;
  IF p_reason_text IS NULL OR trim(p_reason_text) = '' THEN
    RAISE EXCEPTION 'reason_text es obligatorio' USING ERRCODE = '22023';
  END IF;

  -- ── V2: XOR de modos ────────────────────────────────────────
  IF p_delta IS NULL AND p_set_to IS NULL THEN
    RAISE EXCEPTION 'Debe especificar p_delta o p_set_to' USING ERRCODE = '22023';
  END IF;
  IF p_delta IS NOT NULL AND p_set_to IS NOT NULL THEN
    RAISE EXCEPTION 'p_delta y p_set_to son mutuamente exclusivos' USING ERRCODE = '22023';
  END IF;

  -- ── V3: whitelist de action_type ────────────────────────────
  IF NOT (p_action_type = ANY(v_action_whitelist)) THEN
    RAISE EXCEPTION 'action_type "%" no permitido', p_action_type USING ERRCODE = '22023';
  END IF;

  -- ── V4: validar rangos segun modo ───────────────────────────
  IF p_set_to IS NOT NULL THEN
    IF p_set_to < 0 THEN
      RAISE EXCEPTION 'p_set_to debe ser >= 0' USING ERRCODE = '22023';
    END IF;
  ELSE
    IF p_delta < -50000 OR p_delta > 50000 THEN
      RAISE EXCEPTION 'p_delta fuera de rango permitido [-50000, 50000]' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- ── V5: member existe (y lee estado actual) ─────────────────
  SELECT points INTO v_old_points FROM public.members WHERE id = p_member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Miembro % no existe', p_member_id USING ERRCODE = '22023';
  END IF;

  -- ── V6: calcular nuevo valor y delta efectivo ───────────────
  IF p_delta IS NOT NULL THEN
    v_new_points    := v_old_points + p_delta;
    v_delta_applied := p_delta;
  ELSE
    v_new_points    := p_set_to;
    v_delta_applied := p_set_to - v_old_points;
  END IF;

  -- ── V7: resultado no-negativo ───────────────────────────────
  IF v_new_points < 0 THEN
    RAISE EXCEPTION 'Operacion resultaria en puntos negativos (% -> %)', v_old_points, v_new_points
      USING ERRCODE = '22023';
  END IF;

  -- ── Mutacion atomica ────────────────────────────────────────
  -- Autoriza al trigger BEFORE UPDATE de FB.7 (cuando exista).
  PERFORM set_config('app.allow_points_write', 'true', true);

  UPDATE public.members
  SET points = v_new_points,
      updated_at = now()
  WHERE id = p_member_id;

  -- ── Auditoria via log_admin_action ──────────────────────────
  v_log_id := public.log_admin_action(
    p_admin_id    => p_admin_id,
    p_admin_name  => p_admin_name,
    p_admin_email => p_admin_email,
    p_action      => 'modify_member_points',
    p_entity_type => 'member',
    p_entity_id   => p_member_id::text,
    p_reason_text => p_reason_text,
    p_old_value   => jsonb_build_object('points', v_old_points),
    p_new_value   => jsonb_build_object(
      'points',      v_new_points,
      'delta',       v_delta_applied,
      'action_type', p_action_type
    )
  );

  -- ── Retorno detallado ───────────────────────────────────────
  RETURN jsonb_build_object(
    'ok',            true,
    'log_id',        v_log_id,
    'old_points',    v_old_points,
    'new_points',    v_new_points,
    'delta_applied', v_delta_applied,
    'action_type',   p_action_type
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.modify_member_points(uuid, uuid, text, text, text, integer, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.modify_member_points(uuid, uuid, text, text, text, integer, integer, text, text)
  TO anon, authenticated, service_role;

COMMIT;

-- Fin

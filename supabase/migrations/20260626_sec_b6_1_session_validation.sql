-- ============================================================
-- Club Turkaj / Puntos+ — SEC.B.6.1: validación de sesión (modo WARN)
-- ============================================================
-- Agrega validación server-side del p_session_token que B.5
-- inyectó desde el cliente. En esta sub-fase la validación corre
-- en modo WARN: registra cada llamada sin token / con token
-- inválido / expirado / revocado en `session_violations`, pero
-- NUNCA bloquea (no hay RAISE). El corte a strict (RAISE) es
-- SEC.B.8 — un único IF dentro del helper.
--
-- PIEZAS:
-- 1. Helper validate_session_token(...) — centraliza toda la
--    lógica warn/strict. Se crea PRIMERO (las 4 RPCs lo llaman).
-- 2. Las 4 RPCs sensibles recreadas vía CREATE OR REPLACE,
--    agregando SOLO la llamada al helper como primera sentencia
--    del BEGIN + la variable v_session_role_id en el DECLARE.
--    Todo lo demás del cuerpo queda byte-idéntico al vigente
--    post-B.5.1 (extraído con pg_get_functiondef en pre-flight).
--
-- POR QUÉ CREATE OR REPLACE SIN DROP:
-- B.6.1 cambia el CUERPO, no la firma (el p_session_token ya está
-- desde B.5.1). CREATE OR REPLACE sobre la misma firma reemplaza
-- en sitio. CRÍTICO: a diferencia de B.5.1 (que dropeaba y por eso
-- re-otorgaba grants), aquí NO hay DROP → los grants EXECUTE
-- (anon, authenticated, service_role) se PRESERVAN intactos. Por
-- eso esta migración NO re-emite REVOKE/GRANT en las 4 RPCs.
--
-- INVARIANTE PRESERVADA (verificado en pre-flight):
-- SECURITY DEFINER, SET search_path TO 'public','extensions', y
-- CRÍTICAMENTE el PERFORM set_config('app.allow_points_write',
-- 'true', true) que autoriza al trigger guardián de FB.7/FB.9.
-- El helper se llama ANTES del set_config; no lo toca.
--
-- ════════════════════════════════════════════════════════════
-- FRONTERA CRÍTICA — B.6 NO PROTEGE EL VECTOR CLIENTE DEL RAFFLE
-- ════════════════════════════════════════════════════════════
-- buy_raffle_tickets tiene DOBLE VECTOR: operador (manda token) y
-- cliente (App.jsx, NO manda token). B.6 valida SOLO el vector
-- operador. Con p_session_token NULL, buy_raffle_tickets hace
-- SKIP SILENCIOSO (p_allow_null => true): no registra violación y
-- NO mira auth.uid().
--
-- CONSECUENCIA EXPLÍCITA: con token NULL, cualquiera con la apikey
-- anon puede llamar buy_raffle_tickets y gastar puntos de
-- CUALQUIER p_member_id. Esto YA era así antes de SEC.B; B.6 lo
-- deja igual A PROPÓSITO, porque policiarlo exige resolver el
-- login-por-teléfono (los clientes-teléfono no tienen auth.uid()).
-- Su cierre es SEC.C.
--
-- >>> TRAS B.8 STRICT, EL RAFFLE DEL CLIENTE SIGUE SIN PROTECCIÓN. <<<
-- >>> Nadie debe creer que B.8 cierra ese vector. Es SEC.C.        <<<
-- ════════════════════════════════════════════════════════════
--
-- DEPENDENCIAS: operator_sessions, admin_sessions, session_violations
-- (SEC.B.3). Las 4 RPCs ya tienen p_session_token (SEC.B.5.1).
-- ============================================================

BEGIN;

-- ============================================================
-- 0. HELPER — validate_session_token (modo WARN)
-- ============================================================
-- Centraliza la validación de tokens de las 4 RPCs sensibles.
-- Resuelve el token contra operator_sessions / admin_sessions
-- según p_role, y en cada caso de fallo registra una fila en
-- session_violations (modo warn) y devuelve NULL. En éxito
-- devuelve el role_id (operator_id / admin_id) resuelto.
--
-- WARN vs STRICT (SEC.B.8): hoy cada rama de violación hace
-- INSERT + RETURN NULL. En B.8 esas ramas pasan a RAISE
-- EXCEPTION (ERRCODE 42501). El cambio vive AQUÍ, en un solo
-- lugar — esa es la razón de centralizar en helper.
--
-- NO mira auth.uid(): el vector cliente (token NULL con
-- p_allow_null) se resuelve por skip silencioso, no por
-- inspección de JWT. Eso es SEC.C.
--
-- p_params: snapshot de IDs NO sensibles para auditoría
-- (member/operator/admin/station/raffle/quantity). NUNCA
-- contiene el token.
--
-- SECURITY: SECURITY DEFINER + REVOKE FROM PUBLIC. Solo las 4
-- RPCs (también DEFINER, mismo owner) lo invocan internamente;
-- anon/authenticated NO pueden llamarlo directo (evita que se
-- use para spammear session_violations o sondear validez de
-- tokens).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_session_token(
  p_token      text,
  p_role       text,
  p_rpc_name   text,
  p_allow_null boolean DEFAULT false,
  p_params     jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role_id    uuid;
  v_expires_at timestamptz;
  v_revoked_at timestamptz;
BEGIN
  -- (1) Token ausente
  IF p_token IS NULL THEN
    IF p_allow_null THEN
      -- Vector cliente (buy_raffle_tickets): NULL es legítimo.
      -- Skip silencioso: sin fila, sin auth.uid() (eso es SEC.C).
      RETURN NULL;
    END IF;
    -- Operador/admin sin token: sospechoso.
    INSERT INTO session_violations (rpc_name, reason, params)
    VALUES (p_rpc_name, 'no_token', p_params);
    RETURN NULL;
  END IF;

  -- (2) Lookup según rol (token es PK → index scan)
  IF p_role = 'operator' THEN
    SELECT operator_id, expires_at, revoked_at
      INTO v_role_id, v_expires_at, v_revoked_at
    FROM operator_sessions
    WHERE token = p_token;
  ELSIF p_role = 'admin' THEN
    SELECT admin_id, expires_at, revoked_at
      INTO v_role_id, v_expires_at, v_revoked_at
    FROM admin_sessions
    WHERE token = p_token;
  ELSE
    -- Rol desconocido (defensivo): tratar como token inválido.
    INSERT INTO session_violations (rpc_name, reason, params)
    VALUES (p_rpc_name, 'invalid_token', p_params);
    RETURN NULL;
  END IF;

  -- (3) No existe en la tabla de sesiones
  IF NOT FOUND THEN
    INSERT INTO session_violations (rpc_name, reason, params)
    VALUES (p_rpc_name, 'invalid_token', p_params);
    RETURN NULL;
  END IF;

  -- (4) Revocado (ANTES que expiración: señal más fuerte — un
  --     logout deliberado cuyo token sigue circulando)
  IF v_revoked_at IS NOT NULL THEN
    INSERT INTO session_violations (rpc_name, reason, params)
    VALUES (p_rpc_name, 'revoked_token', p_params);
    RETURN NULL;
  END IF;

  -- (5) Expirado (TTL vencido)
  IF v_expires_at <= now() THEN
    INSERT INTO session_violations (rpc_name, reason, params)
    VALUES (p_rpc_name, 'expired_token', p_params);
    RETURN NULL;
  END IF;

  -- (6) Éxito: token válido, no revocado, no expirado.
  --     [B.8: las ramas 1(no_token)/3/4/5 pasarán de
  --      INSERT+RETURN NULL a RAISE EXCEPTION aquí mismo.]
  RETURN v_role_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_session_token(text, text, text, boolean, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_session_token(text, text, text, boolean, jsonb)
  TO service_role;

COMMENT ON FUNCTION public.validate_session_token(text, text, text, boolean, jsonb) IS
'SEC.B.6.1 — Valida un token de sesión (operador/admin) en modo
WARN: registra no_token/invalid_token/revoked_token/expired_token
en session_violations sin bloquear, y devuelve el role_id en
éxito o NULL en fallo. p_allow_null=true (buy_raffle_tickets)
permite NULL legítimo del vector cliente sin registrar. El corte
a strict (RAISE) es SEC.B.8. NO valida el vector cliente del
raffle — eso es SEC.C.';

-- ============================================================
-- 1. register_purchase (vector operador) — + validación warn
-- ============================================================
CREATE OR REPLACE FUNCTION public.register_purchase(p_member_id uuid, p_operator_id uuid, p_station_id uuid, p_amount numeric, p_fuel_type text, p_invoice_no text DEFAULT NULL::text, p_session_token text DEFAULT NULL::text)
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
  v_session_role_id uuid;
BEGIN
  -- SEC.B.6.1: validación de sesión (modo warn — registra, no bloquea).
  v_session_role_id := public.validate_session_token(
    p_session_token, 'operator', 'register_purchase', false,
    jsonb_build_object('member_id', p_member_id, 'operator_id', p_operator_id, 'station_id', p_station_id)
  );

  -- Validar input
  IF p_amount IS NULL OR p_amount < 10 THEN
    RETURN jsonb_build_object('error', 'Mínimo Q10');
  END IF;

  -- Leer precios de combustible desde config
  SELECT value INTO v_fuel_prices
  FROM program_config WHERE key = 'fuel_prices';

  IF v_fuel_prices IS NULL THEN
    v_fuel_prices := '{"super": 31.49, "regular": 30.99, "diesel": 28.99}'::jsonb;
  END IF;

  v_fuel_price := COALESCE(
    (v_fuel_prices->>p_fuel_type)::numeric,
    (v_fuel_prices->>'regular')::numeric
  );

  v_gallons := ROUND(p_amount / v_fuel_price, 2);

  SELECT (value->>'qPerPt')::integer INTO v_q_per_pt
  FROM program_config WHERE key = 'general';
  IF v_q_per_pt IS NULL OR v_q_per_pt = 0 THEN
    v_q_per_pt := 10;
  END IF;

  v_points := FLOOR(p_amount / v_q_per_pt);

  SELECT gallons, card_id INTO v_old_gallons, v_card_id
  FROM members WHERE id = p_member_id;

  IF v_old_gallons IS NULL THEN
    RETURN jsonb_build_object('error', 'Miembro no encontrado');
  END IF;

  v_new_gallons := v_old_gallons + v_gallons;
  v_old_tier := public.get_member_tier(v_old_gallons);
  v_new_tier := public.get_member_tier(v_new_gallons);

  INSERT INTO purchases (
    member_id, operator_id, station_id,
    amount, fuel_type, gallons, points_earned, invoice_no
  )
  VALUES (
    p_member_id, p_operator_id, p_station_id,
    p_amount, p_fuel_type, v_gallons, v_points, p_invoice_no
  )
  RETURNING id INTO v_purchase_id;

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

  INSERT INTO activity_log (
    member_id, activity_type, description, points_change, amount, station_id
  )
  VALUES (
    p_member_id, 'compra',
    'Compra ' || v_gallons || ' gal ' || p_fuel_type || ' · Q' || p_amount,
    v_points, p_amount, p_station_id
  );

  IF v_old_tier <> v_new_tier AND v_card_id IS NOT NULL THEN
    SELECT card_code INTO v_old_code
    FROM physical_cards WHERE id = v_card_id;

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
-- 2. buy_raffle_tickets (DOBLE VECTOR — p_allow_null => true)
-- ============================================================
-- ÚNICA RPC con p_allow_null = true: el vector cliente manda
-- token NULL legítimo (skip silencioso en el helper). Si trae
-- token, se valida igual contra operator_sessions.
CREATE OR REPLACE FUNCTION public.buy_raffle_tickets(p_member_id uuid, p_raffle_id uuid, p_quantity integer, p_session_token text DEFAULT NULL::text)
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
  v_session_role_id uuid;
BEGIN
  -- SEC.B.6.1: validación de sesión (modo warn). p_allow_null=true:
  -- token NULL = vector cliente legítimo → skip silencioso (SEC.C).
  v_session_role_id := public.validate_session_token(
    p_session_token, 'operator', 'buy_raffle_tickets', true,
    jsonb_build_object('member_id', p_member_id, 'raffle_id', p_raffle_id, 'quantity', p_quantity)
  );

  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RETURN jsonb_build_object('error', 'Cantidad inválida');
  END IF;

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

-- ============================================================
-- 3. update_member_with_audit (vector admin) — + validación warn
-- ============================================================
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
  v_session_role_id uuid;
BEGIN
  -- SEC.B.6.1: validación de sesión (modo warn — registra, no bloquea).
  v_session_role_id := public.validate_session_token(
    p_session_token, 'admin', 'update_member_with_audit', false,
    jsonb_build_object('member_id', p_member_id, 'admin_id', p_admin_id)
  );

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

-- ============================================================
-- 4. modify_member_points (vector admin) — + validación warn
-- ============================================================
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
  v_session_role_id uuid;
BEGIN
  -- SEC.B.6.1: validación de sesión (modo warn — registra, no bloquea).
  v_session_role_id := public.validate_session_token(
    p_session_token, 'admin', 'modify_member_points', false,
    jsonb_build_object('member_id', p_member_id, 'admin_id', p_admin_id)
  );

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

COMMIT;

-- Fin

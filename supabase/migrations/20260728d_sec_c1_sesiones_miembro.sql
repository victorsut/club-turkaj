-- ═══════════════════════════════════════════════════════════════
-- SEC.C.1 — SESIONES DE MIEMBRO + DATA-MINIMIZATION DE MEMBERS
-- (28-jul-2026)
--
-- Cierra las dos deudas grandes de seguridad del cliente:
--
--  A. SESIONES DE MIEMBRO: tabla member_sessions (calco de
--     operator_sessions), emitidas por authenticate_member (teléfono),
--     create_member_session_oauth (Google, auth.uid) y /api/webauthn
--     (huella, service key). validate_session_token gana la rama
--     'member'. TTL 180 días (el cliente móvil persiste logueado).
--
--  B. MEMBERS DEJA DE SER PÚBLICA:
--     · Escritura directa CERRADA (se dropean las policies de
--       INSERT/UPDATE/DELETE y se revocan los privilegios): el alta
--       pasa por register_member (puntos calculados SERVER-side),
--       Mi Cuenta por update_my_profile (whitelist + sesión).
--     · Lectura por COLUMNAS: anon/authenticated solo ven las
--       columnas NO sensibles (id, name, points, gallons, ...) —
--       necesarias para Realtime del propio cliente y los nombres de
--       la rifa. password_hash y la PII (phone, dpi, nit, email,
--       birthday, address, plate, vehicles, avatar, auth_provider_id)
--       ya NO viajan por la API abierta. El miembro obtiene SU ficha
--       completa vía get_my_member(token); operador/admin la de todos
--       vía list_members_full / get_member_full con SU sesión.
--
--  C. buy_raffle_tickets pierde el allow_null: toda compra de boletos
--     exige sesión (member = solo para sí mismo; operator = cualquier
--     miembro). Cierra el vector anotado en SEC.B.6.1.
--
-- PENDIENTE (SEC.C.2, anotado): activity_log, purchases, redemptions,
-- raffle_tickets siguen con SELECT abierto (los cierres tocan Realtime
-- y los historiales de 3 vistas — siguiente iteración).
-- ═══════════════════════════════════════════════════════════════

-- ── A.1 Tabla de sesiones de miembro ───────────────────────────
CREATE TABLE IF NOT EXISTS public.member_sessions (
  token      text PRIMARY KEY DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  member_id  uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '180 days',
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS member_sessions_member_idx
  ON public.member_sessions (member_id);
ALTER TABLE public.member_sessions ENABLE ROW LEVEL SECURITY;
-- El event trigger le pondrá "Deny all by default" — CORRECTO: solo
-- las funciones DEFINER y la service key la tocan.

COMMENT ON TABLE public.member_sessions IS
'SEC.C.1: sesiones de miembro (token opaco, TTL 180 días). Emitidas por
authenticate_member / create_member_session_oauth / api-webauthn. Solo
accesible vía funciones DEFINER y service key.';

-- ── A.2 validate_session_token: rama member ────────────────────
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
  IF p_token IS NULL THEN
    IF p_allow_null THEN
      RETURN NULL;
    END IF;
    RAISE EXCEPTION 'Sesión no autenticada'
      USING ERRCODE = '28000', DETAIL = 'no_token';
  END IF;

  IF p_role = 'operator' THEN
    SELECT operator_id, expires_at, revoked_at
      INTO v_role_id, v_expires_at, v_revoked_at
    FROM operator_sessions WHERE token = p_token;
  ELSIF p_role = 'admin' THEN
    SELECT admin_id, expires_at, revoked_at
      INTO v_role_id, v_expires_at, v_revoked_at
    FROM admin_sessions WHERE token = p_token;
  ELSIF p_role = 'member' THEN
    -- SEC.C.1: sesiones de miembro
    SELECT member_id, expires_at, revoked_at
      INTO v_role_id, v_expires_at, v_revoked_at
    FROM member_sessions WHERE token = p_token;
  ELSE
    RAISE EXCEPTION 'Sesión inválida'
      USING ERRCODE = '28000', DETAIL = 'invalid_token';
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesión inválida'
      USING ERRCODE = '28000', DETAIL = 'invalid_token';
  END IF;
  IF v_revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Sesión revocada'
      USING ERRCODE = '28000', DETAIL = 'revoked_token';
  END IF;
  IF v_expires_at <= now() THEN
    RAISE EXCEPTION 'Sesión expirada'
      USING ERRCODE = '28000', DETAIL = 'expired_token';
  END IF;

  RETURN v_role_id;
END;
$function$;

COMMENT ON FUNCTION public.validate_session_token(text, text, text, boolean, jsonb) IS
'SEC.B.8.1 + SEC.C.1 — Valida un token de sesión (operator/admin/member)
en modo STRICT. member_sessions se suma como tercera tabla de lookup.';

-- ── A.3 Helpers internos (EXECUTE revocado — solo DEFINER) ─────
CREATE OR REPLACE FUNCTION public.issue_member_session(p_member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_token   text;
  v_expires timestamptz;
BEGIN
  INSERT INTO member_sessions (member_id)
  VALUES (p_member_id)
  RETURNING token, expires_at INTO v_token, v_expires;
  RETURN jsonb_build_object('session_token', v_token, 'session_expires_at', v_expires);
END;
$function$;

CREATE OR REPLACE FUNCTION public.member_profile_json(p_member_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'id', m.id, 'name', m.name, 'email', m.email, 'avatar_url', m.avatar_url,
    'phone', m.phone, 'dpi', m.dpi, 'plate', m.plate, 'nit', m.nit,
    'birthday', m.birthday, 'address', m.address, 'vehicles', m.vehicles,
    'points', m.points, 'gallons', m.gallons, 'spent', m.spent,
    'visits', m.visits, 'tickets', m.tickets,
    'redeemed_count', m.redeemed_count, 'referral_count', m.referral_count,
    'created_at', m.created_at, 'last_buy', m.last_buy,
    'last_station', m.last_station, 'last_special_bonus', m.last_special_bonus,
    'card_id', m.card_id,
    'card_code', (SELECT pc.card_code FROM physical_cards pc
                  WHERE pc.assigned_to = m.id LIMIT 1),
    'auth_provider', m.auth_provider, 'auth_provider_id', m.auth_provider_id,
    'referred_by', m.referred_by
  )
  FROM members m WHERE m.id = p_member_id;
$function$;

REVOKE EXECUTE ON FUNCTION public.issue_member_session(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.member_profile_json(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_member_session(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.member_profile_json(uuid) TO service_role;

-- ── A.4 authenticate_member v3: emite sesión + perfil ──────────
CREATE OR REPLACE FUNCTION public.authenticate_member(p_phone text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_m RECORD;
  v_sess jsonb;
BEGIN
  IF COALESCE(trim(p_phone), '') = '' OR COALESCE(p_password, '') = '' THEN
    RETURN jsonb_build_object('error', 'Ingresa teléfono y contraseña');
  END IF;

  SELECT id, name, password_hash INTO v_m
  FROM members WHERE phone = trim(p_phone);
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Número no registrado');
  END IF;
  IF NOT public.member_password_matches(v_m.password_hash, p_password) THEN
    RETURN jsonb_build_object('error', 'Contraseña incorrecta');
  END IF;

  IF v_m.password_hash NOT LIKE '$2%' THEN
    UPDATE members SET password_hash = crypt(p_password, gen_salt('bf', 6)), updated_at = now()
    WHERE id = v_m.id;
  END IF;

  v_sess := public.issue_member_session(v_m.id);
  RETURN jsonb_build_object(
    'ok', true, 'member_id', v_m.id, 'name', v_m.name,
    'member', public.member_profile_json(v_m.id)
  ) || v_sess;
END;
$function$;

COMMENT ON FUNCTION public.authenticate_member(text, text) IS
'SEC-lite + SEC.C.1: login por teléfono. Verifica bcrypt server-side
(auto-migra hashes legados), emite sesión de miembro (180 días) y
devuelve el perfil completo — el cliente ya no lee members directo.';

-- ── A.5 Sesión vía Google (auth.uid prueba la identidad) ───────
CREATE OR REPLACE FUNCTION public.create_member_session_oauth(p_avatar_url text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_uid   uuid;
  v_email text;
  v_mid   uuid;
  v_sess  jsonb;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Sin sesión de Google');
  END IF;

  SELECT id INTO v_mid FROM members WHERE auth_provider_id = v_uid::text;

  -- Fallback por email + vínculo (replica el linkeo que hacía App.jsx)
  IF v_mid IS NULL THEN
    v_email := auth.jwt() ->> 'email';
    IF COALESCE(v_email, '') <> '' THEN
      SELECT id INTO v_mid FROM members WHERE email = v_email LIMIT 1;
      IF v_mid IS NOT NULL THEN
        UPDATE members SET auth_provider_id = v_uid::text, auth_provider = 'google',
               updated_at = now()
        WHERE id = v_mid;
      END IF;
    END IF;
  END IF;

  IF v_mid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');  -- → el cliente muestra el registro
  END IF;

  -- Persistir la foto de Google si cambió (antes: update directo del cliente)
  IF COALESCE(p_avatar_url, '') <> '' THEN
    UPDATE members SET avatar_url = p_avatar_url, updated_at = now()
    WHERE id = v_mid AND avatar_url IS DISTINCT FROM p_avatar_url;
  END IF;

  v_sess := public.issue_member_session(v_mid);
  RETURN jsonb_build_object(
    'ok', true, 'member_id', v_mid,
    'member', public.member_profile_json(v_mid)
  ) || v_sess;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_member_session_oauth(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_member_session_oauth(text) TO authenticated;

-- ── A.6 Rehidratación al abrir la app + logout ─────────────────
CREATE OR REPLACE FUNCTION public.get_my_member(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mid uuid;
BEGIN
  BEGIN
    v_mid := public.validate_session_token(p_session_token, 'member', 'get_my_member', false, NULL);
  EXCEPTION WHEN SQLSTATE '28000' THEN
    RETURN jsonb_build_object('error', 'invalid_session');
  END;
  RETURN jsonb_build_object('ok', true, 'member', public.member_profile_json(v_mid));
END;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_member_session(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE member_sessions SET revoked_at = now()
  WHERE token = p_session_token AND revoked_at IS NULL;
  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- ── B.1 Registro server-side (puntos calculados en el server) ──
CREATE OR REPLACE FUNCTION public.register_member(p_data jsonb, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_phone     text := trim(COALESCE(p_data->>'phone', ''));
  v_name      text := trim(COALESCE(p_data->>'name', ''));
  v_dpi       text := NULLIF(trim(COALESCE(p_data->>'dpi', '')), '');
  v_vehicles  jsonb := COALESCE(p_data->'vehicles', '[]'::jsonb);
  v_veh_n     integer := COALESCE(jsonb_array_length(p_data->'vehicles'), 0);
  v_reg_base  integer;
  v_reg_opt   integer;
  v_opt       integer := 0;
  v_points    integer;
  v_veh_pts   integer;
  v_mid       uuid;
  v_card_id   uuid;
  v_card_code text;
  v_try       integer := 0;
  v_sess      jsonb;
BEGIN
  IF v_name = '' THEN
    RETURN jsonb_build_object('error', 'El nombre es obligatorio');
  END IF;
  IF v_phone !~ '^\d{8}$' AND v_phone NOT LIKE 'goog_%' THEN
    RETURN jsonb_build_object('error', 'Teléfono inválido');
  END IF;
  IF p_password IS NULL OR length(p_password) < 6 THEN
    RETURN jsonb_build_object('error', 'La contraseña debe tener al menos 6 caracteres');
  END IF;
  IF EXISTS (SELECT 1 FROM members WHERE phone = v_phone) THEN
    RETURN jsonb_build_object('error', 'phone_exists');
  END IF;
  IF v_dpi IS NOT NULL AND EXISTS (SELECT 1 FROM members WHERE dpi = v_dpi) THEN
    RETURN jsonb_build_object('error', 'dpi_exists');
  END IF;

  -- Bonus de registro SERVER-side (misma fórmula del wizard):
  -- base + regOptional × (email, nit, dirección completa) + 2 × vehículo
  SELECT COALESCE((value->>'regBase')::integer, 15),
         COALESCE((value->>'regOptional')::integer, 2)
    INTO v_reg_base, v_reg_opt
  FROM program_config WHERE key = 'general';
  v_reg_base := COALESCE(v_reg_base, 15);
  v_reg_opt  := COALESCE(v_reg_opt, 2);

  IF COALESCE(trim(p_data->>'email'), '') <> '' THEN v_opt := v_opt + 1; END IF;
  IF COALESCE(trim(p_data->>'nit'), '')   <> '' THEN v_opt := v_opt + 1; END IF;
  IF p_data->'address' IS NOT NULL AND jsonb_typeof(p_data->'address') = 'object'
    THEN v_opt := v_opt + 1; END IF;

  v_veh_pts := v_veh_n * 2;
  v_points  := v_reg_base + v_opt * v_reg_opt + v_veh_pts;

  PERFORM set_config('app.allow_points_write', 'true', true);

  INSERT INTO members (
    phone, password_hash, auth_provider, auth_provider_id,
    name, dpi, plate, vehicles, nit, email, birthday, address, avatar_url,
    points, gallons, spent, visits, tickets, redeemed_count, referral_count
  ) VALUES (
    v_phone,
    crypt(p_password, gen_salt('bf', 6)),
    COALESCE(NULLIF(p_data->>'auth_provider', ''), 'manual'),
    NULLIF(p_data->>'auth_provider_id', ''),
    v_name, v_dpi,
    NULLIF(p_data->>'plate', ''),
    v_vehicles,
    NULLIF(trim(COALESCE(p_data->>'nit', '')), ''),
    NULLIF(trim(COALESCE(p_data->>'email', '')), ''),
    NULLIF(p_data->>'birthday', ''),
    p_data->'address',
    NULLIF(p_data->>'avatar_url', ''),
    v_points, 0, 0, 0, 0, 0, 0
  ) RETURNING id INTO v_mid;

  -- Tarjeta digital ORO con correlativo único
  LOOP
    v_try := v_try + 1;
    v_card_code := 'CTOD-' || upper(substring(md5(random()::text || clock_timestamp()::text), 1, 5));
    BEGIN
      INSERT INTO physical_cards (assigned_to, card_code, tier, status)
      VALUES (v_mid, v_card_code, 'ORO', 'active')
      RETURNING id INTO v_card_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_try >= 10 THEN RAISE; END IF;
    END;
  END LOOP;
  UPDATE members SET card_id = v_card_id WHERE id = v_mid;

  IF v_veh_n > 0 THEN
    INSERT INTO activity_log (member_id, activity_type, description, points_change, metadata)
    VALUES (v_mid, 'registro_vehiculos',
            v_veh_n || ' vehiculo(s) - +' || v_veh_pts || ' pts', v_veh_pts,
            jsonb_build_object('vehicles', v_vehicles));
  END IF;
  INSERT INTO activity_log (member_id, activity_type, description, points_change)
  VALUES (v_mid, 'registro', 'Bienvenido a Puntos Plus - +' || v_points || ' pts', v_points);

  v_sess := public.issue_member_session(v_mid);
  RETURN jsonb_build_object(
    'ok', true, 'member_id', v_mid, 'points', v_points, 'card_code', v_card_code,
    'member', public.member_profile_json(v_mid)
  ) || v_sess;
END;
$function$;

COMMENT ON FUNCTION public.register_member(jsonb, text) IS
'SEC.C.1: alta de miembro del wizard. Sustituye al INSERT directo del
cliente — el bonus de registro se calcula SERVER-side (regBase +
regOptional × [email,nit,dirección] + 2 × vehículo), crea la tarjeta
CTOD única, registra activity_log y devuelve sesión + perfil.';

-- ── B.2 Mi Cuenta / vehículos / avatar con sesión ──────────────
CREATE OR REPLACE FUNCTION public.update_my_profile(p_session_token text, p_changes jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mid uuid;
  v_cur RECORD;
  v_phone text;
  v_bday  text;
BEGIN
  BEGIN
    v_mid := public.validate_session_token(p_session_token, 'member', 'update_my_profile', false, NULL);
  EXCEPTION WHEN SQLSTATE '28000' THEN
    RETURN jsonb_build_object('error', 'invalid_session');
  END;

  SELECT phone, birthday INTO v_cur FROM members WHERE id = v_mid;

  IF p_changes ? 'name' AND trim(COALESCE(p_changes->>'name', '')) = '' THEN
    RETURN jsonb_build_object('error', 'El nombre es obligatorio');
  END IF;

  IF p_changes ? 'phone' THEN
    v_phone := trim(COALESCE(p_changes->>'phone', ''));
    IF v_phone !~ '^\d{8}$' THEN
      RETURN jsonb_build_object('error', 'El teléfono debe tener 8 dígitos');
    END IF;
    IF EXISTS (SELECT 1 FROM members WHERE phone = v_phone AND id <> v_mid) THEN
      RETURN jsonb_build_object('error', 'Ese teléfono ya está registrado');
    END IF;
  END IF;

  -- Cumpleaños: SOLO completar (regla del dueño — una vez, luego candado)
  IF p_changes ? 'birthday' THEN
    v_bday := p_changes->>'birthday';
    IF v_cur.birthday IS NOT NULL AND length(v_cur.birthday) >= 10
       AND v_bday IS DISTINCT FROM v_cur.birthday THEN
      RETURN jsonb_build_object('error', 'La fecha de nacimiento ya no puede cambiarse');
    END IF;
  END IF;

  UPDATE members SET
    name       = CASE WHEN p_changes ? 'name'       THEN trim(p_changes->>'name') ELSE name END,
    phone      = CASE WHEN p_changes ? 'phone'      THEN v_phone                  ELSE phone END,
    email      = CASE WHEN p_changes ? 'email'      THEN NULLIF(trim(COALESCE(p_changes->>'email', '')), '') ELSE email END,
    nit        = CASE WHEN p_changes ? 'nit'        THEN NULLIF(trim(COALESCE(p_changes->>'nit', '')), '')   ELSE nit END,
    birthday   = CASE WHEN p_changes ? 'birthday'   THEN NULLIF(p_changes->>'birthday', '') ELSE birthday END,
    address    = CASE WHEN p_changes ? 'address'    THEN NULLIF(p_changes->'address', 'null'::jsonb) ELSE address END,
    vehicles   = CASE WHEN p_changes ? 'vehicles'   THEN COALESCE(p_changes->'vehicles', '[]'::jsonb) ELSE vehicles END,
    plate      = CASE WHEN p_changes ? 'vehicles'   THEN NULLIF(p_changes->'vehicles'->0->>'plate', '')
                      WHEN p_changes ? 'plate'      THEN NULLIF(p_changes->>'plate', '') ELSE plate END,
    avatar_url = CASE WHEN p_changes ? 'avatar_url' THEN NULLIF(p_changes->>'avatar_url', '') ELSE avatar_url END,
    updated_at = now()
  WHERE id = v_mid;

  RETURN jsonb_build_object('ok', true, 'member', public.member_profile_json(v_mid));
END;
$function$;

COMMENT ON FUNCTION public.update_my_profile(text, jsonb) IS
'SEC.C.1: edición del propio perfil con sesión de miembro. Whitelist:
name, phone (único), email, nit, birthday (solo completar), address,
vehicles (deriva plate), avatar_url. Sustituye los UPDATE directos de
Mi Cuenta y vehículos.';

-- ── B.3 Chequeo de duplicados del wizard (sin leer PII) ────────
CREATE OR REPLACE FUNCTION public.check_member_exists(p_phone text DEFAULT NULL, p_dpi text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'phone_exists', COALESCE(trim(p_phone), '') <> '' AND EXISTS (SELECT 1 FROM members WHERE phone = trim(p_phone)),
    'dpi_exists',   COALESCE(trim(p_dpi), '')   <> '' AND EXISTS (SELECT 1 FROM members WHERE dpi = trim(p_dpi))
  );
$function$;

-- ── C. buy_raffle_tickets: sesión OBLIGATORIA (cierre del vector) ──
CREATE OR REPLACE FUNCTION public.buy_raffle_tickets(
  p_member_id uuid, p_raffle_id uuid, p_quantity integer,
  p_session_token text DEFAULT NULL::text, p_session_role text DEFAULT 'member'
)
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
  -- SEC.C.1: se cierra el allow_null. member → solo para sí mismo;
  -- operator → cualquier miembro (flujo OpRaffle).
  IF p_session_role NOT IN ('member', 'operator') THEN
    RAISE EXCEPTION 'Sesión inválida' USING ERRCODE = '28000', DETAIL = 'invalid_role';
  END IF;
  v_session_role_id := public.validate_session_token(
    p_session_token, p_session_role, 'buy_raffle_tickets', false,
    jsonb_build_object('member_id', p_member_id, 'raffle_id', p_raffle_id, 'quantity', p_quantity)
  );
  IF p_session_role = 'member' AND v_session_role_id <> p_member_id THEN
    RAISE EXCEPTION 'Sesión inválida' USING ERRCODE = '28000', DETAIL = 'member_mismatch';
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RETURN jsonb_build_object('error', 'Cantidad inválida');
  END IF;

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

  PERFORM set_config('app.allow_points_write', 'true', true);
  UPDATE members SET
    points     = points - v_cost,
    tickets    = COALESCE(tickets, 0) + p_quantity,
    updated_at = now()
  WHERE id = p_member_id;

  INSERT INTO activity_log (member_id, activity_type, description, points_change)
  VALUES (p_member_id, 'rifa',
    'Compró ' || p_quantity || ' boleto' || CASE WHEN p_quantity > 1 THEN 's' ELSE '' END || ' de rifa',
    -v_cost);

  RETURN jsonb_build_object(
    'tickets',          p_quantity,
    'cost',             v_cost,
    'remaining_points', v_member_points - v_cost,
    'new_ticket_total', COALESCE(v_member_tickets, 0) + p_quantity
  );
END;
$function$;

COMMENT ON FUNCTION public.buy_raffle_tickets(uuid, uuid, integer, text, text) IS
'Compra de boletos con sesión OBLIGATORIA (SEC.C.1 cierra el allow_null):
member solo para sí mismo, operator para cualquier miembro. Costo por
rifa (ticket_points) o global. Valida puntos, descuenta, registra.';

-- ── D. Lecturas completas para operador/admin ──────────────────
CREATE OR REPLACE FUNCTION public.list_members_full(p_session_token text, p_role text)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_role NOT IN ('operator', 'admin') THEN
    RAISE EXCEPTION 'Sesión inválida' USING ERRCODE = '28000', DETAIL = 'invalid_role';
  END IF;
  PERFORM public.validate_session_token(p_session_token, p_role, 'list_members_full', false, NULL);
  RETURN QUERY
    SELECT public.member_profile_json(m.id) FROM members m
    ORDER BY m.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_member_full(p_session_token text, p_role text, p_member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_role NOT IN ('operator', 'admin') THEN
    RAISE EXCEPTION 'Sesión inválida' USING ERRCODE = '28000', DETAIL = 'invalid_role';
  END IF;
  PERFORM public.validate_session_token(p_session_token, p_role, 'get_member_full', false, NULL);
  RETURN public.member_profile_json(p_member_id);
END;
$function$;

-- ── E. Cierre de members: escritura por RPC, lectura por columnas ──
DROP POLICY IF EXISTS members_insert_all ON public.members;
DROP POLICY IF EXISTS members_update_all ON public.members;
DROP POLICY IF EXISTS members_delete_all ON public.members;
-- members_select_all (fila) se CONSERVA: el filtro es por COLUMNAS.

REVOKE INSERT, UPDATE, DELETE ON public.members FROM anon, authenticated;
REVOKE SELECT ON public.members FROM anon, authenticated;
GRANT SELECT (
  id, name, points, gallons, spent, visits, tickets, redeemed_count,
  last_buy, last_station, card_id, created_at, updated_at,
  degrade_stage, degrade_base_gal
) ON public.members TO anon, authenticated;

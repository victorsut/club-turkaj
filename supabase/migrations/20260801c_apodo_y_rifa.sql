-- ============================================================
-- Puntos Plus — APODO del miembro + privacidad en la rifa
-- (1-ago-2026, pedido del dueño)
-- ============================================================
-- 1. members.nickname (APODO): sobrenombre personalizado EDITABLE.
--    El nombre real deja de ser editable por el cliente (sigue
--    editable por el admin vía update_member_with_audit).
-- 2. member_profile_json expone nickname.
-- 3. update_my_profile: 'name' se IGNORA (compatibilidad con clientes
--    cacheados que aún lo envíen — no rompe el guardado), entra
--    'nickname' (máx 20 caracteres) a la whitelist.
-- 4. list_raffle_participants: la lista de PARTICIPANTES de la rifa
--    ya no usa el nombre real — devuelve display_name (apodo, o el
--    PRIMER nombre si no hay apodo) + avatar_url; a las sesiones de
--    MIEMBRO ya no les viaja el nombre real ('name' solo para
--    operador/admin, que sí lo necesitan en sus vistas).
--    (El total de boletos por participante sigue viajando: lo usan
--    el stat TOTAL del cliente y el flujo del operador; el cliente
--    solo MUESTRA el propio.)
-- ============================================================

BEGIN;

-- ── 1. Columna nickname ─────────────────────────────────────────
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS nickname text;

COMMENT ON COLUMN public.members.nickname IS
'1-ago-2026: APODO editable por el cliente (Mi Cuenta / registro).
Se muestra en la lista de participantes de la rifa en lugar del
nombre real. NULL = se muestra el primer nombre.';

-- ── 2. member_profile_json + nickname ───────────────────────────
CREATE OR REPLACE FUNCTION public.member_profile_json(p_member_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'id', m.id, 'name', m.name, 'nickname', m.nickname,
    'email', m.email, 'avatar_url', m.avatar_url,
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

-- ── 3. update_my_profile: name FUERA, nickname DENTRO ───────────
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

  -- 'name' ya NO es editable por el cliente (1-ago-2026): si un
  -- cliente cacheado aún lo envía, se IGNORA sin romper el guardado.

  IF p_changes ? 'nickname' AND length(trim(COALESCE(p_changes->>'nickname', ''))) > 20 THEN
    RETURN jsonb_build_object('error', 'El apodo no puede superar 20 caracteres');
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
    nickname   = CASE WHEN p_changes ? 'nickname'   THEN NULLIF(trim(COALESCE(p_changes->>'nickname', '')), '') ELSE nickname END,
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
'SEC.C.1 + 1-ago-2026: edición del propio perfil con sesión de miembro.
Whitelist: nickname (apodo, máx 20), phone (único), email, nit,
birthday (solo completar), address, vehicles (deriva plate),
avatar_url. El nombre REAL ya no es editable por el cliente (si un
cliente viejo lo envía, se ignora); el admin lo edita por
update_member_with_audit.';

-- ── 4. list_raffle_participants: apodo + avatar, sin nombre real
--       para miembros ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.list_raffle_participants(
  p_session_token text,
  p_role          text
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_role NOT IN ('member', 'operator', 'admin') THEN
    RAISE EXCEPTION 'Sesión inválida' USING ERRCODE = '28000', DETAIL = 'invalid_role';
  END IF;
  PERFORM public.validate_session_token(p_session_token, p_role, 'list_raffle_participants', false, NULL);
  RETURN QUERY
    SELECT jsonb_build_object(
      'raffle_id', rt.raffle_id, 'member_id', rt.member_id,
      'name', CASE WHEN p_role = 'member' THEN NULL ELSE m.name END,
      'display_name', COALESCE(NULLIF(m.nickname, ''),
                               NULLIF(split_part(COALESCE(m.name, ''), ' ', 1), ''),
                               'Participante'),
      'avatar_url', m.avatar_url,
      'tickets', SUM(rt.quantity)
    )
    FROM raffle_tickets rt
    LEFT JOIN members m ON m.id = rt.member_id
    GROUP BY rt.raffle_id, rt.member_id, m.name, m.nickname, m.avatar_url;
END;
$function$;

COMMENT ON FUNCTION public.list_raffle_participants(text, text) IS
'SEC.C.2 + 1-ago-2026: participantes de rifas con cualquier sesión.
display_name = apodo (o primer nombre) + avatar_url; el nombre real
solo viaja a sesiones de operador/admin.';

COMMIT;

-- ============================================================
-- Verificación:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'members' AND column_name = 'nickname';
--   -- esperado: 1 fila
--   SELECT prosrc LIKE '%display_name%' FROM pg_proc
--   WHERE proname = 'list_raffle_participants';
--   -- esperado: true
-- ============================================================

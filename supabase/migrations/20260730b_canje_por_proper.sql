-- ============================================================
-- 20260730b — CANJE COMPLETO POR PROPER (F7a.3)
-- ============================================================
-- Decisión del dueño (30-jul): el flujo de ENTREGA de canjes se
-- realiza TODO desde PROPER — el operador escanea el QR del premio
-- (o escribe el código) en el POS, desde ahí envía la solicitud de
-- confirmación, el cliente confirma en su celular (Puntos Plus) y el
-- operador imprime el comprobante desde la app de PROPER.
--
-- El comprobante se imprime SOLO al entregar un canje/premio; al
-- acumular puntos por consumo NO se imprime nada (la factura ya la
-- emitió PROPER).
--
-- Paridad con la vista de operador: además del QR, el POS puede
-- ESCRIBIR el código de la tarjeta del cliente (CTxD-XXXXX) para
-- listar sus canjes pendientes, o el código del premio (TK-XXXXXX)
-- directo.
--
-- Piezas:
--   1. redemptions.confirm_requested_at — frescura de la solicitud
--      (el modal del cliente al ABRIR la app solo se auto-abre si la
--      solicitud es reciente; evita revivir solicitudes muertas).
--   2. operator_set_redemption_confirm estampa esa marca (mismo flujo
--      de la app propia).
--   3. get_my_redemptions expone reward_id/confirm_status/
--      confirm_requested_at → el cliente que abre la app con una
--      solicitud activa ve el modal aunque el broadcast no lo haya
--      alcanzado (app cerrada en ese momento).
--   4. api_list_pending_redemptions(card_code) — pendientes del
--      miembro por su tarjeta (escaneada o escrita).
--   5. api_redemption_confirm(action) — request | cancel | deliver
--      para el POS, con operador espejo y comprobante en la entrega.
--   6. Scope nuevo redemptions:write (backfill a llaves existentes).
-- ============================================================

-- ── 1. Frescura de la solicitud de confirmación ────────────────
ALTER TABLE public.redemptions
  ADD COLUMN IF NOT EXISTS confirm_requested_at timestamptz;

COMMENT ON COLUMN public.redemptions.confirm_requested_at IS
'Cuándo se pidió la confirmación vigente (operador propio o POS de
PROPER). El cliente que abre la app solo auto-abre el modal si la
solicitud es reciente (~3 min).';

-- ── 2. El flujo propio también estampa la marca ────────────────
CREATE OR REPLACE FUNCTION public.operator_set_redemption_confirm(
  p_session_token text,
  p_role          text,
  p_redemption_id uuid,
  p_status        text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_collected boolean;
BEGIN
  IF p_role NOT IN ('operator', 'admin') THEN
    RAISE EXCEPTION 'Sesión inválida' USING ERRCODE = '28000', DETAIL = 'invalid_role';
  END IF;
  PERFORM public.validate_session_token(p_session_token, p_role, 'operator_set_redemption_confirm', false, NULL);
  IF p_status NOT IN ('pending', 'none') THEN
    RETURN jsonb_build_object('error', 'Estado inválido');
  END IF;

  SELECT collected INTO v_collected FROM redemptions WHERE id = p_redemption_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Canje no encontrado');
  END IF;
  IF p_status = 'pending' AND v_collected THEN
    RETURN jsonb_build_object('error', 'Este canje ya fue entregado');
  END IF;

  UPDATE redemptions SET
    confirm_status = p_status,
    confirm_requested_at = CASE WHEN p_status = 'pending' THEN now() ELSE confirm_requested_at END
  WHERE id = p_redemption_id;
  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- ── 3. get_my_redemptions: + reward_id / confirmación vigente ──
CREATE OR REPLACE FUNCTION public.get_my_redemptions(
  p_session_token text,
  p_limit         integer DEFAULT 200
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mid uuid;
BEGIN
  v_mid := public.validate_session_token(p_session_token, 'member', 'get_my_redemptions', false, NULL);
  RETURN QUERY
    SELECT jsonb_build_object(
      'id', rd.id, 'member_id', rd.member_id,
      'points_spent', rd.points_spent, 'redemption_code', rd.redemption_code,
      'collected', rd.collected, 'collected_at', rd.collected_at,
      'created_at', rd.created_at,
      'reward_id', rd.reward_id,
      'confirm_status', rd.confirm_status,
      'confirm_requested_at', rd.confirm_requested_at,
      'reward_name', rw.name, 'reward_icon', rw.icon, 'reward_category', rw.category
    )
    FROM redemptions rd
    LEFT JOIN rewards rw ON rw.id = rd.reward_id
    WHERE rd.member_id = v_mid
    ORDER BY rd.created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 200), 1), 1000);
END;
$function$;

-- ── 4. Pendientes por tarjeta del cliente (escaneada o escrita) ─
CREATE OR REPLACE FUNCTION public.api_list_pending_redemptions(p_card_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_code   text := upper(trim(COALESCE(p_card_code, '')));
  v_member RECORD;
  v_items  jsonb;
BEGIN
  IF v_code !~ '^CT[OPB]D-[0-9]+$' THEN
    RETURN jsonb_build_object('error', 'invalid_card_code');
  END IF;

  SELECT m.id, m.name INTO v_member
  FROM physical_cards pc
  JOIN members m ON m.id = pc.assigned_to
  WHERE pc.card_code = v_code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'member_not_found');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'code',         rd.redemption_code,
           'reward_name',  rw.name,
           'category',     rw.category,
           'points_spent', rd.points_spent,
           'created_at',   rd.created_at,
           'confirm_status', rd.confirm_status
         ) ORDER BY rd.created_at DESC), '[]'::jsonb)
    INTO v_items
  FROM redemptions rd
  LEFT JOIN rewards rw ON rw.id = rd.reward_id
  WHERE rd.member_id = v_member.id AND rd.collected = false;

  RETURN jsonb_build_object(
    'ok', true,
    'member_name', v_member.name,
    'card_code',   v_code,
    'pending',     v_items
  );
END;
$function$;

COMMENT ON FUNCTION public.api_list_pending_redemptions(text) IS
'F7a.3: canjes pendientes de entrega de un miembro por su tarjeta —
paridad con la vista de operador (escanear o ESCRIBIR el código del
cliente y elegir el premio a entregar).';

-- ── 5. request / cancel / deliver desde el POS ─────────────────
CREATE OR REPLACE FUNCTION public.api_redemption_confirm(
  p_api_client_id uuid,
  p_code          text,
  p_action        text,
  p_operator_ext  text DEFAULT NULL,
  p_operator_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_code text := upper(trim(COALESCE(p_code, '')));
  v_r    RECORD;
  v_op   uuid;
BEGIN
  IF p_action NOT IN ('request', 'cancel', 'deliver') THEN
    RETURN jsonb_build_object('error', 'invalid_action',
      'detail', 'Acciones válidas: request, cancel, deliver');
  END IF;

  SELECT rd.id, rd.member_id, rd.collected, rd.confirm_status,
         rd.points_spent, rd.redemption_code, rd.created_at,
         rd.reward_id, rw.name AS reward_name, rw.icon AS reward_icon,
         rw.category, m.name AS member_name
    INTO v_r
  FROM redemptions rd
  LEFT JOIN rewards rw ON rw.id = rd.reward_id
  LEFT JOIN members m  ON m.id  = rd.member_id
  WHERE rd.redemption_code = v_code
  FOR UPDATE OF rd;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'redemption_not_found');
  END IF;
  IF v_r.collected THEN
    RETURN jsonb_build_object('error', 'already_delivered',
      'detail', 'Este canje ya fue entregado');
  END IF;

  IF p_action = 'request' THEN
    UPDATE redemptions SET
      confirm_status = 'pending',
      confirm_requested_at = now()
    WHERE id = v_r.id;
    -- member_id/reward_id/redemption_id son para el BROADCAST del
    -- endpoint (se quitan de la respuesta pública; el handler del
    -- cliente exige el UUID en payload.redemptionId).
    RETURN jsonb_build_object(
      'ok', true, 'status', 'pending',
      'code', v_r.redemption_code,
      'reward_name', v_r.reward_name,
      'member_name', v_r.member_name,
      'member_id', v_r.member_id,
      'reward_id', v_r.reward_id,
      'redemption_id', v_r.id,
      'reward_icon', v_r.reward_icon,
      'points_spent', v_r.points_spent
    );
  END IF;

  IF p_action = 'cancel' THEN
    UPDATE redemptions SET confirm_status = 'none' WHERE id = v_r.id;
    RETURN jsonb_build_object('ok', true, 'status', 'none',
      'code', v_r.redemption_code, 'member_id', v_r.member_id,
      'redemption_id', v_r.id);
  END IF;

  -- deliver: misma invariante server-side que deliver_redemption —
  -- la entrega EXIGE la confirmación del cliente en su dispositivo.
  IF v_r.confirm_status <> 'confirmed' THEN
    RETURN jsonb_build_object('error', 'not_confirmed',
      'detail', 'El cliente aún no ha confirmado la entrega en su app');
  END IF;

  -- Operador espejo para la atribución (mismo patrón de purchases).
  IF COALESCE(trim(p_operator_ext), '') = '' THEN
    RETURN jsonb_build_object('error', 'missing_operator');
  END IF;
  v_op := public.api_upsert_operator(trim(p_operator_ext), p_operator_name, NULL);

  UPDATE redemptions SET
    collected      = true,
    collected_at   = now(),
    confirm_status = 'none',
    operator_id    = v_op
  WHERE id = v_r.id;

  INSERT INTO activity_log (member_id, activity_type, description, points_change)
  VALUES (v_r.member_id, 'entrega',
          'Premio entregado: ' || COALESCE(v_r.reward_name, 'Premio'), 0);

  -- Payload del COMPROBANTE: PROPER lo imprime desde su app (la
  -- impresión solo existe en la entrega, nunca al acumular).
  RETURN jsonb_build_object(
    'ok', true, 'status', 'delivered',
    'code',          v_r.redemption_code,
    'reward_name',   v_r.reward_name,
    'category',      v_r.category,
    'points_spent',  v_r.points_spent,
    'member_name',   v_r.member_name,
    'redeemed_at',   v_r.created_at,
    'delivered_at',  now(),
    'member_id',     v_r.member_id
  );
END;
$function$;

COMMENT ON FUNCTION public.api_redemption_confirm(uuid, text, text, text, text) IS
'F7a.3: flujo de entrega de canjes desde el POS de PROPER — request
(pide confirmación al cliente), cancel (desiste) y deliver (entrega
atómica: exige confirmed, atribuye al operador espejo, registra el
entrega y devuelve el payload del comprobante). La confirmación del
cliente en SU dispositivo sigue siendo la invariante del negocio.';

-- ── 6. Scope redemptions:write ─────────────────────────────────
ALTER TABLE public.api_clients
  ALTER COLUMN scopes SET DEFAULT ARRAY['purchases:write','redemptions:read','redemptions:write'];

UPDATE public.api_clients
   SET scopes = scopes || ARRAY['redemptions:write']
 WHERE NOT ('redemptions:write' = ANY (scopes));

-- api_create_client conserva su default viejo en la firma: se recrea
-- solo el DEFAULT del parámetro.
CREATE OR REPLACE FUNCTION public.api_create_client(
  p_session_token text,
  p_name          text,
  p_scopes        text[] DEFAULT ARRAY['purchases:write','redemptions:read','redemptions:write']
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_key text;
  v_id  uuid;
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'api_create_client', false, NULL);
  -- pp_live_<48 hex>
  v_key := 'pp_live_' || encode(extensions.gen_random_bytes(24), 'hex');
  INSERT INTO api_clients (name, key_prefix, key_hash, scopes)
  VALUES (p_name, left(v_key, 8), extensions.crypt(v_key, extensions.gen_salt('bf', 8)), p_scopes)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'client_id', v_id, 'api_key', v_key);
END;
$function$;

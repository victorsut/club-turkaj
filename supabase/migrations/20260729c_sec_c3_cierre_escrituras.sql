-- ═══════════════════════════════════════════════════════════════
-- SEC.C.3 — CIERRE DE ESCRITURAS: activity_log, redemptions,
--           physical_cards  (29-jul-2026)
--
-- Cierra las escrituras directas que quedaron abiertas tras SEC.C.2:
--
--  · activity_log    → INSERT directo REVOCADO (cualquiera podía
--                      falsificar entradas del historial). El único
--                      consumidor vivo era la 'entrega' de OpRedeem —
--                      ahora la registra deliver_redemption server-side.
--
--  · redemptions     → UPDATE directo REVOCADO (cualquiera podía marcar
--                      canjes ajenos como entregados o confirmar en
--                      nombre del cliente). El flujo completo pasa a
--                      RPCs con sesión: operador pide/retira la
--                      confirmación (operator_set_redemption_confirm),
--                      el cliente responde con SU token
--                      (respond_redemption_confirm) y la entrega es
--                      atómica (deliver_redemption exige confirmación
--                      previa del cliente e inserta el 'entrega').
--
--  · physical_cards  → CERRADA del todo (tenía ALL abierto: códigos de
--                      tarjeta enumerables y editables). La resolución
--                      de tarjeta del escaneo pasa a resolve_card con
--                      sesión de operador/admin; el alta y el cambio de
--                      tier ya eran server-side (register_member /
--                      register_purchase). Las funciones CRUD del
--                      cliente estaban muertas.
--
-- ⚠️ EJECUTAR INMEDIATO tras el deploy del frontend (van en pareja:
--    el código nuevo sin migración cae en errores de RPC inexistente
--    en el flujo de canje; el código viejo con migración recibe
--    permission denied en los UPDATE — ambos exigen "Recargar").
-- ⚠️ SESIONES LEGADAS de miembro (sin token): ya NO pueden confirmar
--    canjes — deben re-loguearse (mismo criterio de C.1/C.2).
-- ═══════════════════════════════════════════════════════════════

-- ── 1. resolve_card: tarjeta por código con sesión de staff ────
CREATE OR REPLACE FUNCTION public.resolve_card(
  p_session_token text,
  p_role          text,
  p_code          text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row jsonb;
BEGIN
  IF p_role NOT IN ('operator', 'admin') THEN
    RAISE EXCEPTION 'Sesión inválida' USING ERRCODE = '28000', DETAIL = 'invalid_role';
  END IF;
  PERFORM public.validate_session_token(p_session_token, p_role, 'resolve_card', false, NULL);
  SELECT jsonb_build_object(
    'card_code', pc.card_code, 'tier', pc.tier, 'status', pc.status,
    'assigned_to', pc.assigned_to, 'member_name', m.name
  ) INTO v_row
  FROM physical_cards pc
  LEFT JOIN members m ON m.id = pc.assigned_to
  WHERE pc.card_code = upper(trim(p_code));
  RETURN v_row; -- NULL si el código no existe
END;
$function$;

COMMENT ON FUNCTION public.resolve_card(text, text, text) IS
'SEC.C.3: resolución de tarjeta por código para el escaneo del operador.
Sustituye el SELECT abierto de physical_cards.';

-- ── 2. operator_set_redemption_confirm: pending / none ─────────
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

  UPDATE redemptions SET confirm_status = p_status WHERE id = p_redemption_id;
  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- ── 3. respond_redemption_confirm: el cliente responde ─────────
CREATE OR REPLACE FUNCTION public.respond_redemption_confirm(
  p_session_token text,
  p_redemption_id uuid,
  p_accept        boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mid    uuid;
  v_status text;
BEGIN
  v_mid := public.validate_session_token(p_session_token, 'member', 'respond_redemption_confirm', false, NULL);

  UPDATE redemptions
     SET confirm_status = CASE WHEN p_accept THEN 'confirmed' ELSE 'cancelled' END
   WHERE id = p_redemption_id
     AND member_id = v_mid
     AND confirm_status = 'pending'
  RETURNING confirm_status INTO v_status;

  IF v_status IS NULL THEN
    RETURN jsonb_build_object('error', 'La solicitud ya no está activa');
  END IF;
  RETURN jsonb_build_object('ok', true, 'status', v_status);
END;
$function$;

COMMENT ON FUNCTION public.respond_redemption_confirm(text, uuid, boolean) IS
'SEC.C.3: confirmación/cancelación del canje por el PROPIO miembro con
su sesión — solo sobre solicitudes en pending. Sustituye el UPDATE
directo del cliente.';

-- ── 4. deliver_redemption: entrega atómica con rastro ──────────
CREATE OR REPLACE FUNCTION public.deliver_redemption(
  p_session_token text,
  p_role          text,
  p_redemption_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id     uuid;
  v_r      RECORD;
BEGIN
  IF p_role NOT IN ('operator', 'admin') THEN
    RAISE EXCEPTION 'Sesión inválida' USING ERRCODE = '28000', DETAIL = 'invalid_role';
  END IF;
  v_id := public.validate_session_token(p_session_token, p_role, 'deliver_redemption', false, NULL);

  SELECT rd.member_id, rd.collected, rd.confirm_status, rw.name AS reward_name
    INTO v_r
  FROM redemptions rd
  LEFT JOIN rewards rw ON rw.id = rd.reward_id
  WHERE rd.id = p_redemption_id
  FOR UPDATE OF rd;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Canje no encontrado');
  END IF;
  IF v_r.collected THEN
    RETURN jsonb_build_object('error', 'Este canje ya fue entregado');
  END IF;
  -- Invariante de negocio server-side: la entrega exige la
  -- confirmación del cliente en su dispositivo.
  IF v_r.confirm_status <> 'confirmed' THEN
    RETURN jsonb_build_object('error', 'El cliente aún no ha confirmado');
  END IF;

  UPDATE redemptions SET
    collected      = true,
    collected_at   = now(),
    confirm_status = 'none',
    operator_id    = CASE WHEN p_role = 'operator' THEN v_id ELSE operator_id END
  WHERE id = p_redemption_id;

  INSERT INTO activity_log (member_id, activity_type, description, points_change)
  VALUES (v_r.member_id, 'entrega',
          'Premio entregado: ' || COALESCE(v_r.reward_name, 'Premio'), 0);

  RETURN jsonb_build_object('ok', true);
END;
$function$;

COMMENT ON FUNCTION public.deliver_redemption(text, text, uuid) IS
'SEC.C.3: entrega del canje (operador/admin) — atómica: exige confirmed,
marca collected/collected_at/operator_id y registra el ''entrega'' en
activity_log server-side. Sustituye los UPDATE directos de OpRedeem.';

-- ── 5. Cierres de grants y policies ────────────────────────────
-- activity_log: sin escritura directa (los RPCs DEFINER siguen).
DROP POLICY IF EXISTS activity_insert_open ON public.activity_log;
REVOKE INSERT ON public.activity_log FROM anon, authenticated;

-- redemptions: sin UPDATE directo (grants de columna incluidos).
DROP POLICY IF EXISTS redemptions_update_open ON public.redemptions;
REVOKE UPDATE (confirm_status, collected, collected_at, operator_id)
  ON public.redemptions FROM anon, authenticated;
REVOKE UPDATE ON public.redemptions FROM anon, authenticated;

-- physical_cards: cerrada del todo (lectura por resolve_card).
DROP POLICY IF EXISTS physical_cards_all ON public.physical_cards;
REVOKE ALL ON public.physical_cards FROM anon, authenticated;

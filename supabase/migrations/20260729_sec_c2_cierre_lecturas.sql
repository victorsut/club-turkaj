-- ═══════════════════════════════════════════════════════════════
-- SEC.C.2 — CIERRE DE LECTURAS: activity_log, purchases,
--           redemptions, raffle_tickets  (29-jul-2026)
--
-- Continúa SEC.C.1 (20260728d). Las 4 tablas tenían policy permisiva
-- FOR ALL USING(true) + grants completos para anon/authenticated:
-- cualquiera podía enumerar el historial de compras, canjes, boletos
-- y actividad de TODOS los miembros (incl. redemption_code — el QR
-- de canjes ajenos). Cierre por tabla:
--
--  · activity_log   → SELECT revocado. Lecturas vía RPC list_activity
--                     (member: solo lo suyo; operator/admin: cualquier
--                     miembro o global). INSERT directo se CONSERVA
--                     (logActivity del cliente/operador — deuda de
--                     escrituras anotada para SEC.C.3).
--
--  · purchases      → SELECT solo por VENTANA de 15 minutos (policy
--                     por fila) + grants de columna. El canal Realtime
--                     purchases-<id> (modal de calificación) sigue
--                     vivo: el INSERT recién ocurrido siempre cae en
--                     la ventana; el histórico queda inaccesible.
--                     Historial por operador vía RPC (admin/op).
--
--  · redemptions    → SELECT solo filas EN FLUJO de confirmación
--                     (confirm_status <> 'none') + grants de columna
--                     SIN redemption_code: el canal Realtime
--                     redemption-confirm-<id> sigue vivo y los códigos
--                     TK dejan de ser enumerables. El cliente carga
--                     SUS canjes (con código, para el QR) vía RPC con
--                     sesión; operador vía RPCs (pendientes, escaneo
--                     TK, historial del día, poll de confirmación).
--                     UPDATE directo se conserva PERO acotado a
--                     columnas (confirm_status, collected,
--                     collected_at, operator_id) — cierre total de
--                     escrituras = SEC.C.3.
--
--  · raffle_tickets → SELECT revocado del todo. Participantes vía RPC
--                     list_raffle_participants (cualquier sesión:
--                     member/operator/admin) con nombre resuelto
--                     server-side. Escrituras ya eran solo por RPC.
--
-- ⚠️ EJECUTAR INMEDIATO tras el deploy del frontend: el código viejo
--    cacheado vería vacíos historiales/canjes/rifa hasta "Recargar";
--    el código nuevo sin la migración cae en fallback vacío (no rompe).
-- ⚠️ SESIONES LEGADAS (logueadas antes de SEC.C.1, sin token): verán
--    su historial, canjes y rifa VACÍOS hasta re-loguearse.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. activity_log: solo INSERT directo ───────────────────────
DROP POLICY IF EXISTS activity_all ON public.activity_log;
CREATE POLICY activity_insert_open ON public.activity_log
  FOR INSERT WITH CHECK (true);

REVOKE ALL ON public.activity_log FROM anon, authenticated;
GRANT INSERT ON public.activity_log TO anon, authenticated;

-- ── 2. purchases: ventana de 15 min + columnas mínimas ─────────
DROP POLICY IF EXISTS purchases_all  ON public.purchases;
DROP POLICY IF EXISTS purchases_open ON public.purchases;
CREATE POLICY purchases_select_recent ON public.purchases
  FOR SELECT USING (created_at > now() - interval '15 minutes');

REVOKE ALL ON public.purchases FROM anon, authenticated;
-- Solo lo que consume el handler Realtime del modal de calificación
-- (fuel_type/gallons/invoice_no NO viajan por la API abierta).
GRANT SELECT (id, member_id, operator_id, station_id, points_earned, amount, created_at)
  ON public.purchases TO anon, authenticated;

-- ── 3. redemptions: flujo de confirmación + columnas sin código ─
DROP POLICY IF EXISTS redemptions_all  ON public.redemptions;
DROP POLICY IF EXISTS redemptions_open ON public.redemptions;
CREATE POLICY redemptions_select_confirm_flow ON public.redemptions
  FOR SELECT USING (confirm_status IS NOT NULL AND confirm_status <> 'none');
-- Escritura del flujo actual (operador marca pending/collected, cliente
-- confirma/cancela). Cierre total por RPC = SEC.C.3.
CREATE POLICY redemptions_update_open ON public.redemptions
  FOR UPDATE USING (true) WITH CHECK (true);

REVOKE ALL ON public.redemptions FROM anon, authenticated;
GRANT SELECT (id, member_id, reward_id, points_spent, confirm_status, collected, created_at)
  ON public.redemptions TO anon, authenticated;
GRANT UPDATE (confirm_status, collected, collected_at, operator_id)
  ON public.redemptions TO anon, authenticated;

-- ── 4. raffle_tickets: cerrado del todo ────────────────────────
DROP POLICY IF EXISTS raffle_tickets_all ON public.raffle_tickets;
REVOKE ALL ON public.raffle_tickets FROM anon, authenticated;

-- ═══════════════════════════════════════════════════════════════
-- RPCs de lectura con sesión
-- ═══════════════════════════════════════════════════════════════

-- ── 5. list_activity: libro mayor con sesión ───────────────────
--   member   → p_member_id obligatorio y = su sesión.
--   operator/admin → cualquier miembro, o NULL = global (mapa del
--   admin: filtro por estación de Members y actividad reciente).
CREATE OR REPLACE FUNCTION public.list_activity(
  p_session_token text,
  p_role          text,
  p_member_id     uuid DEFAULT NULL,
  p_limit         integer DEFAULT 1000
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF p_role NOT IN ('member', 'operator', 'admin') THEN
    RAISE EXCEPTION 'Sesión inválida' USING ERRCODE = '28000', DETAIL = 'invalid_role';
  END IF;
  v_id := public.validate_session_token(p_session_token, p_role, 'list_activity', false, NULL);
  IF p_role = 'member' AND (p_member_id IS NULL OR p_member_id <> v_id) THEN
    RAISE EXCEPTION 'Sesión inválida' USING ERRCODE = '28000', DETAIL = 'member_mismatch';
  END IF;

  RETURN QUERY
    SELECT jsonb_build_object(
      'id', a.id, 'member_id', a.member_id,
      'activity_type', a.activity_type, 'description', a.description,
      'points_change', a.points_change, 'amount', a.amount,
      'station_id', a.station_id, 'created_at', a.created_at
    )
    FROM activity_log a
    WHERE p_member_id IS NULL OR a.member_id = p_member_id
    ORDER BY a.created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 1000), 1), 2000);
END;
$function$;

COMMENT ON FUNCTION public.list_activity(text, text, uuid, integer) IS
'SEC.C.2: lectura del activity_log con sesión. member = solo su propio
libro mayor; operator/admin = cualquier miembro o global (member_id NULL).';

-- ── 6. get_my_redemptions: canjes del miembro (CON código) ─────
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
      'reward_name', rw.name, 'reward_icon', rw.icon, 'reward_category', rw.category
    )
    FROM redemptions rd
    LEFT JOIN rewards rw ON rw.id = rd.reward_id
    WHERE rd.member_id = v_mid
    ORDER BY rd.created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 200), 1), 1000);
END;
$function$;

COMMENT ON FUNCTION public.get_my_redemptions(text, integer) IS
'SEC.C.2: canjes del propio miembro con sesión — única vía por la que
el código TK (QR del premio) llega al cliente.';

-- ── 7. list_member_pending_redemptions: pendientes (operador) ──
CREATE OR REPLACE FUNCTION public.list_member_pending_redemptions(
  p_session_token text,
  p_role          text,
  p_member_id     uuid
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_role NOT IN ('operator', 'admin') THEN
    RAISE EXCEPTION 'Sesión inválida' USING ERRCODE = '28000', DETAIL = 'invalid_role';
  END IF;
  PERFORM public.validate_session_token(p_session_token, p_role, 'list_member_pending_redemptions', false, NULL);
  RETURN QUERY
    SELECT jsonb_build_object(
      'id', rd.id, 'member_id', rd.member_id,
      'points_spent', rd.points_spent, 'redemption_code', rd.redemption_code,
      'created_at', rd.created_at,
      'reward_name', rw.name, 'reward_icon', rw.icon, 'reward_category', rw.category
    )
    FROM redemptions rd
    LEFT JOIN rewards rw ON rw.id = rd.reward_id
    WHERE rd.member_id = p_member_id AND rd.collected = false
    ORDER BY rd.created_at DESC;
END;
$function$;

-- ── 8. get_redemption_by_code: escaneo directo del TK ──────────
CREATE OR REPLACE FUNCTION public.get_redemption_by_code(
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
  PERFORM public.validate_session_token(p_session_token, p_role, 'get_redemption_by_code', false, NULL);
  SELECT jsonb_build_object(
    'id', rd.id, 'member_id', rd.member_id,
    'points_spent', rd.points_spent, 'redemption_code', rd.redemption_code,
    'collected', rd.collected, 'created_at', rd.created_at,
    'reward_name', rw.name, 'reward_icon', rw.icon, 'reward_category', rw.category
  ) INTO v_row
  FROM redemptions rd
  LEFT JOIN rewards rw ON rw.id = rd.reward_id
  WHERE rd.redemption_code = upper(trim(p_code));
  RETURN v_row; -- NULL si no existe
END;
$function$;

-- ── 9. list_operator_redemptions: entregas por operador ────────
--   operator → solo su propio historial; admin → cualquier operador.
CREATE OR REPLACE FUNCTION public.list_operator_redemptions(
  p_session_token text,
  p_role          text,
  p_operator_id   uuid,
  p_since         timestamptz DEFAULT NULL,
  p_limit         integer DEFAULT 100
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF p_role NOT IN ('operator', 'admin') THEN
    RAISE EXCEPTION 'Sesión inválida' USING ERRCODE = '28000', DETAIL = 'invalid_role';
  END IF;
  v_id := public.validate_session_token(p_session_token, p_role, 'list_operator_redemptions', false, NULL);
  IF p_role = 'operator' AND v_id <> p_operator_id THEN
    RAISE EXCEPTION 'Sesión inválida' USING ERRCODE = '28000', DETAIL = 'operator_mismatch';
  END IF;

  RETURN QUERY
    SELECT jsonb_build_object(
      'id', rd.id, 'member_id', rd.member_id, 'member_name', m.name,
      'points_spent', rd.points_spent, 'redemption_code', rd.redemption_code,
      'collected_at', rd.collected_at, 'created_at', rd.created_at,
      'reward_name', rw.name, 'reward_icon', rw.icon
    )
    FROM redemptions rd
    LEFT JOIN rewards rw ON rw.id = rd.reward_id
    LEFT JOIN members m  ON m.id  = rd.member_id
    WHERE rd.operator_id = p_operator_id
      AND rd.collected = true
      AND (p_since IS NULL OR rd.collected_at >= p_since)
    ORDER BY rd.collected_at DESC NULLS LAST
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
END;
$function$;

-- ── 10. get_redemption_status: poll de confirmación (operador) ─
CREATE OR REPLACE FUNCTION public.get_redemption_status(
  p_session_token text,
  p_role          text,
  p_id            uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_role NOT IN ('operator', 'admin') THEN
    RAISE EXCEPTION 'Sesión inválida' USING ERRCODE = '28000', DETAIL = 'invalid_role';
  END IF;
  PERFORM public.validate_session_token(p_session_token, p_role, 'get_redemption_status', false, NULL);
  RETURN (SELECT jsonb_build_object('confirm_status', rd.confirm_status)
          FROM redemptions rd WHERE rd.id = p_id);
END;
$function$;

-- ── 11. list_operator_purchases: compras por operador ──────────
CREATE OR REPLACE FUNCTION public.list_operator_purchases(
  p_session_token text,
  p_role          text,
  p_operator_id   uuid,
  p_limit         integer DEFAULT 100
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF p_role NOT IN ('operator', 'admin') THEN
    RAISE EXCEPTION 'Sesión inválida' USING ERRCODE = '28000', DETAIL = 'invalid_role';
  END IF;
  v_id := public.validate_session_token(p_session_token, p_role, 'list_operator_purchases', false, NULL);
  IF p_role = 'operator' AND v_id <> p_operator_id THEN
    RAISE EXCEPTION 'Sesión inválida' USING ERRCODE = '28000', DETAIL = 'operator_mismatch';
  END IF;

  RETURN QUERY
    SELECT jsonb_build_object(
      'id', p.id, 'member_id', p.member_id, 'member_name', m.name,
      'fuel_type', p.fuel_type, 'gallons', p.gallons, 'amount', p.amount,
      'points_earned', p.points_earned, 'created_at', p.created_at
    )
    FROM purchases p
    LEFT JOIN members m ON m.id = p.member_id
    WHERE p.operator_id = p_operator_id
    ORDER BY p.created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
END;
$function$;

-- ── 12. list_raffle_participants: boletos agregados ────────────
--   Cualquier sesión válida (member/operator/admin). Devuelve la
--   suma de boletos por rifa y miembro con el nombre resuelto
--   server-side (points_spent NO viaja).
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
      'name', m.name, 'tickets', SUM(rt.quantity)
    )
    FROM raffle_tickets rt
    LEFT JOIN members m ON m.id = rt.member_id
    GROUP BY rt.raffle_id, rt.member_id, m.name;
END;
$function$;

COMMENT ON FUNCTION public.list_raffle_participants(text, text) IS
'SEC.C.2: participantes de rifas con cualquier sesión válida. Sustituye
el SELECT abierto de raffle_tickets.';

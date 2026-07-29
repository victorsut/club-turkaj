-- ═══════════════════════════════════════════════════════════════
-- SEC.C.2b — FIXES post-cierre (29-jul-2026)
--
-- 1. FILTRO POR ESTACIÓN en Miembros (admin): estaba ROTO desde
--    antes de SEC.C.2 — activity_log.station_id guarda UUIDs y la
--    vista comparaba contra los NOMBRES 'Turkaj I/II/III' (nunca
--    coincidía). Regla del dueño: clasificar por el ÚLTIMO CONSUMO
--    registrado. Nuevo RPC list_member_stations (operador/admin)
--    que deriva por miembro, desde PURCHASES (fuente autoritativa),
--    la estación de su última compra y la más frecuente, con el
--    NOMBRE resuelto server-side.
--
-- 2. reward_id en las lecturas de canje del operador: el aviso de
--    confirmación al cliente ahora viaja también por Realtime
--    BROADCAST (el operador lo emite tras marcar 'pending' — la
--    entrega de postgres_changes bajo policies/grants de columna
--    resultó no confiable en producción) y el payload referencia el
--    premio por id.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. list_member_stations: estación por último consumo ───────
CREATE OR REPLACE FUNCTION public.list_member_stations(
  p_session_token text,
  p_role          text
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
  PERFORM public.validate_session_token(p_session_token, p_role, 'list_member_stations', false, NULL);

  RETURN QUERY
  WITH counts AS (
    SELECT p.member_id, p.station_id, count(*) AS n, max(p.created_at) AS last_at
    FROM purchases p
    WHERE p.station_id IS NOT NULL
    GROUP BY p.member_id, p.station_id
  )
  SELECT jsonb_build_object(
    'member_id', m.member_id,
    'last_station', (
      SELECT s.name FROM counts c JOIN stations s ON s.id = c.station_id
      WHERE c.member_id = m.member_id
      ORDER BY c.last_at DESC LIMIT 1
    ),
    'top_station', (
      SELECT s.name FROM counts c JOIN stations s ON s.id = c.station_id
      WHERE c.member_id = m.member_id
      ORDER BY c.n DESC, c.last_at DESC LIMIT 1
    )
  )
  FROM (SELECT DISTINCT member_id FROM counts) m;
END;
$function$;

COMMENT ON FUNCTION public.list_member_stations(text, text) IS
'SEC.C.2b: estación por miembro derivada de purchases — última compra
(last_station) y más frecuente (top_station), nombres server-side.
Alimenta el filtro por estación de la vista Miembros del admin.';

-- ── 2. reward_id en pendientes y búsqueda por código ───────────
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
      'id', rd.id, 'member_id', rd.member_id, 'reward_id', rd.reward_id,
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
    'id', rd.id, 'member_id', rd.member_id, 'reward_id', rd.reward_id,
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

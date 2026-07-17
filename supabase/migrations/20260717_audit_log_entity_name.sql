-- ============================================================
-- Puntos Plus — B0/F0.4 (ajuste): entity_name en get_admin_audit_log
-- ============================================================
-- Feedback del smoke test: cada registro debe mostrar A QUIÉN
-- afectó el cambio (nombre del miembro, no solo el UUID).
--
-- CREATE OR REPLACE con la MISMA firma → los grants de la
-- migración anterior se preservan (patrón B.8.1, sin DROP).
--
-- Cambios vs 20260717_get_admin_audit_log:
--   + entity_name  — nombre humano de la entidad afectada, resuelto
--     por entity_type: member/operator/reward → name; promotion →
--     title; special_day → name; raffle → prize_name. NULL si la
--     fila ya no existe (ej. deletes) — el cliente cae al snapshot
--     de old_value/new_value.
--   + entity_detail — solo para member: el teléfono (desambigua
--     homónimos). NULL para el resto.
--   Comparación por id::text = entity_id (entity_id es text y puede
--   no ser uuid, ej. fuel_prices) — sin casts que puedan fallar.
--   Subconsultas escalares por fila: máx 20-100 filas/página, costo
--   despreciable con PKs.
--
-- REVERT copy-paste: re-ejecutar el cuerpo de
--   20260717_get_admin_audit_log.sql (mismo CREATE OR REPLACE).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_admin_audit_log(
  p_session_token text DEFAULT NULL,
  p_limit         int  DEFAULT 20,
  p_offset        int  DEFAULT 0,
  p_action        text DEFAULT NULL,
  p_entity_type   text DEFAULT NULL,
  p_date_from     date DEFAULT NULL,
  p_date_to       date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit  int;
  v_offset int;
  v_from   timestamptz;
  v_to     timestamptz;
  v_total  bigint;
  v_rows   jsonb;
BEGIN
  -- (1) Validación de sesión admin (STRICT: RAISE 28000).
  PERFORM public.validate_session_token(
    p_session_token, 'admin', 'get_admin_audit_log', false, NULL
  );

  -- (2) Saneo de paginación.
  v_limit  := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
  v_offset := GREATEST(COALESCE(p_offset, 0), 0);

  -- (3) Fechas: día calendario de Guatemala → rango timestamptz.
  IF p_date_from IS NOT NULL THEN
    v_from := p_date_from::timestamp AT TIME ZONE 'America/Guatemala';
  END IF;
  IF p_date_to IS NOT NULL THEN
    v_to := (p_date_to + 1)::timestamp AT TIME ZONE 'America/Guatemala';
  END IF;

  -- (4) Total con los mismos filtros.
  SELECT count(*) INTO v_total
  FROM admin_audit_log l
  WHERE (p_action      IS NULL OR l.action      = p_action)
    AND (p_entity_type IS NULL OR l.entity_type = p_entity_type)
    AND (v_from IS NULL OR l.created_at >= v_from)
    AND (v_to   IS NULL OR l.created_at <  v_to);

  -- (5) Página con resolución de nombre de entidad.
  SELECT COALESCE(jsonb_agg(to_jsonb(x)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT l.id, l.admin_id, l.admin_name, l.admin_email,
           l.action, l.entity_type, l.entity_id, l.reason_text,
           l.old_value, l.new_value, l.metadata, l.created_at,
           CASE l.entity_type
             WHEN 'member'      THEN (SELECT m.name        FROM members m         WHERE m.id::text  = l.entity_id)
             WHEN 'operator'    THEN (SELECT o.name        FROM operators o       WHERE o.id::text  = l.entity_id)
             WHEN 'reward'      THEN (SELECT r.name        FROM rewards r         WHERE r.id::text  = l.entity_id)
             WHEN 'promotion'   THEN (SELECT p.title       FROM promotions p      WHERE p.id::text  = l.entity_id)
             WHEN 'special_day' THEN (SELECT s.name        FROM special_days s    WHERE s.id::text  = l.entity_id)
             WHEN 'raffle'      THEN (SELECT rc.prize_name FROM raffle_calendar rc WHERE rc.id::text = l.entity_id)
             ELSE NULL
           END AS entity_name,
           CASE WHEN l.entity_type = 'member'
                THEN (SELECT m.phone FROM members m WHERE m.id::text = l.entity_id)
                ELSE NULL
           END AS entity_detail
    FROM admin_audit_log l
    WHERE (p_action      IS NULL OR l.action      = p_action)
      AND (p_entity_type IS NULL OR l.entity_type = p_entity_type)
      AND (v_from IS NULL OR l.created_at >= v_from)
      AND (v_to   IS NULL OR l.created_at <  v_to)
    ORDER BY l.created_at DESC
    LIMIT v_limit OFFSET v_offset
  ) x;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$$;

COMMENT ON FUNCTION public.get_admin_audit_log(text, int, int, text, text, date, date) IS
'B0/F0.4 — Lectura paginada de admin_audit_log con entity_name resuelto (member/operator/reward/promotion/special_day/raffle) y entity_detail (teléfono para member). Filtros acción/entidad/fechas (día calendario America/Guatemala). Sesión admin STRICT (28000). EXECUTE: anon, authenticated, service_role (grants preservados de la migración base).';

-- ── Fin ───────────────────────────────────────────────────────

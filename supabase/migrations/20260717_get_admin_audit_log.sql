-- ============================================================
-- Puntos Plus — B0/F0.4: RPC get_admin_audit_log (lectura)
-- ============================================================
-- admin_audit_log tiene RLS deny-all (F0.1). La propia migración
-- F0.1 anticipó: "Lectura: solo via futura RPC get_admin_audit_log
-- (SECURITY DEFINER)". Esa RPC se construye acá.
--
-- Seguridad: validación STRICT del token de sesión de admin
-- (validate_session_token, SEC.B.8.1). Sin sesión admin válida →
-- RAISE con ERRCODE 28000 (el cliente ya intercepta ese código de
-- forma centralizada y manda a login). Ni siquiera con la apikey
-- anon se puede leer el log sin login de admin vigente.
--
-- Filtros (todos opcionales, combinados con AND):
--   p_action      — igualdad exacta contra action.
--   p_entity_type — igualdad exacta contra entity_type.
--   p_date_from / p_date_to — días calendario de GUATEMALA
--     (America/Guatemala), convertidos a rango timestamptz
--     sargable [from 00:00, to+1 00:00) para usar idx_aal_created_at.
--
-- Retorno jsonb: { total: <bigint>, rows: [ {...}, ... ] }
-- p_limit saneado a [1, 100] server-side; p_offset >= 0.
--
-- REVERT copy-paste:
--   DROP FUNCTION public.get_admin_audit_log(text, int, int, text, text, date, date);
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
  -- (1) Validación de sesión admin (STRICT: RAISE 28000 si el token
  --     está ausente/inválido/revocado/expirado). p_params NULL a
  --     propósito: no persistimos nada del request en violations.
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

  -- (4) Total con los mismos filtros (para "X–Y de N" en la UI).
  SELECT count(*) INTO v_total
  FROM admin_audit_log l
  WHERE (p_action      IS NULL OR l.action      = p_action)
    AND (p_entity_type IS NULL OR l.entity_type = p_entity_type)
    AND (v_from IS NULL OR l.created_at >= v_from)
    AND (v_to   IS NULL OR l.created_at <  v_to);

  -- (5) Página ordenada por fecha descendente.
  SELECT COALESCE(jsonb_agg(to_jsonb(x)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT l.id, l.admin_id, l.admin_name, l.admin_email,
           l.action, l.entity_type, l.entity_id, l.reason_text,
           l.old_value, l.new_value, l.metadata, l.created_at
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

REVOKE ALL ON FUNCTION public.get_admin_audit_log(text, int, int, text, text, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_audit_log(text, int, int, text, text, date, date)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_admin_audit_log(text, int, int, text, text, date, date) IS
'B0/F0.4 — Lectura paginada de admin_audit_log (RLS deny-all: única vía de lectura). Filtros de acción/entidad/fechas (día calendario America/Guatemala). Exige sesión admin válida via validate_session_token STRICT (RAISE 28000). EXECUTE: anon (admins usan anon key), authenticated, service_role.';

-- ── Fin ───────────────────────────────────────────────────────

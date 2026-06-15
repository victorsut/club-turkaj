-- ============================================================
-- Club Turkaj + / Puntos+ — F0.3.5.2: RPC toggle_operator_active
-- ============================================================
-- RPC server-side que invierte el `active` de un operador y
-- registra la accion en admin_audit_log EN LA MISMA TRANSACCION,
-- via log_admin_action. Mismo patron que F0.3.4 (create_operator,
-- update_operator_password).
--
-- BACKWARD COMPATIBILITY:
--   - p_admin_id IS NULL → solo togglea (sin log). Path legacy.
--   - p_admin_id NOT NULL → togglea y registra. toggle_operator_active
--     es accion SENSIBLE en log_admin_action: si reason_text es NULL
--     o vacio, el RAISE de log_admin_action revierte todo.
--
-- ATOMICIDAD: el UPDATE y el log viven en la misma transaccion. Si
-- el log falla (reason invalido), el toggle se revierte.
--
-- SEGURIDAD: nunca se loguea password_hash. old_value/new_value solo
-- contienen { operator_id, operator_username, active }.
--
-- NOTA: funcion nueva, no hay overload previo → no se necesita DROP.
-- No usa crypt → no se necesita pgcrypto.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- toggle_operator_active: activa/desactiva operador + auditoria opcional
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.toggle_operator_active(
  p_id          uuid,
  p_new_active  boolean,
  -- Auditoría (F0.3.5)
  p_admin_id    uuid    DEFAULT NULL,
  p_admin_name  text    DEFAULT NULL,
  p_admin_email text    DEFAULT NULL,
  p_reason_text text    DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_count      integer;
  v_old_active boolean;
  v_username   text;
BEGIN
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'p_id es obligatorio' USING ERRCODE = '22023';
  END IF;

  -- Capturar estado actual ANTES del UPDATE (para old_value).
  SELECT active, username
    INTO v_old_active, v_username
    FROM public.operators
   WHERE id = p_id;

  -- Operador inexistente: nada que togglear.
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.operators
     SET active     = p_new_active,
         updated_at = now()
   WHERE id = p_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Auditoría solo si el UPDATE afectó la fila (v_count > 0, defensivo
  -- ante un DELETE concurrente entre el SELECT y el UPDATE) y hay admin.
  IF v_count > 0 AND p_admin_id IS NOT NULL THEN
    PERFORM public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => 'toggle_operator_active',
      p_entity_type => 'operator',
      p_entity_id   => p_id::text,
      p_reason_text => p_reason_text,
      p_old_value   => jsonb_build_object(
        'operator_id',       p_id,
        'operator_username', v_username,
        'active',            v_old_active
      ),
      p_new_value   => jsonb_build_object(
        'operator_id',       p_id,
        'operator_username', v_username,
        'active',            p_new_active
      )
    );
  END IF;

  RETURN v_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_operator_active(
  uuid, boolean, uuid, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_operator_active(
  uuid, boolean, uuid, text, text, text
) TO anon, authenticated;

COMMENT ON FUNCTION public.toggle_operator_active(
  uuid, boolean, uuid, text, text, text
) IS
'F0.3.5 — Activa/desactiva un operador. Si p_admin_id no es NULL y el operador existe, registra toggle_operator_active en admin_audit_log (old/new value con operator_id/username/active, sin hash) en la misma transaccion. Accion sensible: reason obligatorio.';

COMMIT;

-- ── Fin ───────────────────────────────────────────────────────

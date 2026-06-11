-- ============================================================
-- Club Turkaj + / Puntos+ — F0.2: RPC log_admin_action
-- ============================================================
-- RPC con SECURITY DEFINER para escribir en admin_audit_log
-- (que tiene RLS deny-all).
--
-- Validaciones server-side:
-- 1. action es obligatoria.
-- 2. admin_id, admin_name, admin_email son obligatorios.
-- 3. Si action esta en lista de sensibles, reason_text debe ser
--    no-NULL y no-vacio.
--
-- NO valida que admin_id exista en tabla admins (puede ser
-- borrado mas tarde; el FK ON DELETE SET NULL maneja el caso).
--
-- NO valida que admin_name/admin_email coincidan con la tabla
-- admins (son snapshots del cliente).
--
-- NO whitelist de actions: acepta cualquier string en action.
-- Solo valida reason_text en las acciones marcadas como sensibles.
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_admin_id      uuid,
  p_admin_name    text,
  p_admin_email   text,
  p_action        text,
  p_entity_type   text DEFAULT NULL,
  p_entity_id     text DEFAULT NULL,
  p_reason_text   text DEFAULT NULL,
  p_old_value     jsonb DEFAULT NULL,
  p_new_value     jsonb DEFAULT NULL,
  p_metadata      jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_sensitive_actions text[] := ARRAY[
    -- Administrativas
    'update_fuel_prices',
    'update_operator_password',
    'reset_operator_password',
    'toggle_operator_active',
    'delete_reward',
    'delete_special_day',
    'delete_promotion',
    'delete_raffle_entry',
    'update_raffle',
    -- Sobre perfiles de cliente
    'update_member_profile',
    'update_member_points',
    'update_member_gallons',
    'update_member_balances',
    'delete_member',
    'assign_physical_card',
    'unassign_physical_card'
  ];
BEGIN
  -- Validacion 1: parametros obligatorios.
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es obligatorio' USING ERRCODE = '22023';
  END IF;

  IF p_admin_name IS NULL OR trim(p_admin_name) = '' THEN
    RAISE EXCEPTION 'admin_name es obligatorio y no puede estar vacio' USING ERRCODE = '22023';
  END IF;

  IF p_admin_email IS NULL OR trim(p_admin_email) = '' THEN
    RAISE EXCEPTION 'admin_email es obligatorio y no puede estar vacio' USING ERRCODE = '22023';
  END IF;

  IF p_action IS NULL OR trim(p_action) = '' THEN
    RAISE EXCEPTION 'action es obligatoria y no puede estar vacia' USING ERRCODE = '22023';
  END IF;

  -- Validacion 2: reason_text obligatorio para acciones sensibles.
  IF p_action = ANY(v_sensitive_actions) THEN
    IF p_reason_text IS NULL OR trim(p_reason_text) = '' THEN
      RAISE EXCEPTION 'La accion "%" es sensible y requiere reason_text no-vacio', p_action
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Insert.
  INSERT INTO public.admin_audit_log (
    admin_id,
    admin_name,
    admin_email,
    action,
    entity_type,
    entity_id,
    reason_text,
    old_value,
    new_value,
    metadata
  ) VALUES (
    p_admin_id,
    p_admin_name,
    p_admin_email,
    p_action,
    p_entity_type,
    p_entity_id,
    p_reason_text,
    p_old_value,
    p_new_value,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION public.log_admin_action IS
  'F0.2 — Registra acción admin en admin_audit_log. SECURITY DEFINER bypassa RLS deny-all. Valida server-side que reason_text esté presente para 15 acciones sensibles hardcodeadas. Retorna uuid del log creado.';

-- ── Permisos ──────────────────────────────────────────────────
-- La RPC es accesible desde anon (igual que update_fuel_prices),
-- porque los admins usan la anon key. La validacion server-side
-- protege contra abuso.
GRANT EXECUTE ON FUNCTION public.log_admin_action TO anon;
GRANT EXECUTE ON FUNCTION public.log_admin_action TO authenticated;

-- ── Fin ───────────────────────────────────────────────────────

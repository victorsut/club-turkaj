-- ============================================================
-- Club Turkaj + / Puntos+ — F0.3.1.5: validación de longitud
-- de reason_text en log_admin_action
-- ============================================================
-- CREATE OR REPLACE sobre la versión de F0.2 (20260530). NO cambia
-- la signature (mismos 10 parámetros) ni la lógica de INSERT ni los
-- permisos. Solo agrega DOS validaciones de longitud a reason_text,
-- aplicables ÚNICAMENTE a acciones sensibles (mismo bloque que la
-- validación de no-vacío existente).
--
-- REGLAS:
--   - Mínimo 8 caracteres, validado DESPUÉS de trim (evita strings
--     de puro espacio en blanco que pasarían el largo pero no aportan).
--   - Máximo 500 caracteres, validado SIN trim (cuenta el texto
--     completo tal como llega).
--
-- Como CREATE OR REPLACE mantiene la misma firma, no hace falta
-- DROP (a diferencia de F0.3.1, que sí cambiaba parámetros).
-- ============================================================

BEGIN;

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

  -- Validacion 2: reason_text obligatorio y con longitud valida
  -- para acciones sensibles.
  IF p_action = ANY(v_sensitive_actions) THEN
    -- 2a. No-NULL y no-vacio (tras trim).
    IF p_reason_text IS NULL OR trim(p_reason_text) = '' THEN
      RAISE EXCEPTION 'La accion "%" es sensible y requiere reason_text no-vacio', p_action
        USING ERRCODE = '22023';
    END IF;

    -- 2b. Minimo 8 caracteres, contados DESPUES de trim (evita que
    --     "        " pase como reason valido).
    IF char_length(trim(p_reason_text)) < 8 THEN
      RAISE EXCEPTION 'reason_text para la accion "%" debe tener al menos 8 caracteres (tiene %)',
        p_action, char_length(trim(p_reason_text))
        USING ERRCODE = '22023';
    END IF;

    -- 2c. Maximo 500 caracteres, contados SIN trim (texto completo).
    IF char_length(p_reason_text) > 500 THEN
      RAISE EXCEPTION 'reason_text para la accion "%" no puede exceder 500 caracteres (tiene %)',
        p_action, char_length(p_reason_text)
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
'F0.3.1.5 — Registra acción admin en admin_audit_log. SECURITY DEFINER bypassa RLS deny-all.

Para 16 acciones sensibles hardcodeadas valida server-side que reason_text:
  - no sea NULL ni vacio (tras trim),
  - tenga >= 8 caracteres (contados DESPUES de trim),
  - tenga <= 500 caracteres (contados SIN trim, texto completo).

Para acciones no-sensibles, reason_text es libre (incluido NULL).
Retorna uuid del log creado.';

-- ── Permisos ──────────────────────────────────────────────────
-- Sin cambios respecto a F0.2: la RPC sigue accesible desde anon
-- (los admins usan la anon key) y authenticated. Se re-aplican por
-- idempotencia, inofensivo si ya existian.
GRANT EXECUTE ON FUNCTION public.log_admin_action TO anon;
GRANT EXECUTE ON FUNCTION public.log_admin_action TO authenticated;

COMMIT;

-- ── Fin ───────────────────────────────────────────────────────

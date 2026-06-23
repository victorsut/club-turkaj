-- ============================================================
-- Club Turkaj + / Puntos+ — FB.3: modify_member_points
-- ============================================================
-- Esta migration contiene DOS cambios coordinados:
--
-- BLOQUE 1: re-CREATE de log_admin_action para agregar
-- 'modify_member_points' a la whitelist de acciones sensibles
-- (16 -> 17). Asegura que cualquier llamada a log_admin_action
-- con esa accion requiera reason_text valido server-side,
-- como defensa en profundidad complementaria a la validacion
-- V1 de modify_member_points.
--
-- BLOQUE 2: nueva RPC modify_member_points para ajustes
-- manuales de members.points con auditoria atomica gamma.
-- Modos XOR: p_delta o p_set_to. Whitelist de 5 action_type.
-- Setea app.allow_points_write como preparacion para trigger
-- BEFORE UPDATE de FB.7.
--
-- ATOMICIDAD: ambos cambios en una sola transaccion. Si el
-- bloque 2 falla, el bloque 1 tambien se revierte.
--
-- COMPATIBILIDAD: log_admin_action conserva la misma signature
-- (10 params). Los call sites existentes (update_fuel_prices,
-- update_member_with_audit, operator_rpcs, etc) NO requieren
-- cambios.
--
-- DEPENDENCIAS:
-- - log_admin_action ya debe estar creada (20260612_*).
-- - members.points debe existir (esquema base).
-- - admin_audit_log debe existir (20260530_*).
--
-- POST-FB.3: FB.4 implementa wrapper cliente JS. FB.5
-- modifica las 4 RPCs core a SECURITY DEFINER. FB.6 elimina
-- 3 bypasses (checkSpecialDayBonus, OpRaffle, syncMember).
-- FB.7 crea trigger BEFORE UPDATE que usa app.allow_points_write.
-- ============================================================

BEGIN;

-- ============================================================
-- BLOQUE 1: re-CREATE de log_admin_action (whitelist +1)
-- ============================================================
-- Clon EXACTO de 20260612_log_admin_action_length_validation.sql,
-- con un unico cambio funcional: 'modify_member_points' agregado a
-- la whitelist de acciones sensibles (16 -> 17). Misma signature
-- (10 params) -> CREATE OR REPLACE sin DROP. Conserva intactas las
-- validaciones de longitud de reason_text (min 8 / max 500).
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
    'unassign_physical_card',
    -- Ajuste manual de puntos (FB.3)
    'modify_member_points'
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
'FB.3 — Registra acción admin en admin_audit_log. SECURITY DEFINER bypassa RLS deny-all.

Para 17 acciones sensibles hardcodeadas valida server-side que reason_text:
  - no sea NULL ni vacio (tras trim),
  - tenga >= 8 caracteres (contados DESPUES de trim),
  - tenga <= 500 caracteres (contados SIN trim, texto completo).

Para acciones no-sensibles, reason_text es libre (incluido NULL).
Retorna uuid del log creado.';

-- ── Permisos log_admin_action (sin cambios respecto a 20260612) ─
GRANT EXECUTE ON FUNCTION public.log_admin_action TO anon;
GRANT EXECUTE ON FUNCTION public.log_admin_action TO authenticated;

-- ============================================================
-- BLOQUE 2: nueva RPC modify_member_points
-- ============================================================
-- RPC UNIVERSAL para ajustes MANUALES de puntos de un miembro,
-- con auditoria atomica (opcion gamma: todo o nada).
--
-- Es la INTERFAZ AUTORIZADA para modificar members.points fuera
-- de los flujos automaticos (compra / canje / rifa / encuesta).
-- Para esos flujos usar las RPCs especificas ya existentes
-- (register_purchase, redeem_reward, etc.) — esta RPC NO es para
-- ellos.
--
-- Casos de uso (p_action_type): manual_adjustment,
-- special_day_bonus, compensation, correction, promotional_grant.
--
-- MODOS (mutuamente exclusivos, XOR):
--   - p_delta : suma/resta relativa, BETWEEN -50000 AND 50000.
--   - p_set_to: valor absoluto, >= 0.
-- Exactamente UNO debe venir no-NULL.
--
-- ATOMICIDAD: si cualquier validacion, el UPDATE o el log fallan,
-- el RAISE revierte TODO — ni el UPDATE ni el log quedan
-- persistidos.
--
-- app.allow_points_write: se setea (transaction-local) ANTES del
-- UPDATE como preparacion para el trigger BEFORE UPDATE on members
-- de FB.7, que rechazara cualquier UPDATE a points donde
-- app.allow_points_write != 'true'. Esto cerrara el agujero del
-- SQL Editor del Dashboard. En FB.5 las 4 RPCs core
-- (register_purchase, etc.) tambien setearan este flag y pasaran a
-- SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.modify_member_points(
  p_member_id   uuid,
  p_admin_id    uuid,
  p_admin_name  text,
  p_admin_email text,
  p_reason_text text,
  p_delta       integer DEFAULT NULL,
  p_set_to      integer DEFAULT NULL,
  p_action_type text DEFAULT 'manual_adjustment'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_action_whitelist text[] := ARRAY[
    'manual_adjustment',
    'special_day_bonus',
    'compensation',
    'correction',
    'promotional_grant'
  ];
  v_old_points    integer;
  v_new_points    integer;
  v_delta_applied integer;
  v_log_id        uuid;
BEGIN
  -- ── V1: parametros obligatorios ─────────────────────────────
  IF p_member_id IS NULL THEN
    RAISE EXCEPTION 'member_id es obligatorio' USING ERRCODE = '22023';
  END IF;
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es obligatorio' USING ERRCODE = '22023';
  END IF;
  IF p_reason_text IS NULL OR trim(p_reason_text) = '' THEN
    RAISE EXCEPTION 'reason_text es obligatorio' USING ERRCODE = '22023';
  END IF;

  -- ── V2: XOR de modos ────────────────────────────────────────
  IF p_delta IS NULL AND p_set_to IS NULL THEN
    RAISE EXCEPTION 'Debe especificar p_delta o p_set_to' USING ERRCODE = '22023';
  END IF;
  IF p_delta IS NOT NULL AND p_set_to IS NOT NULL THEN
    RAISE EXCEPTION 'p_delta y p_set_to son mutuamente exclusivos' USING ERRCODE = '22023';
  END IF;

  -- ── V3: whitelist de action_type ────────────────────────────
  IF NOT (p_action_type = ANY(v_action_whitelist)) THEN
    RAISE EXCEPTION 'action_type "%" no permitido', p_action_type USING ERRCODE = '22023';
  END IF;

  -- ── V4: validar rangos segun modo ───────────────────────────
  IF p_set_to IS NOT NULL THEN
    IF p_set_to < 0 THEN
      RAISE EXCEPTION 'p_set_to debe ser >= 0' USING ERRCODE = '22023';
    END IF;
  ELSE
    IF p_delta < -50000 OR p_delta > 50000 THEN
      RAISE EXCEPTION 'p_delta fuera de rango permitido [-50000, 50000]' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- ── V5: member existe (y lee estado actual) ─────────────────
  SELECT points INTO v_old_points FROM public.members WHERE id = p_member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Miembro % no existe', p_member_id USING ERRCODE = '22023';
  END IF;

  -- ── V6: calcular nuevo valor y delta efectivo ───────────────
  IF p_delta IS NOT NULL THEN
    v_new_points    := v_old_points + p_delta;
    v_delta_applied := p_delta;
  ELSE
    v_new_points    := p_set_to;
    v_delta_applied := p_set_to - v_old_points;
  END IF;

  -- ── V7: resultado no-negativo ───────────────────────────────
  IF v_new_points < 0 THEN
    RAISE EXCEPTION 'Operacion resultaria en puntos negativos (% -> %)', v_old_points, v_new_points
      USING ERRCODE = '22023';
  END IF;

  -- ── Mutacion atomica ────────────────────────────────────────
  -- Autoriza al trigger BEFORE UPDATE de FB.7 (cuando exista).
  PERFORM set_config('app.allow_points_write', 'true', true);

  UPDATE public.members
  SET points = v_new_points,
      updated_at = now()
  WHERE id = p_member_id;

  -- ── Auditoria via log_admin_action ──────────────────────────
  v_log_id := public.log_admin_action(
    p_admin_id    => p_admin_id,
    p_admin_name  => p_admin_name,
    p_admin_email => p_admin_email,
    p_action      => 'modify_member_points',
    p_entity_type => 'member',
    p_entity_id   => p_member_id::text,
    p_reason_text => p_reason_text,
    p_old_value   => jsonb_build_object('points', v_old_points),
    p_new_value   => jsonb_build_object(
      'points',      v_new_points,
      'delta',       v_delta_applied,
      'action_type', p_action_type
    )
  );

  -- ── Retorno detallado ───────────────────────────────────────
  RETURN jsonb_build_object(
    'ok',            true,
    'log_id',        v_log_id,
    'old_points',    v_old_points,
    'new_points',    v_new_points,
    'delta_applied', v_delta_applied,
    'action_type',   p_action_type
  );
END;
$$;

-- ── Permisos modify_member_points ───────────────────────────────
-- anon: los admins usan la anon key (authenticate_operator, no
-- Supabase Auth nativa). authenticated + service_role: futuro /
-- llamadas server-side. Patron seguido del proyecto + service_role.
REVOKE ALL ON FUNCTION public.modify_member_points(
  uuid, uuid, text, text, text, integer, integer, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.modify_member_points(
  uuid, uuid, text, text, text, integer, integer, text
) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.modify_member_points(
  uuid, uuid, text, text, text, integer, integer, text
) IS
'FB.3 — RPC universal para ajustes MANUALES de members.points con auditoria atomica (gamma). Modos XOR: p_delta [-50000,50000] o p_set_to (>=0). action_type whitelist: manual_adjustment, special_day_bonus, compensation, correction, promotional_grant. Rechaza resultado negativo. Setea app.allow_points_write (prep trigger FB.7). Loguea siempre action=modify_member_points via log_admin_action. NO usar para flujos automaticos (compra/canje/rifa/encuesta). Retorna { ok, log_id, old_points, new_points, delta_applied, action_type }.';

COMMIT;

-- ── Fin ───────────────────────────────────────────────────────

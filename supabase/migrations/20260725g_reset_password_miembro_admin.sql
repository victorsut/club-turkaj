-- ============================================================
-- 20260725g — Restablecer contraseña de MIEMBRO desde el admin
-- ============================================================
-- Hueco detectado el 25-jul-2026 tras SEC-lite: con las contraseñas
-- ya en bcrypt (irreversibles) no existía NINGUNA vía de recuperación
-- para un cliente que la olvide — el "¿Olvidaste tu contraseña?" del
-- login sigue siendo un aviso informativo y el admin no tenía botón
-- (los operadores sí: update_operator_password).
--
-- Esta RPC es el equivalente para miembros: bcrypt server-side +
-- auditoría obligatoria (mismo patrón que update_operator_password).
--
-- PRIVACIDAD: la contraseña NUNCA se escribe en admin_audit_log —
-- old_value/new_value solo registran que hubo un reset y sobre quién.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_reset_member_password(
  p_member_id uuid,
  p_new_password text,
  p_admin_id uuid,
  p_admin_name text,
  p_admin_email text,
  p_reason_text text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_member RECORD;
  v_log_id uuid;
BEGIN
  IF p_member_id IS NULL THEN
    RAISE EXCEPTION 'member_id es obligatorio' USING ERRCODE = '22023';
  END IF;
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es obligatorio' USING ERRCODE = '22023';
  END IF;
  IF p_reason_text IS NULL OR trim(p_reason_text) = '' THEN
    RAISE EXCEPTION 'reason_text es obligatorio' USING ERRCODE = '22023';
  END IF;
  IF p_new_password IS NULL OR length(p_new_password) < 6 THEN
    RAISE EXCEPTION 'La contraseña debe tener al menos 6 caracteres' USING ERRCODE = '22023';
  END IF;

  SELECT id, name, phone INTO v_member FROM members WHERE id = p_member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Miembro % no existe', p_member_id USING ERRCODE = '22023';
  END IF;

  UPDATE members
  SET password_hash = crypt(p_new_password, gen_salt('bf', 6)), updated_at = now()
  WHERE id = p_member_id;

  -- Auditoría (SIN la contraseña — solo el hecho y el destinatario).
  v_log_id := public.log_admin_action(
    p_admin_id    => p_admin_id,
    p_admin_name  => p_admin_name,
    p_admin_email => p_admin_email,
    p_action      => 'reset_member_password',
    p_entity_type => 'member',
    p_entity_id   => p_member_id::text,
    p_reason_text => p_reason_text,
    p_old_value   => jsonb_build_object('password', '(anterior)'),
    p_new_value   => jsonb_build_object('password', '(restablecida por admin)',
                                        'member_name', v_member.name,
                                        'member_phone', v_member.phone)
  );

  RETURN jsonb_build_object('ok', true, 'log_id', v_log_id);
END;
$function$;

COMMENT ON FUNCTION public.admin_reset_member_password(uuid, text, uuid, text, text, text) IS
'Restablece la contraseña de un miembro desde el panel admin (bcrypt
server-side) con auditoría obligatoria. La contraseña NO se guarda en
admin_audit_log. Vía de recuperación mientras no exista el flujo
autónomo por SMS/correo del login.';

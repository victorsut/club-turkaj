-- ═══════════════════════════════════════════════════════════════
-- CANAL DE ASISTENCIA Y AYUDA (4-ago-2026, antesala de F1)
-- ═══════════════════════════════════════════════════════════════
-- Número de asistencia del negocio (WhatsApp + llamadas) visible en
-- el login y el Menú del cliente, con horario L–V 8:00–16:00.
-- Editable desde Admin → Configuración vía RPC auditado.
--
-- ⚠️ El número es SENSIBLE aunque sea público: si cualquiera con la
-- llave anon pudiera cambiarlo, redirigiría el WhatsApp de todos los
-- clientes a un número atacante (phishing). Por eso el RPC exige
-- sesión de ADMIN (patrón admin_write_catalog / SEC.C.4) y
-- program_config sigue solo-lectura para el cliente.
-- ═══════════════════════════════════════════════════════════════

-- ── Semilla: número inicial 4974 1067 (8 dígitos GT, sin prefijo) ──
INSERT INTO program_config (key, value)
VALUES ('support', '{"phone": "49741067"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ── RPC auditado de edición ──
CREATE OR REPLACE FUNCTION public.set_support_phone(
  p_session_token text,
  p_phone         text,
  p_admin_id      uuid DEFAULT NULL,
  p_admin_name    text DEFAULT NULL,
  p_admin_email   text DEFAULT NULL,
  p_reason_text   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text;
  v_old   jsonb;
  v_value jsonb;
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'set_support_phone', false, NULL);

  v_phone := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  IF length(v_phone) <> 8 THEN
    RETURN jsonb_build_object('error', 'El número debe tener exactamente 8 dígitos');
  END IF;

  SELECT value INTO v_old FROM program_config WHERE key = 'support';
  -- Merge sobre el jsonb existente: claves futuras del canal (correo,
  -- horario editable…) sobreviven a la edición del teléfono.
  v_value := COALESCE(v_old, '{}'::jsonb) || jsonb_build_object('phone', v_phone);

  INSERT INTO program_config (key, value) VALUES ('support', v_value)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  PERFORM public.log_admin_action(
    p_admin_id    => p_admin_id,
    p_admin_name  => p_admin_name,
    p_admin_email => p_admin_email,
    p_action      => 'update_support_phone',
    p_entity_type => 'config',
    p_entity_id   => 'support',
    p_reason_text => p_reason_text,
    p_old_value   => v_old,
    p_new_value   => v_value
  );

  RETURN v_value;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.set_support_phone(text, text, uuid, text, text, text) TO anon, authenticated;

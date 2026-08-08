-- ============================================================
-- VERIFICACIÓN DE TELÉFONO EN EL REGISTRO (8-ago-2026)
-- ============================================================
-- CAMBIO DE MÉTODO (decisión del dueño, mismo día): la verificación
-- OTP ya NO es para cambiar el número — es SOLO AL REGISTRARSE
-- (cumple la promesa del wizard: "Verificaremos este número al
-- finalizar tu registro"). El cambio de número pasa a ser una
-- SOLICITUD por WhatsApp al canal de asistencia y el ADMIN lo
-- aplica desde la ficha del miembro (update_member_with_audit, ya
-- existente y auditado).
--
--   1. Tabla phone_verifications: números aprobados por OTP
--      (escribe SOLO el endpoint /api/verify-phone con service key;
--      cerrada a la API abierta).
--   2. register_member exige verificación reciente (30 min) — con
--      INTERRUPTOR en program_config ('phone_verification', default
--      APAGADO) para no romper el registro mientras Twilio no esté
--      configurado en Vercel. Un solo uso: la fila se consume.
--   3. update_my_profile: solo cambia el MENSAJE de rechazo del
--      teléfono (ahora apunta a la solicitud por WhatsApp).
--
-- ⚠️ ENCENDER el candado cuando las variables TWILIO_* ya estén en
-- Vercel y desplegadas:
--   UPDATE program_config SET value = '{"enabled": true}'::jsonb
--   WHERE key = 'phone_verification';
-- ============================================================

-- ── 1. Tabla de verificaciones aprobadas ────────────────────────
CREATE TABLE IF NOT EXISTS public.phone_verifications (
  phone       text PRIMARY KEY,
  verified_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.phone_verifications IS
'8-ago-2026: números aprobados por OTP (Twilio Verify) durante el
REGISTRO. Escribe solo /api/verify-phone (service key). register_member
exige fila reciente (30 min) cuando el interruptor phone_verification
está encendido, y la consume (un solo uso).';

-- Cerrada a la API abierta: sin policies, RLS activo → solo service key.
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.phone_verifications FROM anon, authenticated;

-- ── 2. Interruptor (default APAGADO) ────────────────────────────
INSERT INTO program_config (key, value)
VALUES ('phone_verification', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ── 3. register_member: candado de verificación ─────────────────
CREATE OR REPLACE FUNCTION public.register_member(p_data jsonb, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_phone     text := trim(COALESCE(p_data->>'phone', ''));
  v_name      text := trim(COALESCE(p_data->>'name', ''));
  v_dpi       text := NULLIF(trim(COALESCE(p_data->>'dpi', '')), '');
  v_vehicles  jsonb := COALESCE(p_data->'vehicles', '[]'::jsonb);
  v_veh_n     integer := COALESCE(jsonb_array_length(p_data->'vehicles'), 0);
  v_reg_base  integer;
  v_reg_opt   integer;
  v_opt       integer := 0;
  v_points    integer;
  v_veh_pts   integer;
  v_mid       uuid;
  v_card_id   uuid;
  v_card_code text;
  v_try       integer := 0;
  v_sess      jsonb;
  v_verif_on  boolean;
BEGIN
  IF v_name = '' THEN
    RETURN jsonb_build_object('error', 'El nombre es obligatorio');
  END IF;
  IF v_phone !~ '^\d{8}$' AND v_phone NOT LIKE 'goog_%' THEN
    RETURN jsonb_build_object('error', 'Teléfono inválido');
  END IF;
  IF p_password IS NULL OR length(p_password) < 6 THEN
    RETURN jsonb_build_object('error', 'La contraseña debe tener al menos 6 caracteres');
  END IF;
  IF EXISTS (SELECT 1 FROM members WHERE phone = v_phone) THEN
    RETURN jsonb_build_object('error', 'phone_exists');
  END IF;
  IF v_dpi IS NOT NULL AND EXISTS (SELECT 1 FROM members WHERE dpi = v_dpi) THEN
    RETURN jsonb_build_object('error', 'dpi_exists');
  END IF;

  -- Verificación OTP del registro (8-ago): exigible SOLO con el
  -- interruptor encendido (se enciende al configurar Twilio) y solo
  -- para teléfonos reales (los placeholder goog_% no reciben SMS).
  -- La fila se CONSUME: un código aprobado sirve para UN registro.
  SELECT COALESCE((value->>'enabled')::boolean, false) INTO v_verif_on
  FROM program_config WHERE key = 'phone_verification';
  IF COALESCE(v_verif_on, false) AND v_phone ~ '^\d{8}$' THEN
    IF NOT EXISTS (
      SELECT 1 FROM phone_verifications pv
      WHERE pv.phone = v_phone
        AND pv.verified_at > now() - interval '30 minutes'
    ) THEN
      RETURN jsonb_build_object('error', 'phone_not_verified');
    END IF;
    DELETE FROM phone_verifications WHERE phone = v_phone;
  END IF;

  -- Bonus de registro SERVER-side (misma fórmula del wizard):
  -- base + regOptional × (email, nit, dirección completa) + 2 × vehículo
  SELECT COALESCE((value->>'regBase')::integer, 15),
         COALESCE((value->>'regOptional')::integer, 2)
    INTO v_reg_base, v_reg_opt
  FROM program_config WHERE key = 'general';
  v_reg_base := COALESCE(v_reg_base, 15);
  v_reg_opt  := COALESCE(v_reg_opt, 2);

  IF COALESCE(trim(p_data->>'email'), '') <> '' THEN v_opt := v_opt + 1; END IF;
  IF COALESCE(trim(p_data->>'nit'), '')   <> '' THEN v_opt := v_opt + 1; END IF;
  IF p_data->'address' IS NOT NULL AND jsonb_typeof(p_data->'address') = 'object'
    THEN v_opt := v_opt + 1; END IF;

  v_veh_pts := v_veh_n * 2;
  v_points  := v_reg_base + v_opt * v_reg_opt + v_veh_pts;

  PERFORM set_config('app.allow_points_write', 'true', true);

  INSERT INTO members (
    phone, password_hash, auth_provider, auth_provider_id,
    name, dpi, plate, vehicles, nit, email, birthday, address, avatar_url,
    points, gallons, spent, visits, tickets, redeemed_count, referral_count
  ) VALUES (
    v_phone,
    crypt(p_password, gen_salt('bf', 6)),
    COALESCE(NULLIF(p_data->>'auth_provider', ''), 'manual'),
    NULLIF(p_data->>'auth_provider_id', ''),
    v_name, v_dpi,
    NULLIF(p_data->>'plate', ''),
    v_vehicles,
    NULLIF(trim(COALESCE(p_data->>'nit', '')), ''),
    NULLIF(trim(COALESCE(p_data->>'email', '')), ''),
    NULLIF(p_data->>'birthday', ''),
    p_data->'address',
    NULLIF(p_data->>'avatar_url', ''),
    v_points, 0, 0, 0, 0, 0, 0
  ) RETURNING id INTO v_mid;

  -- Tarjeta digital ORO con correlativo único — NUMÉRICO de 5 dígitos
  -- (el formato del programa: todo el sistema valida /^CT[OPB]D-\d{5}$/)
  LOOP
    v_try := v_try + 1;
    v_card_code := 'CTOD-' || lpad(floor(random() * 100000)::int::text, 5, '0');
    BEGIN
      INSERT INTO physical_cards (assigned_to, card_code, tier, status)
      VALUES (v_mid, v_card_code, 'ORO', 'active')
      RETURNING id INTO v_card_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_try >= 10 THEN RAISE; END IF;
    END;
  END LOOP;
  UPDATE members SET card_id = v_card_id WHERE id = v_mid;

  IF v_veh_n > 0 THEN
    INSERT INTO activity_log (member_id, activity_type, description, points_change, metadata)
    VALUES (v_mid, 'registro_vehiculos',
            v_veh_n || ' vehiculo(s) - +' || v_veh_pts || ' pts', v_veh_pts,
            jsonb_build_object('vehicles', v_vehicles));
  END IF;
  INSERT INTO activity_log (member_id, activity_type, description, points_change)
  VALUES (v_mid, 'registro', 'Bienvenido a Puntos Plus - +' || v_points || ' pts', v_points);

  v_sess := public.issue_member_session(v_mid);
  RETURN jsonb_build_object(
    'ok', true, 'member_id', v_mid, 'points', v_points, 'card_code', v_card_code,
    'member', public.member_profile_json(v_mid)
  ) || v_sess;
END;
$function$;

-- ── 4. update_my_profile: mensaje de rechazo del teléfono apunta
--      al flujo nuevo (solicitud por WhatsApp) ────────────────────
CREATE OR REPLACE FUNCTION public.update_my_profile(p_session_token text, p_changes jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mid   uuid;
  v_cur   RECORD;
  v_phone text;
  v_bday  text;
  v_nit   text;
  v_days  integer;
BEGIN
  BEGIN
    v_mid := public.validate_session_token(p_session_token, 'member', 'update_my_profile', false, NULL);
  EXCEPTION WHEN SQLSTATE '28000' THEN
    RETURN jsonb_build_object('error', 'invalid_session');
  END;

  SELECT phone, birthday, nit, nit_changed_at INTO v_cur FROM members WHERE id = v_mid;

  -- 'name' ya NO es editable por el cliente (1-ago-2026): se IGNORA.

  IF p_changes ? 'nickname' AND length(trim(COALESCE(p_changes->>'nickname', ''))) > 20 THEN
    RETURN jsonb_build_object('error', 'El apodo no puede superar 20 caracteres');
  END IF;

  -- TELÉFONO (8-ago): el cliente no lo cambia — se solicita por
  -- WhatsApp y lo aplica el ADMIN. El mismo número actual se ignora
  -- sin error (clientes cacheados que aún lo envían).
  IF p_changes ? 'phone' THEN
    v_phone := trim(COALESCE(p_changes->>'phone', ''));
    IF v_phone IS DISTINCT FROM COALESCE(v_cur.phone, '') AND v_phone <> '' THEN
      RETURN jsonb_build_object('error',
        'El cambio de número se solicita por WhatsApp desde Mi Cuenta → Solicitar cambio de número');
    END IF;
  END IF;

  -- NIT (8-ago): cada 2 meses. Primer llenado libre (nit_changed_at
  -- NULL); un cambio REAL (valor distinto) exige 60 días desde el
  -- último. Enviar el mismo valor no cuenta como cambio.
  IF p_changes ? 'nit' THEN
    v_nit := NULLIF(trim(COALESCE(p_changes->>'nit', '')), '');
    IF v_nit IS DISTINCT FROM v_cur.nit THEN
      IF v_cur.nit_changed_at IS NOT NULL
         AND v_cur.nit_changed_at > now() - interval '60 days' THEN
        v_days := CEIL(EXTRACT(EPOCH FROM (v_cur.nit_changed_at + interval '60 days' - now())) / 86400.0);
        RETURN jsonb_build_object('error',
          'El NIT solo puede cambiarse cada 2 meses — podrás cambiarlo en '
          || v_days || CASE WHEN v_days = 1 THEN ' día' ELSE ' días' END);
      END IF;
    END IF;
  END IF;

  -- Cumpleaños: SOLO completar (regla del dueño — una vez, luego candado)
  IF p_changes ? 'birthday' THEN
    v_bday := p_changes->>'birthday';
    IF v_cur.birthday IS NOT NULL AND length(v_cur.birthday) >= 10
       AND v_bday IS DISTINCT FROM v_cur.birthday THEN
      RETURN jsonb_build_object('error', 'La fecha de nacimiento ya no puede cambiarse');
    END IF;
  END IF;

  UPDATE members SET
    nickname   = CASE WHEN p_changes ? 'nickname'   THEN NULLIF(trim(COALESCE(p_changes->>'nickname', '')), '') ELSE nickname END,
    -- phone NO se toca aquí (8-ago: solicitud por WhatsApp → admin)
    email      = CASE WHEN p_changes ? 'email'      THEN NULLIF(trim(COALESCE(p_changes->>'email', '')), '') ELSE email END,
    nit        = CASE WHEN p_changes ? 'nit'        THEN v_nit ELSE nit END,
    nit_changed_at = CASE WHEN p_changes ? 'nit' AND v_nit IS DISTINCT FROM nit THEN now() ELSE nit_changed_at END,
    birthday   = CASE WHEN p_changes ? 'birthday'   THEN NULLIF(p_changes->>'birthday', '') ELSE birthday END,
    address    = CASE WHEN p_changes ? 'address'    THEN NULLIF(p_changes->'address', 'null'::jsonb) ELSE address END,
    vehicles   = CASE WHEN p_changes ? 'vehicles'   THEN COALESCE(p_changes->'vehicles', '[]'::jsonb) ELSE vehicles END,
    plate      = CASE WHEN p_changes ? 'vehicles'   THEN NULLIF(p_changes->'vehicles'->0->>'plate', '')
                      WHEN p_changes ? 'plate'      THEN NULLIF(p_changes->>'plate', '') ELSE plate END,
    avatar_url = CASE WHEN p_changes ? 'avatar_url' THEN NULLIF(p_changes->>'avatar_url', '') ELSE avatar_url END,
    updated_at = now()
  WHERE id = v_mid;

  RETURN jsonb_build_object('ok', true, 'member', public.member_profile_json(v_mid));
END;
$function$;

-- ============================================================
-- VERIFICAR tras ejecutar:
--  (1) Con el interruptor APAGADO (default): el registro funciona
--      exactamente igual que hoy (sin código).
--  (2) Encender el interruptor (UPDATE de arriba) SOLO cuando las
--      TWILIO_* estén en Vercel; registrar una cuenta nueva → el
--      wizard pide el código SMS antes de finalizar; register_member
--      directo sin código → error phone_not_verified.
--  (3) Mi Cuenta → Solicitar cambio de número abre WhatsApp con el
--      mensaje pre-escrito; el admin cambia el número en la ficha
--      del miembro (flujo auditado existente).
-- ============================================================

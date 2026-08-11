-- ============================================================
-- REGISTRO (11-ago-2026) — CONSTANCIA DE ACEPTACIÓN DE TÉRMINOS
-- ============================================================
-- La casilla "Acepto los Términos y Condiciones" del wizard (commit
-- 033b1e9) era solo requisito de UI; el dueño pidió el RESPALDO
-- formal. Esta migración deja constancia doble:
--   1. members.terms_accepted_at (timestamptz) — sello del momento
--      de aceptación, estampado server-side por register_member
--      cuando el wizard envía terms_accepted=true. Los clientes
--      CACHEADOS (app vieja sin casilla) siguen registrándose y
--      quedan con NULL — no se rompe nada; al actualizar la PWA
--      todos los registros nuevos llevan sello.
--   2. La fila 'registro' de activity_log gana metadata
--      {terms_accepted, terms_version} — segunda evidencia
--      independiente de la fila del miembro.
-- member_profile_json expone el sello (ficha del admin y perfil del
-- miembro). terms_version = 'julio-2026' (la vigente de R1a); si los
-- términos cambian, actualizar la constante en register_member.
-- ============================================================

-- ── 1. Columna del sello ─────────────────────────────────────
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

-- ── 2. register_member: estampa el sello (v. 20260808c + terms) ──
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
  -- Aceptación de términos (11-ago): comparación de texto para no
  -- reventar con valores basura; solo 'true' literal estampa.
  v_terms     boolean := lower(COALESCE(p_data->>'terms_accepted', '')) = 'true';
  v_terms_ver text := 'julio-2026';
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
    points, gallons, spent, visits, tickets, redeemed_count, referral_count,
    terms_accepted_at
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
    v_points, 0, 0, 0, 0, 0, 0,
    CASE WHEN v_terms THEN now() END
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
  -- Segunda constancia de la aceptación en el log de actividad
  INSERT INTO activity_log (member_id, activity_type, description, points_change, metadata)
  VALUES (v_mid, 'registro', 'Bienvenido a Puntos Plus - +' || v_points || ' pts', v_points,
          jsonb_build_object('terms_accepted', v_terms,
                             'terms_version', CASE WHEN v_terms THEN v_terms_ver END));

  v_sess := public.issue_member_session(v_mid);
  RETURN jsonb_build_object(
    'ok', true, 'member_id', v_mid, 'points', v_points, 'card_code', v_card_code,
    'member', public.member_profile_json(v_mid)
  ) || v_sess;
END;
$function$;

-- ── 3. member_profile_json: expone el sello (v. 20260808b + terms) ──
CREATE OR REPLACE FUNCTION public.member_profile_json(p_member_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'id', m.id, 'name', m.name, 'nickname', m.nickname,
    'email', m.email, 'avatar_url', m.avatar_url,
    'phone', m.phone, 'dpi', m.dpi, 'plate', m.plate, 'nit', m.nit,
    'nit_changed_at', m.nit_changed_at,
    'birthday', m.birthday, 'address', m.address, 'vehicles', m.vehicles,
    'points', m.points, 'gallons', m.gallons, 'spent', m.spent,
    'visits', m.visits, 'tickets', m.tickets,
    'redeemed_count', m.redeemed_count, 'referral_count', m.referral_count,
    'created_at', m.created_at, 'last_buy', m.last_buy,
    'last_station', m.last_station, 'last_special_bonus', m.last_special_bonus,
    'card_id', m.card_id,
    'card_code', (SELECT pc.card_code FROM physical_cards pc
                  WHERE pc.assigned_to = m.id LIMIT 1),
    'auth_provider', m.auth_provider, 'auth_provider_id', m.auth_provider_id,
    'referred_by', m.referred_by,
    'terms_accepted_at', m.terms_accepted_at
  )
  FROM members m WHERE m.id = p_member_id;
$function$;

-- ============================================================
-- VERIFICAR tras ejecutar:
--   1. Registrar una cuenta de prueba con la casilla marcada →
--      SELECT name, terms_accepted_at FROM members ORDER BY created_at
--      DESC LIMIT 1;  debe traer el sello con fecha/hora.
--   2. SELECT metadata FROM activity_log WHERE activity_type='registro'
--      ORDER BY created_at DESC LIMIT 1;  debe traer
--      {"terms_accepted": true, "terms_version": "julio-2026"}.
--   3. En Admin → Miembros → ficha, la fila "Términos aceptados"
--      muestra la fecha (los miembros previos a la casilla quedan '—').
-- Sin la migración nada se rompe: el wizard manda terms_accepted y la
-- versión vieja del RPC simplemente lo ignora.
-- ============================================================

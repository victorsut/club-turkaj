-- ============================================================
-- 20260731b — FIX: register_member generaba correlativos HEX
-- ============================================================
-- Reporte del dueño (31-jul): usuario nuevo con tarjeta CTOD-E4B09
-- y el escáner del operador la rechaza como "QR no válido".
--
-- CAUSA RAÍZ: al mover el alta al servidor (SEC.C.1, 20260728d),
-- register_member generó el correlativo desde md5 HEXADECIMAL
-- (letras A-F posibles, ~90% de probabilidad por registro). TODO el
-- resto del sistema asume correlativo NUMÉRICO de 5 dígitos:
--   · frontend: CARD_CODE_REGEX /^CT[OPB]D-\d{5}$/ (lib/cardCodes.js)
--   · API PROPER: api_resolve_member / api_list_pending_redemptions
--     validan '^CT[OPB]D-[0-9]+$'
--   · subida de nivel: register_purchase/api_register_purchase
--     extraen el correlativo con substring(code FROM '\d+$') — con
--     un código hex lo CORROMPEN (E4B09 → '09')
--   · documento de PROPER: "correlativo numérico"
-- Las 40 tarjetas previas al 28-jul son numéricas (el generador
-- viejo del cliente lo era); la única hex es la de prueba.
--
-- FIX: (1) register_member genera 5 DÍGITOS aleatorios (el loop de
-- unicidad ya existente absorbe colisiones; espacio 100k vs 41 usadas)
-- y (2) backfill: toda tarjeta no numérica se regenera numérica
-- CONSERVANDO su prefijo de nivel y su asignación (members.card_id
-- referencia el uuid de la fila, no cambia).
-- ============================================================

-- ── 1. Generador numérico en register_member ───────────────────
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

-- ── 2. Backfill: regenerar las tarjetas NO numéricas ───────────
-- Conserva el prefijo de nivel y la asignación; solo cambia el
-- correlativo. Idempotente (si no hay tarjetas hex, no hace nada).
DO $$
DECLARE
  r      RECORD;
  v_code text;
  v_try  integer;
BEGIN
  FOR r IN
    SELECT id, card_code FROM physical_cards
    WHERE card_code !~ '^CT[OPB]D-[0-9]{5}$'
  LOOP
    v_try := 0;
    LOOP
      v_try := v_try + 1;
      v_code := substring(r.card_code FROM 1 FOR 4) || '-' ||
                lpad(floor(random() * 100000)::int::text, 5, '0');
      BEGIN
        UPDATE physical_cards SET card_code = v_code, updated_at = now()
        WHERE id = r.id;
        RAISE NOTICE 'Tarjeta % regenerada como %', r.card_code, v_code;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        IF v_try >= 10 THEN RAISE; END IF;
      END;
    END LOOP;
  END LOOP;
END $$;

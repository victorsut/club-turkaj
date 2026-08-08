-- ============================================================
-- CANDADOS DE PERFIL (8-ago-2026, pedido del dueño)
-- ============================================================
-- El cliente pierde la edición libre de dos datos sensibles:
--   1. NIT: solo puede cambiarse cada 2 MESES (60 días). El primer
--      llenado es libre; cada cambio real marca nit_changed_at y
--      bloquea el siguiente por 60 días. El candado vive AQUÍ
--      (server-side) — la UI solo lo refleja.
--   2. TELÉFONO: deja de ser editable por update_my_profile. El
--      cambio pasa por VERIFICACIÓN OTP (código SMS vía Twilio
--      Verify) en el endpoint /api/verify-phone, que valida la
--      sesión de miembro, comprueba unicidad y aplica el cambio
--      con la service key SOLO si el código es correcto.
--      Si un cliente cacheado envía el MISMO teléfono actual, se
--      ignora sin error (compatibilidad); distinto → error claro.
-- El admin NO se ve afectado: update_member_with_audit sigue
-- editando todo (corrige errores con auditoría).
-- ============================================================

-- ── 1. Fecha del último cambio de NIT ───────────────────────────
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS nit_changed_at timestamptz;

COMMENT ON COLUMN public.members.nit_changed_at IS
'8-ago-2026: fecha del último cambio de NIT hecho por el CLIENTE
(update_my_profile). NULL = nunca lo ha cambiado (primer llenado
libre). Candado: no puede volver a cambiarlo hasta 60 días después.
Los cambios del admin no marcan esta fecha.';

-- ── 2. member_profile_json expone nit_changed_at (la UI muestra
--      la fecha del próximo cambio permitido) ────────────────────
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
    'referred_by', m.referred_by
  )
  FROM members m WHERE m.id = p_member_id;
$function$;

-- ── 3. update_my_profile: phone FUERA, NIT con candado de 60 días ──
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

  -- TELÉFONO (8-ago): ya no se cambia por aquí — solo verificación
  -- OTP (/api/verify-phone). El mismo número actual se ignora sin
  -- error para no romper clientes cacheados que aún lo envían.
  IF p_changes ? 'phone' THEN
    v_phone := trim(COALESCE(p_changes->>'phone', ''));
    IF v_phone IS DISTINCT FROM COALESCE(v_cur.phone, '') AND v_phone <> '' THEN
      RETURN jsonb_build_object('error',
        'El teléfono ahora se cambia con verificación por código, desde Mi Cuenta → Cambiar teléfono');
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
    -- phone NO se toca aquí (candado 8-ago — solo /api/verify-phone)
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

COMMENT ON FUNCTION public.update_my_profile(text, jsonb) IS
'SEC.C.1 + 8-ago-2026: edición del propio perfil con sesión de miembro.
Whitelist: nickname (máx 20), email, nit (CANDADO: cambio real solo
cada 60 días — nit_changed_at), birthday (solo completar), address,
vehicles (deriva plate), avatar_url. PHONE ya no se edita aquí: solo
por /api/verify-phone con código OTP (mismo número actual se ignora).
El nombre real solo lo edita el admin (update_member_with_audit).';

-- ============================================================
-- VERIFICAR tras ejecutar:
--  (1) Mi Cuenta → cambiar NIT: guarda; segundo cambio inmediato
--      → error "podrás cambiarlo en N días". Guardar sin tocar el
--      NIT no dispara el candado.
--  (2) Mi Cuenta → Guardar cambios con el MISMO teléfono: sin
--      error (se ignora); cliente viejo cacheado que intente uno
--      distinto → error que lo manda al flujo verificado.
--  (3) El cambio verificado de teléfono (código correcto en
--      /api/verify-phone) sí actualiza members.phone.
-- ============================================================

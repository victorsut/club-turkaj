-- ============================================================
-- SEC.C.6 (11-ago-2026) — CIERRE DE RPCs HEREDADAS SIN SESIÓN
-- ============================================================
-- Auditoría del 11-ago: el cierre SEC.B/C protegió las TABLAS y las
-- RPCs nuevas, pero cinco funciones SECURITY DEFINER heredadas
-- siguieron aceptando p_member_id/p_admin_id DEL CLIENTE sin token —
-- y como el anon key es público, quedaron abiertas a internet:
--   · admin_reset_member_password → tomar cualquier cuenta
--   · redeem_reward               → vaciar puntos ajenos
--   · complete_survey             → farmear encuestas ajenas
--   · grant_special_day_bonus     → farmear bonos ajenos
--   · update_member_password      → oráculo de fuerza bruta
--   · log_admin_action            → falsificar la auditoría
--
-- ESTRATEGIA (mismo patrón que register_purchase/buy_raffle_tickets
-- en SEC.B.5 y todas las RPCs de SEC.C):
--   · Funciones de MIEMBRO: ganan p_session_token y SOBRESCRIBEN
--     p_member_id con el id VERIFICADO de la sesión — el cliente ya
--     no elige sobre qué cuenta opera. Lógica de negocio idéntica.
--   · admin_reset_member_password: exige sesión de ADMIN (p_member_id
--     sigue siendo el objetivo, correcto para un admin).
--   · log_admin_action: se REVOCA a anon/authenticated (el wrapper
--     del frontend está muerto). Las 19 llamadas internas desde otras
--     funciones SECURITY DEFINER siguen: corren con privilegios del
--     owner, ajenas al REVOKE.
--   · p_session_token va como ÚLTIMO parámetro con DEFAULT NULL: las
--     llamadas viejas siguen resolviendo a la misma función, pero
--     validate_session_token(NULL, …) las rechaza con 28000.
--
-- ⚠️ ORDEN DE DESPLIEGUE: ejecutar esta migración PRIMERO; el frontend
-- que pasa el token va justo después (commit aparte). Entre ambos, un
-- cliente con la app cacheada que intente CANJEAR/ENCUESTA/BONUS será
-- rechazado hasta recargar la PWA. No afecta compras, registro ni
-- login. Aplicar en horario de bajo tráfico.
-- ============================================================

-- ── 1. redeem_reward — sesión de MIEMBRO ─────────────────────
CREATE OR REPLACE FUNCTION public.redeem_reward(
  p_member_id uuid, p_reward_id uuid, p_operator_id uuid DEFAULT NULL,
  p_session_token text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_reward    rewards%ROWTYPE;
  v_member    members%ROWTYPE;
  v_tier      text;
  v_discount  numeric;
  v_cost      integer;
  v_code      text;
  v_redemption_id uuid;
BEGIN
  -- SEC.C.6: opera SIEMPRE sobre el miembro de la sesión, no sobre el
  -- p_member_id que mandó el cliente.
  p_member_id := public.validate_session_token(p_session_token, 'member', 'redeem_reward', false, NULL);

  SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id AND COALESCE(active, true) = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Premio no disponible');
  END IF;

  SELECT * INTO v_member FROM members WHERE id = p_member_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Miembro no encontrado');
  END IF;

  v_tier := public.get_member_tier(v_member.gallons);

  v_discount := CASE v_tier
    WHEN 'BLACK'   THEN 0.15
    WHEN 'PLATINO' THEN 0.10
    ELSE 0
  END;

  v_cost := ROUND(v_reward.points_cost * (1 - v_discount));

  IF v_member.points < v_cost THEN
    RETURN jsonb_build_object('error', 'Puntos insuficientes');
  END IF;

  IF v_reward.tier_exclusive IS NOT NULL
     AND v_tier <> v_reward.tier_exclusive
     AND NOT (v_reward.tier_exclusive = 'PLATINO' AND v_tier = 'BLACK') THEN
    RETURN jsonb_build_object(
      'error', 'Premio exclusivo para ' || v_reward.tier_exclusive
    );
  END IF;

  v_code := 'TK-' || upper(substring(md5(random()::text || clock_timestamp()::text), 1, 6));

  INSERT INTO redemptions (
    member_id, reward_id, operator_id,
    points_spent, discount_applied, redemption_code
  )
  VALUES (
    p_member_id, p_reward_id, p_operator_id,
    v_cost, v_discount, v_code
  )
  RETURNING id INTO v_redemption_id;

  PERFORM set_config('app.allow_points_write', 'true', true);

  UPDATE members SET
    points          = points - v_cost,
    redeemed_count  = COALESCE(redeemed_count, 0) + 1,
    updated_at      = now()
  WHERE id = p_member_id;

  INSERT INTO activity_log (
    member_id, activity_type, description, points_change
  )
  VALUES (
    p_member_id, 'canje',
    'Canjeó: ' || v_reward.name || ' ' || COALESCE(v_reward.icon, ''),
    -v_cost
  );

  RETURN jsonb_build_object(
    'redemption_id', v_redemption_id,
    'code',          v_code,
    'cost',          v_cost,
    'discount',      v_discount,
    'reward_name',   v_reward.name,
    'reward_icon',   v_reward.icon
  );
END;
$function$;

-- ── 2. complete_survey — sesión de MIEMBRO ───────────────────
CREATE OR REPLACE FUNCTION public.complete_survey(
  p_member_id uuid,
  p_session_token text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_today_count    integer;
  v_daily_limit    integer;
  v_pts            integer;
  v_bonus          boolean := false;
  v_member_points  integer;
  v_member_tickets integer;
  v_raffle_id      uuid;
BEGIN
  p_member_id := public.validate_session_token(p_session_token, 'member', 'complete_survey', false, NULL);

  SELECT
    (value->>'surveyDaily')::integer,
    (value->>'surveyPts')::integer
  INTO v_daily_limit, v_pts
  FROM program_config WHERE key = 'general';

  IF v_daily_limit IS NULL THEN v_daily_limit := 5; END IF;
  IF v_pts IS NULL THEN v_pts := 3; END IF;

  SELECT COUNT(*) INTO v_today_count
  FROM surveys
  WHERE member_id = p_member_id AND DATE(created_at) = CURRENT_DATE;

  IF v_today_count >= v_daily_limit THEN
    RETURN jsonb_build_object('error', 'Límite diario alcanzado');
  END IF;

  v_bonus := (v_today_count + 1) >= v_daily_limit;

  INSERT INTO surveys (member_id, points_earned, bonus_ticket)
  VALUES (p_member_id, v_pts, v_bonus);

  SELECT points, tickets INTO v_member_points, v_member_tickets
  FROM members WHERE id = p_member_id;

  PERFORM set_config('app.allow_points_write', 'true', true);

  UPDATE members SET
    points     = points + v_pts,
    tickets    = CASE WHEN v_bonus THEN COALESCE(tickets, 0) + 1 ELSE tickets END,
    updated_at = now()
  WHERE id = p_member_id;

  IF v_bonus THEN
    SELECT id INTO v_raffle_id
    FROM raffle_calendar
    WHERE month = EXTRACT(MONTH FROM (now() AT TIME ZONE 'America/Guatemala'))::integer
      AND year  = EXTRACT(YEAR  FROM (now() AT TIME ZONE 'America/Guatemala'))::integer
    LIMIT 1;

    IF v_raffle_id IS NOT NULL THEN
      INSERT INTO raffle_tickets (member_id, raffle_id, quantity, points_spent)
      VALUES (p_member_id, v_raffle_id, 1, 0);
    END IF;
  END IF;

  INSERT INTO activity_log (
    member_id, activity_type, description, points_change
  )
  VALUES (
    p_member_id, 'encuesta',
    'Encuesta completada' || CASE WHEN v_bonus THEN ' + Boleto bonus' ELSE '' END,
    v_pts
  );

  RETURN jsonb_build_object(
    'points',           v_pts,
    'count',            v_today_count + 1,
    'limit',            v_daily_limit,
    'bonus_ticket',     v_bonus,
    'remaining_points', COALESCE(v_member_points, 0) + v_pts,
    'new_ticket_total', COALESCE(v_member_tickets, 0) + (CASE WHEN v_bonus THEN 1 ELSE 0 END)
  );
END;
$function$;

-- ── 3. grant_special_day_bonus — sesión de MIEMBRO ───────────
CREATE OR REPLACE FUNCTION public.grant_special_day_bonus(
  p_member_id uuid,
  p_session_token text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_member      public.members%ROWTYPE;
  v_sd          public.special_days%ROWTYPE;
  v_today_month integer := EXTRACT(MONTH FROM CURRENT_DATE)::integer;
  v_today_day   integer := EXTRACT(DAY   FROM CURRENT_DATE)::integer;
  v_total_bonus integer := 0;
  v_events      jsonb   := '[]'::jsonb;
  v_bday_raw    text;
  v_bday_parts  integer;
  v_bday_month  integer;
  v_bday_day    integer;
  v_names       text[]  := ARRAY[]::text[];
  v_description text;
  v_tier        text;
  v_tier_pts    integer;
  v_evt_pts     integer;
  i             integer;
BEGIN
  p_member_id := public.validate_session_token(p_session_token, 'member', 'grant_special_day_bonus', false, NULL);

  SELECT * INTO v_member FROM public.members WHERE id = p_member_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'member_not_found');
  END IF;

  IF v_member.last_special_bonus = CURRENT_DATE THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_granted');
  END IF;

  v_tier     := public.get_member_tier(COALESCE(v_member.gallons, 0));
  v_tier_pts := public.tier_evt_pts(v_tier);

  BEGIN
    IF v_member.birthday IS NOT NULL AND btrim(v_member.birthday::text) <> '' THEN
      v_bday_raw   := btrim(v_member.birthday::text);
      v_bday_parts := array_length(string_to_array(v_bday_raw, '-'), 1);
      IF v_bday_parts = 2 THEN
        v_bday_month := split_part(v_bday_raw, '-', 1)::integer;
        v_bday_day   := split_part(v_bday_raw, '-', 2)::integer;
      ELSIF v_bday_parts = 3 THEN
        v_bday_month := split_part(v_bday_raw, '-', 2)::integer;
        v_bday_day   := split_part(v_bday_raw, '-', 3)::integer;
      END IF;
      IF v_bday_month IS NOT NULL
         AND v_bday_month = v_today_month
         AND v_bday_day   = v_today_day THEN
        SELECT * INTO v_sd FROM public.special_days
          WHERE month = 0 AND day = 0 AND active = true
          LIMIT 1;
        IF FOUND THEN
          v_evt_pts := COALESCE(v_tier_pts, v_sd.points, 0);
          v_total_bonus := v_total_bonus + v_evt_pts;
          v_events := v_events || jsonb_build_array(jsonb_build_object(
            'id',          v_sd.id,
            'name',        v_sd.name,
            'icon',        v_sd.icon,
            'points',      v_evt_pts,
            'message',     v_sd.message,
            'is_birthday', true
          ));
        END IF;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  FOR v_sd IN
    SELECT * FROM public.special_days
    WHERE active = true
      AND month = v_today_month
      AND day   = v_today_day
  LOOP
    v_evt_pts := COALESCE(v_tier_pts, v_sd.points, 0);
    v_total_bonus := v_total_bonus + v_evt_pts;
    v_events := v_events || jsonb_build_array(jsonb_build_object(
      'id',          v_sd.id,
      'name',        v_sd.name,
      'icon',        v_sd.icon,
      'points',      v_evt_pts,
      'message',     v_sd.message,
      'is_birthday', false
    ));
  END LOOP;

  IF v_total_bonus = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_bonus_today');
  END IF;

  PERFORM set_config('app.allow_points_write', 'true', true);

  UPDATE public.members SET
    points             = points + v_total_bonus,
    last_special_bonus = CURRENT_DATE,
    updated_at         = now()
  WHERE id = p_member_id;

  FOR i IN 0 .. jsonb_array_length(v_events) - 1 LOOP
    v_names := array_append(
      v_names,
      btrim(COALESCE(v_events -> i ->> 'icon', '') || ' ' || COALESCE(v_events -> i ->> 'name', ''))
    );
  END LOOP;
  v_description := 'Bonus especial: ' || array_to_string(v_names, ' + ');

  INSERT INTO public.activity_log (
    member_id, activity_type, description, points_change
  ) VALUES (
    p_member_id, 'evento', v_description, v_total_bonus
  );

  RETURN jsonb_build_object(
    'ok',          true,
    'bonus',       v_total_bonus,
    'events',      v_events,
    'member_name', v_member.name
  );
END;
$function$;

-- ── 4. update_member_password — sesión de MIEMBRO ────────────
CREATE OR REPLACE FUNCTION public.update_member_password(
  p_member_id uuid, p_current_password text, p_new_password text,
  p_session_token text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_hash text;
BEGIN
  -- SEC.C.6: cambia la contraseña del miembro de la SESIÓN (aún exige
  -- la actual). Cierra el oráculo de fuerza bruta anónimo.
  p_member_id := public.validate_session_token(p_session_token, 'member', 'update_member_password', false, NULL);

  IF p_new_password IS NULL OR length(p_new_password) < 6 THEN
    RETURN jsonb_build_object('error', 'La nueva contraseña debe tener al menos 6 caracteres');
  END IF;

  SELECT password_hash INTO v_hash FROM members WHERE id = p_member_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Miembro no encontrado');
  END IF;

  IF NOT public.member_password_matches(v_hash, p_current_password) THEN
    RETURN jsonb_build_object('error', 'La contraseña actual es incorrecta');
  END IF;

  UPDATE members SET password_hash = crypt(p_new_password, gen_salt('bf', 6)), updated_at = now()
  WHERE id = p_member_id;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- ── 5. admin_reset_member_password — sesión de ADMIN ─────────
CREATE OR REPLACE FUNCTION public.admin_reset_member_password(
  p_member_id uuid, p_new_password text, p_admin_id uuid,
  p_admin_name text, p_admin_email text, p_reason_text text,
  p_session_token text DEFAULT NULL
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
  -- SEC.C.6: exige sesión de ADMIN. p_member_id sigue siendo el
  -- objetivo (un admin restablece la contraseña de cualquier miembro).
  PERFORM public.validate_session_token(p_session_token, 'admin', 'admin_reset_member_password', false, NULL);

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

-- ── 6. log_admin_action — solo llamadas internas ─────────────
-- El wrapper del frontend está muerto (nunca se invoca). Se corta el
-- acceso directo desde el cliente; las 19 llamadas internas desde
-- otras funciones SECURITY DEFINER siguen (privilegios del owner).
REVOKE EXECUTE ON FUNCTION public.log_admin_action(uuid, text, text, text, text, text, text, jsonb, jsonb, jsonb) FROM anon, authenticated, PUBLIC;

-- ============================================================
-- VERIFICAR tras ejecutar (cada una debe devolver el rechazo de
-- sesión, no ejecutar):
--   SELECT public.redeem_reward(gen_random_uuid(), gen_random_uuid());
--     → error 28000 "Sesión inválida" (antes: descontaba puntos)
--   SELECT public.admin_reset_member_password(gen_random_uuid(),
--     'test1234', gen_random_uuid(), 'x', 'x', 'motivo de prueba');
--     → error 28000 (antes: reseteaba la contraseña)
--   SELECT public.log_admin_action(gen_random_uuid(),'x','x','y','z',
--     null,'r',null,null,null);  → permission denied for function
-- Con sesión válida (token real en p_session_token) siguen funcionando
-- igual. El frontend que pasa el token va en el commit siguiente.
-- ============================================================

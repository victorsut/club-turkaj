-- ═══════════════════════════════════════════════════════════════
-- SEC.C.4 — CIERRE DEL CATÁLOGO Y ESCRITURAS RESTANTES
-- (29-jul-2026) — último tramo del track de seguridad
--
-- Auditoría final de policies: quedaban tablas con policy ALL abierta
-- y grants completos para anon/authenticated. Riesgo REAL (no teórico):
--
--   · rewards        → cualquiera podía poner points_cost = 0 en un
--                      premio y canjearlo gratis, o borrarlos todos.
--   · special_days   → crear un "día especial" con N puntos y
--                      cobrarlo con grant_special_day_bonus.
--   · raffle_calendar→ reescribir premios y hasta el winner_id de un
--                      sorteo ya realizado.
--   · promotions     → defacement del contenido visual de la app.
--   · stations       → alterar direcciones/coordenadas/clave WiFi.
--   · operator_ratings → spam de estrellas (INSERT libre, sin sesión).
--   · surveys        → INSERT libre podía BLOQUEAR el límite diario de
--                      un miembro; el SELECT abierto exponía su
--                      actividad.
--   · push_subscriptions → leer o borrar las suscripciones de otros.
--   · card_history / referrals / raffle_entries → tablas sin uso vivo.
--
-- Cierre:
--   A. admin_write_catalog: RPC ÚNICO para las mutaciones del panel
--      (reward | promotion | special_day | raffle | station) con
--      whitelist de columnas por entidad, sesión de admin y auditoría
--      ATÓMICA (hoy el log era client-first: si fallaba, el cambio
--      quedaba sin rastro).
--   B. RPCs del cliente con sesión: rate_operator,
--      count_my_surveys_today, mark_raffle_winner_seen,
--      save_push_subscription.
--   C. Revocaciones. Las LECTURAS públicas del catálogo se conservan
--      (rewards, promotions, stations, special_days, raffle_calendar,
--      promo_rules/applications): son el contenido de la app.
--
-- ⚠️ EJECUTAR INMEDIATO tras el deploy (van en pareja).
-- ═══════════════════════════════════════════════════════════════

-- ── A. admin_write_catalog ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_write_catalog(
  p_session_token text,
  p_entity        text,          -- reward|promotion|special_day|raffle|station
  p_action        text,          -- create|update|delete
  p_id            uuid DEFAULT NULL,
  p_data          jsonb DEFAULT '{}'::jsonb,
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
  v_old jsonb;
  v_new jsonb;
  v_id  uuid := p_id;
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'admin_write_catalog', false, NULL);

  IF p_entity NOT IN ('reward','promotion','special_day','raffle','station') THEN
    RETURN jsonb_build_object('error', 'Entidad inválida');
  END IF;
  IF p_action NOT IN ('create','update','delete') THEN
    RETURN jsonb_build_object('error', 'Acción inválida');
  END IF;
  IF p_action <> 'create' AND p_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Falta el identificador');
  END IF;

  -- ── Snapshot previo (auditoría) ──
  IF p_id IS NOT NULL THEN
    SELECT CASE p_entity
      WHEN 'reward'      THEN (SELECT to_jsonb(t) FROM rewards t WHERE t.id = p_id)
      WHEN 'promotion'   THEN (SELECT to_jsonb(t) FROM promotions t WHERE t.id = p_id)
      WHEN 'special_day' THEN (SELECT to_jsonb(t) FROM special_days t WHERE t.id = p_id)
      WHEN 'raffle'      THEN (SELECT to_jsonb(t) FROM raffle_calendar t WHERE t.id = p_id)
      WHEN 'station'     THEN (SELECT to_jsonb(t) FROM stations t WHERE t.id = p_id)
    END INTO v_old;
    IF v_old IS NULL THEN
      RETURN jsonb_build_object('error', 'Registro no encontrado');
    END IF;
  END IF;

  -- ── DELETE ──
  IF p_action = 'delete' THEN
    IF p_entity = 'station' THEN
      RETURN jsonb_build_object('error', 'Las estaciones no se eliminan');
    END IF;
    IF p_entity = 'special_day' AND COALESCE((v_old->>'system')::boolean, false) THEN
      RETURN jsonb_build_object('error', 'Los días del sistema no se eliminan');
    END IF;
    CASE p_entity
      WHEN 'reward'      THEN DELETE FROM rewards        WHERE id = p_id;
      WHEN 'promotion'   THEN DELETE FROM promotions     WHERE id = p_id;
      WHEN 'special_day' THEN DELETE FROM special_days   WHERE id = p_id;
      WHEN 'raffle'      THEN DELETE FROM raffle_calendar WHERE id = p_id;
    END CASE;

  -- ── CREATE / UPDATE (whitelist por entidad) ──
  ELSIF p_entity = 'reward' THEN
    IF p_action = 'create' THEN
      INSERT INTO rewards (name, icon, points_cost, category, tier_exclusive, active, sort_order, description)
      VALUES (p_data->>'name', p_data->>'icon',
              COALESCE((p_data->>'points_cost')::integer, 0), p_data->>'category',
              NULLIF(p_data->>'tier_exclusive', ''),
              COALESCE((p_data->>'active')::boolean, true),
              NULLIF(p_data->>'sort_order', '')::integer, p_data->>'description')
      RETURNING id INTO v_id;
    ELSE
      UPDATE rewards SET
        name           = CASE WHEN p_data ? 'name'           THEN p_data->>'name' ELSE name END,
        icon           = CASE WHEN p_data ? 'icon'           THEN p_data->>'icon' ELSE icon END,
        points_cost    = CASE WHEN p_data ? 'points_cost'    THEN (p_data->>'points_cost')::integer ELSE points_cost END,
        category       = CASE WHEN p_data ? 'category'       THEN p_data->>'category' ELSE category END,
        tier_exclusive = CASE WHEN p_data ? 'tier_exclusive' THEN NULLIF(p_data->>'tier_exclusive', '') ELSE tier_exclusive END,
        active         = CASE WHEN p_data ? 'active'         THEN (p_data->>'active')::boolean ELSE active END,
        sort_order     = CASE WHEN p_data ? 'sort_order'     THEN NULLIF(p_data->>'sort_order','')::integer ELSE sort_order END,
        description    = CASE WHEN p_data ? 'description'    THEN p_data->>'description' ELSE description END
      WHERE id = p_id;
    END IF;

  ELSIF p_entity = 'promotion' THEN
    IF p_action = 'create' THEN
      INSERT INTO promotions (title, description, icon, bg_gradient, text_color, active, sort_order,
                              image_url, category, valid_until, conditions, promo_rule_id, text_colors)
      VALUES (p_data->>'title', p_data->>'description', p_data->>'icon',
              p_data->>'bg_gradient', p_data->>'text_color',
              COALESCE((p_data->>'active')::boolean, true),
              NULLIF(p_data->>'sort_order','')::integer,
              NULLIF(p_data->>'image_url',''), NULLIF(p_data->>'category',''),
              NULLIF(p_data->>'valid_until','')::date, p_data->>'conditions',
              NULLIF(p_data->>'promo_rule_id','')::uuid, p_data->'text_colors')
      RETURNING id INTO v_id;
    ELSE
      UPDATE promotions SET
        title         = CASE WHEN p_data ? 'title'         THEN p_data->>'title' ELSE title END,
        description   = CASE WHEN p_data ? 'description'   THEN p_data->>'description' ELSE description END,
        icon          = CASE WHEN p_data ? 'icon'          THEN p_data->>'icon' ELSE icon END,
        bg_gradient   = CASE WHEN p_data ? 'bg_gradient'   THEN p_data->>'bg_gradient' ELSE bg_gradient END,
        text_color    = CASE WHEN p_data ? 'text_color'    THEN p_data->>'text_color' ELSE text_color END,
        active        = CASE WHEN p_data ? 'active'        THEN (p_data->>'active')::boolean ELSE active END,
        sort_order    = CASE WHEN p_data ? 'sort_order'    THEN NULLIF(p_data->>'sort_order','')::integer ELSE sort_order END,
        image_url     = CASE WHEN p_data ? 'image_url'     THEN NULLIF(p_data->>'image_url','') ELSE image_url END,
        category      = CASE WHEN p_data ? 'category'      THEN NULLIF(p_data->>'category','') ELSE category END,
        valid_until   = CASE WHEN p_data ? 'valid_until'   THEN NULLIF(p_data->>'valid_until','')::date ELSE valid_until END,
        conditions    = CASE WHEN p_data ? 'conditions'    THEN p_data->>'conditions' ELSE conditions END,
        promo_rule_id = CASE WHEN p_data ? 'promo_rule_id' THEN NULLIF(p_data->>'promo_rule_id','')::uuid ELSE promo_rule_id END,
        text_colors   = CASE WHEN p_data ? 'text_colors'   THEN p_data->'text_colors' ELSE text_colors END,
        updated_at    = now()
      WHERE id = p_id;
    END IF;

  ELSIF p_entity = 'special_day' THEN
    -- `system` NUNCA se escribe desde el panel (marca los días del motor).
    IF p_action = 'create' THEN
      INSERT INTO special_days (name, month, day, points, icon, active, message, system)
      VALUES (p_data->>'name', (p_data->>'month')::integer, (p_data->>'day')::integer,
              COALESCE((p_data->>'points')::integer, 0), p_data->>'icon',
              COALESCE((p_data->>'active')::boolean, true), p_data->>'message', false)
      RETURNING id INTO v_id;
    ELSE
      UPDATE special_days SET
        name    = CASE WHEN p_data ? 'name'    THEN p_data->>'name' ELSE name END,
        month   = CASE WHEN p_data ? 'month'   THEN (p_data->>'month')::integer ELSE month END,
        day     = CASE WHEN p_data ? 'day'     THEN (p_data->>'day')::integer ELSE day END,
        points  = CASE WHEN p_data ? 'points'  THEN (p_data->>'points')::integer ELSE points END,
        icon    = CASE WHEN p_data ? 'icon'    THEN p_data->>'icon' ELSE icon END,
        active  = CASE WHEN p_data ? 'active'  THEN (p_data->>'active')::boolean ELSE active END,
        message = CASE WHEN p_data ? 'message' THEN p_data->>'message' ELSE message END
      WHERE id = p_id;
    END IF;

  ELSIF p_entity = 'raffle' THEN
    -- winner_id / drawn_at / winner_seen_at los escribe SOLO el sorteo
    -- (draw_due_raffles) — no se exponen acá.
    IF p_action = 'create' THEN
      INSERT INTO raffle_calendar (month, year, prize_name, prize_icon, prize_value,
                                   prize_image_url, prize_detail, ticket_points)
      VALUES ((p_data->>'month')::integer, (p_data->>'year')::integer,
              p_data->>'prize_name', p_data->>'prize_icon',
              NULLIF(p_data->>'prize_value','')::numeric,
              NULLIF(p_data->>'prize_image_url',''), p_data->>'prize_detail',
              NULLIF(p_data->>'ticket_points','')::integer)
      RETURNING id INTO v_id;
    ELSE
      UPDATE raffle_calendar SET
        month           = CASE WHEN p_data ? 'month'           THEN (p_data->>'month')::integer ELSE month END,
        year            = CASE WHEN p_data ? 'year'            THEN (p_data->>'year')::integer ELSE year END,
        prize_name      = CASE WHEN p_data ? 'prize_name'      THEN p_data->>'prize_name' ELSE prize_name END,
        prize_icon      = CASE WHEN p_data ? 'prize_icon'      THEN p_data->>'prize_icon' ELSE prize_icon END,
        prize_value     = CASE WHEN p_data ? 'prize_value'     THEN NULLIF(p_data->>'prize_value','')::numeric ELSE prize_value END,
        prize_image_url = CASE WHEN p_data ? 'prize_image_url' THEN NULLIF(p_data->>'prize_image_url','') ELSE prize_image_url END,
        prize_detail    = CASE WHEN p_data ? 'prize_detail'    THEN p_data->>'prize_detail' ELSE prize_detail END,
        ticket_points   = CASE WHEN p_data ? 'ticket_points'   THEN NULLIF(p_data->>'ticket_points','')::integer ELSE ticket_points END
      WHERE id = p_id;
    END IF;

  ELSIF p_entity = 'station' THEN
    IF p_action = 'create' THEN
      RETURN jsonb_build_object('error', 'Las estaciones no se crean desde el panel');
    END IF;
    UPDATE stations SET
      name          = CASE WHEN p_data ? 'name'          THEN p_data->>'name' ELSE name END,
      address       = CASE WHEN p_data ? 'address'       THEN p_data->>'address' ELSE address END,
      lat           = CASE WHEN p_data ? 'lat'           THEN NULLIF(p_data->>'lat','')::numeric ELSE lat END,
      lng           = CASE WHEN p_data ? 'lng'           THEN NULLIF(p_data->>'lng','')::numeric ELSE lng END,
      schedule      = CASE WHEN p_data ? 'schedule'      THEN p_data->>'schedule' ELSE schedule END,
      wifi_ssid     = CASE WHEN p_data ? 'wifi_ssid'     THEN p_data->>'wifi_ssid' ELSE wifi_ssid END,
      wifi_password = CASE WHEN p_data ? 'wifi_password' THEN p_data->>'wifi_password' ELSE wifi_password END,
      active        = CASE WHEN p_data ? 'active'        THEN (p_data->>'active')::boolean ELSE active END
    WHERE id = p_id;
  END IF;

  -- ── Snapshot posterior + auditoría atómica ──
  IF p_action <> 'delete' THEN
    SELECT CASE p_entity
      WHEN 'reward'      THEN (SELECT to_jsonb(t) FROM rewards t WHERE t.id = v_id)
      WHEN 'promotion'   THEN (SELECT to_jsonb(t) FROM promotions t WHERE t.id = v_id)
      WHEN 'special_day' THEN (SELECT to_jsonb(t) FROM special_days t WHERE t.id = v_id)
      WHEN 'raffle'      THEN (SELECT to_jsonb(t) FROM raffle_calendar t WHERE t.id = v_id)
      WHEN 'station'     THEN (SELECT to_jsonb(t) FROM stations t WHERE t.id = v_id)
    END INTO v_new;
  END IF;

  IF p_admin_id IS NOT NULL THEN
    PERFORM public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => p_action || '_' || p_entity,
      p_entity_type => p_entity,
      p_entity_id   => COALESCE(v_id, p_id)::text,
      p_reason_text => p_reason_text,
      p_old_value   => v_old,
      p_new_value   => v_new
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', COALESCE(v_id, p_id), 'row', v_new);
END;
$function$;

COMMENT ON FUNCTION public.admin_write_catalog(text, text, text, uuid, jsonb, uuid, text, text, text) IS
'SEC.C.4: única vía de escritura del catálogo (premios, promociones,
días especiales, rifas, estaciones). Whitelist de columnas por entidad,
sesión de admin y auditoría ATÓMICA. winner_id/drawn_at de las rifas y
special_days.system quedan fuera del alcance del panel.';

-- ── B.1 rate_operator (cliente con sesión) ─────────────────────
CREATE OR REPLACE FUNCTION public.rate_operator(
  p_session_token text,
  p_operator_id   uuid,
  p_stars         integer,
  p_purchase_id   uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mid uuid;
BEGIN
  v_mid := public.validate_session_token(p_session_token, 'member', 'rate_operator', false, NULL);
  IF p_stars IS NULL OR p_stars < 1 OR p_stars > 5 THEN
    RETURN jsonb_build_object('error', 'Calificación inválida');
  END IF;
  -- Una calificación por compra (evita el spam que permitía el INSERT
  -- abierto). Sin purchase_id se acepta una suelta.
  IF p_purchase_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM operator_ratings WHERE purchase_id = p_purchase_id
  ) THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true);
  END IF;

  INSERT INTO operator_ratings (operator_id, member_id, purchase_id, stars)
  VALUES (p_operator_id, v_mid, p_purchase_id, p_stars);
  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- ── B.2 count_my_surveys_today ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.count_my_surveys_today(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mid uuid;
  v_n   integer;
BEGIN
  v_mid := public.validate_session_token(p_session_token, 'member', 'count_my_surveys_today', false, NULL);
  SELECT count(*) INTO v_n FROM surveys
  WHERE member_id = v_mid
    AND (created_at AT TIME ZONE 'America/Guatemala')::date
        = (now() AT TIME ZONE 'America/Guatemala')::date;
  RETURN jsonb_build_object('ok', true, 'count', v_n);
END;
$function$;

-- ── B.3 mark_raffle_winner_seen ────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_raffle_winner_seen(
  p_session_token text,
  p_raffle_id     uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mid uuid;
BEGIN
  v_mid := public.validate_session_token(p_session_token, 'member', 'mark_raffle_winner_seen', false, NULL);
  -- Solo el GANADOR marca su propia felicitación como vista.
  UPDATE raffle_calendar SET winner_seen_at = now()
  WHERE id = p_raffle_id AND winner_id = v_mid AND winner_seen_at IS NULL;
  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- ── B.4 save_push_subscription ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.save_push_subscription(
  p_session_token text,
  p_endpoint      text,
  p_p256dh        text,
  p_auth          text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mid uuid;
BEGIN
  v_mid := public.validate_session_token(p_session_token, 'member', 'save_push_subscription', false, NULL);
  IF COALESCE(p_endpoint, '') = '' THEN
    RETURN jsonb_build_object('error', 'Suscripción inválida');
  END IF;
  INSERT INTO push_subscriptions (member_id, endpoint, keys_p256dh, keys_auth)
  VALUES (v_mid, p_endpoint, p_p256dh, p_auth)
  ON CONFLICT (member_id, endpoint) DO UPDATE
    SET keys_p256dh = EXCLUDED.keys_p256dh,
        keys_auth   = EXCLUDED.keys_auth,
        updated_at  = now();
  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- ═══════════════════════════════════════════════════════════════
-- C. REVOCACIONES
-- ═══════════════════════════════════════════════════════════════

-- Catálogo: LECTURA pública (es el contenido de la app), escritura solo RPC.
DROP POLICY IF EXISTS rewards_open ON public.rewards;
REVOKE ALL ON public.rewards FROM anon, authenticated;
GRANT SELECT ON public.rewards TO anon, authenticated;

DROP POLICY IF EXISTS promotions_open ON public.promotions;
REVOKE ALL ON public.promotions FROM anon, authenticated;
GRANT SELECT ON public.promotions TO anon, authenticated;

DROP POLICY IF EXISTS special_days_open ON public.special_days;
CREATE POLICY special_days_select_public ON public.special_days
  FOR SELECT USING (true);
REVOKE ALL ON public.special_days FROM anon, authenticated;
GRANT SELECT ON public.special_days TO anon, authenticated;

DROP POLICY IF EXISTS stations_open ON public.stations;
REVOKE ALL ON public.stations FROM anon, authenticated;
GRANT SELECT ON public.stations TO anon, authenticated;

DROP POLICY IF EXISTS raffle_calendar_open ON public.raffle_calendar;
REVOKE ALL ON public.raffle_calendar FROM anon, authenticated;
GRANT SELECT ON public.raffle_calendar TO anon, authenticated;

-- Cliente: escrituras por RPC.
DROP POLICY IF EXISTS operator_ratings_all ON public.operator_ratings;
CREATE POLICY operator_ratings_select_open ON public.operator_ratings
  FOR SELECT USING (true);   -- promedios por operador (vista admin)
REVOKE ALL ON public.operator_ratings FROM anon, authenticated;
GRANT SELECT (operator_id, stars, created_at) ON public.operator_ratings TO anon, authenticated;

DROP POLICY IF EXISTS surveys_all  ON public.surveys;
DROP POLICY IF EXISTS surveys_open ON public.surveys;
REVOKE ALL ON public.surveys FROM anon, authenticated;

DROP POLICY IF EXISTS push_subscriptions_open ON public.push_subscriptions;
REVOKE ALL ON public.push_subscriptions FROM anon, authenticated;

-- Tablas sin uso vivo (histórico/deprecadas): cerradas del todo.
DROP POLICY IF EXISTS card_history_all   ON public.card_history;
DROP POLICY IF EXISTS referrals_all      ON public.referrals;
DROP POLICY IF EXISTS referrals_open     ON public.referrals;
DROP POLICY IF EXISTS raffle_entries_open ON public.raffle_entries;
REVOKE ALL ON public.card_history   FROM anon, authenticated;
REVOKE ALL ON public.referrals      FROM anon, authenticated;
REVOKE ALL ON public.raffle_entries FROM anon, authenticated;

-- phone_verifications: nace para el flujo Twilio (aún sin usar) —
-- solo service key hasta que exista el RPC de verificación.
DROP POLICY IF EXISTS phone_verifications_all ON public.phone_verifications;
REVOKE ALL ON public.phone_verifications FROM anon, authenticated;

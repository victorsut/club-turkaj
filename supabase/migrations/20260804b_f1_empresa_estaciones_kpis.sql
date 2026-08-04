-- ═══════════════════════════════════════════════════════════════
-- F1 (alcance ajustado 4-ago-2026) — EMPRESA + ESTACIONES + KPIs
-- ═══════════════════════════════════════════════════════════════
-- 1. admin_write_catalog: la entidad 'station' gana `external_code`
--    (código de estación de PROPER) en su whitelist — el resto de la
--    función queda IDÉNTICO a 20260729f (recreada completa porque
--    plpgsql no permite parches parciales).
-- 2. program_config 'company' (nombre + ubicación de la empresa,
--    consumidos por el selector de empresa y el encabezado del inicio)
--    + RPC auditado set_company_info (sesión de ADMIN).
-- 3. RPC get_admin_kpis: agregados REALES de purchases (por combustible
--    y por estación, mes en curso GT y acumulado) para el dashboard —
--    purchases quedó sin SELECT abierto en SEC.C.2, por eso RPC.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. admin_write_catalog con stations.external_code ──────────
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
      -- F1 (4-ago): código de estación de PROPER editable desde el panel
      external_code = CASE WHEN p_data ? 'external_code' THEN NULLIF(p_data->>'external_code','') ELSE external_code END,
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
'SEC.C.4 + F1: única vía de escritura del catálogo (premios, promociones,
días especiales, rifas, estaciones — incl. external_code de PROPER).
Whitelist de columnas por entidad, sesión de admin y auditoría ATÓMICA.
winner_id/drawn_at de las rifas y special_days.system quedan fuera.';

-- ── 2. Empresa: semilla + RPC auditado ─────────────────────────
INSERT INTO program_config (key, value)
VALUES ('company', '{"name": "Gasolineras Turkaj", "location": "Chichicastenango"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.set_company_info(
  p_session_token text,
  p_data          jsonb,
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
  v_old   jsonb;
  v_value jsonb;
  v_name  text := NULLIF(trim(p_data->>'name'), '');
  v_loc   text := NULLIF(trim(p_data->>'location'), '');
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'set_company_info', false, NULL);

  IF v_name IS NULL AND v_loc IS NULL THEN
    RETURN jsonb_build_object('error', 'Nada que actualizar');
  END IF;
  IF length(COALESCE(v_name, '')) > 60 OR length(COALESCE(v_loc, '')) > 60 THEN
    RETURN jsonb_build_object('error', 'Máximo 60 caracteres por campo');
  END IF;

  SELECT value INTO v_old FROM program_config WHERE key = 'company';
  -- Merge con whitelist: solo name y location entran desde el panel
  v_value := COALESCE(v_old, '{}'::jsonb)
    || CASE WHEN v_name IS NOT NULL THEN jsonb_build_object('name', v_name) ELSE '{}'::jsonb END
    || CASE WHEN v_loc  IS NOT NULL THEN jsonb_build_object('location', v_loc) ELSE '{}'::jsonb END;

  INSERT INTO program_config (key, value) VALUES ('company', v_value)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  PERFORM public.log_admin_action(
    p_admin_id    => p_admin_id,
    p_admin_name  => p_admin_name,
    p_admin_email => p_admin_email,
    p_action      => 'update_company_info',
    p_entity_type => 'config',
    p_entity_id   => 'company',
    p_reason_text => p_reason_text,
    p_old_value   => v_old,
    p_new_value   => v_value
  );

  RETURN v_value;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.set_company_info(text, jsonb, uuid, text, text, text) TO anon, authenticated;

-- ── 3. KPIs reales del dashboard ───────────────────────────────
-- purchases quedó sin SELECT abierto (SEC.C.2) — los agregados por
-- combustible y estación viajan por RPC con sesión de ADMIN. El mes
-- en curso se corta con la zona America/Guatemala.
CREATE OR REPLACE FUNCTION public.get_admin_kpis(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_month_start timestamptz :=
    date_trunc('month', now() AT TIME ZONE 'America/Guatemala') AT TIME ZONE 'America/Guatemala';
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'get_admin_kpis', false, NULL);

  RETURN jsonb_build_object(
    'fuel', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'fuel_type', t.fuel_type, 'gallons', t.g, 'amount', t.a, 'purchases', t.n))
      FROM (
        SELECT COALESCE(NULLIF(trim(lower(fuel_type)), ''), 'otro') AS fuel_type,
               ROUND(SUM(gallons)::numeric, 2) AS g,
               ROUND(SUM(amount)::numeric, 2)  AS a,
               COUNT(*) AS n
        FROM purchases
        GROUP BY 1 ORDER BY 2 DESC
      ) t), '[]'::jsonb),
    'fuel_month', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'fuel_type', t.fuel_type, 'gallons', t.g, 'amount', t.a, 'purchases', t.n))
      FROM (
        SELECT COALESCE(NULLIF(trim(lower(fuel_type)), ''), 'otro') AS fuel_type,
               ROUND(SUM(gallons)::numeric, 2) AS g,
               ROUND(SUM(amount)::numeric, 2)  AS a,
               COUNT(*) AS n
        FROM purchases
        WHERE created_at >= v_month_start
        GROUP BY 1 ORDER BY 2 DESC
      ) t), '[]'::jsonb),
    'stations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.sid, 'name', t.sname, 'gallons', t.g, 'amount', t.a, 'purchases', t.n))
      FROM (
        SELECT p.station_id AS sid,
               COALESCE(s.name, 'Sin estación') AS sname,
               ROUND(SUM(p.gallons)::numeric, 2) AS g,
               ROUND(SUM(p.amount)::numeric, 2)  AS a,
               COUNT(*) AS n
        FROM purchases p
        LEFT JOIN stations s ON s.id = p.station_id
        GROUP BY 1, 2 ORDER BY 3 DESC
      ) t), '[]'::jsonb),
    'stations_month', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.sid, 'name', t.sname, 'gallons', t.g, 'amount', t.a, 'purchases', t.n))
      FROM (
        SELECT p.station_id AS sid,
               COALESCE(s.name, 'Sin estación') AS sname,
               ROUND(SUM(p.gallons)::numeric, 2) AS g,
               ROUND(SUM(p.amount)::numeric, 2)  AS a,
               COUNT(*) AS n
        FROM purchases p
        LEFT JOIN stations s ON s.id = p.station_id
        WHERE p.created_at >= v_month_start
        GROUP BY 1, 2 ORDER BY 3 DESC
      ) t), '[]'::jsonb)
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_admin_kpis(text) TO anon, authenticated;

-- ============================================================
-- F2 D22 (6-ago-2026) — PREMIO DE RIFA CON PLAZO Y ESTACIÓN CONFIGURABLES
-- ============================================================
-- D22: el ganador de la rifa mensual recibe su premio (canje TK) con
-- un PLAZO MÁXIMO para reclamarlo en una ESTACIÓN definida.
-- Defaults del ROADMAP: 15 días · Turkaj 1 (la primera estación por
-- nombre). Configurables POR RIFA desde el form de rifas del panel
-- (raffle_calendar.claim_days / claim_station_id, NULL = default).
--
-- Mecánica:
--   · redemptions.expires_at (timestamptz, NULL = no expira) — columna
--     GENÉRICA: hoy la estampa solo el sorteo (drawn + claim_days),
--     mañana puede usarla cualquier canje con vencimiento.
--   · El premio (reward oculto) nace con station_ids = [estación de
--     reclamo] (infraestructura D17) — informativo.
--   · ENFORCEMENT server-side del plazo: vencido el premio, NI la app
--     (operator_set_redemption_confirm / deliver_redemption) NI el POS
--     de PROPER (api_redemption_confirm, error nuevo 'expired') pueden
--     solicitarlo o entregarlo. Los canjes NORMALES no expiran
--     (expires_at NULL) — nada cambia para ellos.
-- ============================================================

-- ── 1) Columnas ──────────────────────────────────────────────
ALTER TABLE public.raffle_calendar
  ADD COLUMN IF NOT EXISTS claim_days       integer,
  ADD COLUMN IF NOT EXISTS claim_station_id uuid;

ALTER TABLE public.redemptions
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

COMMENT ON COLUMN public.raffle_calendar.claim_days IS
  'D22: días de plazo del ganador para reclamar. NULL = 15.';
COMMENT ON COLUMN public.raffle_calendar.claim_station_id IS
  'D22: estación donde se reclama el premio. NULL = primera estación (Turkaj 1).';
COMMENT ON COLUMN public.redemptions.expires_at IS
  'D22: vencimiento del canje (NULL = no expira). Hoy lo estampa solo el sorteo de rifa.';

-- ── 2) draw_due_raffles: estampa plazo + estación del premio ─
CREATE OR REPLACE FUNCTION public.draw_due_raffles()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  r            record;
  v_total      integer;
  v_pick       integer;
  v_winner     uuid;
  v_reward_id  uuid;
  v_code       text;
  v_month_name text;
  v_drawn      integer := 0;
  v_claim_days integer;
  v_station    uuid;
  months       text[] := ARRAY['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
BEGIN
  FOR r IN
    SELECT rc.* FROM raffle_calendar rc
    WHERE rc.winner_id IS NULL
      -- el mes de la rifa ya terminó en hora de Guatemala
      AND (make_date(rc.year, rc.month, 1) + interval '1 month') <= ((now() AT TIME ZONE 'America/Guatemala')::date)
      AND EXISTS (SELECT 1 FROM raffle_tickets rt WHERE rt.raffle_id = rc.id)
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT COALESCE(SUM(quantity), 0) INTO v_total
    FROM raffle_tickets WHERE raffle_id = r.id;
    IF v_total <= 0 THEN CONTINUE; END IF;

    -- Boleto ganador al azar en [1..total]; el ganador es el miembro en
    -- cuyo rango acumulado cae — ponderación exacta por boletos.
    v_pick := floor(random() * v_total)::integer + 1;

    SELECT member_id INTO v_winner
    FROM (
      SELECT member_id, SUM(SUM(quantity)) OVER (ORDER BY member_id) AS cum
      FROM raffle_tickets
      WHERE raffle_id = r.id
      GROUP BY member_id
    ) s
    WHERE s.cum >= v_pick
    ORDER BY s.cum
    LIMIT 1;

    IF v_winner IS NULL THEN CONTINUE; END IF;

    UPDATE raffle_calendar SET winner_id = v_winner, drawn_at = now()
    WHERE id = r.id;

    v_month_name := months[r.month];

    -- D22: plazo y estación de reclamo (defaults 15 días / primera
    -- estación por nombre = Turkaj 1).
    v_claim_days := COALESCE(r.claim_days, 15);
    v_station := COALESCE(
      r.claim_station_id,
      (SELECT id FROM stations ORDER BY name LIMIT 1)
    );

    -- Premio como canje EXCLUSIVO del ganador: reward oculto del catálogo
    -- (active=false) + redemption costo 0 con código TK estándar.
    -- D17: el reward nace localizado en la estación de reclamo.
    INSERT INTO rewards (name, icon, points_cost, category, active, description, station_ids)
    VALUES (
      r.prize_name, COALESCE(r.prize_icon, '🎁'), 0, 'merch', false,
      'Premio de la rifa de ' || v_month_name || ' ' || r.year ||
      ' (Q' || r.prize_value || '). Exclusivo del ganador del sorteo.',
      CASE WHEN v_station IS NULL THEN NULL ELSE ARRAY[v_station] END
    )
    RETURNING id INTO v_reward_id;

    v_code := 'TK-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));

    -- D22: el canje del premio VENCE claim_days después del sorteo.
    INSERT INTO redemptions (member_id, reward_id, points_spent, redemption_code, collected, confirm_status, expires_at)
    VALUES (v_winner, v_reward_id, 0, v_code, false, 'none',
            now() + (v_claim_days || ' days')::interval);

    INSERT INTO activity_log (member_id, activity_type, description, points_change)
    VALUES (
      v_winner, 'rifa',
      'Ganaste la rifa de ' || v_month_name || ': ' || r.prize_name, 0
    );

    v_drawn := v_drawn + 1;
  END LOOP;

  RETURN jsonb_build_object('drawn', v_drawn);
END;
$$;

-- ── 3) deliver_redemption: rechaza premios vencidos ──────────
CREATE OR REPLACE FUNCTION public.deliver_redemption(p_session_token text, p_role text, p_redemption_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id     uuid;
  v_r      RECORD;
BEGIN
  IF p_role NOT IN ('operator', 'admin') THEN
    RAISE EXCEPTION 'Sesión inválida' USING ERRCODE = '28000', DETAIL = 'invalid_role';
  END IF;
  v_id := public.validate_session_token(p_session_token, p_role, 'deliver_redemption', false, NULL);

  SELECT rd.member_id, rd.collected, rd.confirm_status, rd.expires_at, rw.name AS reward_name
    INTO v_r
  FROM redemptions rd
  LEFT JOIN rewards rw ON rw.id = rd.reward_id
  WHERE rd.id = p_redemption_id
  FOR UPDATE OF rd;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Canje no encontrado');
  END IF;
  IF v_r.collected THEN
    RETURN jsonb_build_object('error', 'Este canje ya fue entregado');
  END IF;
  -- D22: plazo de reclamo vencido (solo canjes con expires_at — rifa).
  IF v_r.expires_at IS NOT NULL AND now() > v_r.expires_at THEN
    RETURN jsonb_build_object('error',
      'El plazo para reclamar este premio venció el ' ||
      to_char(v_r.expires_at AT TIME ZONE 'America/Guatemala', 'DD/MM/YYYY'));
  END IF;
  -- Invariante de negocio server-side: la entrega exige la
  -- confirmación del cliente en su dispositivo.
  IF v_r.confirm_status <> 'confirmed' THEN
    RETURN jsonb_build_object('error', 'El cliente aún no ha confirmado');
  END IF;

  UPDATE redemptions SET
    collected      = true,
    collected_at   = now(),
    confirm_status = 'none',
    operator_id    = CASE WHEN p_role = 'operator' THEN v_id ELSE operator_id END
  WHERE id = p_redemption_id;

  INSERT INTO activity_log (member_id, activity_type, description, points_change)
  VALUES (v_r.member_id, 'entrega',
          'Premio entregado: ' || COALESCE(v_r.reward_name, 'Premio'), 0);

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── 4) operator_set_redemption_confirm: no solicita vencidos ─
CREATE OR REPLACE FUNCTION public.operator_set_redemption_confirm(p_session_token text, p_role text, p_redemption_id uuid, p_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_r RECORD;
BEGIN
  IF p_role NOT IN ('operator', 'admin') THEN
    RAISE EXCEPTION 'Sesión inválida' USING ERRCODE = '28000', DETAIL = 'invalid_role';
  END IF;
  PERFORM public.validate_session_token(p_session_token, p_role, 'operator_set_redemption_confirm', false, NULL);
  IF p_status NOT IN ('pending', 'none') THEN
    RETURN jsonb_build_object('error', 'Estado inválido');
  END IF;

  SELECT collected, expires_at INTO v_r FROM redemptions WHERE id = p_redemption_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Canje no encontrado');
  END IF;
  IF p_status = 'pending' AND v_r.collected THEN
    RETURN jsonb_build_object('error', 'Este canje ya fue entregado');
  END IF;
  -- D22: no se solicita confirmación de un premio vencido (cancelar sí).
  IF p_status = 'pending' AND v_r.expires_at IS NOT NULL AND now() > v_r.expires_at THEN
    RETURN jsonb_build_object('error',
      'El plazo para reclamar este premio venció el ' ||
      to_char(v_r.expires_at AT TIME ZONE 'America/Guatemala', 'DD/MM/YYYY'));
  END IF;

  UPDATE redemptions SET
    confirm_status = p_status,
    confirm_requested_at = CASE WHEN p_status = 'pending' THEN now() ELSE confirm_requested_at END
  WHERE id = p_redemption_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── 5) api_redemption_confirm (PROPER): error nuevo 'expired' ─
CREATE OR REPLACE FUNCTION public.api_redemption_confirm(p_api_client_id uuid, p_code text, p_action text, p_operator_ext text DEFAULT NULL::text, p_operator_name text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code text := upper(trim(COALESCE(p_code, '')));
  v_r    RECORD;
  v_op   uuid;
BEGIN
  IF p_action NOT IN ('request', 'cancel', 'deliver') THEN
    RETURN jsonb_build_object('error', 'invalid_action',
      'detail', 'Acciones válidas: request, cancel, deliver');
  END IF;

  SELECT rd.id, rd.member_id, rd.collected, rd.confirm_status,
         rd.points_spent, rd.redemption_code, rd.created_at, rd.expires_at,
         rd.reward_id, rw.name AS reward_name, rw.icon AS reward_icon,
         rw.category, m.name AS member_name
    INTO v_r
  FROM redemptions rd
  LEFT JOIN rewards rw ON rw.id = rd.reward_id
  LEFT JOIN members m  ON m.id  = rd.member_id
  WHERE rd.redemption_code = v_code
  FOR UPDATE OF rd;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'redemption_not_found');
  END IF;
  IF v_r.collected THEN
    RETURN jsonb_build_object('error', 'already_delivered',
      'detail', 'Este canje ya fue entregado');
  END IF;
  -- D22: premio con plazo vencido — ni solicitar ni entregar (cancel sí).
  IF p_action <> 'cancel' AND v_r.expires_at IS NOT NULL AND now() > v_r.expires_at THEN
    RETURN jsonb_build_object('error', 'expired',
      'detail', 'El plazo para reclamar este premio venció el ' ||
                to_char(v_r.expires_at AT TIME ZONE 'America/Guatemala', 'DD/MM/YYYY'),
      'expired_at', v_r.expires_at);
  END IF;

  IF p_action = 'request' THEN
    UPDATE redemptions SET
      confirm_status = 'pending',
      confirm_requested_at = now()
    WHERE id = v_r.id;
    -- member_id/reward_id/redemption_id son para el BROADCAST del
    -- endpoint (se quitan de la respuesta pública; el handler del
    -- cliente exige el UUID en payload.redemptionId).
    RETURN jsonb_build_object(
      'ok', true, 'status', 'pending',
      'code', v_r.redemption_code,
      'reward_name', v_r.reward_name,
      'member_name', v_r.member_name,
      'member_id', v_r.member_id,
      'reward_id', v_r.reward_id,
      'redemption_id', v_r.id,
      'reward_icon', v_r.reward_icon,
      'points_spent', v_r.points_spent
    );
  END IF;

  IF p_action = 'cancel' THEN
    UPDATE redemptions SET confirm_status = 'none' WHERE id = v_r.id;
    RETURN jsonb_build_object('ok', true, 'status', 'none',
      'code', v_r.redemption_code, 'member_id', v_r.member_id,
      'redemption_id', v_r.id);
  END IF;

  -- deliver: misma invariante server-side que deliver_redemption —
  -- la entrega EXIGE la confirmación del cliente en su dispositivo.
  IF v_r.confirm_status <> 'confirmed' THEN
    RETURN jsonb_build_object('error', 'not_confirmed',
      'detail', 'El cliente aún no ha confirmado la entrega en su app');
  END IF;

  -- Operador espejo para la atribución (mismo patrón de purchases).
  IF COALESCE(trim(p_operator_ext), '') = '' THEN
    RETURN jsonb_build_object('error', 'missing_operator');
  END IF;
  v_op := public.api_upsert_operator(trim(p_operator_ext), p_operator_name, NULL);

  UPDATE redemptions SET
    collected      = true,
    collected_at   = now(),
    confirm_status = 'none',
    operator_id    = v_op
  WHERE id = v_r.id;

  INSERT INTO activity_log (member_id, activity_type, description, points_change)
  VALUES (v_r.member_id, 'entrega',
          'Premio entregado: ' || COALESCE(v_r.reward_name, 'Premio'), 0);

  -- Payload del COMPROBANTE: PROPER lo imprime desde su app (la
  -- impresión solo existe en la entrega, nunca al acumular).
  RETURN jsonb_build_object(
    'ok', true, 'status', 'delivered',
    'code',          v_r.redemption_code,
    'reward_name',   v_r.reward_name,
    'category',      v_r.category,
    'points_spent',  v_r.points_spent,
    'member_name',   v_r.member_name,
    'redeemed_at',   v_r.created_at,
    'delivered_at',  now(),
    'member_id',     v_r.member_id
  );
END;
$$;

-- ── 6) get_my_redemptions: expone expires_at ─────────────────
CREATE OR REPLACE FUNCTION public.get_my_redemptions(p_session_token text, p_limit integer DEFAULT 200)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_mid uuid;
BEGIN
  v_mid := public.validate_session_token(p_session_token, 'member', 'get_my_redemptions', false, NULL);
  RETURN QUERY
    SELECT jsonb_build_object(
      'id', rd.id, 'member_id', rd.member_id,
      'points_spent', rd.points_spent, 'redemption_code', rd.redemption_code,
      'collected', rd.collected, 'collected_at', rd.collected_at,
      'created_at', rd.created_at,
      'expires_at', rd.expires_at,
      'reward_id', rd.reward_id,
      'confirm_status', rd.confirm_status,
      'confirm_requested_at', rd.confirm_requested_at,
      'reward_name', rw.name, 'reward_icon', rw.icon, 'reward_category', rw.category
    )
    FROM redemptions rd
    LEFT JOIN rewards rw ON rw.id = rd.reward_id
    WHERE rd.member_id = v_mid
    ORDER BY rd.created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 200), 1), 1000);
END;
$$;

-- ── 7) admin_write_catalog: claim_days/claim_station_id en 'raffle' ─
-- (Recreado desde la versión 20260806c — incluye la entidad 'store'.)
CREATE OR REPLACE FUNCTION public.admin_write_catalog(
  p_session_token text, p_entity text, p_action text,
  p_id uuid DEFAULT NULL::uuid, p_data jsonb DEFAULT '{}'::jsonb,
  p_admin_id uuid DEFAULT NULL::uuid, p_admin_name text DEFAULT NULL::text,
  p_admin_email text DEFAULT NULL::text, p_reason_text text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_id  uuid := p_id;
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'admin_write_catalog', false, NULL);

  IF p_entity NOT IN ('reward','promotion','special_day','raffle','station','store') THEN
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
      WHEN 'store'       THEN (SELECT to_jsonb(t) FROM partner_stores t WHERE t.id = p_id)
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
      WHEN 'store'       THEN
        UPDATE rewards
          SET store_ids = NULLIF(array_remove(store_ids, p_id), ARRAY[]::uuid[])
          WHERE store_ids @> ARRAY[p_id];
        DELETE FROM partner_stores WHERE id = p_id;
    END CASE;

  -- ── CREATE / UPDATE (whitelist por entidad) ──
  ELSIF p_entity = 'reward' THEN
    IF p_action = 'create' THEN
      INSERT INTO rewards (name, icon, points_cost, category, tier_exclusive, active, sort_order, description,
                           station_ids, store_ids)
      VALUES (p_data->>'name', p_data->>'icon',
              COALESCE((p_data->>'points_cost')::integer, 0), p_data->>'category',
              NULLIF(p_data->>'tier_exclusive', ''),
              COALESCE((p_data->>'active')::boolean, true),
              NULLIF(p_data->>'sort_order', '')::integer, p_data->>'description',
              public.jsonb_uuid_array(p_data->'station_ids'),
              public.jsonb_uuid_array(p_data->'store_ids'))
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
        description    = CASE WHEN p_data ? 'description'    THEN p_data->>'description' ELSE description END,
        station_ids    = CASE WHEN p_data ? 'station_ids'    THEN public.jsonb_uuid_array(p_data->'station_ids') ELSE station_ids END,
        store_ids      = CASE WHEN p_data ? 'store_ids'      THEN public.jsonb_uuid_array(p_data->'store_ids') ELSE store_ids END
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
    -- D22: claim_days / claim_station_id configurables por rifa.
    IF p_action = 'create' THEN
      INSERT INTO raffle_calendar (month, year, prize_name, prize_icon, prize_value,
                                   prize_image_url, prize_detail, ticket_points,
                                   claim_days, claim_station_id)
      VALUES ((p_data->>'month')::integer, (p_data->>'year')::integer,
              p_data->>'prize_name', p_data->>'prize_icon',
              NULLIF(p_data->>'prize_value','')::numeric,
              NULLIF(p_data->>'prize_image_url',''), p_data->>'prize_detail',
              NULLIF(p_data->>'ticket_points','')::integer,
              NULLIF(p_data->>'claim_days','')::integer,
              NULLIF(p_data->>'claim_station_id','')::uuid)
      RETURNING id INTO v_id;
    ELSE
      UPDATE raffle_calendar SET
        month            = CASE WHEN p_data ? 'month'            THEN (p_data->>'month')::integer ELSE month END,
        year             = CASE WHEN p_data ? 'year'             THEN (p_data->>'year')::integer ELSE year END,
        prize_name       = CASE WHEN p_data ? 'prize_name'       THEN p_data->>'prize_name' ELSE prize_name END,
        prize_icon       = CASE WHEN p_data ? 'prize_icon'       THEN p_data->>'prize_icon' ELSE prize_icon END,
        prize_value      = CASE WHEN p_data ? 'prize_value'      THEN NULLIF(p_data->>'prize_value','')::numeric ELSE prize_value END,
        prize_image_url  = CASE WHEN p_data ? 'prize_image_url'  THEN NULLIF(p_data->>'prize_image_url','') ELSE prize_image_url END,
        prize_detail     = CASE WHEN p_data ? 'prize_detail'     THEN p_data->>'prize_detail' ELSE prize_detail END,
        ticket_points    = CASE WHEN p_data ? 'ticket_points'    THEN NULLIF(p_data->>'ticket_points','')::integer ELSE ticket_points END,
        claim_days       = CASE WHEN p_data ? 'claim_days'       THEN NULLIF(p_data->>'claim_days','')::integer ELSE claim_days END,
        claim_station_id = CASE WHEN p_data ? 'claim_station_id' THEN NULLIF(p_data->>'claim_station_id','')::uuid ELSE claim_station_id END
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
      external_code = CASE WHEN p_data ? 'external_code' THEN NULLIF(p_data->>'external_code','') ELSE external_code END,
      active        = CASE WHEN p_data ? 'active'        THEN (p_data->>'active')::boolean ELSE active END
    WHERE id = p_id;

  ELSIF p_entity = 'store' THEN
    IF p_action = 'create' THEN
      IF COALESCE(trim(p_data->>'name'), '') = '' THEN
        RETURN jsonb_build_object('error', 'El nombre de la tienda es obligatorio');
      END IF;
      INSERT INTO partner_stores (name, address, active)
      VALUES (trim(p_data->>'name'),
              NULLIF(trim(COALESCE(p_data->>'address', '')), ''),
              COALESCE((p_data->>'active')::boolean, true))
      RETURNING id INTO v_id;
    ELSE
      IF p_data ? 'name' AND COALESCE(trim(p_data->>'name'), '') = '' THEN
        RETURN jsonb_build_object('error', 'El nombre de la tienda es obligatorio');
      END IF;
      UPDATE partner_stores SET
        name       = CASE WHEN p_data ? 'name'    THEN trim(p_data->>'name') ELSE name END,
        address    = CASE WHEN p_data ? 'address' THEN NULLIF(trim(COALESCE(p_data->>'address','')),'') ELSE address END,
        active     = CASE WHEN p_data ? 'active'  THEN (p_data->>'active')::boolean ELSE active END,
        updated_at = now()
      WHERE id = p_id;
    END IF;
  END IF;

  -- ── Snapshot posterior + auditoría atómica ──
  IF p_action <> 'delete' THEN
    SELECT CASE p_entity
      WHEN 'reward'      THEN (SELECT to_jsonb(t) FROM rewards t WHERE t.id = v_id)
      WHEN 'promotion'   THEN (SELECT to_jsonb(t) FROM promotions t WHERE t.id = v_id)
      WHEN 'special_day' THEN (SELECT to_jsonb(t) FROM special_days t WHERE t.id = v_id)
      WHEN 'raffle'      THEN (SELECT to_jsonb(t) FROM raffle_calendar t WHERE t.id = v_id)
      WHEN 'station'     THEN (SELECT to_jsonb(t) FROM stations t WHERE t.id = v_id)
      WHEN 'store'       THEN (SELECT to_jsonb(t) FROM partner_stores t WHERE t.id = v_id)
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
$$;

-- ============================================================
-- ⚠️ EJECUTAR DESPUÉS de la 20260806c (esta versión de
--    admin_write_catalog incluye la entidad 'store' de D18).
-- VERIFICAR tras ejecutar:
--   1. Form de rifas del panel guarda plazo y estación.
--   2. Al cerrar un mes, el premio del ganador nace con expires_at =
--      sorteo + plazo y el reward con station_ids = [estación].
--   3. Vencido el plazo: solicitar/entregar falla en app
--      ("venció el DD/MM/YYYY") y en el POS (error 'expired');
--      los canjes normales (expires_at NULL) no cambian.
--   4. El modal del ganador y el QR del premio muestran el plazo.
-- ============================================================

-- ============================================================
-- F2 D17/D18 (6-ago-2026) — LOCALIZACIONES DE CANJE + TIENDAS ASOCIADAS
-- ============================================================
-- D18: tiendas asociadas gestionables (Betel, Súper 24, futuras) —
--   tabla partner_stores, CRUD desde el panel por admin_write_catalog
--   (entidad nueva 'store': crear/editar/eliminar, sesión + auditoría).
-- D17: cada premio declara DÓNDE es válido — rewards.station_ids y
--   rewards.store_ids (arrays uuid). Semántica: AMBOS NULL/vacíos =
--   válido en todas las estaciones (comportamiento actual, sin tiendas).
--   v1 INFORMATIVA: se muestra al cliente en catálogo y confirmación de
--   canje; la entrega NO se bloquea por estación (el modelo operador-
--   estación es débil desde PROPER — decisión a revisar si el dueño
--   quiere enforcement).
-- Al ELIMINAR una tienda se limpia su id de rewards.store_ids.
-- ============================================================

-- ── 1) Tabla de tiendas asociadas ────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_stores (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  address    text,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_stores ENABLE ROW LEVEL SECURITY;

-- Gotcha del proyecto: los event triggers ensure_rls/auto_enable_rls
-- agregan una policy RESTRICTIVA "Deny all by default" a toda tabla
-- nueva — anula las permisivas de SELECT. Se dropea acá mismo.
DROP POLICY IF EXISTS "Deny all by default" ON public.partner_stores;

-- Lectura pública (es contenido del catálogo: nombres de tiendas donde
-- canjear); escritura SOLO por admin_write_catalog (SECURITY DEFINER).
CREATE POLICY "Public read partner stores" ON public.partner_stores
  FOR SELECT USING (true);

GRANT SELECT ON public.partner_stores TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.partner_stores FROM anon, authenticated;

-- ── 2) Localizaciones del premio ─────────────────────────────
ALTER TABLE public.rewards
  ADD COLUMN IF NOT EXISTS station_ids uuid[],
  ADD COLUMN IF NOT EXISTS store_ids   uuid[];

COMMENT ON COLUMN public.rewards.station_ids IS
  'D17: estaciones donde el premio es canjeable. NULL junto a store_ids NULL = todas las estaciones.';
COMMENT ON COLUMN public.rewards.store_ids IS
  'D17: tiendas asociadas (partner_stores) donde el premio es canjeable.';

-- ── 3) Helper: jsonb array → uuid[] (vacío → NULL) ───────────
CREATE OR REPLACE FUNCTION public.jsonb_uuid_array(j jsonb)
RETURNS uuid[]
LANGUAGE sql IMMUTABLE
AS $$
  SELECT NULLIF(ARRAY(SELECT jsonb_array_elements_text(j)::uuid), ARRAY[]::uuid[]);
$$;

REVOKE ALL ON FUNCTION public.jsonb_uuid_array(jsonb) FROM PUBLIC, anon, authenticated;

-- ── 4) admin_write_catalog: entidad 'store' + localizaciones ─
-- Recreado desde la versión vigente (20260804b); cambios marcados D17/D18.
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

  -- D18: entidad 'store' (tiendas asociadas)
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
        -- D17: limpiar la tienda de las localizaciones de los premios
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
        -- D17: localizaciones (array vacío = NULL = todas las estaciones)
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

  -- D18: tiendas asociadas
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
-- VERIFICAR tras ejecutar:
--   1. SELECT * FROM partner_stores;  (vacía, legible con anon key)
--   2. SELECT polname FROM pg_policy WHERE polrelid = 'partner_stores'::regclass;
--      → solo "Public read partner stores" (sin "Deny all by default")
--   3. Crear tienda "Tienda Betel" desde Admin → Estaciones y Tiendas.
--   4. Editar un premio asignándole estaciones/tiendas → el catálogo
--      del cliente muestra "Válido en: …".
--   5. Eliminar una tienda usada por un premio → desaparece de la
--      localización del premio sin romperlo.
-- ============================================================

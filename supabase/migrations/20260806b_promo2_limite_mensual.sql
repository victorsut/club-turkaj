-- ============================================================
-- PROMO-2 (6-ago-2026) — LÍMITE MENSUAL POR CLIENTE en el motor
-- ============================================================
-- Cierre de PROMO-2: el motor ya cubría los lavados por consumo
-- como CAMPAÑAS (grant_reward + min_amount + fechas + tiers +
-- estaciones, operativo desde PROMO-1b). Lo único que no podía
-- expresar era un beneficio RECURRENTE ("1 lavado gratis al mes
-- para PLATINO/BLACK") porque max_uses_per_member es un tope
-- TOTAL de la regla, no por período.
--
-- Nuevo: promo_rules.max_uses_per_member_month — usos máximos por
-- cliente POR MES CALENDARIO (zona America/Guatemala, igual que la
-- evaluación de fechas del motor). NULL = sin límite mensual.
-- Ambos límites por cliente pueden convivir (mensual + total).
--
-- El conteo mira promo_applications.created_at → aplica a TODO
-- efecto (multiplicador, bonus o premio gratis) y a ambas vías
-- (app del operador y API PROPER) porque pick_best_promo es el
-- único punto de selección (register_purchase_core, F2.1).
-- ============================================================

-- ── 1) Columna + índice del conteo mensual ───────────────────
ALTER TABLE public.promo_rules
  ADD COLUMN IF NOT EXISTS max_uses_per_member_month integer;

CREATE INDEX IF NOT EXISTS idx_promo_apps_rule_member_created
  ON public.promo_applications (promo_rule_id, member_id, created_at);

-- ── 2) pick_best_promo: condición de límite mensual ──────────
CREATE OR REPLACE FUNCTION public.pick_best_promo(
  p_amount numeric, p_fuel_type text, p_station_id uuid,
  p_tier text, p_base_points integer, p_member_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today  date;
  v_dow    smallint;
  v_month0 timestamptz;
  v_result jsonb;
BEGIN
  -- Día calendario de GUATEMALA (now() es UTC).
  v_today := (now() AT TIME ZONE 'America/Guatemala')::date;
  v_dow   := EXTRACT(ISODOW FROM v_today)::smallint;  -- 1=lun … 7=dom
  -- Inicio del mes calendario GT expresado en UTC (promo_applications
  -- .created_at es timestamptz): las aplicaciones desde este instante
  -- cuentan para el límite mensual.
  v_month0 := date_trunc('month', now() AT TIME ZONE 'America/Guatemala')
              AT TIME ZONE 'America/Guatemala';

  SELECT jsonb_build_object(
           'rule_id',      c.id,
           'name',         c.name,
           'effect_type',  c.effect_type,
           'effect_value', c.effect_value,
           'extra_points', c.extra_points,
           'reward_id',    c.reward_id,
           'reward_name',  c.reward_name,
           'reward_icon',  c.reward_icon
         )
    INTO v_result
  FROM (
    SELECT r.id, r.name, r.effect_type, r.effect_value, r.created_at,
           rw.id AS reward_id, rw.name AS reward_name, rw.icon AS reward_icon,
           -- Puntos que efectivamente se suman (grant no suma puntos)
           CASE r.effect_type
             WHEN 'points_multiplier'
               THEN GREATEST(FLOOR(p_base_points * r.effect_value)::integer - p_base_points, 0)
             WHEN 'bonus_points'
               THEN GREATEST(FLOOR(r.effect_value)::integer, 0)
             ELSE 0
           END AS extra_points,
           -- Beneficio para la comparación sin stacking: los efectos
           -- de puntos valen sus puntos extra; el premio gratis vale
           -- su points_cost (valor del premio en puntos).
           CASE r.effect_type
             WHEN 'points_multiplier'
               THEN GREATEST(FLOOR(p_base_points * r.effect_value)::integer - p_base_points, 0)
             WHEN 'bonus_points'
               THEN GREATEST(FLOOR(r.effect_value)::integer, 0)
             WHEN 'grant_reward'
               THEN COALESCE(rw.points_cost, 0)
             ELSE 0
           END AS benefit
    FROM promo_rules r
    LEFT JOIN rewards rw
      ON rw.id = r.reward_id AND COALESCE(rw.active, true)
    WHERE r.active
      AND r.effect_type IN ('points_multiplier', 'bonus_points', 'grant_reward')
      -- grant_reward exige premio existente y activo HOY
      AND (r.effect_type <> 'grant_reward' OR rw.id IS NOT NULL)
      AND (r.starts_on IS NULL OR v_today >= r.starts_on)
      AND (r.ends_on   IS NULL OR v_today <= r.ends_on)
      AND (
        (r.weekdays IS NULL AND r.specific_dates IS NULL)
        OR (r.weekdays       IS NOT NULL AND v_dow   = ANY (r.weekdays))
        OR (r.specific_dates IS NOT NULL AND v_today = ANY (r.specific_dates))
      )
      AND (r.fuel_types  IS NULL OR p_fuel_type  = ANY (r.fuel_types))
      AND (r.min_amount  IS NULL OR p_amount    >= r.min_amount)
      AND (r.tiers       IS NULL OR p_tier       = ANY (r.tiers))
      AND (r.station_ids IS NULL OR p_station_id = ANY (r.station_ids))
      AND (r.max_uses_total IS NULL OR
           (SELECT count(*) FROM promo_applications a
             WHERE a.promo_rule_id = r.id) < r.max_uses_total)
      AND (r.max_uses_per_member IS NULL OR p_member_id IS NULL OR
           (SELECT count(*) FROM promo_applications a
             WHERE a.promo_rule_id = r.id
               AND a.member_id = p_member_id) < r.max_uses_per_member)
      -- PROMO-2: límite por cliente POR MES calendario (GT)
      AND (r.max_uses_per_member_month IS NULL OR p_member_id IS NULL OR
           (SELECT count(*) FROM promo_applications a
             WHERE a.promo_rule_id = r.id
               AND a.member_id = p_member_id
               AND a.created_at >= v_month0) < r.max_uses_per_member_month)
  ) c
  WHERE c.benefit > 0
  -- SIN STACKING: gana el mayor beneficio; empate → la más antigua.
  ORDER BY c.benefit DESC, c.created_at ASC
  LIMIT 1;

  RETURN v_result;  -- NULL si ninguna regla aplica
END;
$$;

-- ── 3) manage_promo_rule: whitelist + validación del campo ───
CREATE OR REPLACE FUNCTION public.manage_promo_rule(
  p_action text, p_admin_id uuid, p_admin_name text, p_admin_email text,
  p_reason_text text, p_rule_id uuid DEFAULT NULL::uuid,
  p_rule jsonb DEFAULT NULL::jsonb, p_session_token text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_key_whitelist text[] := ARRAY[
    'name', 'description', 'starts_on', 'ends_on', 'weekdays',
    'specific_dates', 'fuel_types', 'min_amount', 'tiers',
    'station_ids', 'effect_type', 'effect_value', 'reward_id',
    'max_uses_total', 'max_uses_per_member', 'max_uses_per_member_month',
    'active'
  ];
  v_key            text;
  v_old            public.promo_rules%ROWTYPE;
  v_new            public.promo_rules%ROWTYPE;
  v_uses           bigint;
  v_log_id         uuid;
  v_name           text;
  v_description    text;
  v_starts_on      date;
  v_ends_on        date;
  v_weekdays       smallint[];
  v_specific_dates date[];
  v_fuel_types     text[];
  v_min_amount     numeric;
  v_tiers          text[];
  v_station_ids    uuid[];
  v_effect_type    text;
  v_effect_value   numeric;
  v_reward_id      uuid;
  v_max_total      integer;
  v_max_member     integer;
  v_max_member_mo  integer;
  v_active         boolean;
BEGIN
  -- (1) Sesión admin STRICT (RAISE 28000 si falta/inválida/expirada).
  PERFORM public.validate_session_token(
    p_session_token, 'admin', 'manage_promo_rule', false, NULL
  );

  -- (2) Validaciones comunes.
  IF p_action IS NULL OR p_action NOT IN ('create', 'update', 'toggle', 'delete') THEN
    RAISE EXCEPTION 'Acción "%" no permitida (create, update, toggle, delete)', p_action
      USING ERRCODE = '22023';
  END IF;
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es obligatorio' USING ERRCODE = '22023';
  END IF;
  IF p_reason_text IS NULL OR trim(p_reason_text) = '' THEN
    RAISE EXCEPTION 'reason_text es obligatorio' USING ERRCODE = '22023';
  END IF;
  IF p_action <> 'create' THEN
    IF p_rule_id IS NULL THEN
      RAISE EXCEPTION 'rule_id es obligatorio para %', p_action USING ERRCODE = '22023';
    END IF;
    SELECT * INTO v_old FROM public.promo_rules WHERE id = p_rule_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Regla % no existe', p_rule_id USING ERRCODE = '22023';
    END IF;
  END IF;

  -- (3) create/update: parsear y validar p_rule completo.
  IF p_action IN ('create', 'update') THEN
    IF p_rule IS NULL OR jsonb_typeof(p_rule) <> 'object' THEN
      RAISE EXCEPTION 'rule debe ser un objeto JSON' USING ERRCODE = '22023';
    END IF;
    FOR v_key IN SELECT jsonb_object_keys(p_rule) LOOP
      IF NOT (v_key = ANY (v_key_whitelist)) THEN
        RAISE EXCEPTION 'Campo "%" no permitido en rule', v_key USING ERRCODE = '22023';
      END IF;
    END LOOP;

    -- Nombre (aparece en activity_log y comprobantes)
    v_name := trim(p_rule->>'name');
    IF v_name IS NULL OR length(v_name) < 3 OR length(v_name) > 60 THEN
      RAISE EXCEPTION 'name es obligatorio (3-60 caracteres)' USING ERRCODE = '22023';
    END IF;
    v_description := NULLIF(trim(COALESCE(p_rule->>'description', '')), '');

    -- Efecto (PROMO-1b: grant_reward habilitado)
    v_effect_type := p_rule->>'effect_type';
    IF v_effect_type IS NULL OR v_effect_type NOT IN ('points_multiplier', 'bonus_points', 'grant_reward') THEN
      RAISE EXCEPTION 'effect_type debe ser points_multiplier, bonus_points o grant_reward' USING ERRCODE = '22023';
    END IF;
    IF v_effect_type = 'grant_reward' THEN
      v_effect_value := NULL;
      v_reward_id := (p_rule->>'reward_id')::uuid;
      IF v_reward_id IS NULL THEN
        RAISE EXCEPTION 'grant_reward requiere elegir un premio del catálogo' USING ERRCODE = '22023';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.rewards WHERE id = v_reward_id AND COALESCE(active, true)
      ) THEN
        RAISE EXCEPTION 'El premio elegido no existe o está inactivo' USING ERRCODE = '22023';
      END IF;
    ELSE
      v_reward_id := NULL;
      v_effect_value := (p_rule->>'effect_value')::numeric;
      IF v_effect_value IS NULL THEN
        RAISE EXCEPTION 'effect_value es obligatorio' USING ERRCODE = '22023';
      END IF;
      IF v_effect_type = 'points_multiplier' AND (v_effect_value <= 1 OR v_effect_value > 10) THEN
        RAISE EXCEPTION 'El multiplicador debe ser mayor a 1 y hasta 10 (ej: 2 = dobles puntos)' USING ERRCODE = '22023';
      END IF;
      IF v_effect_type = 'bonus_points' AND (v_effect_value < 1 OR v_effect_value > 10000) THEN
        RAISE EXCEPTION 'El bonus debe estar entre 1 y 10000 puntos' USING ERRCODE = '22023';
      END IF;
    END IF;

    -- Vigencia
    v_starts_on := (p_rule->>'starts_on')::date;
    v_ends_on   := (p_rule->>'ends_on')::date;
    IF v_starts_on IS NOT NULL AND v_ends_on IS NOT NULL AND v_ends_on < v_starts_on THEN
      RAISE EXCEPTION 'ends_on no puede ser anterior a starts_on' USING ERRCODE = '22023';
    END IF;

    -- Arrays (vacíos → NULL = sin restricción)
    IF p_rule ? 'weekdays' AND jsonb_typeof(p_rule->'weekdays') = 'array' THEN
      v_weekdays := ARRAY(SELECT jsonb_array_elements_text(p_rule->'weekdays')::smallint);
      IF array_length(v_weekdays, 1) IS NULL THEN v_weekdays := NULL; END IF;
      IF v_weekdays IS NOT NULL AND EXISTS (
        SELECT 1 FROM unnest(v_weekdays) d WHERE d < 1 OR d > 7
      ) THEN
        RAISE EXCEPTION 'weekdays debe contener valores ISO 1 (lunes) a 7 (domingo)' USING ERRCODE = '22023';
      END IF;
    END IF;

    IF p_rule ? 'specific_dates' AND jsonb_typeof(p_rule->'specific_dates') = 'array' THEN
      v_specific_dates := ARRAY(SELECT jsonb_array_elements_text(p_rule->'specific_dates')::date);
      IF array_length(v_specific_dates, 1) IS NULL THEN v_specific_dates := NULL; END IF;
    END IF;

    IF p_rule ? 'fuel_types' AND jsonb_typeof(p_rule->'fuel_types') = 'array' THEN
      v_fuel_types := ARRAY(SELECT jsonb_array_elements_text(p_rule->'fuel_types'));
      IF array_length(v_fuel_types, 1) IS NULL THEN v_fuel_types := NULL; END IF;
      IF v_fuel_types IS NOT NULL AND EXISTS (
        SELECT 1 FROM unnest(v_fuel_types) f WHERE f NOT IN ('super', 'regular', 'diesel')
      ) THEN
        RAISE EXCEPTION 'fuel_types solo admite super, regular, diesel' USING ERRCODE = '22023';
      END IF;
    END IF;

    IF p_rule ? 'tiers' AND jsonb_typeof(p_rule->'tiers') = 'array' THEN
      v_tiers := ARRAY(SELECT jsonb_array_elements_text(p_rule->'tiers'));
      IF array_length(v_tiers, 1) IS NULL THEN v_tiers := NULL; END IF;
      IF v_tiers IS NOT NULL AND EXISTS (
        SELECT 1 FROM unnest(v_tiers) t WHERE t NOT IN ('ORO', 'PLATINO', 'BLACK')
      ) THEN
        RAISE EXCEPTION 'tiers solo admite ORO, PLATINO, BLACK' USING ERRCODE = '22023';
      END IF;
    END IF;

    IF p_rule ? 'station_ids' AND jsonb_typeof(p_rule->'station_ids') = 'array' THEN
      v_station_ids := ARRAY(SELECT jsonb_array_elements_text(p_rule->'station_ids')::uuid);
      IF array_length(v_station_ids, 1) IS NULL THEN v_station_ids := NULL; END IF;
      IF v_station_ids IS NOT NULL AND EXISTS (
        SELECT 1 FROM unnest(v_station_ids) s
        WHERE NOT EXISTS (SELECT 1 FROM public.stations st WHERE st.id = s)
      ) THEN
        RAISE EXCEPTION 'station_ids contiene una estación inexistente' USING ERRCODE = '22023';
      END IF;
    END IF;

    -- Numéricos opcionales
    v_min_amount := (p_rule->>'min_amount')::numeric;
    IF v_min_amount IS NOT NULL AND v_min_amount <= 0 THEN
      RAISE EXCEPTION 'min_amount debe ser mayor a 0' USING ERRCODE = '22023';
    END IF;
    v_max_total     := (p_rule->>'max_uses_total')::integer;
    v_max_member    := (p_rule->>'max_uses_per_member')::integer;
    v_max_member_mo := (p_rule->>'max_uses_per_member_month')::integer;
    IF (v_max_total IS NOT NULL AND v_max_total < 1)
       OR (v_max_member IS NOT NULL AND v_max_member < 1)
       OR (v_max_member_mo IS NOT NULL AND v_max_member_mo < 1) THEN
      RAISE EXCEPTION 'Los límites de uso deben ser al menos 1' USING ERRCODE = '22023';
    END IF;

    v_active := COALESCE((p_rule->>'active')::boolean, true);
  END IF;

  -- (4) Ejecutar la acción + auditoría atómica.
  IF p_action = 'create' THEN
    INSERT INTO public.promo_rules (
      name, description, starts_on, ends_on, weekdays, specific_dates,
      fuel_types, min_amount, tiers, station_ids,
      effect_type, effect_value, reward_id,
      max_uses_total, max_uses_per_member, max_uses_per_member_month, active
    )
    VALUES (
      v_name, v_description, v_starts_on, v_ends_on, v_weekdays, v_specific_dates,
      v_fuel_types, v_min_amount, v_tiers, v_station_ids,
      v_effect_type, v_effect_value, v_reward_id,
      v_max_total, v_max_member, v_max_member_mo, v_active
    )
    RETURNING * INTO v_new;

    v_log_id := public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => 'create_promo_rule',
      p_entity_type => 'promo_rule',
      p_entity_id   => v_new.id::text,
      p_reason_text => p_reason_text,
      p_old_value   => NULL,
      p_new_value   => to_jsonb(v_new)
    );

  ELSIF p_action = 'update' THEN
    UPDATE public.promo_rules SET
      name                      = v_name,
      description               = v_description,
      starts_on                 = v_starts_on,
      ends_on                   = v_ends_on,
      weekdays                  = v_weekdays,
      specific_dates            = v_specific_dates,
      fuel_types                = v_fuel_types,
      min_amount                = v_min_amount,
      tiers                     = v_tiers,
      station_ids               = v_station_ids,
      effect_type               = v_effect_type,
      effect_value              = v_effect_value,
      reward_id                 = v_reward_id,
      max_uses_total            = v_max_total,
      max_uses_per_member       = v_max_member,
      max_uses_per_member_month = v_max_member_mo,
      active                    = v_active,
      updated_at                = now()
    WHERE id = p_rule_id
    RETURNING * INTO v_new;

    v_log_id := public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => 'update_promo_rule',
      p_entity_type => 'promo_rule',
      p_entity_id   => p_rule_id::text,
      p_reason_text => p_reason_text,
      p_old_value   => to_jsonb(v_old),
      p_new_value   => to_jsonb(v_new)
    );

  ELSIF p_action = 'toggle' THEN
    UPDATE public.promo_rules SET
      active     = NOT v_old.active,
      updated_at = now()
    WHERE id = p_rule_id
    RETURNING * INTO v_new;

    v_log_id := public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => 'toggle_promo_rule_active',
      p_entity_type => 'promo_rule',
      p_entity_id   => p_rule_id::text,
      p_reason_text => p_reason_text,
      p_old_value   => jsonb_build_object('active', v_old.active),
      p_new_value   => jsonb_build_object('active', v_new.active)
    );

  ELSIF p_action = 'delete' THEN
    SELECT count(*) INTO v_uses
    FROM public.promo_applications WHERE promo_rule_id = p_rule_id;
    IF v_uses > 0 THEN
      RAISE EXCEPTION 'La regla tiene % uso(s) registrados y no puede borrarse — desactivala en su lugar', v_uses
        USING ERRCODE = '22023';
    END IF;

    DELETE FROM public.promo_rules WHERE id = p_rule_id;

    v_log_id := public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => 'delete_promo_rule',
      p_entity_type => 'promo_rule',
      p_entity_id   => p_rule_id::text,
      p_reason_text => p_reason_text,
      p_old_value   => to_jsonb(v_old),
      p_new_value   => NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'ok',     true,
    'action', p_action,
    'log_id', v_log_id,
    'rule',   CASE WHEN p_action = 'delete' THEN NULL ELSE to_jsonb(v_new) END
  );
END;
$$;

-- ============================================================
-- VERIFICAR tras ejecutar:
--   1. Crear regla "Lavado mensual" (grant_reward + tiers PLATINO/
--      BLACK + estaciones II/III + máx 1 x cliente/mes) desde el
--      panel — debe guardar sin error.
--   2. Una compra que cumpla la otorga; la SEGUNDA compra del mismo
--      cliente en el mes ya no (la regla no aplica); el mes
--      siguiente vuelve a aplicar.
--   3. El simulador del panel sigue funcionando (preview_promo usa
--      pick_best_promo con member NULL → ignora límites por cliente).
-- ============================================================

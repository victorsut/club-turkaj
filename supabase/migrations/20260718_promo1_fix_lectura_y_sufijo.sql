-- ============================================================
-- Puntos Plus — PROMO-1 fix post-smoke: lectura de reglas + sufijo corto
-- ============================================================
-- Feedback del smoke del dueño (18-jul):
--
-- (1) LISTA DE REGLAS VACÍA AL VOLVER A LA VISTA. Causa raíz: el
--     proyecto tiene event triggers (ensure_rls / trg_auto_enable_rls,
--     ddl_command_end) que al crear CUALQUIER tabla le agregan una
--     policy RESTRICTIVA "Deny all by default" (USING false). Una
--     policy restrictiva se AND-ea con las permisivas → anula la
--     promo_rules_select_all (SELECT USING true) de la migración
--     PROMO-1. Por eso los RPCs funcionaban (SECURITY DEFINER corre
--     como owner y salta RLS) pero el SELECT del cliente (anon)
--     devolvía [] — la vista solo mostraba las reglas que tenía en
--     memoria de la sesión.
--     FIX: dropear la restrictiva en promo_rules y promo_applications.
--     La escritura SIGUE cerrada: sin policies de INSERT/UPDATE/DELETE
--     el default de RLS es denegar; el único punto de escritura sigue
--     siendo manage_promo_rule / register_purchase (DEFINER).
--     Los event triggers solo disparan en CREATE TABLE → la policy no
--     se re-crea sola para estas tablas.
--
-- (2) SUFIJO ILEGIBLE EN EL HISTORIAL. "🎉 Dobles puntos (+16 extra)"
--     no cabe en la fila del historial del cliente. Se abrevia
--     (decisión del dueño: "x2 da a entender la promoción"):
--       multiplicador → ' · 🎉 x2 (+16)'
--       bonus fijo    → ' · 🎉 +50'
--     Se recrea register_purchase (CREATE OR REPLACE, sin DROP →
--     grants preservados) cambiando SOLO la construcción de
--     v_promo_suffix. También se acortan las filas ya escritas por
--     el smoke con el formato largo.
--
-- REVERT copy-paste:
--   -- (la policy restrictiva original, si se quisiera volver atrás)
--   CREATE POLICY "Deny all by default" ON public.promo_rules
--     AS RESTRICTIVE FOR ALL USING (false);
--   CREATE POLICY "Deny all by default" ON public.promo_applications
--     AS RESTRICTIVE FOR ALL USING (false);
--   -- register_purchase: re-ejecutar el bloque 4 de
--   -- 20260718_promo1_motor_promociones.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Dropear la policy restrictiva que anula la lectura
-- ============================================================
DROP POLICY IF EXISTS "Deny all by default" ON public.promo_rules;
DROP POLICY IF EXISTS "Deny all by default" ON public.promo_applications;

-- ============================================================
-- 2. register_purchase — sufijo compacto en activity_log
-- ============================================================
-- Cuerpo byte-idéntico al de 20260718_promo1_motor_promociones.sql
-- salvo el bloque que arma v_promo_suffix.
CREATE OR REPLACE FUNCTION public.register_purchase(p_member_id uuid, p_operator_id uuid, p_station_id uuid, p_amount numeric, p_fuel_type text, p_invoice_no text DEFAULT NULL::text, p_session_token text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_fuel_prices  jsonb;
  v_fuel_price   numeric;
  v_gallons      numeric;
  v_points       integer;
  v_q_per_pt     integer;
  v_purchase_id  uuid;
  v_old_gallons  numeric;
  v_new_gallons  numeric;
  v_old_tier     text;
  v_new_tier     text;
  v_card_id      uuid;
  v_old_code     text;
  v_new_code     text;
  v_correlative  text;
  v_tier_prefix  text;
  v_session_role_id uuid;
  -- PROMO-1
  v_promo        jsonb;
  v_extra        integer := 0;
  v_points_final integer;
  v_promo_suffix text := '';
BEGIN
  -- SEC.B.6.1: validación de sesión (strict desde B.8.1 — RAISE 28000).
  v_session_role_id := public.validate_session_token(
    p_session_token, 'operator', 'register_purchase', false,
    jsonb_build_object('member_id', p_member_id, 'operator_id', p_operator_id, 'station_id', p_station_id)
  );

  -- Validar input
  IF p_amount IS NULL OR p_amount < 10 THEN
    RETURN jsonb_build_object('error', 'Mínimo Q10');
  END IF;

  -- Leer precios de combustible desde config
  SELECT value INTO v_fuel_prices
  FROM program_config WHERE key = 'fuel_prices';

  IF v_fuel_prices IS NULL THEN
    v_fuel_prices := '{"super": 31.49, "regular": 30.99, "diesel": 28.99}'::jsonb;
  END IF;

  v_fuel_price := COALESCE(
    (v_fuel_prices->>p_fuel_type)::numeric,
    (v_fuel_prices->>'regular')::numeric
  );

  v_gallons := ROUND(p_amount / v_fuel_price, 2);

  SELECT (value->>'qPerPt')::integer INTO v_q_per_pt
  FROM program_config WHERE key = 'general';
  IF v_q_per_pt IS NULL OR v_q_per_pt = 0 THEN
    v_q_per_pt := 10;
  END IF;

  v_points := FLOOR(p_amount / v_q_per_pt);

  SELECT gallons, card_id INTO v_old_gallons, v_card_id
  FROM members WHERE id = p_member_id;

  IF v_old_gallons IS NULL THEN
    RETURN jsonb_build_object('error', 'Miembro no encontrado');
  END IF;

  v_new_gallons := v_old_gallons + v_gallons;
  v_old_tier := public.get_member_tier(v_old_gallons);
  v_new_tier := public.get_member_tier(v_new_gallons);

  -- ── PROMO-1: elegir la promo de mayor beneficio (sin stacking).
  --    Usa el tier PREVIO a la compra. El bono de special_days es
  --    independiente y no pasa por acá. ──
  v_promo := public.pick_best_promo(
    p_amount, p_fuel_type, p_station_id, v_old_tier, v_points, p_member_id
  );
  IF v_promo IS NOT NULL THEN
    v_extra := (v_promo->>'extra_points')::integer;
    -- Sufijo COMPACTO para el historial (fix post-smoke 18-jul): el
    -- nombre completo de la regla no cabe en la fila del historial.
    -- 'x2' comunica el multiplicador; el detalle completo vive en
    -- promo_applications y en el modal del cliente.
    IF v_promo->>'effect_type' = 'points_multiplier' THEN
      v_promo_suffix := ' · 🎉 x' || (v_promo->>'effect_value') || ' (+' || v_extra || ')';
    ELSE
      v_promo_suffix := ' · 🎉 +' || v_extra;
    END IF;
  END IF;
  v_points_final := v_points + v_extra;

  INSERT INTO purchases (
    member_id, operator_id, station_id,
    amount, fuel_type, gallons, points_earned, invoice_no
  )
  VALUES (
    p_member_id, p_operator_id, p_station_id,
    p_amount, p_fuel_type, v_gallons, v_points_final, p_invoice_no
  )
  RETURNING id INTO v_purchase_id;

  -- ── PROMO-1: trazabilidad (desglose base/final + snapshot del efecto) ──
  IF v_promo IS NOT NULL THEN
    INSERT INTO promo_applications (
      promo_rule_id, member_id, purchase_id,
      points_base, points_final, effect
    )
    VALUES (
      (v_promo->>'rule_id')::uuid, p_member_id, v_purchase_id,
      v_points, v_points_final,
      jsonb_build_object(
        'type',         v_promo->>'effect_type',
        'value',        (v_promo->>'effect_value')::numeric,
        'extra_points', v_extra
      )
    );
  END IF;

  -- Autoriza el trigger BEFORE UPDATE de FB.7 (cuando exista).
  PERFORM set_config('app.allow_points_write', 'true', true);

  UPDATE members SET
    points  = points + v_points_final,
    gallons = gallons + v_gallons,
    spent   = spent + p_amount,
    visits  = visits + 1,
    last_buy = now(),
    last_operator_id = p_operator_id,
    updated_at = now()
  WHERE id = p_member_id;

  INSERT INTO activity_log (
    member_id, activity_type, description, points_change, amount, station_id
  )
  VALUES (
    p_member_id, 'compra',
    'Compra ' || v_gallons || ' gal ' || p_fuel_type || ' · Q' || p_amount || v_promo_suffix,
    v_points_final, p_amount, p_station_id
  );

  IF v_old_tier <> v_new_tier AND v_card_id IS NOT NULL THEN
    SELECT card_code INTO v_old_code
    FROM physical_cards WHERE id = v_card_id;

    v_correlative := substring(v_old_code FROM '\d+$');

    IF v_correlative IS NOT NULL THEN
      v_tier_prefix := CASE v_new_tier
        WHEN 'ORO'     THEN 'CTOD'
        WHEN 'PLATINO' THEN 'CTPD'
        WHEN 'BLACK'   THEN 'CTBD'
        ELSE 'CTOD'
      END;

      v_new_code := v_tier_prefix || '-' || v_correlative;

      UPDATE physical_cards
      SET card_code = v_new_code,
          tier = v_new_tier,
          updated_at = now()
      WHERE id = v_card_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'purchase_id',   v_purchase_id,
    'points',        v_points_final,   -- FINALES (base + extra): la UI existente los muestra sin cambios
    'points_base',   v_points,
    'gallons',       v_gallons,
    'tier_changed',  v_old_tier <> v_new_tier,
    'old_tier',      v_old_tier,
    'new_tier',      v_new_tier,
    'new_card_code', v_new_code,
    'promo',         v_promo           -- NULL o {rule_id, name, effect_type, effect_value, extra_points}
  );
END;
$function$;

-- ============================================================
-- 3. Acortar las filas del smoke ya escritas con el formato largo
-- ============================================================
-- Solo aplica al patrón exacto de la regla "Dobles puntos" (x2) del
-- smoke del 18-jul. Las filas futuras ya nacen cortas.
UPDATE activity_log
SET description = regexp_replace(
  description,
  ' · 🎉 Dobles puntos \(\+(\d+) extra\)$',
  ' · 🎉 x2 (+\1)'
)
WHERE activity_type = 'compra'
  AND description ~ ' · 🎉 Dobles puntos \(\+\d+ extra\)$';

COMMIT;

-- ============================================================
-- VERIFICACIÓN POST-APLICACIÓN (correr a mano en el SQL Editor):
--
--   SELECT c.relname, p.polname, p.polpermissive
--   FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
--   WHERE c.relname IN ('promo_rules', 'promo_applications');
--   -- esperado: SOLO las policies *_select_all (permissive = true);
--   -- "Deny all by default" ya no debe aparecer.
-- ============================================================

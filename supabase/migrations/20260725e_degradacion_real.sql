-- ============================================================
-- 20260725e — Degradación por inactividad REAL (algoritmo del dueño)
-- ============================================================
-- Bug reportado (25-jul-2026): la degradación NUNCA se ejecutaba —
-- solo existían los textos de las reglas y un aviso; el nivel deriva
-- de members.gallons y nada los tocaba.
--
-- Algoritmo firmado por el dueño (25-jul-2026):
--   · ACTIVIDAD que reinicia el contador: compra de combustible,
--     encuesta completada, compra de boletos de rifa, canje creado y
--     uso (entrega) de un canje pendiente. Fuente: activity_log +
--     members.last_buy.
--   · 15 días de gracia desde la última actividad.
--   · Día 1 de degradación (día 16 de inactividad): los galones caen
--     a UMBRAL − 1 ("rozando el límite superior" — una compra lo
--     recupera). Día 2: umbral − 3 (1+2). Día 3: −6 (3+3). Día n:
--     − n(n+1)/2 (números triangulares, "total anterior + día").
--   · BLACK: días 16–30 desciende desde el umbral 500 (queda PLATINO
--     desde el día 1). Al pasar 15 días de descenso (día 31), baja a
--     ORO con la misma lógica desde el umbral 150, hasta consumir o
--     llegar a 0.
--   · PLATINO: desde el día 16 desciende desde el umbral 150 (queda
--     ORO desde el día 1 de descenso), hasta consumir o llegar a 0.
--   · Reinicio TOTAL (puntos y galones en 0) a los 45 días de haber
--     descendido a ORO: BLACK → día 75 de inactividad; PLATINO →
--     día 60; ORO nativo → día 45.
--
-- INTERRUPTOR (lanzamiento oficial): el motor nace APAGADO
-- (program_config 'degradation_enabled'). Se enciende desde Admin →
-- Configuración vía set_degradation_enabled (auditado). Al activarlo
-- se estampa enabled_at y el contador de TODOS cuenta desde
-- GREATEST(última actividad, enabled_at) → nadie arrastra inactividad
-- previa al encendido (protege las cuentas viejas). Re-activar
-- vuelve a estampar enabled_at (reinicio limpio).
--
-- Motor: RPC perezoso (patrón draw_due_raffles) que corre en cada
-- apertura de la app ANTES de leer members. Idempotente: los galones
-- objetivo son función PURA de (tier de origen, días de inactividad);
-- FOR UPDATE SKIP LOCKED evita carreras entre aperturas simultáneas.
--
-- Estado por miembro:
--   · degrade_base_gal: galones al iniciar el ciclo (tier de ORIGEN).
--   · degrade_stage: 0 activo · 1 bajó BLACK→PLATINO · 2 bajó a ORO
--     · 3 reiniciado. Controla los registros en activity_log (una
--     vez por transición) y la idempotencia del reinicio.
--   · Actividad posterior (días < 16 en el siguiente barrido) → el
--     ciclo se cierra (stage 0, base NULL) sin tocar otras RPCs.
-- ============================================================

ALTER TABLE members ADD COLUMN IF NOT EXISTS degrade_stage smallint NOT NULL DEFAULT 0;
ALTER TABLE members ADD COLUMN IF NOT EXISTS degrade_base_gal numeric;

COMMENT ON COLUMN members.degrade_stage IS
'Etapa de degradación por inactividad: 0 activo · 1 bajó BLACK→PLATINO · 2 bajó a ORO · 3 cuenta reiniciada. Se limpia al volver a tener actividad.';
COMMENT ON COLUMN members.degrade_base_gal IS
'Galones al iniciar el ciclo de degradación (tier de origen). NULL = sin ciclo activo.';

-- Interruptor: nace APAGADO (se enciende en el lanzamiento oficial).
INSERT INTO program_config (key, value)
VALUES ('degradation_enabled', '{"enabled": false, "enabled_at": null}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.apply_due_degradations()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cfg       jsonb;
  v_enabled_at timestamptz;
  v_black_gal numeric := 500;
  v_plat_gal  numeric := 150;
  r           RECORD;
  v_ref       timestamptz;
  v_days      integer;
  v_base      numeric;
  v_base_tier text;
  v_target    numeric;
  v_stage     smallint;
  v_new_stage smallint;
  v_k         integer;
  v_reset_at  integer;
  v_processed integer := 0;
  v_changed   integer := 0;
BEGIN
  -- ── Interruptor: sin activar, el motor es un no-op ──
  SELECT value INTO v_cfg FROM program_config WHERE key = 'degradation_enabled';
  IF v_cfg IS NULL OR COALESCE((v_cfg ->> 'enabled')::boolean, false) IS NOT TRUE THEN
    RETURN jsonb_build_object('enabled', false);
  END IF;
  v_enabled_at := COALESCE((v_cfg ->> 'enabled_at')::timestamptz, now());

  -- Los primeros 15 días tras el encendido nada puede degradar
  -- (el contador de todos arranca, como mínimo, en enabled_at).
  IF now() - v_enabled_at <= interval '15 days' THEN
    RETURN jsonb_build_object('enabled', true, 'processed', 0, 'changed', 0);
  END IF;

  SELECT COALESCE((value -> 'black'   ->> 'gal')::numeric, 500),
         COALESCE((value -> 'platino' ->> 'gal')::numeric, 150)
    INTO v_black_gal, v_plat_gal
  FROM program_config WHERE key = 'tiers';

  -- Autoriza el trigger BEFORE UPDATE de FB.7 (guard de points).
  PERFORM set_config('app.allow_points_write', 'true', true);

  FOR r IN
    SELECT id, points, gallons, degrade_stage, degrade_base_gal, last_buy, created_at
    FROM members
    FOR UPDATE SKIP LOCKED
  LOOP
    v_processed := v_processed + 1;

    -- Última ACTIVIDAD del miembro: compra (last_buy) o cualquier
    -- acción del cliente en activity_log — encuesta, canje creado,
    -- entrega de canje, compra de boletos ('rifa' con puntos
    -- negativos: excluye el premio del sorteo, que es pasivo).
    -- Piso: enabled_at (nadie arrastra inactividad previa al motor).
    SELECT GREATEST(
      COALESCE(r.last_buy, r.created_at),
      COALESCE((
        SELECT max(created_at) FROM activity_log
        WHERE member_id = r.id
          AND (activity_type IN ('compra', 'encuesta', 'canje', 'entrega')
               OR (activity_type = 'rifa' AND COALESCE(points_change, 0) < 0))
      ), '-infinity'::timestamptz),
      v_enabled_at
    ) INTO v_ref;

    v_days := floor(extract(epoch FROM (now() - v_ref)) / 86400)::integer;

    -- Tuvo actividad reciente: cerrar el ciclo si estaba abierto.
    IF v_days < 16 THEN
      IF r.degrade_stage > 0 OR r.degrade_base_gal IS NOT NULL THEN
        UPDATE members SET degrade_stage = 0, degrade_base_gal = NULL, updated_at = now()
        WHERE id = r.id;
      END IF;
      CONTINUE;
    END IF;

    v_base  := COALESCE(r.degrade_base_gal, r.gallons);
    v_stage := r.degrade_stage;
    v_base_tier := CASE WHEN v_base >= v_black_gal THEN 'BLACK'
                        WHEN v_base >= v_plat_gal  THEN 'PLATINO'
                        ELSE 'ORO' END;
    v_reset_at := CASE v_base_tier WHEN 'BLACK' THEN 75 WHEN 'PLATINO' THEN 60 ELSE 45 END;

    IF v_days >= v_reset_at THEN
      v_target := 0;
      v_new_stage := 3;
    ELSIF v_base_tier = 'BLACK' THEN
      IF v_days >= 31 THEN
        -- Segunda fase: descenso a ORO desde el umbral PLATINO (150)
        v_k := v_days - 30;
        v_target := GREATEST(v_plat_gal - (v_k * (v_k + 1) / 2), 0);
        v_new_stage := GREATEST(v_stage, 2);
      ELSE
        -- Primera fase: descenso desde el umbral BLACK (500)
        v_k := v_days - 15;
        v_target := GREATEST(v_black_gal - (v_k * (v_k + 1) / 2), v_plat_gal);
        v_new_stage := GREATEST(v_stage, 1);
      END IF;
    ELSIF v_base_tier = 'PLATINO' THEN
      v_k := v_days - 15;
      v_target := GREATEST(v_plat_gal - (v_k * (v_k + 1) / 2), 0);
      v_new_stage := GREATEST(v_stage, 2);
    ELSE
      -- ORO nativo: no hay nivel que bajar; solo el reinicio de los 45.
      v_target := r.gallons;
      v_new_stage := v_stage;
    END IF;

    -- ── Reinicio total (una sola vez) ──
    IF v_new_stage = 3 AND v_stage < 3 THEN
      UPDATE members SET
        points = 0, gallons = 0, degrade_stage = 3,
        degrade_base_gal = v_base, updated_at = now()
      WHERE id = r.id;
      INSERT INTO activity_log (member_id, activity_type, description, points_change)
      VALUES (r.id, 'degradacion',
        'Cuenta reiniciada por inactividad: puntos y galones en 0', -r.points);
      v_changed := v_changed + 1;
      CONTINUE;
    END IF;
    IF v_stage >= 3 THEN CONTINUE; END IF; -- ya reiniciado, nada más que hacer

    -- ── Descenso diario + transiciones de nivel ──
    IF v_new_stage <> v_stage OR v_target <> r.gallons OR r.degrade_base_gal IS NULL THEN
      UPDATE members SET
        gallons = v_target, degrade_stage = v_new_stage,
        degrade_base_gal = v_base, updated_at = now()
      WHERE id = r.id;
      v_changed := v_changed + 1;

      IF v_base_tier = 'BLACK' AND v_new_stage >= 1 AND v_stage < 1 THEN
        INSERT INTO activity_log (member_id, activity_type, description, points_change)
        VALUES (r.id, 'degradacion', 'Nivel degradado por inactividad: BLACK → PLATINO', 0);
      END IF;
      IF v_new_stage >= 2 AND v_stage < 2 THEN
        INSERT INTO activity_log (member_id, activity_type, description, points_change)
        VALUES (r.id, 'degradacion', 'Nivel degradado por inactividad: ahora estás en ORO', 0);
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('enabled', true, 'processed', v_processed, 'changed', v_changed);
END;
$function$;

COMMENT ON FUNCTION public.apply_due_degradations() IS
'Degradación perezosa por inactividad (corre al abrir la app, idempotente).
No-op mientras program_config degradation_enabled esté apagado. Actividad =
compra, encuesta, canje, entrega o compra de boletos; el contador cuenta
desde GREATEST(última actividad, enabled_at). 15 días de gracia; luego los
galones caen a UMBRAL − n(n+1)/2 por día ("rozando el límite" el día 1).
BLACK: 500→ desde día 16, 150→ desde día 31; PLATINO: 150→ desde día 16.
Reinicio total 45 días después de caer a ORO (BLACK d75 · PLATINO d60 ·
ORO d45).';

-- ── Interruptor auditado (program_config es solo-lectura para el
--    cliente — el toggle del admin pasa por acá) ──
CREATE OR REPLACE FUNCTION public.set_degradation_enabled(
  p_enabled boolean,
  p_admin_id uuid,
  p_admin_name text,
  p_admin_email text,
  p_reason_text text DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_old   jsonb;
  v_value jsonb;
BEGIN
  IF p_enabled IS NULL THEN
    RAISE EXCEPTION 'enabled es obligatorio' USING ERRCODE = '22023';
  END IF;
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es obligatorio' USING ERRCODE = '22023';
  END IF;

  SELECT value INTO v_old FROM program_config WHERE key = 'degradation_enabled';

  -- Encender estampa enabled_at = ahora (contador limpio para todos);
  -- apagar conserva el enabled_at histórico (irrelevante mientras esté off).
  v_value := jsonb_build_object(
    'enabled', p_enabled,
    'enabled_at', CASE WHEN p_enabled THEN to_jsonb(now())
                       ELSE COALESCE(v_old -> 'enabled_at', 'null'::jsonb) END
  );

  INSERT INTO program_config (key, value) VALUES ('degradation_enabled', v_value)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  PERFORM public.log_admin_action(
    p_admin_id    => p_admin_id,
    p_admin_name  => p_admin_name,
    p_admin_email => p_admin_email,
    p_action      => CASE WHEN p_enabled THEN 'enable_degradation' ELSE 'disable_degradation' END,
    p_entity_type => 'config',
    p_entity_id   => 'degradation_enabled',
    p_reason_text => p_reason_text,
    p_old_value   => v_old,
    p_new_value   => v_value
  );

  RETURN v_value;
END;
$function$;

-- ── Textos de reglas mostrados en la app (Ajustes/Menú/Reglas) ──
UPDATE program_config SET value = '[
  {"tier":"BLACK","rules":[
    {"days":15,"effect":"Baja a PLATINO y pierde galones cada día (−1, −3, −6…)"},
    {"days":30,"effect":"Baja a ORO y sigue perdiendo galones"},
    {"days":75,"effect":"Reinicio total: puntos y galones en 0"}]},
  {"tier":"PLATINO","rules":[
    {"days":15,"effect":"Baja a ORO y pierde galones cada día (−1, −3, −6…)"},
    {"days":60,"effect":"Reinicio total: puntos y galones en 0"}]},
  {"tier":"ORO","rules":[
    {"days":45,"effect":"Reinicio total: puntos y galones en 0"}]}
]'::jsonb
WHERE key = 'degradation';

-- ============================================================
-- ANÁLISIS (8-ago-2026) — RPCs report_* para el grupo "Análisis"
-- del panel de administrador (Clientes / Operadores / Promos y
-- Rifas / Integridad).
-- ============================================================
-- Patrón común (mismo de get_station_top_members):
--   · Sesión de ADMIN obligatoria (validate_session_token).
--   · p_from/p_to en DÍA CALENDARIO DE GUATEMALA (created_at es
--     UTC); NULL = historial completo.
--   · Agregación 100% server-side con tope de filas — nunca se
--     manda purchases crudo al navegador.
-- Las consultas de INTEGRIDAD además registran cada ejecución en
-- la auditoría (log_admin_action, acción 'consulta_integridad')
-- porque son material de investigación interna.
-- ============================================================

-- ── Índices de apoyo (baratos; IF NOT EXISTS por si ya existen) ──
CREATE INDEX IF NOT EXISTS idx_purchases_operator
  ON public.purchases (operator_id);
CREATE INDEX IF NOT EXISTS idx_purchases_member_created
  ON public.purchases (member_id, created_at);
CREATE INDEX IF NOT EXISTS idx_operator_ratings_operator
  ON public.operator_ratings (operator_id, created_at);

-- ============================================================
-- 1. CLIENTES — consumo segmentado por dimensión
--    p_dim: age | muni | canton | vehicle | tier | fuel |
--           weekday | hour
--    Devuelve [{label, ord, members, purchases, gallons, amount,
--    points}]. 'Sin dato' agrupa a quienes no tienen el dato de
--    perfil (edad sin año, sin dirección, sin vehículo).
--    NOTA tier: es el nivel ACTUAL del miembro (members.gallons,
--    umbrales fijos 150/500 de la regla de negocio), no el nivel
--    que tenía al momento de cada compra.
--    NOTA vehicle: clasifica por el PRIMER vehículo del perfil.
-- ============================================================
CREATE OR REPLACE FUNCTION public.report_consumo_segmentos(
  p_session_token text,
  p_dim text,
  p_from date DEFAULT NULL,
  p_to   date DEFAULT NULL,
  p_station uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_out jsonb;
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'report_consumo_segmentos', false, NULL);

  IF p_dim NOT IN ('age','muni','canton','vehicle','tier','fuel','weekday','hour') THEN
    RETURN jsonb_build_object('error', 'Dimensión no soportada');
  END IF;
  IF p_from IS NOT NULL AND p_to IS NOT NULL AND p_to < p_from THEN
    RETURN jsonb_build_object('error', 'Rango de fechas inválido');
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.ord, r.gallons DESC), '[]'::jsonb)
  INTO v_out
  FROM (
    SELECT L.label,
           MIN(L.ord) AS ord,
           COUNT(DISTINCT p.member_id)::int AS members,
           COUNT(*)::int AS purchases,
           ROUND(SUM(p.gallons)::numeric, 1) AS gallons,
           ROUND(SUM(p.amount)::numeric, 0)  AS amount,
           COALESCE(SUM(p.points_earned), 0)::int AS points
    FROM purchases p
    JOIN members m ON m.id = p.member_id
    CROSS JOIN LATERAL (
      -- Edad aproximada por texto (birthday guarda 'YYYY-MM-DD' en
      -- registros nuevos y 'MM-DD' en antiguos — estos van a 'Sin
      -- dato'). Se evita ::date para que una fecha corrupta no
      -- reviente el reporte completo.
      SELECT CASE
        WHEN m.birthday ~ '^\d{4}-\d{2}-\d{2}' THEN
          EXTRACT(YEAR FROM CURRENT_DATE)::int - substring(m.birthday, 1, 4)::int
          - CASE WHEN substring(m.birthday, 6, 5) > to_char(CURRENT_DATE, 'MM-DD') THEN 1 ELSE 0 END
        ELSE NULL
      END AS age
    ) v
    CROSS JOIN LATERAL (
      SELECT
        CASE p_dim
          WHEN 'age' THEN CASE
            WHEN v.age IS NULL THEN 'Sin dato'
            WHEN v.age < 18 THEN 'Menor de 18'
            WHEN v.age <= 25 THEN '18–25'
            WHEN v.age <= 35 THEN '26–35'
            WHEN v.age <= 45 THEN '36–45'
            WHEN v.age <= 60 THEN '46–60'
            ELSE 'Más de 60'
          END
          WHEN 'muni'    THEN COALESCE(NULLIF(trim(m.address->>'muni'), ''), 'Sin dirección')
          WHEN 'canton'  THEN CASE
            WHEN NULLIF(trim(m.address->>'canton'), '') IS NULL THEN 'Sin dirección'
            ELSE (m.address->>'canton') || ' · ' || COALESCE(m.address->>'muni', '')
          END
          WHEN 'vehicle' THEN COALESCE(NULLIF(trim(m.vehicles->0->>'type'), ''), 'Sin vehículo')
          WHEN 'tier'    THEN CASE
            WHEN m.gallons >= 500 THEN 'BLACK'
            WHEN m.gallons >= 150 THEN 'PLATINO'
            ELSE 'ORO'
          END
          WHEN 'fuel'    THEN COALESCE(NULLIF(trim(p.fuel_type), ''), 'Sin dato')
          WHEN 'weekday' THEN (ARRAY['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'])
                               [EXTRACT(ISODOW FROM p.created_at AT TIME ZONE 'America/Guatemala')::int]
          WHEN 'hour'    THEN to_char(p.created_at AT TIME ZONE 'America/Guatemala', 'HH24"h"')
        END AS label,
        CASE p_dim
          WHEN 'age' THEN CASE
            WHEN v.age IS NULL THEN 99
            WHEN v.age < 18 THEN 0
            WHEN v.age <= 25 THEN 1
            WHEN v.age <= 35 THEN 2
            WHEN v.age <= 45 THEN 3
            WHEN v.age <= 60 THEN 4
            ELSE 5
          END
          WHEN 'tier'    THEN CASE WHEN m.gallons >= 500 THEN 0 WHEN m.gallons >= 150 THEN 1 ELSE 2 END
          WHEN 'weekday' THEN EXTRACT(ISODOW FROM p.created_at AT TIME ZONE 'America/Guatemala')::int
          WHEN 'hour'    THEN EXTRACT(HOUR   FROM p.created_at AT TIME ZONE 'America/Guatemala')::int
          ELSE 0
        END AS ord
    ) L
    WHERE (p_station IS NULL OR p.station_id = p_station)
      AND (p_from IS NULL OR (p.created_at AT TIME ZONE 'America/Guatemala')::date >= p_from)
      AND (p_to   IS NULL OR (p.created_at AT TIME ZONE 'America/Guatemala')::date <= p_to)
    GROUP BY L.label
  ) r;

  RETURN v_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_consumo_segmentos(text, text, date, date, uuid) TO anon, authenticated;

-- ============================================================
-- 2. OPERADORES — productividad, rating y entregas por operador
--    Incluye TODOS los operadores (aun sin actividad en el
--    período) para ver el padrón completo. La estación mostrada
--    es operators.station_id (última donde despachó — referencia,
--    modelo operador-por-factura del 30-jul); el filtro p_station
--    aplica a las COMPRAS, no al operador.
-- ============================================================
CREATE OR REPLACE FUNCTION public.report_operadores(
  p_session_token text,
  p_from date DEFAULT NULL,
  p_to   date DEFAULT NULL,
  p_station uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_out jsonb;
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'report_operadores', false, NULL);

  IF p_from IS NOT NULL AND p_to IS NOT NULL AND p_to < p_from THEN
    RETURN jsonb_build_object('error', 'Rango de fechas inválido');
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.gallons DESC NULLS LAST, r.name), '[]'::jsonb)
  INTO v_out
  FROM (
    SELECT o.id, o.name, o.username, o.active,
           (o.external_id IS NOT NULL) AS is_proper,
           s.name AS station_name,
           st.purchases, st.members, st.gallons, st.amount, st.points,
           rt.rating_avg, rt.rating_count,
           dv.deliveries
    FROM operators o
    LEFT JOIN stations s ON s.id = o.station_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS purchases,
             COUNT(DISTINCT p.member_id)::int AS members,
             ROUND(COALESCE(SUM(p.gallons), 0)::numeric, 1) AS gallons,
             ROUND(COALESCE(SUM(p.amount), 0)::numeric, 0)  AS amount,
             COALESCE(SUM(p.points_earned), 0)::int AS points
      FROM purchases p
      WHERE p.operator_id = o.id
        AND (p_station IS NULL OR p.station_id = p_station)
        AND (p_from IS NULL OR (p.created_at AT TIME ZONE 'America/Guatemala')::date >= p_from)
        AND (p_to   IS NULL OR (p.created_at AT TIME ZONE 'America/Guatemala')::date <= p_to)
    ) st ON true
    LEFT JOIN LATERAL (
      SELECT ROUND(AVG(r0.stars)::numeric, 2) AS rating_avg,
             COUNT(*)::int AS rating_count
      FROM operator_ratings r0
      WHERE r0.operator_id = o.id
        AND (p_from IS NULL OR (r0.created_at AT TIME ZONE 'America/Guatemala')::date >= p_from)
        AND (p_to   IS NULL OR (r0.created_at AT TIME ZONE 'America/Guatemala')::date <= p_to)
    ) rt ON true
    LEFT JOIN LATERAL (
      -- Entregas por fecha de ENTREGA (collected_at); entregas
      -- viejas sin timestamp solo cuentan en "Todo".
      SELECT COUNT(*)::int AS deliveries
      FROM redemptions rd
      WHERE rd.operator_id = o.id AND rd.collected
        AND (p_from IS NULL OR (rd.collected_at AT TIME ZONE 'America/Guatemala')::date >= p_from)
        AND (p_to   IS NULL OR (rd.collected_at AT TIME ZONE 'America/Guatemala')::date <= p_to)
    ) dv ON true
  ) r;

  RETURN v_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_operadores(text, date, date, uuid) TO anon, authenticated;

-- ============================================================
-- 3. PROMOCIONES — consumo atribuido por regla del motor
--    Fuente: promo_applications (una fila por compra a la que la
--    regla aplicó — atribución exacta, no por ventana de fechas).
--    bonus_points = points_final - points_base acumulado.
-- ============================================================
CREATE OR REPLACE FUNCTION public.report_promos(
  p_session_token text,
  p_from date DEFAULT NULL,
  p_to   date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_out jsonb;
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'report_promos', false, NULL);

  IF p_from IS NOT NULL AND p_to IS NOT NULL AND p_to < p_from THEN
    RETURN jsonb_build_object('error', 'Rango de fechas inválido');
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.applications DESC, r.name), '[]'::jsonb)
  INTO v_out
  FROM (
    SELECT pr.id, pr.name, pr.effect_type, pr.active,
           pr.starts_on, pr.ends_on,
           COUNT(pa.id)::int AS applications,
           COUNT(DISTINCT pa.member_id)::int AS members,
           COALESCE(SUM(pa.points_final - pa.points_base), 0)::int AS bonus_points,
           ROUND(COALESCE(SUM(p.gallons), 0)::numeric, 1) AS gallons,
           ROUND(COALESCE(SUM(p.amount), 0)::numeric, 0)  AS amount
    FROM promo_rules pr
    LEFT JOIN promo_applications pa ON pa.promo_rule_id = pr.id
      AND (p_from IS NULL OR (pa.created_at AT TIME ZONE 'America/Guatemala')::date >= p_from)
      AND (p_to   IS NULL OR (pa.created_at AT TIME ZONE 'America/Guatemala')::date <= p_to)
    LEFT JOIN purchases p ON p.id = pa.purchase_id
    GROUP BY pr.id, pr.name, pr.effect_type, pr.active, pr.starts_on, pr.ends_on
  ) r;

  RETURN v_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_promos(text, date, date) TO anon, authenticated;

-- ============================================================
-- 4. RIFAS — boletos y puntos invertidos por rifa
--    Sin período: cada rifa YA es un período (mes/año). Distingue
--    boletos comprados con puntos (points_spent > 0) del boleto
--    regalado por la 5ª encuesta (points_spent = 0).
-- ============================================================
CREATE OR REPLACE FUNCTION public.report_rifas(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_out jsonb;
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'report_rifas', false, NULL);

  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.year DESC, r.month DESC), '[]'::jsonb)
  INTO v_out
  FROM (
    SELECT rc.id, rc.month, rc.year, rc.prize_name, rc.drawn_at,
           w.name AS winner_name,
           COALESCE(SUM(rt.quantity), 0)::int AS tickets,
           COALESCE(SUM(rt.quantity) FILTER (WHERE rt.points_spent > 0), 0)::int AS tickets_paid,
           COALESCE(SUM(rt.quantity) FILTER (WHERE rt.points_spent = 0), 0)::int AS tickets_gift,
           COALESCE(SUM(rt.points_spent), 0)::int AS points_spent,
           COUNT(DISTINCT rt.member_id)::int AS participants
    FROM raffle_calendar rc
    LEFT JOIN raffle_tickets rt ON rt.raffle_id = rc.id
    LEFT JOIN members w ON w.id = rc.winner_id
    GROUP BY rc.id, rc.month, rc.year, rc.prize_name, rc.drawn_at, w.name
  ) r;

  RETURN v_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_rifas(text) TO anon, authenticated;

-- ============================================================
-- 5. CANJES — economía del catálogo (puntos quemados, tasa de
--    entrega, premios más canjeados). Período por fecha de
--    CREACIÓN del canje.
-- ============================================================
CREATE OR REPLACE FUNCTION public.report_canjes(
  p_session_token text,
  p_from date DEFAULT NULL,
  p_to   date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_summary jsonb;
  v_top     jsonb;
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'report_canjes', false, NULL);

  IF p_from IS NOT NULL AND p_to IS NOT NULL AND p_to < p_from THEN
    RETURN jsonb_build_object('error', 'Rango de fechas inválido');
  END IF;

  SELECT jsonb_build_object(
    'created',   COUNT(*),
    'delivered', COUNT(*) FILTER (WHERE rd.collected),
    'pending',   COUNT(*) FILTER (WHERE NOT rd.collected),
    'points',           COALESCE(SUM(rd.points_spent), 0),
    'points_delivered', COALESCE(SUM(rd.points_spent) FILTER (WHERE rd.collected), 0)
  )
  INTO v_summary
  FROM redemptions rd
  WHERE (p_from IS NULL OR (rd.created_at AT TIME ZONE 'America/Guatemala')::date >= p_from)
    AND (p_to   IS NULL OR (rd.created_at AT TIME ZONE 'America/Guatemala')::date <= p_to);

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  INTO v_top
  FROM (
    SELECT COALESCE(rw.name, '—') AS reward,
           rw.category,
           COUNT(*)::int AS count,
           COUNT(*) FILTER (WHERE rd.collected)::int AS delivered,
           COALESCE(SUM(rd.points_spent), 0)::int AS points
    FROM redemptions rd
    LEFT JOIN rewards rw ON rw.id = rd.reward_id
    WHERE (p_from IS NULL OR (rd.created_at AT TIME ZONE 'America/Guatemala')::date >= p_from)
      AND (p_to   IS NULL OR (rd.created_at AT TIME ZONE 'America/Guatemala')::date <= p_to)
    GROUP BY rw.name, rw.category
    ORDER BY COUNT(*) DESC
    LIMIT 15
  ) t;

  RETURN jsonb_build_object('summary', v_summary, 'top', v_top);
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_canjes(text, date, date) TO anon, authenticated;

-- ============================================================
-- INTEGRIDAD — consultas de investigación interna. Cada
-- ejecución queda AUDITADA (quién, cuándo y con qué parámetros)
-- vía log_admin_action → acción 'consulta_integridad'. Por eso
-- son VOLATILE (insertan en la auditoría).
-- ============================================================

-- ── 6. Compras repetidas: miembros con ≥ p_min compras el MISMO
--    día calendario de Guatemala, con el detalle de cada compra
--    (hora, estación, operador) para revisar el caso. ──
CREATE OR REPLACE FUNCTION public.report_integridad_repetidos(
  p_session_token text,
  p_from date DEFAULT NULL,
  p_to   date DEFAULT NULL,
  p_min  integer DEFAULT 2
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid;
  v_name  text;
  v_email text;
  v_out   jsonb;
  v_min   integer := GREATEST(COALESCE(p_min, 2), 2);
BEGIN
  v_admin := public.validate_session_token(p_session_token, 'admin', 'report_integridad_repetidos', false, NULL);

  IF p_from IS NOT NULL AND p_to IS NOT NULL AND p_to < p_from THEN
    RETURN jsonb_build_object('error', 'Rango de fechas inválido');
  END IF;

  SELECT a.name, a.email INTO v_name, v_email FROM admins a WHERE a.id = v_admin;
  PERFORM public.log_admin_action(
    v_admin, COALESCE(v_name, '—'), COALESCE(v_email, '—'),
    'consulta_integridad', 'report', 'repetidos', NULL, NULL, NULL,
    jsonb_build_object('from', p_from, 'to', p_to, 'min', v_min)
  );

  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.purchases DESC, r.day DESC), '[]'::jsonb)
  INTO v_out
  FROM (
    SELECT p.member_id,
           m.name  AS member_name,
           m.phone,
           (p.created_at AT TIME ZONE 'America/Guatemala')::date AS day,
           COUNT(*)::int AS purchases,
           ROUND(SUM(p.gallons)::numeric, 1) AS gallons,
           ROUND(SUM(p.amount)::numeric, 0)  AS amount,
           jsonb_agg(jsonb_build_object(
             'time',     to_char(p.created_at AT TIME ZONE 'America/Guatemala', 'HH24:MI'),
             'station',  s.name,
             'operator', o.name,
             'gallons',  ROUND(p.gallons::numeric, 1),
             'amount',   ROUND(p.amount::numeric, 0)
           ) ORDER BY p.created_at) AS detail
    FROM purchases p
    JOIN members m    ON m.id = p.member_id
    LEFT JOIN stations s  ON s.id = p.station_id
    LEFT JOIN operators o ON o.id = p.operator_id
    WHERE (p_from IS NULL OR (p.created_at AT TIME ZONE 'America/Guatemala')::date >= p_from)
      AND (p_to   IS NULL OR (p.created_at AT TIME ZONE 'America/Guatemala')::date <= p_to)
    GROUP BY p.member_id, m.name, m.phone, (p.created_at AT TIME ZONE 'America/Guatemala')::date
    HAVING COUNT(*) >= v_min
    ORDER BY COUNT(*) DESC, (p.created_at AT TIME ZONE 'America/Guatemala')::date DESC
    LIMIT 200
  ) r;

  RETURN v_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_integridad_repetidos(text, date, date, integer) TO anon, authenticated;

-- ── 7. Afinidad operador–cliente: pares donde un mismo operador
--    registra ≥ p_min_pct % de las compras de un miembro (con al
--    menos p_min_compras compras en el período). Señal de la
--    concentración sospechosa que pidió el dueño. ──
CREATE OR REPLACE FUNCTION public.report_integridad_afinidad(
  p_session_token text,
  p_from date DEFAULT NULL,
  p_to   date DEFAULT NULL,
  p_min_compras integer DEFAULT 5,
  p_min_pct     integer DEFAULT 70
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid;
  v_name  text;
  v_email text;
  v_out   jsonb;
  v_minc  integer := GREATEST(COALESCE(p_min_compras, 5), 2);
  v_pct   integer := LEAST(GREATEST(COALESCE(p_min_pct, 70), 10), 100);
BEGIN
  v_admin := public.validate_session_token(p_session_token, 'admin', 'report_integridad_afinidad', false, NULL);

  IF p_from IS NOT NULL AND p_to IS NOT NULL AND p_to < p_from THEN
    RETURN jsonb_build_object('error', 'Rango de fechas inválido');
  END IF;

  SELECT a.name, a.email INTO v_name, v_email FROM admins a WHERE a.id = v_admin;
  PERFORM public.log_admin_action(
    v_admin, COALESCE(v_name, '—'), COALESCE(v_email, '—'),
    'consulta_integridad', 'report', 'afinidad', NULL, NULL, NULL,
    jsonb_build_object('from', p_from, 'to', p_to, 'min_compras', v_minc, 'min_pct', v_pct)
  );

  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.pct DESC, r.pair_purchases DESC), '[]'::jsonb)
  INTO v_out
  FROM (
    WITH base AS (
      SELECT p.member_id, p.operator_id,
             COUNT(*) AS pair_n,
             SUM(p.gallons) AS gal,
             SUM(p.amount)  AS amt
      FROM purchases p
      WHERE p.operator_id IS NOT NULL
        AND (p_from IS NULL OR (p.created_at AT TIME ZONE 'America/Guatemala')::date >= p_from)
        AND (p_to   IS NULL OR (p.created_at AT TIME ZONE 'America/Guatemala')::date <= p_to)
      GROUP BY p.member_id, p.operator_id
    ), tot AS (
      SELECT member_id, SUM(pair_n) AS total_n FROM base GROUP BY member_id
    )
    SELECT m.id   AS member_id,
           m.name AS member_name,
           m.phone,
           o.id   AS operator_id,
           o.name AS operator_name,
           b.pair_n::int  AS pair_purchases,
           t.total_n::int AS member_purchases,
           ROUND(100.0 * b.pair_n / t.total_n)::int AS pct,
           ROUND(b.gal::numeric, 1) AS gallons,
           ROUND(b.amt::numeric, 0) AS amount
    FROM base b
    JOIN tot t USING (member_id)
    JOIN members m   ON m.id = b.member_id
    JOIN operators o ON o.id = b.operator_id
    WHERE t.total_n >= v_minc
      AND 100.0 * b.pair_n / t.total_n >= v_pct
    ORDER BY 100.0 * b.pair_n / t.total_n DESC, b.pair_n DESC
    LIMIT 200
  ) r;

  RETURN v_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_integridad_afinidad(text, date, date, integer, integer) TO anon, authenticated;

-- ── 8. Cuentas del personal: cuentas de MIEMBRO que coinciden con
--    un operador o administrador por DPI exacto (members.dpi es
--    UNIQUE — match limpio) o por nombre exacto normalizado
--    (señal secundaria). Solo lectura para investigación. ──
CREATE OR REPLACE FUNCTION public.report_integridad_cuentas_personal(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid;
  v_name  text;
  v_email text;
  v_out   jsonb;
BEGIN
  v_admin := public.validate_session_token(p_session_token, 'admin', 'report_integridad_cuentas_personal', false, NULL);

  SELECT a.name, a.email INTO v_name, v_email FROM admins a WHERE a.id = v_admin;
  PERFORM public.log_admin_action(
    v_admin, COALESCE(v_name, '—'), COALESCE(v_email, '—'),
    'consulta_integridad', 'report', 'cuentas_personal', NULL, NULL, NULL, NULL
  );

  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.role, r.staff_name, r.member_name), '[]'::jsonb)
  INTO v_out
  FROM (
    SELECT 'operador' AS role,
           o.name     AS staff_name,
           o.username AS staff_ref,
           o.active   AS staff_active,
           CASE WHEN o.dpi IS NOT NULL AND trim(o.dpi) <> '' AND o.dpi = m.dpi
                THEN 'DPI' ELSE 'Nombre' END AS match_type,
           m.id    AS member_id,
           m.name  AS member_name,
           m.phone,
           m.points,
           ROUND(m.gallons::numeric, 1) AS gallons,
           ROUND(m.spent::numeric, 0)   AS spent,
           m.visits,
           m.last_buy
    FROM operators o
    JOIN members m ON (o.dpi IS NOT NULL AND trim(o.dpi) <> '' AND o.dpi = m.dpi)
                   OR lower(trim(o.name)) = lower(trim(m.name))
    UNION ALL
    SELECT 'admin',
           a.name, a.email, a.active,
           CASE WHEN a.dpi IS NOT NULL AND trim(a.dpi) <> '' AND a.dpi = m.dpi
                THEN 'DPI' ELSE 'Nombre' END,
           m.id, m.name, m.phone, m.points,
           ROUND(m.gallons::numeric, 1), ROUND(m.spent::numeric, 0),
           m.visits, m.last_buy
    FROM admins a
    JOIN members m ON (a.dpi IS NOT NULL AND trim(a.dpi) <> '' AND a.dpi = m.dpi)
                   OR lower(trim(a.name)) = lower(trim(m.name))
  ) r;

  RETURN v_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_integridad_cuentas_personal(text) TO anon, authenticated;

-- ============================================================
-- VERIFICAR tras ejecutar (con sesión de admin en la app):
--  (1) Análisis → Clientes: cada dimensión (Edad, Municipio,
--      Cantón, Vehículo, Nivel, Combustible, Día, Hora) carga y
--      los presets de período cambian los números.
--  (2) Análisis → Operadores: lista completa con rating (avg +
--      conteo), registros y entregas.
--  (3) Análisis → Promos y Rifas: promos con aplicaciones y
--      puntos bonus; rifas con boletos comprados/regalados y
--      puntos invertidos; canjes con resumen y top de premios.
--  (4) Análisis → Integridad: las 3 consultas devuelven filas y
--      cada ejecución aparece en Sistema → Auditoría como
--      'consulta_integridad'.
-- ============================================================

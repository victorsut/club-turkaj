-- ============================================================
-- Dashboard admin — PUNTOS CANJEADOS REALES (4-sep-2026)
-- ============================================================
-- El inicio del panel estimaba los puntos canjeados como "costo
-- PROMEDIO del catálogo × cantidad de canjes" porque `redemptions`
-- está cerrada a la API abierta. get_admin_kpis (sesión de admin) ya
-- agrega purchases; ahora agrega también redemptions: cantidad y SUMA
-- REAL de points_spent (total histórico y mes en curso GT). El
-- frontend usa estos valores y deja el promedio solo como respaldo si
-- el RPC no responde.
-- ============================================================

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
      ) t), '[]'::jsonb),
    -- Canjes REALES (4-sep): cantidad y suma de points_spent. `points`
    -- cuenta TODO canje creado (los puntos se descuentan al crearlo);
    -- `collected` / `points_collected` solo los entregados.
    'redemptions', (
      SELECT jsonb_build_object(
        'count',            COUNT(*),
        'points',           COALESCE(SUM(points_spent), 0),
        'collected',        COUNT(*) FILTER (WHERE collected),
        'points_collected', COALESCE(SUM(points_spent) FILTER (WHERE collected), 0),
        'count_month',      COUNT(*) FILTER (WHERE created_at >= v_month_start),
        'points_month',     COALESCE(SUM(points_spent) FILTER (WHERE created_at >= v_month_start), 0)
      )
      FROM redemptions
    )
  );
END;
$function$;

-- ============================================================
-- VERIFICAR tras ejecutar:
--   get_admin_kpis(<token admin>) → clave 'redemptions' con count = 27
--   y points = 1312 (valores al 4-sep-2026); el cuadro "Canjeados" del
--   inicio del panel muestra 1,312 en vez del promedio × cantidad.
-- ============================================================

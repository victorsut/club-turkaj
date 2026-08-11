-- ============================================================
-- ADMIN v2 (11-ago-2026) — HISTORIAL MENSUAL DEL INICIO
-- ============================================================
-- Pedido del dueño: las gráficas del inicio muestran el MES ACTUAL
-- (y el total acumulado en el encabezado) y al presionar cada cuadro
-- se abre el historial de los meses anteriores. Este RPC entrega la
-- serie mensual completa de purchases — galones, ventas y compras
-- por mes, con desglose por estación y por combustible — en mes
-- calendario de Guatemala. Mismo patrón de sesión de get_admin_kpis
-- y get_station_top_members (validate_session_token 'admin').
-- El historial de ALTAS de miembros no necesita RPC: se calcula en
-- el cliente desde members.registered (ya viaja en custs).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_dash_monthly(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_out jsonb;
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'get_dash_monthly', false, NULL);

  WITH base AS (
    SELECT to_char(created_at AT TIME ZONE 'America/Guatemala', 'YYYY-MM') AS ym,
           station_id,
           COALESCE(NULLIF(trim(lower(fuel_type)), ''), 'otro') AS fuel_type,
           gallons, amount
    FROM purchases
  ),
  months AS (
    SELECT ym,
           ROUND(SUM(gallons)::numeric, 1) AS g,
           ROUND(SUM(amount)::numeric, 0)  AS a,
           COUNT(*) AS n
    FROM base
    GROUP BY ym
  )
  SELECT jsonb_agg(jsonb_build_object(
    'ym', m.ym,
    'gallons', m.g,
    'amount', m.a,
    'purchases', m.n,
    'stations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.station_id, 'name', COALESCE(s.name, 'Sin estación'),
        'gallons', t.g, 'amount', t.a, 'purchases', t.n) ORDER BY t.g DESC)
      FROM (
        SELECT b.station_id,
               ROUND(SUM(b.gallons)::numeric, 1) AS g,
               ROUND(SUM(b.amount)::numeric, 0)  AS a,
               COUNT(*) AS n
        FROM base b
        WHERE b.ym = m.ym
        GROUP BY b.station_id
      ) t
      LEFT JOIN stations s ON s.id = t.station_id
    ), '[]'::jsonb),
    'fuel', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'fuel_type', t.fuel_type, 'gallons', t.g, 'amount', t.a) ORDER BY t.g DESC)
      FROM (
        SELECT b.fuel_type,
               ROUND(SUM(b.gallons)::numeric, 1) AS g,
               ROUND(SUM(b.amount)::numeric, 0)  AS a
        FROM base b
        WHERE b.ym = m.ym
        GROUP BY b.fuel_type
      ) t
    ), '[]'::jsonb)
  ) ORDER BY m.ym DESC) INTO v_out
  FROM months m;

  RETURN COALESCE(v_out, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dash_monthly(text) TO anon, authenticated;

-- ============================================================
-- VERIFICAR tras ejecutar: en el inicio del panel, al presionar
-- cualquiera de los cuadros (Galones, Ventas, Ventas por estación,
-- Mezcla de combustible) se abre el modal de historial con una
-- sección por mes (el mes en curso incluido). Sin la migración el
-- modal avisa "Historial no disponible" y nada más se rompe; el
-- historial de Miembros por nivel funciona sin migración (se
-- calcula en el navegador).
-- ============================================================

-- ============================================================
-- ADMIN v2 (6-ago-2026) — TOP DE CONSUMO POR ESTACIÓN
-- ============================================================
-- Pedido del dueño para el inicio del panel: además del top 10
-- general de galones, un top 10 POR ESTACIÓN (quiénes consumen más
-- en cada una). purchases quedó sin SELECT abierto (SEC.C.2), por eso
-- RPC con sesión de admin — mismo patrón de get_admin_kpis.
-- Agrega por purchases.station_id (dato confiable POR FACTURA desde
-- el modelo operador-por-factura de F7a.2). Los miembros con cuenta
-- eliminada aparecen como "Cuenta eliminada" (anonimizados).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_station_top_members(
  p_session_token text,
  p_limit integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_out   jsonb;
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'get_station_top_members', false, NULL);

  SELECT jsonb_agg(st ORDER BY st.name) INTO v_out
  FROM (
    SELECT s.id, s.name,
      COALESCE((
        SELECT jsonb_agg(t)
        FROM (
          SELECT m.id   AS member_id,
                 m.name AS member_name,
                 m.gallons AS member_gallons,   -- para el badge de nivel
                 ROUND(SUM(p.gallons)::numeric, 1) AS gallons,
                 ROUND(SUM(p.amount)::numeric, 0)  AS amount,
                 COUNT(*) AS purchases
          FROM purchases p
          JOIN members m ON m.id = p.member_id
          WHERE p.station_id = s.id
          GROUP BY m.id, m.name, m.gallons
          ORDER BY SUM(p.gallons) DESC
          LIMIT v_limit
        ) t
      ), '[]'::jsonb) AS top
    FROM stations s
  ) st;

  RETURN COALESCE(v_out, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_station_top_members(text, integer) TO anon, authenticated;

-- ============================================================
-- VERIFICAR tras ejecutar: el inicio del panel muestra la sección
-- "Top 10 por estación" con una tarjeta por estación (los datos
-- vienen de las facturas registradas; estaciones sin compras salen
-- con lista vacía). Sin la migración la sección simplemente no
-- aparece (el RPC no existe — nada se rompe).
-- ============================================================

-- ============================================================
-- ADMIN v2 (6-ago-2026) — RANKING DE CONSUMO POR ESTACIÓN CON FECHAS
-- ============================================================
-- La consulta "Consumo por estación" de Miembros gana PERÍODO:
-- historial completo (default) o rango de fechas específico. Fechas
-- en día calendario de GUATEMALA (purchases.created_at es UTC).
-- ⚠️ La firma cambia (parámetros nuevos p_from/p_to): se DROPEA la
-- versión anterior para no dejar una sobrecarga ambigua en PostgREST.
-- El inicio (Top 10) sigue llamando sin fechas = historial completo.
-- EJECUTAR DESPUÉS de la 20260806g (o en su lugar — esta versión ya
-- incluye el tope de 500).
-- ============================================================

DROP FUNCTION IF EXISTS public.get_station_top_members(text, integer);

CREATE OR REPLACE FUNCTION public.get_station_top_members(
  p_session_token text,
  p_limit integer DEFAULT 10,
  p_from date DEFAULT NULL,
  p_to   date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_out   jsonb;
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 500);
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'get_station_top_members', false, NULL);

  IF p_from IS NOT NULL AND p_to IS NOT NULL AND p_to < p_from THEN
    RETURN jsonb_build_object('error', 'Rango de fechas inválido');
  END IF;

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
            -- Período en día calendario de Guatemala (NULL = sin límite)
            AND (p_from IS NULL OR (p.created_at AT TIME ZONE 'America/Guatemala')::date >= p_from)
            AND (p_to   IS NULL OR (p.created_at AT TIME ZONE 'America/Guatemala')::date <= p_to)
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

GRANT EXECUTE ON FUNCTION public.get_station_top_members(text, integer, date, date) TO anon, authenticated;

-- ============================================================
-- VERIFICAR tras ejecutar: (1) el Top 10 del inicio sigue cargando
-- (llama sin fechas); (2) Miembros → Consumo por estación → Período
-- "Este mes" / "Mes anterior" / rango personalizado cambian el
-- ranking; "Todo" = historial completo.
-- ============================================================

-- ============================================================
-- ADMIN v2 (6-ago-2026) — RANKING COMPLETO DE CONSUMO POR ESTACIÓN
-- ============================================================
-- La vista Miembros gana el modo "Consumo por estación": el orden
-- COMPLETO de quiénes han consumido en cada estación (la misma
-- fuente del Top 10 del inicio — get_station_top_members). El tope
-- del RPC sube de 50 a 500 filas por estación para cubrir el padrón
-- completo. Resuelve además la confusión reportada por el dueño:
-- el FILTRO de estación de Miembros clasifica a cada miembro en UNA
-- estación (última visita o más frecuente), mientras el TOP contiene
-- a todo el que haya comprado ahí — un miembro puede estar en el top
-- de TURKAJ 1 aunque su estación habitual sea otra.
-- (Recreación idéntica a 20260806f salvo el tope 50 → 500.)
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
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 500);
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
-- VERIFICAR tras ejecutar: Miembros → vista "Consumo por estación"
-- lista el ranking completo de la estación elegida (misma fuente
-- del Top 10 del inicio). Sin esta migración el modo funciona pero
-- capado a 50 filas por estación (tope viejo de la 20260806f).
-- ============================================================

-- ============================================================
-- 20260814 — preview_promo con conversión POR TIER (F2.1)
-- ============================================================
-- BUG: el simulador del Motor de promos (Admin) calculaba los
-- puntos base con la conversión GLOBAL vieja (program_config
-- 'general' → qPerPt, fallback 10) sin importar el nivel elegido:
-- simular Q150 mostraba 15 pts base también en PLATINO (real: 18,
-- Q8 = 1 pt) y BLACK (real: 25, Q6 = 1 pt), y los extras de las
-- promos multiplicadoras se calculaban sobre esa base equivocada.
-- El registro REAL de compras no estaba afectado (register_
-- purchase_core ya usa tier_q_per_pt desde F2.1, 6-ago-2026).
--
-- FIX: preview_promo usa el helper tier_q_per_pt(p_tier)
-- (migración 20260806_f2_puntos_eventos_por_tier), que lee EN VIVO
-- program_config 'tiers' → qPerPt del nivel — el mismo dato que
-- edita Admin → Configuración → Puntos por Nivel (set_loyalty_
-- config) — con fallback al 'general' y por último 10. Simulador
-- y compras reales quedan sincronizados con la config SIEMPRE,
-- sin duplicar la lógica de lectura.
--
-- Sin cambios de firma ni de contrato de retorno: el frontend
-- (PromoRules.jsx → previewPromo) no necesita cambios.
--
-- REVERT copy-paste: re-ejecutar el bloque 6 de
--   20260718_promo1_motor_promociones.sql
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.preview_promo(
  p_amount        numeric,
  p_fuel_type     text,
  p_station_id    uuid DEFAULT NULL,
  p_tier          text DEFAULT 'ORO',
  p_session_token text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_q_per_pt integer;
  v_points   integer;
  v_promo    jsonb;
BEGIN
  PERFORM public.validate_session_token(
    p_session_token, 'admin', 'preview_promo', false, NULL
  );

  IF p_amount IS NULL OR p_amount < 10 THEN
    RETURN jsonb_build_object('error', 'Mínimo Q10');
  END IF;

  -- F2.1: conversión POR TIER, misma fuente que register_purchase_core
  -- (program_config 'tiers' → qPerPt del nivel; fallback general → 10).
  v_q_per_pt := public.tier_q_per_pt(p_tier);

  v_points := FLOOR(p_amount / v_q_per_pt);
  v_promo  := public.pick_best_promo(
    p_amount, p_fuel_type, p_station_id, p_tier, v_points, NULL
  );

  RETURN jsonb_build_object(
    'base_points',  v_points,
    'final_points', v_points + COALESCE((v_promo->>'extra_points')::integer, 0),
    'promo',        v_promo
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.preview_promo(numeric, text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_promo(numeric, text, uuid, text, text)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.preview_promo(numeric, text, uuid, text, text) IS
'PROMO-1 — Simula qué promoción aplicaría HOY a una compra hipotética (monto/combustible/estación/tier) sin persistir nada. Sesión admin STRICT (28000). Puntos base con conversión POR TIER (tier_q_per_pt, F2.1 — sincronizado con Admin → Puntos por Nivel). Devuelve {base_points, final_points, promo|null}.';

COMMIT;

-- ============================================================
-- VERIFICAR tras ejecutar (SQL Editor, con un token de admin):
--   Con la config default (ORO 10 · PLATINO 8 · BLACK 6):
--   SELECT public.preview_promo(150, 'super', NULL, 'ORO',     '<token>') ->> 'base_points';  -- 15
--   SELECT public.preview_promo(150, 'super', NULL, 'PLATINO', '<token>') ->> 'base_points';  -- 18
--   SELECT public.preview_promo(150, 'super', NULL, 'BLACK',   '<token>') ->> 'base_points';  -- 25
--   (o directamente desde el simulador del panel cambiando el nivel)
-- ============================================================

-- ============================================================
-- Club Turkaj + / Puntos+ — F0.3.1: update_fuel_prices con auditoría
-- ============================================================
-- Extiende el RPC original (20260513) con 4 parámetros opcionales
-- para registrar la acción en admin_audit_log vía log_admin_action,
-- EN LA MISMA TRANSACCIÓN.
--
-- BACKWARD COMPATIBILITY:
--   - p_admin_id IS NULL → comportamiento legacy idéntico (sin log).
--   - p_admin_id NOT NULL → lee old_value, hace el update, y llama
--     a log_admin_action. Como 'update_fuel_prices' es acción
--     sensible, log_admin_action exige reason_text; si falta →
--     RAISE → rollback de TODO (update incluido).
--
-- NOTA TÉCNICA: agregar parámetros con DEFAULT crea un OVERLOAD
-- nuevo, no reemplaza. Con ambas firmas vivas, PostgREST no
-- resolvería la llamada de 1 argumento ("function not unique"). Por
-- eso DROP de la firma vieja antes de CREATE OR REPLACE.
-- ============================================================

BEGIN;

DROP FUNCTION IF EXISTS public.update_fuel_prices(jsonb);

CREATE OR REPLACE FUNCTION public.update_fuel_prices(
  p_prices      jsonb,
  p_admin_id    uuid DEFAULT NULL,
  p_admin_name  text DEFAULT NULL,
  p_admin_email text DEFAULT NULL,
  p_reason_text text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super numeric;
  v_regular numeric;
  v_diesel numeric;
  v_old_value jsonb;
  v_result jsonb;
BEGIN
  -- Validar que los 3 keys existen
  IF p_prices ? 'super' = false OR p_prices ? 'regular' = false OR p_prices ? 'diesel' = false THEN
    RAISE EXCEPTION 'Faltan precios obligatorios. Se requieren las claves: super, regular, diesel.';
  END IF;

  -- Castear a numeric
  v_super := (p_prices->>'super')::numeric;
  v_regular := (p_prices->>'regular')::numeric;
  v_diesel := (p_prices->>'diesel')::numeric;

  -- Validar rango Q1-Q100
  IF v_super < 1 OR v_super > 100 THEN
    RAISE EXCEPTION 'Precio de super fuera de rango (Q1.00 a Q100.00): %', v_super;
  END IF;
  IF v_regular < 1 OR v_regular > 100 THEN
    RAISE EXCEPTION 'Precio de regular fuera de rango (Q1.00 a Q100.00): %', v_regular;
  END IF;
  IF v_diesel < 1 OR v_diesel > 100 THEN
    RAISE EXCEPTION 'Precio de diesel fuera de rango (Q1.00 a Q100.00): %', v_diesel;
  END IF;

  -- Si hay auditoría: capturar old_value ANTES del update
  IF p_admin_id IS NOT NULL THEN
    SELECT value INTO v_old_value
    FROM public.program_config
    WHERE key = 'fuel_prices';
  END IF;

  -- UPSERT (INSERT si no existe, UPDATE si existe)
  INSERT INTO public.program_config (key, value, updated_at)
  VALUES (
    'fuel_prices',
    jsonb_build_object('super', v_super, 'regular', v_regular, 'diesel', v_diesel),
    now()
  )
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = EXCLUDED.updated_at
  RETURNING value INTO v_result;

  -- Logging de auditoría EN LA MISMA TRANSACCIÓN.
  -- Si log_admin_action hace RAISE (p.ej. reason_text vacío),
  -- todo el UPDATE se revierte junto con el log.
  IF p_admin_id IS NOT NULL THEN
    PERFORM public.log_admin_action(
      p_admin_id    => p_admin_id,
      p_admin_name  => p_admin_name,
      p_admin_email => p_admin_email,
      p_action      => 'update_fuel_prices',
      p_entity_type => 'fuel_prices',
      p_entity_id   => 'fuel_prices',
      p_reason_text => p_reason_text,
      p_old_value   => v_old_value,
      p_new_value   => v_result
    );
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.update_fuel_prices(jsonb, uuid, text, text, text) IS
'F0.3.1 - Actualiza fuel_prices en program_config con auditoria opcional.

Si p_admin_id IS NULL: comportamiento legacy (sin logging).
Si p_admin_id NOT NULL: lee old_value, hace update, llama a log_admin_action
en la misma transaccion. Como update_fuel_prices es accion sensible,
log_admin_action exige reason_text no-vacio; si falta, rollback completo.

Validaciones server-side: 3 claves obligatorias (super/regular/diesel),
rango Q1-Q100 por precio.';

-- Permisos: idénticos a la versión original
REVOKE ALL ON FUNCTION public.update_fuel_prices(jsonb, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_fuel_prices(jsonb, uuid, text, text, text) TO anon, authenticated;

COMMIT;

-- ── Fin ───────────────────────────────────────────────────────

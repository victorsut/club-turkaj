-- ============================================================
-- Club Turkaj — RPC para actualizar precios de combustible
-- ============================================================
-- program_config tiene RLS con policy solo de SELECT (anon/auth).
-- Para que el admin pueda modificar fuel_prices desde el cliente
-- sin abrir UPDATE genérico en la tabla, este RPC corre como
-- SECURITY DEFINER y aplica el UPDATE controladamente.
--
-- Validación server-side:
--   - Las 3 claves super/regular/diesel son obligatorias.
--   - Cada precio debe ser numérico y estar entre Q1.00 y Q100.00.
--   - Si la clave fuel_prices no existe, hace INSERT (idempotente).
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_fuel_prices(p_prices jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super numeric;
  v_regular numeric;
  v_diesel numeric;
  v_result jsonb;
BEGIN
  -- Validar que los 3 keys existen y son numéricos
  IF p_prices ? 'super' = false OR p_prices ? 'regular' = false OR p_prices ? 'diesel' = false THEN
    RAISE EXCEPTION 'Faltan precios obligatorios. Se requieren las claves: super, regular, diesel.';
  END IF;

  v_super := (p_prices->>'super')::numeric;
  v_regular := (p_prices->>'regular')::numeric;
  v_diesel := (p_prices->>'diesel')::numeric;

  -- Validar rango
  IF v_super < 1 OR v_super > 100 THEN
    RAISE EXCEPTION 'Precio de super fuera de rango (Q1.00 a Q100.00): %', v_super;
  END IF;
  IF v_regular < 1 OR v_regular > 100 THEN
    RAISE EXCEPTION 'Precio de regular fuera de rango (Q1.00 a Q100.00): %', v_regular;
  END IF;
  IF v_diesel < 1 OR v_diesel > 100 THEN
    RAISE EXCEPTION 'Precio de diesel fuera de rango (Q1.00 a Q100.00): %', v_diesel;
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

  RETURN v_result;
END;
$$;

-- Permisos: cualquier cliente puede invocar (la lógica de "solo
-- admin" vive en la UI; cualquier mejora se hace acá agregando
-- chequeo de sesión o un parámetro p_admin_id verificable).
REVOKE ALL ON FUNCTION public.update_fuel_prices(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_fuel_prices(jsonb) TO anon, authenticated;

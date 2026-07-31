-- ============================================================
-- 20260731 — FIX: alta del operador espejo violaba el NOT NULL de dpi
-- ============================================================
-- Hallado en la prueba punta a punta del flujo de canje por API
-- (31-jul): el primer deliver con un colaborador PROPER nuevo
-- fallaba 500 — api_upsert_operator insertaba dpi = NULL y la
-- columna operators.dpi es NOT NULL sin default. El mismo bug
-- afectaba al PRIMER envío de compra de cualquier colaborador
-- nuevo (api_register_purchase usa el mismo upsert).
--
-- Fix: dpi placeholder 'PROPER-<external_id>' (mismo patrón que
-- gafete; operators.dpi NO tiene unique). El admin puede completar
-- el DPI real después desde Personal — el upsert nunca lo pisa.
-- ============================================================

CREATE OR REPLACE FUNCTION public.api_upsert_operator(
  p_external_id text,
  p_name        text,
  p_station_id  uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM operators
  WHERE external_source = 'proper' AND external_id = p_external_id;

  IF v_id IS NULL THEN
    INSERT INTO operators (
      name, username, password_hash, dpi, gafete,
      station_id, active, external_id, external_source
    ) VALUES (
      COALESCE(NULLIF(trim(p_name), ''), 'Colaborador PROPER'),
      'proper_' || regexp_replace(lower(p_external_id), '[^a-z0-9]', '', 'g'),
      '!',                       -- hash imposible: no puede loguearse en la app
      'PROPER-' || p_external_id,  -- placeholder: el admin completa el DPI real
      'PROPER-' || p_external_id,
      p_station_id, true, p_external_id, 'proper'
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE operators SET
      -- El nombre de PROPER solo RELLENA el placeholder del alta: si el
      -- admin ya completó/corrigió la ficha, su versión se respeta.
      name       = CASE WHEN name = 'Colaborador PROPER'
                        THEN COALESCE(NULLIF(trim(p_name), ''), name)
                        ELSE name END,
      -- La estación SÍ viaja con cada factura (modelo 30-jul): acá queda
      -- la última donde despachó.
      station_id = COALESCE(p_station_id, station_id),
      updated_at = now()
    WHERE id = v_id;
  END IF;

  RETURN v_id;
END;
$function$;

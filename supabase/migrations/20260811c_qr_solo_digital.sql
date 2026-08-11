-- ============================================================
-- OBJETIVO #2 (11-ago-2026) — QR SOLO DIGITAL: endurecimiento
-- ============================================================
-- DECISIÓN del dueño (11-ago): la tarjeta FÍSICA no se implementa
-- por ahora (deseo a futuro que podría descartarse). El sistema de
-- QR digital ya está completo (emisión en register_member, upgrade
-- de prefijo en register_purchase_core, resolve_card para staff,
-- api_resolve_member para PROPER); esta migración cierra los DOS
-- huecos que quedaban, sin cerrar la puerta a las físicas:
--   1. physical_cards.status NO se validaba en ningún resolutor —
--      una tarjeta bloqueada seguiría identificando al miembro.
--   2. El stock SEED de 13 tarjetas físicas sueltas (CTOD-00001..
--      00013, feb/mar 2026, nunca impresas) queda 'inactive' — deja
--      de ser escaneable pero se CONSERVA como base del futuro
--      módulo de físicas (re-activar el lote si se implementa).
-- El resolutor del staff (resolve_card) NO cambia: ya devuelve
-- status y el frontend del operador ahora lo rechaza con mensaje.
-- ============================================================

-- ── 1. api_resolve_member: solo tarjetas ACTIVAS ─────────────
-- Una tarjeta no-activa responde member_not_found (mismo contrato
-- documentado en docs/API-PROPER.md — sin códigos de error nuevos:
-- para el POS una tarjeta bloqueada simplemente no identifica).
CREATE OR REPLACE FUNCTION public.api_resolve_member(p_card_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_m      RECORD;
  v_code   text := upper(trim(COALESCE(p_card_code, '')));
BEGIN
  IF v_code !~ '^CT[OPB]D-[0-9]+$' THEN
    RETURN jsonb_build_object('error', 'invalid_card_code');
  END IF;

  SELECT m.id, m.name, m.nit, m.points, m.gallons
    INTO v_m
  FROM physical_cards pc
  JOIN members m ON m.id = pc.assigned_to
  WHERE pc.card_code = v_code
    AND pc.status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'member_not_found');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'member_id',    v_m.id,
    'name',         v_m.name,
    'tier',         public.get_member_tier(v_m.gallons),
    'points',       v_m.points,
    -- Para que el POS avise ANTES de facturar con qué NIT puede emitir.
    'has_nit',      v_m.nit IS NOT NULL AND trim(v_m.nit) <> '',
    'nit_masked',   CASE WHEN v_m.nit IS NULL OR trim(v_m.nit) = '' THEN NULL
                         ELSE '****' || right(public.normalize_nit(v_m.nit), 4) END,
    'accepted_nits', CASE WHEN v_m.nit IS NULL OR trim(v_m.nit) = ''
                          THEN jsonb_build_array('CF')
                          ELSE jsonb_build_array('CF', public.normalize_nit(v_m.nit)) END
  );
END;
$function$;

-- ── 2. Stock seed de físicas → inactive ──────────────────────
-- Solo las SUELTAS (assigned_to IS NULL): las tarjetas digitales de
-- los miembros no se tocan. Reversible: UPDATE ... SET status='active'
-- cuando el módulo de tarjetas físicas se implemente.
UPDATE public.physical_cards
SET status = 'inactive'
WHERE assigned_to IS NULL
  AND status = 'active';

-- ============================================================
-- VERIFICAR tras ejecutar:
--   1. SELECT count(*) FROM physical_cards
--      WHERE assigned_to IS NULL AND status = 'active';  → 0
--   2. GET /v1/members?card_code=CTOD-00001 (una seed) → 404
--      member_not_found (antes: "Tarjeta sin registrar").
--   3. El QR digital de cualquier miembro sigue resolviendo normal
--      en el escáner del operador y en la API.
-- ============================================================

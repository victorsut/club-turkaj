-- ============================================================
-- 20260731c — FIX: solo podía existir UNA llave de API a la vez
-- ============================================================
-- Reporte del dueño (31-jul, captura): al generar la llave definitiva
-- 'PROPER' en Admin → Configuración → API externa, api_create_client
-- responde 409 "duplicate key value violates unique constraint
-- api_clients_prefix_idx".
--
-- CAUSA RAÍZ (bug de diseño de F7a): key_prefix = left(llave, 8) y
-- 'pp_live_' mide EXACTAMENTE 8 caracteres — el prefijo guardado era
-- siempre la constante 'pp_live_', sin ningún carácter distintivo.
-- Con el índice ÚNICO sobre key_prefix, la primera llave (la de
-- pruebas) lo ocupó y ninguna otra puede crearse. api_authenticate
-- buscaba por ese mismo prefijo, así que el modelo entero solo
-- soportaba UNA llave. Nunca se notó porque hasta hoy solo había
-- existido una.
--
-- FIX:
--   1. api_create_client: key_prefix = left(llave, 16)
--      ('pp_live_' + 8 hex ≈ 4×10^9 combinaciones) con reintento si
--      el prefijo colisionara (regenera la llave completa).
--   2. api_authenticate: busca candidatos por AMBOS largos de prefijo
--      (8 legado y 16 nuevo) y verifica el bcrypt de cada uno — la
--      llave de pruebas vigente (fila con prefijo 'pp_live_') sigue
--      funcionando sin tocarla. OJO: la fila legada matchea el left-8
--      de CUALQUIER llave, por eso la verificación itera candidatos y
--      solo acepta el que pase el bcrypt.
-- ============================================================

-- ── 1. Prefijo distintivo en la generación ─────────────────────
CREATE OR REPLACE FUNCTION public.api_create_client(
  p_session_token text,
  p_name          text,
  p_scopes        text[] DEFAULT ARRAY['purchases:write','redemptions:read','redemptions:write']
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_key text;
  v_id  uuid;
  v_try integer := 0;
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'api_create_client', false, NULL);
  -- pp_live_<48 hex>; prefijo identificador = primeros 16 chars
  -- ('pp_live_' + 8 hex). Si el prefijo colisionara (improbable),
  -- se regenera la llave completa.
  LOOP
    v_try := v_try + 1;
    v_key := 'pp_live_' || encode(extensions.gen_random_bytes(24), 'hex');
    BEGIN
      INSERT INTO api_clients (name, key_prefix, key_hash, scopes)
      VALUES (p_name, left(v_key, 16), extensions.crypt(v_key, extensions.gen_salt('bf', 8)), p_scopes)
      RETURNING id INTO v_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_try >= 5 THEN RAISE; END IF;
    END;
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'client_id', v_id, 'api_key', v_key);
END;
$function$;

-- ── 2. Autenticación tolerante a ambos largos de prefijo ───────
CREATE OR REPLACE FUNCTION public.api_authenticate(p_key text, p_scope text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_c api_clients%ROWTYPE;
BEGIN
  IF COALESCE(p_key, '') = '' THEN
    RETURN jsonb_build_object('error', 'missing_api_key');
  END IF;

  -- Candidatos por prefijo de 16 (nuevo) o de 8 (llaves legadas).
  -- La fila legada 'pp_live_' matchea el left-8 de cualquier llave:
  -- el bcrypt decide cuál (si alguno) es el dueño real.
  FOR v_c IN
    SELECT * FROM api_clients
    WHERE key_prefix IN (left(p_key, 16), left(p_key, 8))
  LOOP
    IF v_c.key_hash = extensions.crypt(p_key, v_c.key_hash) THEN
      IF NOT v_c.active THEN
        RETURN jsonb_build_object('error', 'invalid_api_key');
      END IF;
      IF p_scope IS NOT NULL AND NOT (p_scope = ANY (v_c.scopes)) THEN
        RETURN jsonb_build_object('error', 'insufficient_scope');
      END IF;
      UPDATE api_clients SET last_used_at = now() WHERE id = v_c.id;
      RETURN jsonb_build_object('ok', true, 'client_id', v_c.id, 'name', v_c.name);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('error', 'invalid_api_key');
END;
$function$;

COMMENT ON FUNCTION public.api_create_client(text, text, text[]) IS
'F7a: genera una llave pp_live_<48 hex> (se muestra UNA vez; solo el
hash bcrypt persiste). 20260731c: key_prefix = left(llave,16) para que
convivan varias llaves (el prefijo de 8 era la constante pp_live_ y el
índice único solo permitía una).';

COMMENT ON FUNCTION public.api_authenticate(p_key text, p_scope text) IS
'F7a: autentica la llave del header Authorization. 20260731c: busca
candidatos por prefijo de 16 (nuevo) y 8 (legado) y verifica bcrypt de
cada uno — soporta múltiples llaves y las legadas siguen válidas.';

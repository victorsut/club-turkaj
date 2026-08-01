-- ============================================================
-- Puntos Plus — El login con Google NO pisa la foto personalizada
-- (1-ago-2026, pedido del dueño)
-- ============================================================
-- Con la foto de perfil editable (20260801_bucket_avatars),
-- create_member_session_oauth seguía persistiendo la foto de Google
-- en CADA login → borraba la foto que el cliente eligió en Mi Cuenta.
--
-- Regla nueva: la foto de Google solo se persiste si la actual NO es
-- personalizada (una URL del bucket `avatars`). Las fotos de Google
-- sí se siguen refrescando entre sí (sus URLs rotan periódicamente).
--
-- Única diferencia con la versión de 20260728d: el guard
--   AND COALESCE(avatar_url,'') NOT LIKE '%/object/public/avatars/%'
-- en el UPDATE del avatar. El resto de la función queda idéntico.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_member_session_oauth(p_avatar_url text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_uid   uuid;
  v_email text;
  v_mid   uuid;
  v_sess  jsonb;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Sin sesión de Google');
  END IF;

  SELECT id INTO v_mid FROM members WHERE auth_provider_id = v_uid::text;

  -- Fallback por email + vínculo (replica el linkeo que hacía App.jsx)
  IF v_mid IS NULL THEN
    v_email := auth.jwt() ->> 'email';
    IF COALESCE(v_email, '') <> '' THEN
      SELECT id INTO v_mid FROM members WHERE email = v_email LIMIT 1;
      IF v_mid IS NOT NULL THEN
        UPDATE members SET auth_provider_id = v_uid::text, auth_provider = 'google',
               updated_at = now()
        WHERE id = v_mid;
      END IF;
    END IF;
  END IF;

  IF v_mid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');  -- → el cliente muestra el registro
  END IF;

  -- Persistir la foto de Google si cambió — SALVO que el miembro tenga
  -- una foto PERSONALIZADA (bucket avatars, elegida en Mi Cuenta)
  IF COALESCE(p_avatar_url, '') <> '' THEN
    UPDATE members SET avatar_url = p_avatar_url, updated_at = now()
    WHERE id = v_mid
      AND avatar_url IS DISTINCT FROM p_avatar_url
      AND COALESCE(avatar_url, '') NOT LIKE '%/object/public/avatars/%';
  END IF;

  v_sess := public.issue_member_session(v_mid);
  RETURN jsonb_build_object(
    'ok', true, 'member_id', v_mid,
    'member', public.member_profile_json(v_mid)
  ) || v_sess;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_member_session_oauth(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_member_session_oauth(text) TO authenticated;

COMMENT ON FUNCTION public.create_member_session_oauth(text) IS
'SEC.C.1 + 1-ago-2026: sesión vía Google. Persiste la foto de Google
solo si el miembro no tiene una foto personalizada (bucket avatars).';

-- ============================================================
-- Verificación:
--   SELECT prosrc LIKE '%avatars%' FROM pg_proc
--   WHERE proname = 'create_member_session_oauth';
--   -- esperado: true
-- ============================================================

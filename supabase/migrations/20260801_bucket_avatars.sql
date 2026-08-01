-- ============================================================
-- Puntos Plus — Bucket de Storage `avatars` (1-ago-2026)
-- ============================================================
-- Foto de perfil EDITABLE por el cliente (pedido del dueño): las
-- cuentas Google nacen con la foto de la cuenta, pero cualquier
-- miembro puede cambiarla desde Mi Cuenta.
--
-- Mismo modelo que promo-images (20260718):
--   · Bucket PÚBLICO para lectura (la app carga la URL pública que
--     queda guardada en members.avatar_url).
--   · SIN policies de escritura en storage.objects → solo la
--     service key puede subir (bypasa RLS). La subida del cliente
--     pasa por el serverless /api/upload-avatar, que valida el
--     TOKEN DE SESIÓN DE MIEMBRO (member_sessions, patrón SEC.C.1)
--     y recién entonces sube con la service key. El endpoint borra
--     la foto anterior del miembro (carpeta <member_id>/) antes de
--     subir la nueva — no se acumulan archivos huérfanos.
--   · El guardado en members.avatar_url viaja por update_my_profile
--     (la whitelist del RPC ya incluía avatar_url desde SEC.C.1).
--
-- ROLLBACK:
--   DELETE FROM storage.buckets WHERE id = 'avatars';
--     -- (falla si el bucket tiene objetos; vaciarlo antes desde el
--     --  dashboard de Storage)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true,
  2097152,  -- 2 MB por archivo (el cliente además reduce a 512px antes de subir)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Verificación:
--   SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'avatars';
--   -- esperado: 1 fila, public = true
-- ============================================================

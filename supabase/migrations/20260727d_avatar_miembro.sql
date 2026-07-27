-- ============================================================
-- Foto de perfil persistida (27-jul-2026)
-- ============================================================
-- La foto de la cuenta de Google solo vivía en la sesión OAuth del
-- momento: al entrar por teléfono o por huella (biometría) el menú
-- caía a la inicial (reporte del dueño: cliente Ezer Morales).
-- Se persiste la URL en members al iniciar sesión con Google y todos
-- los caminos de login la leen de ahí.

ALTER TABLE members ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN members.avatar_url IS
  'URL de la foto de perfil (cuenta Google). Se refresca en cada login OAuth.';

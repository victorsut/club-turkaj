-- ============================================================
-- Biometría con passkeys / WebAuthn (27-jul-2026)
-- ============================================================
-- Inicio de sesión del MIEMBRO con huella / rostro / patrón del
-- celular. La verificación criptográfica vive en el endpoint
-- serverless /api/webauthn (Vercel, @simplewebauthn/server) que
-- accede con la SERVICE KEY — estas tablas NO deben ser accesibles
-- desde el cliente: se deja que los event triggers ensure_rls
-- apliquen la policy restrictiva "Deny all by default" (gotcha del
-- proyecto que acá es deseado; service_role bypasa RLS).
--
-- member_credentials: llaves públicas registradas (la privada vive
--   en el chip seguro del teléfono, nunca sale de ahí).
-- webauthn_challenges: desafíos de un solo uso entre la llamada de
--   opciones y la de verificación (los serverless no tienen memoria).
-- ============================================================

CREATE TABLE IF NOT EXISTS member_credentials (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,          -- id base64url del navegador
  public_key    text NOT NULL,                 -- llave pública base64url
  counter       bigint NOT NULL DEFAULT 0,     -- contador anti-clonación
  transports    jsonb,
  device_label  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz
);
CREATE INDEX IF NOT EXISTS idx_member_credentials_member
  ON member_credentials(member_id);

CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge  text NOT NULL,
  kind       text NOT NULL CHECK (kind IN ('reg', 'auth')),
  member_id  uuid,                             -- solo en registro
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_challenge
  ON webauthn_challenges(challenge);

-- Cinturón y tirantes: RLS activo aunque el event trigger ya lo haga.
ALTER TABLE member_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE member_credentials IS
  'Passkeys WebAuthn de miembros (login biométrico). Acceso SOLO vía /api/webauthn con service key.';
COMMENT ON TABLE webauthn_challenges IS
  'Desafíos WebAuthn de un solo uso (TTL 10 min, se borran al usarse).';

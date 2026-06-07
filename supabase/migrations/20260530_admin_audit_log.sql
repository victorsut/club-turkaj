-- ============================================================
-- Club Turkaj + — F0.1: admin_audit_log
-- ============================================================
-- Auditoría Nivel 2 con before/after de acciones admin.
--
-- Arquitectura A: el cliente pasa admin_id + reason_text a un RPC
-- log_admin_action (creado en F0.2). RLS deny-all en esta tabla;
-- todo acceso pasa por RPCs SECURITY DEFINER.
--
-- Cobertura F0: best-effort desde cliente (post-mutación).
-- Cobertura post-F0: las migraciones a RPCs con auditoría atómica
-- de AdminPremios, AdminPromos, OpManagement se hacen durante
-- F1-F4 cuando se toquen esas vistas.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      uuid REFERENCES public.admins(id) ON DELETE SET NULL,
  admin_name    text,
  admin_email   text,
  action        text NOT NULL,
  entity_type   text,
  entity_id     text,
  reason_text   text,
  old_value     jsonb,
  new_value     jsonb,
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_audit_log IS
  'Auditoría Nivel 2 de acciones admin. Acceso solo via RPCs SECURITY DEFINER. NO escribir/leer directo.';

COMMENT ON COLUMN public.admin_audit_log.admin_id IS
  'FK a admins.id. ON DELETE SET NULL para preservar el log si se elimina el admin.';

COMMENT ON COLUMN public.admin_audit_log.admin_name IS
  'Snapshot del nombre al momento del evento. Legible aunque el admin se renombre o borre.';

COMMENT ON COLUMN public.admin_audit_log.admin_email IS
  'Snapshot del email al momento del evento.';

COMMENT ON COLUMN public.admin_audit_log.action IS
  'Vocabulario controlado: update_fuel_prices, create_operator, update_operator, toggle_operator_active, reset_operator_password, create_reward, update_reward, delete_reward, create_special_day, update_special_day, delete_special_day, create_promotion, update_promotion, delete_promotion, update_raffle, etc.';

COMMENT ON COLUMN public.admin_audit_log.entity_type IS
  'Tipo de entidad afectada: fuel_prices, operator, reward, special_day, promotion, raffle, member, etc.';

COMMENT ON COLUMN public.admin_audit_log.entity_id IS
  'ID de la fila afectada. text (no uuid) porque algunas claves no son uuid (ej. program_config.key=fuel_prices).';

COMMENT ON COLUMN public.admin_audit_log.reason_text IS
  'Justificación escrita por el admin. Obligatorio para acciones sensibles (validado server-side en F0.2): fuel_prices, password ops, toggle activo, deletes. Opcional para el resto.';

COMMENT ON COLUMN public.admin_audit_log.old_value IS
  'Estado previo al cambio. NULL para creates.';

COMMENT ON COLUMN public.admin_audit_log.new_value IS
  'Estado posterior al cambio. NULL para deletes.';

COMMENT ON COLUMN public.admin_audit_log.metadata IS
  'Contexto extensible (user-agent, estación, IP, etc.) sin alterar el schema.';

-- ── Índices ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_aal_created_at
  ON public.admin_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_aal_admin_id
  ON public.admin_audit_log (admin_id);

CREATE INDEX IF NOT EXISTS idx_aal_action
  ON public.admin_audit_log (action);

CREATE INDEX IF NOT EXISTS idx_aal_entity
  ON public.admin_audit_log (entity_type, entity_id);

-- ── RLS deny-all ──────────────────────────────────────────────
-- Sin policies: ningún acceso directo desde anon ni authenticated.
-- Lectura: solo via futura RPC get_admin_audit_log (SECURITY DEFINER).
-- Escritura: solo via RPC log_admin_action (SECURITY DEFINER) — F0.2.
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- ── Fin ───────────────────────────────────────────────────────

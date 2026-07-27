-- ============================================================
-- Dirección opcional del miembro (27-jul-2026)
-- ============================================================
-- Dato opcional del registro / Mi Cuenta: cantón de residencia con
-- cascada departamento → municipio → cantón (Quiché/Chichicastenango
-- preseleccionados en la UI). Se guarda SOLO si el cliente eligió
-- cantón — sin cantón queda NULL (no se inventan datos con los
-- valores preseleccionados).
-- Formato: {"dept": "Quiché", "muni": "Chichicastenango", "canton": "Chulumal II"}
-- ============================================================

ALTER TABLE members ADD COLUMN IF NOT EXISTS address jsonb;

COMMENT ON COLUMN members.address IS
  'Dirección opcional {dept, muni, canton}. NULL = no proporcionada. La UI preselecciona Quiché/Chichicastenango; solo se guarda al elegir cantón.';

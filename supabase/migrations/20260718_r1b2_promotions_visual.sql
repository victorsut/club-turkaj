-- ============================================================
-- Puntos Plus — R1b.2: promociones visuales (D33)
-- ============================================================
-- Vista PROMOCIONES del cliente según referencia visual (cards de
-- color con chips Todas/Combustible/Tienda/Servicios) + card 1:1 en
-- el cuadro del home. Enfoque HÍBRIDO acordado con el dueño (18-jul):
-- la card se COMPONE por código (fondo degradado + bloques de texto:
-- título arriba-izq, descripción debajo, restricciones abajo-izq) y
-- el "sujeto" de la imagen (producto/objeto, idealmente PNG con
-- transparencia) ocupa la zona media/inferior derecha. La imagen es
-- OPCIONAL: sin imagen la card usa el ícono emoji existente.
--
-- CAMBIOS:
--   1. promotions + 5 columnas (todas NULL = compatible con las
--      promos existentes):
--      - image_url      → URL pública del sujeto en Storage.
--      - category       → chip de la vista (combustible|tienda|
--                         servicios); NULL = solo aparece en "Todas".
--      - valid_until    → "Válido hasta DD/MM/AAAA" en el bloque de
--                         restricciones (solo informativo; la
--                         vigencia REAL de efectos vive en
--                         promo_rules — PROMO-1).
--      - conditions     → texto libre de restricciones/condiciones.
--      - promo_rule_id  → vínculo opcional con la regla del motor
--                         (documental en v1; ON DELETE SET NULL).
--   2. Bucket de Storage `promo-images` PÚBLICO para lectura (las
--      cards del cliente cargan la URL pública). SIN policies de
--      escritura en storage.objects → solo service_role puede subir
--      (bypasa RLS). La subida desde el admin pasa por el serverless
--      /api/upload-promo-image, que valida el token de sesión admin
--      (patrón SEC.B) y sube con la service key. Con la apikey anon
--      NO se puede escribir en el bucket.
--
-- NOTA RLS: promotions ya tenía sus policies (lectura abierta +
-- escritura client-first del admin, patrón F0.3.7) — esta migración
-- NO las toca. Las tablas nuevas no existen acá, así que el gotcha
-- del event trigger auto_enable_rls (policy restrictiva en CREATE
-- TABLE) no aplica.
--
-- REVERT copy-paste:
--   ALTER TABLE public.promotions
--     DROP COLUMN IF EXISTS image_url,
--     DROP COLUMN IF EXISTS category,
--     DROP COLUMN IF EXISTS valid_until,
--     DROP COLUMN IF EXISTS conditions,
--     DROP COLUMN IF EXISTS promo_rule_id;
--   DELETE FROM storage.buckets WHERE id = 'promo-images';
--     -- (falla si el bucket tiene objetos; vaciarlo antes desde el
--     --  dashboard de Storage)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Columnas nuevas en promotions
-- ============================================================
ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS image_url     text,
  ADD COLUMN IF NOT EXISTS category      text
    CHECK (category IS NULL OR category IN ('combustible', 'tienda', 'servicios')),
  ADD COLUMN IF NOT EXISTS valid_until   date,
  ADD COLUMN IF NOT EXISTS conditions    text,
  ADD COLUMN IF NOT EXISTS promo_rule_id uuid REFERENCES public.promo_rules(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.promotions.image_url IS
'R1b.2 (D33) — URL pública del sujeto de la imagen (Storage promo-images). NULL = la card usa el ícono emoji.';
COMMENT ON COLUMN public.promotions.category IS
'R1b.2 (D33) — chip de la vista Promociones: combustible|tienda|servicios. NULL = solo visible en "Todas".';
COMMENT ON COLUMN public.promotions.valid_until IS
'R1b.2 (D33) — fecha "Válido hasta" del bloque de restricciones (informativo; la vigencia real de efectos vive en promo_rules).';
COMMENT ON COLUMN public.promotions.conditions IS
'R1b.2 (D33) — texto libre de restricciones/condiciones (bloque inferior izquierdo de la card 4:3).';
COMMENT ON COLUMN public.promotions.promo_rule_id IS
'R1b.2 (D33) — vínculo opcional con la regla del motor PROMO-1 (documental en v1).';

-- ============================================================
-- 2. Bucket de Storage promo-images (lectura pública, escritura
--    SOLO service_role vía /api/upload-promo-image)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'promo-images', 'promo-images', true,
  2097152,  -- 2 MB por archivo (las cards móviles no necesitan más)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ============================================================
-- VERIFICACIÓN POST-APLICACIÓN (correr a mano en el SQL Editor):
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'promotions'
--     AND column_name IN ('image_url','category','valid_until','conditions','promo_rule_id');
--   -- esperado: 5 filas
--
--   SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'promo-images';
--   -- esperado: 1 fila, public = true
-- ============================================================

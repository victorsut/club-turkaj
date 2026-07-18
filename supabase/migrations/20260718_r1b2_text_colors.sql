-- ============================================================
-- Puntos Plus — R1b.2 ajuste: color individual por bloque de texto
-- ============================================================
-- Feedback del dueño (18-jul): cada bloque de la card (título,
-- descripción, condiciones) debe poder tener su propio color para
-- convivir con la imagen de fondo (p.ej. título claro sobre zona
-- oscura del arte y condiciones oscuras sobre zona clara).
--
-- text_colors jsonb: { "title": "#FFF", "desc": "#...", "conditions": "#..." }
-- NULL o clave ausente → fallback al text_color existente (las promos
-- actuales no cambian). text_color se mantiene como color general /
-- legacy (lo usa el preview compacto de la lista admin).
--
-- REVERT copy-paste:
--   ALTER TABLE public.promotions DROP COLUMN IF EXISTS text_colors;
-- ============================================================

ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS text_colors jsonb;

COMMENT ON COLUMN public.promotions.text_colors IS
'R1b.2 — Colores por bloque de la card: {title, desc, conditions}. NULL/clave ausente = fallback a text_color.';

-- ============================================================
-- VERIFICACIÓN POST-APLICACIÓN (correr a mano en el SQL Editor):
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'promotions' AND column_name = 'text_colors';
--   -- esperado: 1 fila
-- ============================================================

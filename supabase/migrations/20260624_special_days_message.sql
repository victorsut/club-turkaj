-- ============================================================
-- Club Turkaj + / Puntos+ — FB.6.2b: special_days.message
-- ============================================================
-- Migration FB.6.2b realiza TRES cambios coordinados en
-- special_days:
--
-- 1. BORRA la fila 'Semana Santa - Viernes Santo' (Viernes
--    Santo es fecha pascual movil, no fija como month=4 day=3
--    que solo coincide en 2026). El admin podra recrearla en
--    AdminPremios con la fecha correcta del año si la necesita.
--
-- 2. Corrige la ortografia de los nombres de 7 festivos para
--    agregar tildes y diereses faltantes (defecto historico
--    de la insercion inicial). Incluye 6 festivos activos
--    + 1 festivo inactivo ('Dia de la Asuncion').
--
-- 3. Agrega columna 'message' (text, nullable) para almacenar
--    la frase motivacional que mostrara el modal flotante de
--    bonus cuando el cliente reciba un bonus por dia especial.
--    Se pobla con frases para los 10 festivos activos + 1
--    inactivo ('Asuncion') por higiene de datos.
--
-- La columna es nullable: si esta vacia o NULL, el modal se
-- mostrara sin frase motivacional.
--
-- ORDEN DE OPERACIONES (importante):
-- 0) Borrar fila con fecha movil hardcodeada.
-- A) Corregir nombres (sin tildes -> con tildes).
-- B) Agregar columna message.
-- C) Poblar message usando los nombres NUEVOS corregidos.
--
-- Los admins podran editar cada frase desde AdminPremios
-- (FB.6.2d).
-- ============================================================

BEGIN;

-- ============================================================
-- A. Corregir ortografia de nombres (1 DELETE + 7 UPDATEs de name)
-- ============================================================

-- A0. Borrar festivo con fecha movil hardcodeada (deuda
--     historica). Si se necesita en el futuro, el admin lo
--     crea desde AdminPremios con la fecha correcta del año.
DELETE FROM public.special_days
WHERE name = 'Semana Santa - Viernes Santo';

UPDATE public.special_days SET name = 'Año Nuevo'
WHERE name = 'Ano Nuevo';

UPDATE public.special_days SET name = 'Día del Trabajador'
WHERE name = 'Dia del Trabajador';

UPDATE public.special_days SET name = 'Día del Ejército'
WHERE name = 'Dia del Ejercito';

UPDATE public.special_days SET name = 'Día de la Revolución'
WHERE name = 'Dia de la Revolucion';

UPDATE public.special_days SET name = 'Día de Todos los Santos'
WHERE name = 'Dia de Todos los Santos';

UPDATE public.special_days SET name = 'Feria de Santo Tomás'
WHERE name = 'Feria de Santo Tomas';

UPDATE public.special_days SET name = 'Día de la Asunción'
WHERE name = 'Dia de la Asuncion';

-- 4 nombres NO cambian (ya estan correctos):
-- - 'Cumpleaños del miembro'
-- - 'Aniversario Gasolineras Turkaj'
-- - 'Independencia de Guatemala'
-- - 'Navidad'

-- ============================================================
-- B. Agregar columna message
-- ============================================================

ALTER TABLE public.special_days
ADD COLUMN message text;

-- ============================================================
-- C. Poblar message usando los nombres CORREGIDOS
--    (10 festivos activos + 1 inactivo 'Asuncion')
-- ============================================================

UPDATE public.special_days SET message =
  'Que este nuevo año esté lleno de bendiciones, salud y momentos especiales.'
WHERE name = 'Cumpleaños del miembro';

UPDATE public.special_days SET message =
  'Que este año traiga prosperidad, alegría y nuevos comienzos.'
WHERE name = 'Año Nuevo';

UPDATE public.special_days SET message =
  'Reconocemos el esfuerzo y dedicación de quienes construyen Guatemala día a día.'
WHERE name = 'Día del Trabajador';

UPDATE public.special_days SET message =
  'Gracias por ser parte de nuestra historia. Tu confianza nos impulsa.'
WHERE name = 'Aniversario Gasolineras Turkaj';

UPDATE public.special_days SET message =
  'Honramos a quienes sirven con valor y compromiso a nuestra patria.'
WHERE name = 'Día del Ejército';

UPDATE public.special_days SET message =
  'Celebremos juntos la libertad y el orgullo de ser guatemaltecos.'
WHERE name = 'Independencia de Guatemala';

UPDATE public.special_days SET message =
  'Recordamos el camino hacia un futuro de oportunidades para todos.'
WHERE name = 'Día de la Revolución';

UPDATE public.special_days SET message =
  'Honramos la memoria de quienes ya no están con nosotros.'
WHERE name = 'Día de Todos los Santos';

UPDATE public.special_days SET message =
  'Chichicastenango celebra sus tradiciones. Tu hogar te abraza.'
WHERE name = 'Feria de Santo Tomás';

UPDATE public.special_days SET message =
  'Que la paz y el amor llenen tu hogar en estas fiestas.'
WHERE name = 'Navidad';

UPDATE public.special_days SET message =
  'Honramos esta fecha mariana con respeto y fe.'
WHERE name = 'Día de la Asunción';

-- ============================================================
-- Verificacion: confirmar conteos (10 activos + 1 inactivo) y
-- que todas las filas tienen message poblado.
-- ============================================================

DO $$
DECLARE
  v_active_null integer;
  v_inactive_null integer;
  v_total_active integer;
  v_total_inactive integer;
BEGIN
  SELECT COUNT(*) INTO v_active_null
  FROM public.special_days
  WHERE active = true AND message IS NULL;

  SELECT COUNT(*) INTO v_inactive_null
  FROM public.special_days
  WHERE active = false AND message IS NULL;

  SELECT COUNT(*) INTO v_total_active
  FROM public.special_days WHERE active = true;

  SELECT COUNT(*) INTO v_total_inactive
  FROM public.special_days WHERE active = false;

  RAISE NOTICE 'Total filas activas: % (esperado: 10)', v_total_active;
  RAISE NOTICE 'Total filas inactivas: % (esperado: 1)', v_total_inactive;
  RAISE NOTICE 'Filas activas sin message: %', v_active_null;
  RAISE NOTICE 'Filas inactivas sin message: %', v_inactive_null;

  IF v_active_null > 0 THEN
    RAISE WARNING 'Hay % filas ACTIVAS sin message poblado.', v_active_null;
  END IF;

  IF v_inactive_null > 0 THEN
    RAISE WARNING 'Hay % filas INACTIVAS sin message poblado.', v_inactive_null;
  END IF;

  IF v_total_active <> 10 THEN
    RAISE WARNING 'Cantidad de filas activas (%) NO coincide con 10 esperadas.', v_total_active;
  END IF;

  IF v_total_inactive <> 1 THEN
    RAISE WARNING 'Cantidad de filas inactivas (%) NO coincide con 1 esperada.', v_total_inactive;
  END IF;
END $$;

COMMIT;

-- Fin

-- ============================================================
-- SEC.C.6 (corrección) — ELIMINAR LAS FIRMAS VIEJAS SIN SESIÓN
-- ============================================================
-- La migración 20260811d agregó p_session_token a cinco funciones,
-- pero al CAMBIAR la firma, PostgreSQL creó una SOBRECARGA nueva en
-- vez de reemplazar la vieja: las versiones originales (sin token, sin
-- validación, ejecutables por anon) quedaron VIVAS en paralelo. El
-- agujero seguía abierto por la firma vieja. Esta migración las
-- elimina; quedan solo las versiones nuevas, cuyo p_session_token
-- tiene DEFAULT NULL, así que siguen resolviendo llamadas con o sin el
-- parámetro — y validan la sesión en ambos casos.
--
-- Verificado antes de escribir: ninguna de las firmas viejas se invoca
-- internamente desde otra función (son puntos de entrada del cliente).
-- DROP sin CASCADE: si hubiera alguna dependencia oculta, falla en vez
-- de romper en silencio.
-- ============================================================

DROP FUNCTION IF EXISTS public.redeem_reward(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.complete_survey(uuid);
DROP FUNCTION IF EXISTS public.grant_special_day_bonus(uuid);
DROP FUNCTION IF EXISTS public.update_member_password(uuid, text, text);
DROP FUNCTION IF EXISTS public.admin_reset_member_password(uuid, text, uuid, text, text, text);

-- ============================================================
-- VERIFICAR tras ejecutar — cada función debe aparecer UNA sola vez y
-- SIEMPRE con validación de sesión:
--
--   SELECT p.proname,
--          pg_get_function_identity_arguments(p.oid) AS args
--   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--   WHERE n.nspname='public'
--     AND p.proname IN ('redeem_reward','complete_survey',
--       'grant_special_day_bonus','update_member_password',
--       'admin_reset_member_password')
--   ORDER BY p.proname;
--   → 5 filas, todas con 'p_session_token' en args.
--
--   SELECT public.redeem_reward(gen_random_uuid(), gen_random_uuid());
--   → error 28000 "Sesión inválida" (ya no ejecuta la versión vieja).
-- ============================================================

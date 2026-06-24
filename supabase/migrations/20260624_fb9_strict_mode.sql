-- ============================================================
-- Club Turkaj + / Puntos+ — FB.9: activar modo strict
-- ============================================================
-- Cambia v_mode de 'warn' a 'strict' en la función trigger
-- members_guard_points_write.
--
-- A partir de este deploy, cualquier UPDATE a members.points
-- sin app.allow_points_write='true' será RECHAZADO con
-- ERRCODE 42501 (insufficient_privilege).
--
-- JUSTIFICACIÓN:
-- - FB.8: 28 tests exhaustivos pasaron, 0 violations.
-- - Producción: 12+ horas sin violations desde deploy FB.7.
-- - Validación funcional real: Ezer recibió bonus de cumpleaños
--   sin disparar trigger.
-- - Las 7 RPCs autorizadas setean correctamente el flag.
--
-- COMPORTAMIENTO POST-STRICT:
-- - UPDATE directo vía Dashboard SQL Editor sin flag: RAISE
--   EXCEPTION 42501.
-- - Cualquier RPC autorizada sigue funcionando sin cambios.
-- - Trigger sigue siendo column-aware: solo dispara cuando
--   OLD.points IS DISTINCT FROM NEW.points.
--
-- EMERGENCY OVERRIDE:
-- Si el equipo necesita editar points vía SQL Editor por
-- alguna razón legítima, puede setear el flag manualmente:
--   SELECT set_config('app.allow_points_write', 'true', true);
--   UPDATE members SET points = ... WHERE id = ...;
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.members_guard_points_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_allowed text;
  v_mode    text := 'strict';  -- FB.9: cambio de 'warn' a 'strict'
  v_delta   integer;
BEGIN
  v_allowed := current_setting('app.allow_points_write', true);

  IF v_allowed IS DISTINCT FROM 'true' THEN
    v_delta := COALESCE(NEW.points, 0) - COALESCE(OLD.points, 0);

    -- Registrar la violación en tabla dedicada (siempre, en ambos modos)
    INSERT INTO public.points_write_violations (
      member_id,
      old_points,
      new_points,
      delta,
      session_user_name,
      current_user_name,
      application_name
    ) VALUES (
      NEW.id,
      OLD.points,
      NEW.points,
      v_delta,
      session_user::text,
      current_user::text,
      COALESCE(current_setting('application_name', true), 'unknown')
    );

    IF v_mode = 'strict' THEN
      RAISE EXCEPTION
        'UPDATE de members.points no autorizado. Use modify_member_points u otra RPC autorizada. Member: %, Delta: %',
        NEW.id, v_delta
        USING ERRCODE = '42501';
    ELSE
      RAISE WARNING
        'UPDATE de members.points sin autorizacion (modo warn). Member: %, Delta: %. Registrado en points_write_violations.',
        NEW.id, v_delta;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.members_guard_points_write() IS
'FB.9 — Trigger function en modo STRICT. Rechaza UPDATEs a
members.points sin app.allow_points_write=true con ERRCODE
42501. Las 7 RPCs autorizadas (register_purchase, redeem_reward,
buy_raffle_tickets, complete_survey, modify_member_points,
update_member_with_audit, grant_special_day_bonus) setean el
flag antes de su UPDATE.';

COMMIT;

-- Fin

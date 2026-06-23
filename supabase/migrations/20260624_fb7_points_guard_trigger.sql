-- ============================================================
-- Club Turkaj + / Puntos+ — FB.7: Guard trigger en members.points
-- ============================================================
-- Crea la defensa final del bloque FB: un trigger BEFORE UPDATE
-- column-aware sobre members.points que rechaza cualquier
-- modificacion sin la session variable app.allow_points_write
-- seteada a 'true'.
--
-- Esta defensa cierra el ultimo agujero del modelo de auditoria:
-- edicion directa via Supabase Dashboard SQL Editor (o cualquier
-- otro vector que no pase por las 7 RPCs autorizadas).
--
-- Las 7 RPCs autorizadas que setean el flag legitimamente:
--   1. register_purchase
--   2. redeem_reward
--   3. buy_raffle_tickets
--   4. complete_survey
--   5. modify_member_points
--   6. update_member_with_audit
--   7. grant_special_day_bonus
--
-- MODO DE OPERACION:
--
-- Inicialmente: 'warn' — registra violaciones en
-- points_write_violations + RAISE WARNING, pero permite el
-- UPDATE. Esto da periodo de observacion para detectar
-- writers olvidados en produccion sin romper nada.
--
-- En FB.9: cambiar a 'strict' — RAISE EXCEPTION y bloquea
-- el UPDATE.
--
-- COLUMN-AWARE: el trigger solo dispara cuando
-- OLD.points IS DISTINCT FROM NEW.points. Esto permite que
-- los UPDATEs a otros campos (name, phone, plate, vehicles,
-- card_id, auth_provider_id, etc.) sigan funcionando sin
-- necesidad de setear el flag.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Tabla de violaciones (auditoria estructurada)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.points_write_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid,
  old_points integer,
  new_points integer,
  delta integer,
  session_user_name text,
  current_user_name text,
  application_name text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.points_write_violations IS
'FB.7 — Registra UPDATEs a members.points que NO fueron
autorizados via app.allow_points_write. En modo warn, son
logueados pero permitidos. En modo strict (FB.9), seran
rechazados. Esta tabla permite auditoria estructurada y
deteccion de writers olvidados durante el periodo de
observacion.';

-- Permisos: solo service_role puede leer. Otros usuarios no.
REVOKE ALL ON TABLE public.points_write_violations FROM PUBLIC;
GRANT SELECT, INSERT ON TABLE public.points_write_violations
  TO service_role;

-- ============================================================
-- 2. Funcion del trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.members_guard_points_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_allowed text;
  v_mode    text := 'warn';  -- 'warn' inicial, cambiar a 'strict' en FB.9
  v_delta   integer;
BEGIN
  v_allowed := current_setting('app.allow_points_write', true);

  IF v_allowed IS DISTINCT FROM 'true' THEN
    v_delta := COALESCE(NEW.points, 0) - COALESCE(OLD.points, 0);

    -- Registrar la violacion en tabla dedicada
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
'FB.7 — Trigger function que verifica app.allow_points_write
antes de permitir UPDATE a members.points. Modo inicial: warn
(logea + permite). Modo final (FB.9): strict (logea + rechaza).
Las 7 RPCs autorizadas setean app.allow_points_write=true antes
de su UPDATE.';

-- ============================================================
-- 3. Trigger column-aware
-- ============================================================

DROP TRIGGER IF EXISTS members_guard_points ON public.members;

CREATE TRIGGER members_guard_points
BEFORE UPDATE ON public.members
FOR EACH ROW
WHEN (OLD.points IS DISTINCT FROM NEW.points)
EXECUTE FUNCTION public.members_guard_points_write();

COMMENT ON TRIGGER members_guard_points ON public.members IS
'FB.7 — Trigger column-aware: dispara solo cuando
OLD.points IS DISTINCT FROM NEW.points. UPDATEs a otros
campos (name, phone, plate, vehicles, etc.) no requieren
autorizacion.';

COMMIT;

-- Fin

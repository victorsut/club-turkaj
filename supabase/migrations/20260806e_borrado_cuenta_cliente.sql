-- ============================================================
-- BORRADO DE CUENTA DESDE EL CLIENTE (6-ago-2026, pedido del dueño)
-- ============================================================
-- Soft delete con ANONIMIZACIÓN IRREVERSIBLE de la PII. La fila de
-- members se conserva (integridad referencial de purchases/redemptions/
-- activity_log — la contabilidad no pierde filas) pero queda vaciada de
-- todo dato personal y NO puede volver a usarse ni recuperarse:
--   · name 'Cuenta eliminada' · nickname/dpi/nit/email/birthday/
--     address/vehículos/avatar → NULL/vacío
--   · phone → 'DEL-<hash del id>' (UNIQUE se conserva; ya no es un
--     teléfono marcable ni logueable)
--   · password_hash '!' (jamás matchea bcrypt)
--   · vínculo Google (auth_provider/auth_provider_id) → NULL — el
--     fallback por email tampoco aplica (email NULL)
--   · credenciales de huella (member_credentials) ELIMINADAS
--   · sesiones (member_sessions) y suscripciones push ELIMINADAS
--   · points/gallons/tickets → 0 (la tarjeta CT queda sin valor)
--   · boletos de rifas AÚN NO sorteadas eliminados (una cuenta
--     eliminada no puede ganar); los de rifas ya sorteadas se quedan
--     (histórico del sorteo)
--   · deleted_at = marca del soft delete
-- Guarda central: issue_member_session RECHAZA miembros eliminados —
-- ninguna vía (teléfono, Google, huella) puede emitir sesión nueva.
-- El RPC exige la palabra ELIMINAR (server-side, además de la UI).
-- ============================================================

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.members.deleted_at IS
  'Soft delete del cliente (delete_my_account): fila anonimizada e irrecuperable.';

-- ── Guarda central: sin sesiones nuevas para cuentas eliminadas ──
CREATE OR REPLACE FUNCTION public.issue_member_session(p_member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_token   text;
  v_expires timestamptz;
BEGIN
  -- Borrado de cuenta (6-ago): defensa en profundidad — aunque alguna
  -- vía de login resolviera un miembro eliminado, no se emite sesión.
  IF EXISTS (SELECT 1 FROM members WHERE id = p_member_id AND deleted_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Cuenta eliminada' USING ERRCODE = '28000', DETAIL = 'account_deleted';
  END IF;

  INSERT INTO member_sessions (member_id)
  VALUES (p_member_id)
  RETURNING token, expires_at INTO v_token, v_expires;
  RETURN jsonb_build_object('session_token', v_token, 'session_expires_at', v_expires);
END;
$$;

-- ── RPC del cliente: borrar la propia cuenta ─────────────────
CREATE OR REPLACE FUNCTION public.delete_my_account(p_session_token text, p_confirm text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_mid uuid;
BEGIN
  v_mid := public.validate_session_token(p_session_token, 'member', 'delete_my_account', false, NULL);

  -- Fricción server-side: la UI ya exige tipear ELIMINAR; acá se
  -- verifica de nuevo (ningún cliente alterado puede saltársela).
  IF upper(COALESCE(trim(p_confirm), '')) <> 'ELIMINAR' THEN
    RETURN jsonb_build_object('error', 'Confirmación inválida');
  END IF;

  -- Autoriza el trigger BEFORE UPDATE de FB.7 (cuando exista).
  PERFORM set_config('app.allow_points_write', 'true', true);

  UPDATE members SET
    name             = 'Cuenta eliminada',
    nickname         = NULL,
    phone            = 'DEL-' || left(replace(v_mid::text, '-', ''), 12),
    dpi              = NULL,
    plate            = NULL,
    nit              = NULL,
    email            = NULL,
    birthday         = NULL,
    address          = NULL,
    vehicles         = '[]'::jsonb,
    avatar_url       = NULL,
    auth_provider    = NULL,
    auth_provider_id = NULL,
    phone_verified   = false,
    password_hash    = '!',
    points           = 0,
    gallons          = 0,
    tickets          = 0,
    degrade_stage    = 0,
    degrade_base_gal = NULL,
    deleted_at       = now(),
    updated_at       = now()
  WHERE id = v_mid AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'La cuenta ya fue eliminada');
  END IF;

  -- Boletos de rifas SIN sortear (no puede ganar una cuenta eliminada).
  DELETE FROM raffle_tickets rt
  USING raffle_calendar rc
  WHERE rt.raffle_id = rc.id AND rt.member_id = v_mid AND rc.winner_id IS NULL;

  -- Solicitudes de confirmación vivas quedan sin efecto (los canjes
  -- pendientes ya no pueden confirmarse sin sesión).
  UPDATE redemptions SET confirm_status = 'none'
  WHERE member_id = v_mid AND collected = false AND confirm_status <> 'none';

  -- Credenciales de huella, push y TODAS las sesiones (todos los
  -- dispositivos quedan afuera al instante).
  DELETE FROM member_credentials WHERE member_id = v_mid;
  DELETE FROM push_subscriptions WHERE member_id = v_mid;
  DELETE FROM member_sessions    WHERE member_id = v_mid;

  -- Foto personalizada del bucket avatars (best effort — si el esquema
  -- storage no está accesible, la anonimización no se bloquea).
  BEGIN
    DELETE FROM storage.objects
    WHERE bucket_id = 'avatars' AND name LIKE v_mid::text || '/%';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_my_account(text, text) TO anon, authenticated;

-- ============================================================
-- VERIFICAR tras ejecutar (con una CUENTA DE PRUEBA):
--   1. Menú → Mi Cuenta → Eliminar mi cuenta → tipear ELIMINAR →
--      la app cierra sesión sola.
--   2. SELECT name, phone, dpi, email, auth_provider_id, deleted_at
--        FROM members WHERE id = '<id>';  → todo anonimizado.
--   3. Re-login imposible: teléfono ("Número no registrado"), Google
--      (→ registro) y huella (sin credenciales / sesión rechazada).
--   4. Sus compras/canjes históricos siguen en purchases/redemptions
--      (contabilidad intacta) atribuidos a "Cuenta eliminada".
--   5. Escanear su tarjeta CT muestra la cuenta anonimizada con 0 pts.
-- ============================================================

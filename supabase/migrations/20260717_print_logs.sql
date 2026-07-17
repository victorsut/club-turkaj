-- ============================================================
-- Puntos Plus — FA-lite: print_logs + RPC log_print (D37/D29)
-- ============================================================
-- Trazabilidad best-effort de impresiones de comprobantes de canje.
-- Desde el navegador no se puede confirmar la salida física del
-- papel → el status registrado es 'initiated'. Las REIMPRESIONES
-- quedan encadenadas (reprint_of) para control anti-abuso.
--
-- Seguridad: escritura SOLO vía RPC log_print con token de sesión de
-- OPERADOR validado en modo STRICT (validate_session_token, SEC.B.8.1
-- → RAISE 28000 si el token es inválido). RLS deny-all en la tabla.
-- operator_id/member_id/station_id se derivan SERVER-SIDE (token +
-- redemptions + operators), no se confía en el cliente.
--
-- REVERT copy-paste:
--   DROP FUNCTION public.log_print(uuid, text, text, text);
--   DROP TABLE public.print_logs;
-- ============================================================

CREATE TABLE IF NOT EXISTS public.print_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  redemption_id uuid REFERENCES public.redemptions(id) ON DELETE SET NULL,
  member_id     uuid REFERENCES public.members(id) ON DELETE SET NULL,
  operator_id   uuid REFERENCES public.operators(id) ON DELETE SET NULL,
  station_id    uuid,  -- sin FK hasta que F1 formalice stations
  copy_type     text NOT NULL CHECK (copy_type IN ('auto', 'manual', 'reprint')),
  print_status  text NOT NULL DEFAULT 'initiated' CHECK (print_status IN ('initiated', 'failed')),
  printer_hint  text,  -- user-agent truncado del dispositivo que imprimió
  reprint_of    uuid REFERENCES public.print_logs(id),  -- cadena de reimpresiones
  printed_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.print_logs IS
  'FA-lite — Log best-effort de impresiones de comprobantes. Escritura solo vía RPC log_print (token operador STRICT). Lectura futura vía RPC admin.';

CREATE INDEX IF NOT EXISTS idx_pl_redemption ON public.print_logs (redemption_id);
CREATE INDEX IF NOT EXISTS idx_pl_operator   ON public.print_logs (operator_id, printed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pl_printed_at ON public.print_logs (printed_at DESC);

-- RLS deny-all: sin policies, todo acceso pasa por RPCs DEFINER.
ALTER TABLE public.print_logs ENABLE ROW LEVEL SECURITY;

-- ── RPC log_print ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_print(
  p_redemption_id uuid,
  p_copy_type     text,
  p_session_token text DEFAULT NULL,
  p_printer_hint  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operator_id uuid;
  v_member_id   uuid;
  v_station_id  uuid;
  v_reprint_of  uuid;
  v_id          uuid;
BEGIN
  -- (1) Sesión de operador obligatoria (STRICT: RAISE 28000 si falla).
  v_operator_id := public.validate_session_token(
    p_session_token, 'operator', 'log_print', false, NULL
  );

  -- (2) Validaciones de negocio.
  IF p_redemption_id IS NULL THEN
    RAISE EXCEPTION 'redemption_id es obligatorio' USING ERRCODE = '22023';
  END IF;
  IF p_copy_type IS NULL OR p_copy_type NOT IN ('auto', 'manual', 'reprint') THEN
    RAISE EXCEPTION 'copy_type inválido (auto|manual|reprint)' USING ERRCODE = '22023';
  END IF;

  -- (3) Derivar datos server-side (no se confía en el cliente).
  SELECT member_id INTO v_member_id FROM redemptions WHERE id = p_redemption_id;
  SELECT station_id INTO v_station_id FROM operators WHERE id = v_operator_id;

  -- (4) Reimpresión: encadenar con la impresión previa de ese canje.
  IF p_copy_type = 'reprint' THEN
    SELECT id INTO v_reprint_of
    FROM print_logs
    WHERE redemption_id = p_redemption_id
    ORDER BY printed_at DESC
    LIMIT 1;
  END IF;

  INSERT INTO print_logs (
    redemption_id, member_id, operator_id, station_id,
    copy_type, printer_hint, reprint_of
  ) VALUES (
    p_redemption_id, v_member_id, v_operator_id, v_station_id,
    p_copy_type, left(p_printer_hint, 200), v_reprint_of
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('log_id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION public.log_print(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_print(uuid, text, text, text)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.log_print(uuid, text, text, text) IS
'FA-lite — Registra una impresión de comprobante en print_logs. Exige sesión de operador válida (STRICT 28000). Deriva operator/member/station server-side; encadena reimpresiones vía reprint_of. EXECUTE: anon (operadores usan anon key), authenticated, service_role.';

-- ── Fin ───────────────────────────────────────────────────────

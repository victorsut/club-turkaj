-- ═══════════════════════════════════════════════════════════════
-- F7a — API REST PARA SISTEMAS EXTERNOS (PROPER)   29-jul-2026
--
-- D9 del ROADMAP: Puntos Plus EXPONE la API, PROPER la consume —
-- nosotros controlamos el contrato.
--
-- Flujo acordado con el dueño:
--   1. PROPER cierra la factura en su POS.
--   2. Muestra un botón "Acumular Puntos Plus" → escanea el QR del
--      cliente (CTOD/CTPD/CTBD-NNNNN).
--   3. Envía a esta API los datos REALES de la factura: galones,
--      monto, tipo de combustible, NIT y el colaborador que atendió.
--   4. Puntos Plus valida, acredita y devuelve el resultado para que
--      PROPER lo muestre o imprima.
--   Además, en su pantalla de inicio, un botón "Comprobante de premio"
--   escanea el QR del canje (TK-XXXXXX) y obtiene los datos a imprimir.
--
-- REGLA DE NIT (decisión del dueño, calca D11):
--   · Miembro CON nit registrado  → solo facturas con SU nit o con CF.
--   · Miembro SIN nit registrado  → solo facturas con CF.
--   Cualquier otro NIT se RECHAZA (la factura es de otra persona).
--
-- IDENTIDAD DEL COLABORADOR: PROPER tiene su propia base de personal.
-- Manda su identificador y nombre; Puntos Plus mantiene un operador
-- ESPEJO (operators.external_id + external_source='proper') que NO
-- puede iniciar sesión en la app (password_hash imposible). Así las
-- compras quedan atribuidas y el ranking de operadores sigue vivo.
--
-- SEGURIDAD: API key por cliente (bcrypt), scopes, idempotencia por
-- `Idempotency-Key` y bitácora de cada llamada. Ninguna tabla se abre
-- a anon/authenticated: los endpoints corren con service key.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Clientes de la API ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_clients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  key_prefix   text NOT NULL,                 -- 8 chars visibles (identifica la llave sin revelarla)
  key_hash     text NOT NULL,                 -- bcrypt de la llave completa
  scopes       text[] NOT NULL DEFAULT ARRAY['purchases:write','redemptions:read'],
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS api_clients_prefix_idx ON public.api_clients (key_prefix);
ALTER TABLE public.api_clients ENABLE ROW LEVEL SECURITY;

-- ── 2. Bitácora de llamadas + idempotencia ─────────────────────
CREATE TABLE IF NOT EXISTS public.api_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_client_id   uuid REFERENCES public.api_clients(id) ON DELETE SET NULL,
  endpoint        text NOT NULL,
  idempotency_key text,
  request         jsonb,
  response        jsonb,
  status_code     integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS api_requests_idem_idx
  ON public.api_requests (api_client_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS api_requests_created_idx ON public.api_requests (created_at DESC);
ALTER TABLE public.api_requests ENABLE ROW LEVEL SECURITY;

-- ── 3. Operadores espejo del sistema externo ───────────────────
ALTER TABLE public.operators
  ADD COLUMN IF NOT EXISTS external_id     text,
  ADD COLUMN IF NOT EXISTS external_source text;
CREATE UNIQUE INDEX IF NOT EXISTS operators_external_idx
  ON public.operators (external_source, external_id)
  WHERE external_id IS NOT NULL;

COMMENT ON COLUMN public.operators.external_id IS
'F7a: identificador del colaborador en el sistema externo (PROPER).
Los operadores espejo no pueden iniciar sesión en la app.';

-- ── 4. Autenticación de la API ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.api_authenticate(p_key text, p_scope text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_prefix text := left(COALESCE(p_key, ''), 8);
  v_c      api_clients%ROWTYPE;
BEGIN
  IF COALESCE(p_key, '') = '' THEN
    RETURN jsonb_build_object('error', 'missing_api_key');
  END IF;

  SELECT * INTO v_c FROM api_clients WHERE key_prefix = v_prefix;
  IF NOT FOUND OR NOT v_c.active THEN
    RETURN jsonb_build_object('error', 'invalid_api_key');
  END IF;
  IF v_c.key_hash <> extensions.crypt(p_key, v_c.key_hash) THEN
    RETURN jsonb_build_object('error', 'invalid_api_key');
  END IF;
  IF p_scope IS NOT NULL AND NOT (p_scope = ANY (v_c.scopes)) THEN
    RETURN jsonb_build_object('error', 'insufficient_scope');
  END IF;

  UPDATE api_clients SET last_used_at = now() WHERE id = v_c.id;
  RETURN jsonb_build_object('ok', true, 'client_id', v_c.id, 'name', v_c.name);
END;
$function$;

-- Alta de llaves (solo admin desde el panel o SQL). Devuelve la llave
-- EN CLARO una única vez: no se puede recuperar después.
CREATE OR REPLACE FUNCTION public.api_create_client(
  p_session_token text,
  p_name          text,
  p_scopes        text[] DEFAULT ARRAY['purchases:write','redemptions:read']
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_key text;
  v_id  uuid;
BEGIN
  PERFORM public.validate_session_token(p_session_token, 'admin', 'api_create_client', false, NULL);
  -- pp_live_<48 hex>
  v_key := 'pp_live_' || encode(extensions.gen_random_bytes(24), 'hex');
  INSERT INTO api_clients (name, key_prefix, key_hash, scopes)
  VALUES (p_name, left(v_key, 8), extensions.crypt(v_key, extensions.gen_salt('bf', 8)), p_scopes)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'client_id', v_id, 'api_key', v_key);
END;
$function$;

-- ── 5. Normalización y regla de NIT ────────────────────────────
CREATE OR REPLACE FUNCTION public.normalize_nit(p_nit text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT CASE
    WHEN upper(regexp_replace(COALESCE(p_nit, ''), '[^A-Za-z0-9]', '', 'g'))
         IN ('CF', 'CF0', 'CONSUMIDORFINAL', '') THEN 'CF'
    ELSE upper(regexp_replace(p_nit, '[^A-Za-z0-9]', '', 'g'))
  END;
$function$;

COMMENT ON FUNCTION public.normalize_nit(text) IS
'F7a: normaliza el NIT de la factura — quita guiones/espacios, mayúsculas
y unifica las variantes de consumidor final a ''CF''.';

-- ── 6. Resolver miembro por QR (identificación) ────────────────
CREATE OR REPLACE FUNCTION public.api_resolve_member(p_card_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_m      RECORD;
  v_code   text := upper(trim(COALESCE(p_card_code, '')));
BEGIN
  IF v_code !~ '^CT[OPB]D-[0-9]+$' THEN
    RETURN jsonb_build_object('error', 'invalid_card_code');
  END IF;

  SELECT m.id, m.name, m.nit, m.points, m.gallons
    INTO v_m
  FROM physical_cards pc
  JOIN members m ON m.id = pc.assigned_to
  WHERE pc.card_code = v_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'member_not_found');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'member_id',    v_m.id,
    'name',         v_m.name,
    'tier',         public.get_member_tier(v_m.gallons),
    'points',       v_m.points,
    -- Para que el POS avise ANTES de facturar con qué NIT puede emitir.
    'has_nit',      v_m.nit IS NOT NULL AND trim(v_m.nit) <> '',
    'nit_masked',   CASE WHEN v_m.nit IS NULL OR trim(v_m.nit) = '' THEN NULL
                         ELSE '****' || right(public.normalize_nit(v_m.nit), 4) END,
    'accepted_nits', CASE WHEN v_m.nit IS NULL OR trim(v_m.nit) = ''
                          THEN jsonb_build_array('CF')
                          ELSE jsonb_build_array('CF', public.normalize_nit(v_m.nit)) END
  );
END;
$function$;

-- ── 7. Alta/actualización del colaborador externo ──────────────
CREATE OR REPLACE FUNCTION public.api_upsert_operator(
  p_external_id text,
  p_name        text,
  p_station_id  uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM operators
  WHERE external_source = 'proper' AND external_id = p_external_id;

  IF v_id IS NULL THEN
    INSERT INTO operators (
      name, username, password_hash, dpi, gafete,
      station_id, active, external_id, external_source
    ) VALUES (
      COALESCE(NULLIF(trim(p_name), ''), 'Colaborador PROPER'),
      'proper_' || regexp_replace(lower(p_external_id), '[^a-z0-9]', '', 'g'),
      '!',                       -- hash imposible: no puede loguearse en la app
      NULL, 'PROPER-' || p_external_id,
      p_station_id, true, p_external_id, 'proper'
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE operators SET
      name       = COALESCE(NULLIF(trim(p_name), ''), name),
      station_id = COALESCE(p_station_id, station_id),
      updated_at = now()
    WHERE id = v_id;
  END IF;

  RETURN v_id;
END;
$function$;

-- ── 8. Registro de compra desde el POS externo ─────────────────
-- Reutiliza el motor de puntos y promociones ya probado: calcula los
-- mismos puntos (Q por punto) pero usa los GALONES REALES de la
-- factura (el surtidor es más preciso que amount/precio de lista).
CREATE OR REPLACE FUNCTION public.api_register_purchase(
  p_api_client_id  uuid,
  p_card_code      text,
  p_amount         numeric,
  p_gallons        numeric,
  p_fuel_type      text,
  p_nit            text,
  p_invoice_no     text,
  p_station_id     uuid,
  p_operator_ext   text,
  p_operator_name  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_member      RECORD;
  v_code        text := upper(trim(COALESCE(p_card_code, '')));
  v_nit         text := public.normalize_nit(p_nit);
  v_member_nit  text;
  v_operator_id uuid;
  v_fuel        text := lower(COALESCE(p_fuel_type, 'regular'));
  v_q_per_pt    integer;
  v_points      integer;
  v_extra       integer := 0;
  v_points_final integer;
  v_promo       jsonb;
  v_promo_suffix text := '';
  v_purchase_id uuid;
  v_old_gal     numeric;
  v_new_gal     numeric;
  v_old_tier    text;
  v_new_tier    text;
  v_card_id     uuid;
  v_old_code    text;
  v_new_code    text;
  v_correlative text;
  v_prefix      text;
  v_red_code    text;
  v_red_id      uuid;
  v_grant       integer := 0;
  v_effect      jsonb;
BEGIN
  -- ── Validaciones de entrada ──
  IF v_code !~ '^CT[OPB]D-[0-9]+$' THEN
    RETURN jsonb_build_object('error', 'invalid_card_code');
  END IF;
  IF p_amount IS NULL OR p_amount < 10 THEN
    RETURN jsonb_build_object('error', 'amount_too_low', 'detail', 'El monto mínimo es Q10');
  END IF;
  IF p_gallons IS NULL OR p_gallons <= 0 THEN
    RETURN jsonb_build_object('error', 'invalid_gallons');
  END IF;
  IF v_fuel NOT IN ('super', 'regular', 'diesel') THEN
    RETURN jsonb_build_object('error', 'invalid_fuel_type',
      'detail', 'Valores válidos: super, regular, diesel');
  END IF;
  IF p_station_id IS NULL OR NOT EXISTS (SELECT 1 FROM stations WHERE id = p_station_id) THEN
    RETURN jsonb_build_object('error', 'invalid_station');
  END IF;

  SELECT m.id, m.nit, m.gallons, m.card_id, m.name
    INTO v_member
  FROM physical_cards pc
  JOIN members m ON m.id = pc.assigned_to
  WHERE pc.card_code = v_code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'member_not_found');
  END IF;

  -- ── REGLA DE NIT ──
  v_member_nit := public.normalize_nit(v_member.nit);
  IF v_member.nit IS NULL OR trim(v_member.nit) = '' THEN
    -- Sin NIT registrado: SOLO consumidor final.
    IF v_nit <> 'CF' THEN
      RETURN jsonb_build_object('error', 'nit_mismatch',
        'detail', 'El cliente no tiene NIT registrado: solo se acreditan facturas con CF');
    END IF;
  ELSE
    -- Con NIT registrado: su propio NIT o CF.
    IF v_nit <> 'CF' AND v_nit <> v_member_nit THEN
      RETURN jsonb_build_object('error', 'nit_mismatch',
        'detail', 'La factura debe emitirse con CF o con el NIT del cliente');
    END IF;
  END IF;

  -- ── Colaborador (espejo del sistema externo) ──
  IF COALESCE(trim(p_operator_ext), '') = '' THEN
    RETURN jsonb_build_object('error', 'missing_operator');
  END IF;
  v_operator_id := public.api_upsert_operator(trim(p_operator_ext), p_operator_name, p_station_id);

  -- ── Puntos base (misma fórmula del programa: Q10 = 1 punto) ──
  SELECT (value->>'qPerPt')::integer INTO v_q_per_pt FROM program_config WHERE key = 'general';
  IF v_q_per_pt IS NULL OR v_q_per_pt = 0 THEN v_q_per_pt := 10; END IF;
  v_points := FLOOR(p_amount / v_q_per_pt);

  v_old_gal  := v_member.gallons;
  v_card_id  := v_member.card_id;
  v_new_gal  := v_old_gal + p_gallons;
  v_old_tier := public.get_member_tier(v_old_gal);
  v_new_tier := public.get_member_tier(v_new_gal);

  -- ── PROMO-1: misma selección sin stacking que el flujo del operador ──
  v_promo := public.pick_best_promo(p_amount, v_fuel, p_station_id, v_old_tier, v_points, v_member.id);
  IF v_promo IS NOT NULL THEN
    v_extra := (v_promo->>'extra_points')::integer;
    IF v_promo->>'effect_type' = 'grant_reward' THEN
      v_promo_suffix := ' · 🎁 ' || (v_promo->>'reward_name') || ' gratis';
    ELSIF v_promo->>'effect_type' = 'points_multiplier' THEN
      v_promo_suffix := ' · 🎉 x' || (v_promo->>'effect_value') || ' (+' || v_extra || ')';
    ELSE
      v_promo_suffix := ' · 🎉 +' || v_extra;
    END IF;
  END IF;
  v_points_final := v_points + v_extra;

  INSERT INTO purchases (member_id, operator_id, station_id, amount, fuel_type, gallons, points_earned, invoice_no)
  VALUES (v_member.id, v_operator_id, p_station_id, p_amount, v_fuel, p_gallons, v_points_final, p_invoice_no)
  RETURNING id INTO v_purchase_id;

  -- PROMO-1b: premio gratis → canje cost-0 con su código TK.
  IF v_promo IS NOT NULL AND v_promo->>'effect_type' = 'grant_reward' THEN
    v_red_code := 'TK-' || upper(substring(md5(random()::text || clock_timestamp()::text), 1, 6));
    INSERT INTO redemptions (member_id, reward_id, operator_id, points_spent, discount_applied, redemption_code)
    VALUES (v_member.id, (v_promo->>'reward_id')::uuid, NULL, 0, 0, v_red_code)
    RETURNING id INTO v_red_id;
    v_grant := 1;
    v_promo := v_promo || jsonb_build_object('redemption_code', v_red_code, 'redemption_id', v_red_id);
  END IF;

  IF v_promo IS NOT NULL THEN
    v_effect := jsonb_build_object('type', v_promo->>'effect_type',
                                   'value', (v_promo->>'effect_value')::numeric,
                                   'extra_points', v_extra);
    IF v_grant = 1 THEN
      v_effect := v_effect || jsonb_build_object(
        'reward_id', v_promo->>'reward_id', 'reward_name', v_promo->>'reward_name',
        'redemption_id', v_red_id, 'redemption_code', v_red_code);
    END IF;
    INSERT INTO promo_applications (promo_rule_id, member_id, purchase_id, points_base, points_final, effect)
    VALUES ((v_promo->>'rule_id')::uuid, v_member.id, v_purchase_id, v_points, v_points_final, v_effect);
  END IF;

  PERFORM set_config('app.allow_points_write', 'true', true);
  UPDATE members SET
    points  = points + v_points_final,
    gallons = gallons + p_gallons,
    spent   = spent + p_amount,
    visits  = visits + 1,
    redeemed_count = COALESCE(redeemed_count, 0) + v_grant,
    last_buy = now(),
    last_operator_id = v_operator_id,
    updated_at = now()
  WHERE id = v_member.id;

  INSERT INTO activity_log (member_id, activity_type, description, points_change, amount, station_id)
  VALUES (v_member.id, 'compra',
          'Compra ' || p_gallons || ' gal ' || v_fuel || ' · Q' || p_amount || v_promo_suffix,
          v_points_final, p_amount, p_station_id);

  -- Cambio de tier → renombrar la tarjeta conservando el correlativo.
  IF v_old_tier <> v_new_tier AND v_card_id IS NOT NULL THEN
    SELECT card_code INTO v_old_code FROM physical_cards WHERE id = v_card_id;
    v_correlative := substring(v_old_code FROM '\d+$');
    IF v_correlative IS NOT NULL THEN
      v_prefix := CASE v_new_tier WHEN 'ORO' THEN 'CTOD' WHEN 'PLATINO' THEN 'CTPD'
                                  WHEN 'BLACK' THEN 'CTBD' ELSE 'CTOD' END;
      v_new_code := v_prefix || '-' || v_correlative;
      UPDATE physical_cards SET card_code = v_new_code, tier = v_new_tier, updated_at = now()
      WHERE id = v_card_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'purchase_id',   v_purchase_id,
    'member_name',   v_member.name,
    'points_earned', v_points_final,
    'points_base',   v_points,
    'points_promo',  v_extra,
    'points_balance',(SELECT points FROM members WHERE id = v_member.id),
    'gallons',       p_gallons,
    'tier',          v_new_tier,
    'tier_changed',  v_old_tier <> v_new_tier,
    'new_card_code', v_new_code,
    'promo',         v_promo
  );
END;
$function$;

COMMENT ON FUNCTION public.api_register_purchase IS
'F7a: acumulación de puntos desde el POS externo (PROPER). Usa los
galones REALES de la factura, aplica la regla de NIT (CF o el NIT del
propio miembro) y el motor de promociones sin stacking. Atribuye la
compra al colaborador externo mediante un operador espejo.';

-- ── 9. Comprobante de premio por QR (TK-XXXXXX) ────────────────
CREATE OR REPLACE FUNCTION public.api_get_redemption(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_r RECORD;
BEGIN
  SELECT rd.id, rd.redemption_code, rd.points_spent, rd.collected, rd.collected_at,
         rd.created_at, rd.confirm_status,
         rw.name AS reward_name, rw.category,
         m.name AS member_name, pc.card_code
    INTO v_r
  FROM redemptions rd
  LEFT JOIN rewards rw ON rw.id = rd.reward_id
  LEFT JOIN members m  ON m.id  = rd.member_id
  LEFT JOIN physical_cards pc ON pc.assigned_to = rd.member_id
  WHERE rd.redemption_code = upper(trim(COALESCE(p_code, '')));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'redemption_not_found');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'redemption_id',   v_r.id,
    'code',            v_r.redemption_code,
    'reward_name',     v_r.reward_name,
    'category',        v_r.category,
    'points_spent',    v_r.points_spent,
    'member_name',     v_r.member_name,
    'card_code',       v_r.card_code,
    'created_at',      v_r.created_at,
    'delivered',       v_r.collected,
    'delivered_at',    v_r.collected_at,
    'confirm_status',  v_r.confirm_status
  );
END;
$function$;

-- ── 10. Registro de la llamada (bitácora + idempotencia) ───────
CREATE OR REPLACE FUNCTION public.api_log_request(
  p_api_client_id   uuid,
  p_endpoint        text,
  p_idempotency_key text,
  p_request         jsonb,
  p_response        jsonb,
  p_status_code     integer
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  INSERT INTO api_requests (api_client_id, endpoint, idempotency_key, request, response, status_code)
  VALUES (p_api_client_id, p_endpoint, NULLIF(p_idempotency_key, ''), p_request, p_response, p_status_code)
  ON CONFLICT (api_client_id, idempotency_key) WHERE idempotency_key IS NOT NULL
  DO NOTHING;
$function$;

-- Respuesta previa para una idempotency-key ya usada (evita doble
-- acreditación si el POS reintenta por corte de red).
CREATE OR REPLACE FUNCTION public.api_replay(p_api_client_id uuid, p_idempotency_key text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT response FROM api_requests
  WHERE api_client_id = p_api_client_id
    AND idempotency_key = NULLIF(p_idempotency_key, '')
    AND status_code < 400
  ORDER BY created_at DESC LIMIT 1;
$function$;

-- ── 11. Cierre: ninguna tabla de la API se expone a la app ─────
REVOKE ALL ON public.api_clients  FROM anon, authenticated;
REVOKE ALL ON public.api_requests FROM anon, authenticated;

-- ============================================================
-- Club Turkaj + / Puntos+ — FB.6.2a: grant_special_day_bonus
-- ============================================================
-- RPC server-side que otorga el bonus de dias especiales
-- (cumpleaños + festivos) de forma ATOMICA, reemplazando la
-- logica cliente checkSpecialDayBonus (App.jsx).
--
-- FIXEA UN BUG CRITICO: checkSpecialDayBonus leia solo
-- last_special_bonus pero escribia points = (memberRow.points
-- || 0) + bonus, y como nunca cargaba points, RESETEABA el
-- saldo del miembro a 0+bonus (perdida de puntos). Esta RPC
-- usa delta server-side (points = points + bonus), leido en la
-- misma transaccion.
--
-- ATOMICIDAD (gamma): validaciones + UPDATE members + INSERT
-- activity_log en una sola transaccion. Si algo falla, rollback
-- total.
--
-- app.allow_points_write: se setea (transaction-local) antes
-- del UPDATE como writer legitimo de points (prep trigger FB.7).
--
-- RETORNO RICO: ademas de ok/bonus, devuelve events[] (con
-- name, icon, points, message, is_birthday por evento) y
-- member_name, para que el modal flotante (FB.6.2c) muestre las
-- frases personalizadas de special_days.message.
--
-- CASOS DE RETORNO:
--   { ok:false, reason:'member_not_found' }
--   { ok:false, reason:'already_granted' }   -- ya recibio hoy
--   { ok:false, reason:'no_bonus_today' }    -- hoy no aplica nada
--   { ok:true, bonus, events:[...], member_name }
--
-- NO es para flujos de admin: no escribe admin_audit_log (es un
-- flujo automatico de negocio, como register_purchase).
--
-- DEPENDENCIAS: members (points, birthday, last_special_bonus,
-- name), special_days (month=0 => cumpleaños; message FB.6.2b),
-- activity_log.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.grant_special_day_bonus(
  p_member_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_member      public.members%ROWTYPE;
  v_sd          public.special_days%ROWTYPE;
  v_today_month integer := EXTRACT(MONTH FROM CURRENT_DATE)::integer;
  v_today_day   integer := EXTRACT(DAY   FROM CURRENT_DATE)::integer;
  v_total_bonus integer := 0;
  v_events      jsonb   := '[]'::jsonb;
  v_bday_raw    text;
  v_bday_month  integer;
  v_bday_day    integer;
  v_names       text[]  := ARRAY[]::text[];
  v_description text;
  i             integer;
BEGIN
  -- ── V1: member existe ───────────────────────────────────────
  SELECT * INTO v_member FROM public.members WHERE id = p_member_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'member_not_found');
  END IF;

  -- ── V2: already_granted (comparacion directa con CURRENT_DATE)
  IF v_member.last_special_bonus = CURRENT_DATE THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_granted');
  END IF;

  -- ── V4: cumpleaños (defensivo: cualquier error de formato de
  --        birthday se ignora y se continua con festivos) ──────
  BEGIN
    IF v_member.birthday IS NOT NULL AND btrim(v_member.birthday::text) <> '' THEN
      v_bday_raw := btrim(v_member.birthday::text);
      -- Requiere EXACTAMENTE 2 partes 'MM-DD'. Si vienen 3
      -- (YYYY-MM-DD) o cualquier otra cosa, se omite el bonus.
      IF array_length(string_to_array(v_bday_raw, '-'), 1) = 2 THEN
        v_bday_month := split_part(v_bday_raw, '-', 1)::integer;
        v_bday_day   := split_part(v_bday_raw, '-', 2)::integer;
        IF v_bday_month = v_today_month AND v_bday_day = v_today_day THEN
          SELECT * INTO v_sd FROM public.special_days
            WHERE month = 0 AND day = 0 AND active = true
            LIMIT 1;
          IF FOUND THEN
            v_total_bonus := v_total_bonus + COALESCE(v_sd.points, 0);
            v_events := v_events || jsonb_build_array(jsonb_build_object(
              'id',          v_sd.id,
              'name',        v_sd.name,
              'icon',        v_sd.icon,
              'points',      v_sd.points,
              'message',     v_sd.message,
              'is_birthday', true
            ));
          END IF;
        END IF;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Formato de birthday invalido: se omite el bonus de cumpleaños.
    NULL;
  END;

  -- ── V5: festivos de fecha fija que aplican hoy ──────────────
  FOR v_sd IN
    SELECT * FROM public.special_days
    WHERE active = true
      AND month = v_today_month
      AND day   = v_today_day
  LOOP
    v_total_bonus := v_total_bonus + COALESCE(v_sd.points, 0);
    v_events := v_events || jsonb_build_array(jsonb_build_object(
      'id',          v_sd.id,
      'name',        v_sd.name,
      'icon',        v_sd.icon,
      'points',      v_sd.points,
      'message',     v_sd.message,
      'is_birthday', false
    ));
  END LOOP;

  -- ── V6: nada que otorgar hoy ────────────────────────────────
  IF v_total_bonus = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_bonus_today');
  END IF;

  -- ── V7: mutacion atomica ────────────────────────────────────
  -- Autoriza al trigger BEFORE UPDATE de FB.7 (cuando exista).
  PERFORM set_config('app.allow_points_write', 'true', true);

  UPDATE public.members SET
    points             = points + v_total_bonus,
    last_special_bonus = CURRENT_DATE,
    updated_at         = now()
  WHERE id = p_member_id;

  -- Descripcion consolidada: "Bonus especial: 🎂 Cumpleaños + 🇬🇹 Independencia"
  FOR i IN 0 .. jsonb_array_length(v_events) - 1 LOOP
    v_names := array_append(
      v_names,
      btrim(COALESCE(v_events -> i ->> 'icon', '') || ' ' || COALESCE(v_events -> i ->> 'name', ''))
    );
  END LOOP;
  v_description := 'Bonus especial: ' || array_to_string(v_names, ' + ');

  INSERT INTO public.activity_log (
    member_id, activity_type, description, points_change
  ) VALUES (
    p_member_id, 'evento', v_description, v_total_bonus
  );

  -- ── V8: exito ───────────────────────────────────────────────
  RETURN jsonb_build_object(
    'ok',          true,
    'bonus',       v_total_bonus,
    'events',      v_events,
    'member_name', v_member.name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.grant_special_day_bonus(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_special_day_bonus(uuid) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.grant_special_day_bonus(uuid) IS
'FB.6.2a — Otorga bonus de dias especiales (cumpleaños month=0 + festivos fecha fija) de forma atomica. DEFINER + search_path=public,extensions. Delta server-side (points = points + bonus) — fixea el bug de checkSpecialDayBonus que reseteaba points. Setea app.allow_points_write (prep trigger FB.7). Dedup por last_special_bonus = CURRENT_DATE. 1 activity_log consolidado (evento). Retorna { ok, bonus, events[], member_name } o { ok:false, reason }. Birthday parse defensivo (espera MM-DD; otros formatos se omiten).';

COMMIT;

-- ── Fin ───────────────────────────────────────────────────────

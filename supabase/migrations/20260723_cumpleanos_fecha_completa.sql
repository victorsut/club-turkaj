-- ============================================================
-- 20260723 — Cumpleaños con fecha completa
-- ============================================================
-- La app pasa a guardar members.birthday como fecha completa
-- 'YYYY-MM-DD' (antes solo 'MM-DD'). Esta migración actualiza
-- grant_special_day_bonus para aceptar AMBOS formatos, de modo
-- que el bonus de cumpleaños funcione tanto para los miembros
-- antiguos (MM-DD) como para los nuevos (YYYY-MM-DD).
-- Único cambio respecto a la versión anterior: el bloque V4 de
-- parseo del cumpleaños.
-- ============================================================

CREATE OR REPLACE FUNCTION public.grant_special_day_bonus(p_member_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_member      public.members%ROWTYPE;
  v_sd          public.special_days%ROWTYPE;
  v_today_month integer := EXTRACT(MONTH FROM CURRENT_DATE)::integer;
  v_today_day   integer := EXTRACT(DAY   FROM CURRENT_DATE)::integer;
  v_total_bonus integer := 0;
  v_events      jsonb   := '[]'::jsonb;
  v_bday_raw    text;
  v_bday_parts  integer;
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
  --        birthday se ignora y se continua con festivos).
  --        Acepta 'MM-DD' (miembros antiguos) y 'YYYY-MM-DD'
  --        (fecha completa, registros desde jul-2026). ──────────
  BEGIN
    IF v_member.birthday IS NOT NULL AND btrim(v_member.birthday::text) <> '' THEN
      v_bday_raw   := btrim(v_member.birthday::text);
      v_bday_parts := array_length(string_to_array(v_bday_raw, '-'), 1);
      IF v_bday_parts = 2 THEN
        v_bday_month := split_part(v_bday_raw, '-', 1)::integer;
        v_bday_day   := split_part(v_bday_raw, '-', 2)::integer;
      ELSIF v_bday_parts = 3 THEN
        v_bday_month := split_part(v_bday_raw, '-', 2)::integer;
        v_bday_day   := split_part(v_bday_raw, '-', 3)::integer;
      END IF;
      IF v_bday_month IS NOT NULL
         AND v_bday_month = v_today_month
         AND v_bday_day   = v_today_day THEN
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
$function$;

-- ============================================================
-- activity_log: permitir tipos de vehículo (27-jul-2026)
-- ============================================================
-- El CHECK activity_log_activity_type_check no incluía 'vehiculo'
-- (alta/baja de vehículo desde Mi Cuenta → 400, reporte del dueño)
-- ni 'registro_vehiculos' (bonus de vehículos del wizard — ese log
-- fallaba SILENCIOSAMENTE desde el inicio). Se amplía la lista.

ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_activity_type_check;
ALTER TABLE activity_log ADD CONSTRAINT activity_log_activity_type_check
  CHECK (activity_type = ANY (ARRAY[
    'compra'::text, 'canje'::text, 'encuesta'::text, 'rifa'::text,
    'referido'::text, 'registro'::text, 'evento'::text, 'wifi'::text,
    'degradacion'::text, 'vehiculo'::text, 'registro_vehiculos'::text
  ]));

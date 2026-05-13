-- Garantiza que la clave fuel_prices exista en program_config.
-- Idempotente: si ya existe, no la toca.
-- Los valores reales se setean por el admin desde Settings > Editar precios.
INSERT INTO public.program_config (key, value, updated_at)
VALUES ('fuel_prices', '{"super": 0, "regular": 0, "diesel": 0}'::jsonb, now())
ON CONFLICT (key) DO NOTHING;

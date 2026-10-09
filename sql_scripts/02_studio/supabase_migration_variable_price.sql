-- Add variable price fields to salon_services
ALTER TABLE public.salon_services ADD COLUMN IF NOT EXISTS is_variable_price BOOLEAN DEFAULT false;
ALTER TABLE public.salon_services ADD COLUMN IF NOT EXISTS price_max NUMERIC(10, 2);

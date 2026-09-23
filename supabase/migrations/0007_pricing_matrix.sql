-- ==============================================================================
-- KALLAYI CAR SPA & AUTO CARE - DYNAMIC VEHICLE PRICING MATRIX MIGRATION
-- Migration: 20260921_pricing_matrix.sql
-- ==============================================================================

-- 1. Extend service_packages table with is_active and icon_url
ALTER TABLE IF EXISTS public.service_packages
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS icon_url TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Extend service_package_prices table with estimated_time_minutes
ALTER TABLE IF EXISTS public.service_package_prices
    ADD COLUMN IF NOT EXISTS estimated_time_minutes INTEGER DEFAULT 45;

-- 3. Ensure compound unique constraint on (package_id, vehicle_type)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_package_vehicle_type' AND conrelid = 'public.service_package_prices'::regclass
    ) THEN
        ALTER TABLE public.service_package_prices 
            ADD CONSTRAINT uq_package_vehicle_type UNIQUE (package_id, vehicle_type);
    END IF;
END $$;

-- 4. Create backward-compatible SQL Views matching prompt naming conventions
CREATE OR REPLACE VIEW public.services AS
SELECT 
    id,
    name,
    description,
    price AS base_price,
    duration_minutes,
    vehicle_type,
    is_active,
    icon_url,
    chemical_recipe,
    commission_rule_id,
    created_at,
    updated_at
FROM public.service_packages;

CREATE OR REPLACE VIEW public.service_tier_prices AS
SELECT 
    id,
    package_id AS service_id,
    vehicle_type,
    price,
    estimated_time_minutes
FROM public.service_package_prices;

-- 5. Grant permissions on schema objects
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

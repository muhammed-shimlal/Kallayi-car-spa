-- Migration: 20260922_ensure_staff_profiles_schema.sql
-- Description: Ensure staff_profiles has all necessary columns, relaxed role constraint, and schema cache reload

-- 1. Ensure staff_profiles table exists
CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'WASHER',
    commission_percentage NUMERIC(5,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add columns if not already present
ALTER TABLE public.staff_profiles
    ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS retained_balance NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Relax role check constraint to accommodate 'STAFF', 'WASHER', 'TECHNICIAN', 'MANAGER', 'DRIVER', 'ADMIN'
ALTER TABLE public.staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_role_check;
ALTER TABLE public.staff_profiles 
    ADD CONSTRAINT staff_profiles_role_check 
    CHECK (role IN ('WASHER', 'TECHNICIAN', 'MANAGER', 'DRIVER', 'ADMIN', 'STAFF', 'staff', 'technician', 'washer', 'manager', 'driver', 'admin'));

-- 4. Ensure user_id can be nullable for database-only staff records if auth user is not linked
DO $$
BEGIN
    ALTER TABLE public.staff_profiles ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION
    WHEN undefined_column THEN NULL;
END $$;

-- 5. Create index for fast phone lookups
CREATE INDEX IF NOT EXISTS idx_staff_profiles_phone ON public.staff_profiles (phone_number);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_role ON public.staff_profiles (role);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_active ON public.staff_profiles (is_active);

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

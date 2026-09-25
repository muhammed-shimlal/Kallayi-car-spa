-- ==============================================================================
-- KALLAYI CAR SPA & AUTO CARE - DATABASE MIGRATION
-- Migration 0012: Fix Customer Name Sync, Metadata Extraction & Backfill
-- Resolves: Customer Name Missing/Empty in Admin POS & Public Tables
-- ==============================================================================

-- 1. Ensure `full_name` column exists on `public.customers` as a compatibility alias
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- 2. Ensure `customer_id` column exists on `public.customer_vehicles`
ALTER TABLE public.customer_vehicles 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customer_vehicles_customer ON public.customer_vehicles (customer_id);

-- 3. Backfill `name` and `full_name` in `public.customers` from `auth.users` metadata
UPDATE public.customers c
SET 
    name = COALESCE(
        NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
        NULLIF(TRIM(u.raw_user_meta_data->>'first_name'), ''),
        c.name
    ),
    full_name = COALESCE(
        NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
        NULLIF(TRIM(u.raw_user_meta_data->>'first_name'), ''),
        c.name
    )
FROM auth.users u
WHERE (c.user_id = u.id)
  AND (
      c.name IS NULL 
      OR c.name = '' 
      OR c.name = 'Guest Customer'
      OR c.name = 'Valued Customer'
      OR c.name ~ '^[0-9+ \-]+$'
      OR c.full_name IS NULL
      OR c.full_name = ''
  )
  AND COALESCE(
      NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
      NULLIF(TRIM(u.raw_user_meta_data->>'first_name'), '')
  ) IS NOT NULL;

-- Keep name and full_name aligned
UPDATE public.customers
SET full_name = name
WHERE full_name IS NULL OR full_name = '';

-- 4. Backfill `customer_id` on `public.customer_vehicles`
-- A. From user_id linkage
UPDATE public.customer_vehicles cv
SET customer_id = c.id
FROM public.customers c
WHERE cv.user_id = c.user_id AND cv.customer_id IS NULL;

-- B. From recent bookings linkage
UPDATE public.customer_vehicles cv
SET customer_id = b.customer_id
FROM public.bookings b
WHERE cv.id = b.vehicle_id AND cv.customer_id IS NULL AND b.customer_id IS NOT NULL;

-- 5. Updated Trigger Function: Robust Auth User Metadata to Customer Profile Sync
CREATE OR REPLACE FUNCTION public.sync_auth_user_to_customer()
RETURNS TRIGGER AS $$
DECLARE
    resolved_name VARCHAR(255);
    clean_phone VARCHAR(50);
    pure_phone VARCHAR(20);
    matched_cust_id UUID;
BEGIN
    -- Extract genuine name from raw_user_meta_data
    resolved_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), '')
    );

    -- Only fall back to email prefix if not internal virtual email and not phone digits
    IF resolved_name IS NULL THEN
        IF NEW.email IS NOT NULL 
           AND NEW.email NOT LIKE '%@kallayi.internal' 
           AND SPLIT_PART(NEW.email, '@', 1) !~ '^[0-9+ \-]+$' THEN
            resolved_name := NULLIF(SPLIT_PART(NEW.email, '@', 1), '');
        END IF;
    END IF;

    -- Extract phone numbers
    clean_phone := COALESCE(
        NULLIF(TRIM(NEW.phone), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'phone_number'), '')
    );

    IF clean_phone IS NOT NULL THEN
        pure_phone := REGEXP_REPLACE(clean_phone, '\D', '', 'g');
        IF LENGTH(pure_phone) > 10 AND pure_phone LIKE '91%' THEN
            pure_phone := SUBSTRING(pure_phone FROM 3);
        END IF;
    END IF;

    -- Step 1: Check if customer record exists with matching user_id
    SELECT id INTO matched_cust_id 
    FROM public.customers 
    WHERE user_id = NEW.id 
    LIMIT 1;

    IF matched_cust_id IS NOT NULL THEN
        -- Update existing customer profile
        UPDATE public.customers
        SET 
            name = CASE 
                WHEN resolved_name IS NOT NULL THEN resolved_name
                WHEN name IS NULL OR name = 'Guest Customer' OR name = '' OR name ~ '^[0-9+ \-]+$' THEN 'Valued Customer'
                ELSE name 
            END,
            full_name = CASE 
                WHEN resolved_name IS NOT NULL THEN resolved_name
                WHEN full_name IS NULL OR full_name = 'Guest Customer' OR full_name = '' OR full_name ~ '^[0-9+ \-]+$' THEN 'Valued Customer'
                ELSE full_name 
            END,
            phone_number = COALESCE(NULLIF(phone_number, ''), clean_phone, ''),
            updated_at = now()
        WHERE id = matched_cust_id;
    ELSE
        -- Step 2: Check if unlinked walk-in record exists matching phone
        IF clean_phone IS NOT NULL AND LENGTH(clean_phone) >= 7 THEN
            SELECT id INTO matched_cust_id 
            FROM public.customers 
            WHERE (
                phone_number = clean_phone 
                OR (pure_phone IS NOT NULL AND REGEXP_REPLACE(phone_number, '\D', '', 'g') LIKE '%' || pure_phone)
            )
            LIMIT 1;
        END IF;

        IF matched_cust_id IS NOT NULL THEN
            UPDATE public.customers
            SET 
                user_id = NEW.id,
                name = COALESCE(resolved_name, name, 'Valued Customer'),
                full_name = COALESCE(resolved_name, full_name, name, 'Valued Customer'),
                phone_number = COALESCE(clean_phone, phone_number),
                updated_at = now()
            WHERE id = matched_cust_id;
        ELSE
            -- Step 3: Insert new customer profile row
            INSERT INTO public.customers (
                user_id,
                name,
                full_name,
                phone_number,
                address,
                loyalty_points,
                outstanding_balance,
                credit_limit,
                created_at,
                updated_at
            ) VALUES (
                NEW.id,
                COALESCE(resolved_name, 'Valued Customer'),
                COALESCE(resolved_name, 'Valued Customer'),
                COALESCE(clean_phone, ''),
                '',
                0,
                0.00,
                5000.00,
                now(),
                now()
            )
            ON CONFLICT (user_id) DO UPDATE
            SET 
                name = CASE 
                    WHEN EXCLUDED.name != 'Valued Customer' THEN EXCLUDED.name 
                    ELSE public.customers.name 
                END,
                full_name = CASE 
                    WHEN EXCLUDED.full_name != 'Valued Customer' THEN EXCLUDED.full_name 
                    ELSE public.customers.full_name 
                END,
                phone_number = CASE 
                    WHEN EXCLUDED.phone_number != '' THEN EXCLUDED.phone_number 
                    ELSE public.customers.phone_number 
                END,
                updated_at = now();
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach trigger
DROP TRIGGER IF EXISTS trg_sync_auth_user_customer ON auth.users;
CREATE TRIGGER trg_sync_auth_user_customer
    AFTER INSERT OR UPDATE OF raw_user_meta_data, phone, email ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_auth_user_to_customer();

-- 7. Permissions and PostgREST Cache Refresh
GRANT ALL ON TABLE public.customers TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.customer_vehicles TO postgres, anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';

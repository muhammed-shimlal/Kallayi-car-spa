-- ==============================================================================
-- KALLAYI CAR SPA & AUTO CARE - DATABASE MIGRATION
-- Migration: Add Customer Name & Auth User Automatic Sync Trigger
-- Fixes PostgreSQL Error 42703 (column customers_1.name does not exist)
-- ==============================================================================

-- 1. Add `name` column to `public.customers` if it does not exist
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT 'Guest Customer';

-- 2. Allow `user_id` to be nullable for walk-in guest customers without auth accounts
ALTER TABLE public.customers 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.customer_vehicles 
ALTER COLUMN user_id DROP NOT NULL;

-- 3. Backfill existing customer rows without a valid name
UPDATE public.customers 
SET name = 'Guest Customer' 
WHERE name IS NULL OR TRIM(name) = '';

-- Backfill names from auth.users metadata where linked
UPDATE public.customers c
SET name = COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
    NULLIF(TRIM(u.raw_user_meta_data->>'first_name'), ''),
    c.name,
    'Guest Customer'
)
FROM auth.users u
WHERE c.user_id = u.id AND (c.name IS NULL OR c.name = 'Guest Customer' OR c.name = '');

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers (name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (phone_number);

-- 5. Trigger Function: Sync auth.users metadata and phone into public.customers
CREATE OR REPLACE FUNCTION public.sync_auth_user_to_customer()
RETURNS TRIGGER AS $$
DECLARE
    resolved_name VARCHAR(255);
    clean_phone VARCHAR(50);
    pure_phone VARCHAR(20);
    matched_cust_id UUID;
BEGIN
    -- Extract full name from raw_user_meta_data or email
    resolved_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''),
        NULLIF(SPLIT_PART(NEW.email, '@', 1), ''),
        'Valued Customer'
    );

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
        -- Update existing customer profile linked to user_id
        UPDATE public.customers
        SET 
            name = CASE 
                WHEN name IS NULL OR name = 'Guest Customer' OR name = '' THEN resolved_name 
                ELSE name 
            END,
            phone_number = COALESCE(NULLIF(phone_number, ''), clean_phone, ''),
            updated_at = now()
        WHERE id = matched_cust_id;
    ELSE
        -- Step 2: Check if an unlinked/walk-in customer record exists with matching phone
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
            -- Link customer record to the new auth user and update their registered name
            UPDATE public.customers
            SET 
                user_id = NEW.id,
                name = resolved_name,
                phone_number = COALESCE(clean_phone, phone_number),
                updated_at = now()
            WHERE id = matched_cust_id;
        ELSE
            -- Step 3: Insert new customer profile row for this user
            INSERT INTO public.customers (
                user_id,
                name,
                phone_number,
                address,
                loyalty_points,
                outstanding_balance,
                credit_limit,
                created_at,
                updated_at
            ) VALUES (
                NEW.id,
                resolved_name,
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
                name = EXCLUDED.name,
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

-- 6. Attach trigger to auth.users table
DROP TRIGGER IF EXISTS trg_sync_auth_user_customer ON auth.users;
CREATE TRIGGER trg_sync_auth_user_customer
    AFTER INSERT OR UPDATE OF raw_user_meta_data, phone, email ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_auth_user_to_customer();

-- 7. Refresh PostgREST schema cache
GRANT ALL ON TABLE public.customers TO postgres, anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';

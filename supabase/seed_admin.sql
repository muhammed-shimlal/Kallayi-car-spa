-- ==============================================================================
-- KALLAYI CAR SPA & AUTO CARE - ADMIN SEED SQL SCRIPT
-- Executes in Supabase SQL Editor to provision a superadmin user in GoTrue auth
-- and link them directly to public.staff_profiles with full system privileges.
-- ==============================================================================

-- 1. Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
DECLARE
    admin_uid UUID := 'd0000000-0000-0000-0000-000000000001';
    admin_email VARCHAR(255) := 'admin@kallayi.com';
    admin_phone VARCHAR(50) := '+919876543210';
    admin_password TEXT := 'Kallayi@2026';
    encrypted_pw TEXT;
BEGIN
    -- Compute Blowfish hash for password
    encrypted_pw := crypt(admin_password, gen_salt('bf'));

    -- 2. Insert or update auth.users
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = admin_email OR id = admin_uid) THEN
        UPDATE auth.users
        SET 
            encrypted_password = encrypted_pw,
            phone = admin_phone,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            phone_confirmed_at = COALESCE(phone_confirmed_at, now()),
            raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'::jsonb,
            raw_user_meta_data = jsonb_build_object(
                'full_name', 'Kallayi Admin',
                'first_name', 'Admin',
                'phone', admin_phone,
                'role', 'ADMIN'
            ),
            updated_at = now()
        WHERE email = admin_email OR id = admin_uid;
        
        SELECT id INTO admin_uid FROM auth.users WHERE email = admin_email OR id = admin_uid LIMIT 1;
    ELSE
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            phone,
            phone_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            admin_uid,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            admin_email,
            encrypted_pw,
            now(),
            admin_phone,
            now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            jsonb_build_object(
                'full_name', 'Kallayi Admin',
                'first_name', 'Admin',
                'phone', admin_phone,
                'role', 'ADMIN'
            ),
            now(),
            now()
        );
    END IF;

    -- 3. Insert or update auth.identities (Required for GoTrue password auth)
    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = admin_uid AND provider = 'email') THEN
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            admin_uid,
            admin_uid,
            jsonb_build_object(
                'sub', admin_uid::text,
                'email', admin_email,
                'email_verified', true,
                'phone_verified', true
            ),
            'email',
            admin_email,
            now(),
            now(),
            now()
        );
    ELSE
        UPDATE auth.identities
        SET 
            identity_data = jsonb_build_object(
                'sub', admin_uid::text,
                'email', admin_email,
                'email_verified', true,
                'phone_verified', true
            ),
            updated_at = now()
        WHERE user_id = admin_uid AND provider = 'email';
    END IF;

    -- 4. Insert or update public.staff_profiles
    IF NOT EXISTS (SELECT 1 FROM public.staff_profiles WHERE user_id = admin_uid) THEN
        INSERT INTO public.staff_profiles (
            user_id,
            role,
            phone_number,
            salary_type,
            salary_amount,
            hourly_rate,
            base_salary,
            is_active,
            is_online,
            joining_date
        ) VALUES (
            admin_uid,
            'ADMIN',
            admin_phone,
            'MONTHLY',
            50000.00,
            25.00,
            50000.00,
            true,
            true,
            CURRENT_DATE
        );
    ELSE
        UPDATE public.staff_profiles
        SET 
            role = 'ADMIN',
            phone_number = admin_phone,
            is_active = true,
            is_online = true,
            updated_at = now()
        WHERE user_id = admin_uid;
    END IF;

    RAISE NOTICE 'Admin user % successfully seeded with UID: %', admin_email, admin_uid;
END $$;

-- Refresh grants and reload PostgREST schema cache
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator, dashboard_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator, dashboard_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator, dashboard_user;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator, dashboard_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator, dashboard_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator, dashboard_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator, dashboard_user;

NOTIFY pgrst, 'reload schema';

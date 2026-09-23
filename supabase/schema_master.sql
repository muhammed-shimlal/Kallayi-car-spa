-- ==============================================================================
-- KALLAYI CAR SPA & AUTO CARE - UNIFIED MASTER DATABASE SCHEMA (PRODUCTION DDL)
-- Complete, consolidated, idempotent PostgreSQL 15+ schema for Supabase
-- ==============================================================================

-- 0. EXTENSIONS & SCHEMAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- ==============================================================================
-- 1. AUTHENTICATION & CORE
-- ==============================================================================

-- 1.1 Password Reset OTPs (WhatsApp 6-digit OTP verification)
CREATE TABLE IF NOT EXISTS public.password_reset_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_used BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_password_reset_otps_phone ON public.password_reset_otps (phone_number);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_created ON public.password_reset_otps (created_at DESC);

-- ==============================================================================
-- 2. STAFF & OPERATIONS
-- ==============================================================================

-- 2.1 Staff Profiles
CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'WASHER' CHECK (role IN ('WASHER', 'TECHNICIAN', 'MANAGER', 'DRIVER', 'ADMIN', 'STAFF', 'staff', 'technician', 'washer', 'manager', 'driver', 'admin')),
    phone_number VARCHAR(20) NOT NULL DEFAULT '',
    
    -- Financial details
    salary_type VARCHAR(20) NOT NULL DEFAULT 'COMMISSION' CHECK (salary_type IN ('DAILY', 'MONTHLY', 'COMMISSION', 'CUSTOM')),
    salary_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    hourly_rate NUMERIC(6, 2) NOT NULL DEFAULT 15.00,
    base_salary NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    commission_type VARCHAR(15) NOT NULL DEFAULT 'PERCENTAGE' CHECK (commission_type IN ('PERCENTAGE', 'FIXED')),
    commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    commission_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    retained_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Status & Location
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_online BOOLEAN NOT NULL DEFAULT false,
    current_latitude DOUBLE PRECISION,
    current_longitude DOUBLE PRECISION,
    last_location_update TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_profiles_role ON public.staff_profiles (role);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_active ON public.staff_profiles (is_active);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_phone ON public.staff_profiles (phone_number);

-- 2.2 Time Entries (Clock In/Out)
CREATE TABLE IF NOT EXISTS public.time_entries (
    id BIGSERIAL PRIMARY KEY,
    staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    clock_in_time TIMESTAMPTZ NOT NULL,
    clock_out_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    hourly_rate_snapshot NUMERIC(6, 2) NOT NULL DEFAULT 15.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 3. CUSTOMERS, SUBSCRIPTIONS & VEHICLES
-- ==============================================================================

-- 3.1 Customers
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Guest Customer',
    phone_number VARCHAR(20) NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    loyalty_points INTEGER NOT NULL DEFAULT 0,
    outstanding_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    credit_limit NUMERIC(10, 2) NOT NULL DEFAULT 5000.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers (name);
CREATE INDEX IF NOT EXISTS idx_customers_outstanding ON public.customers (outstanding_balance);

-- 3.2 Subscription Plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    plan_tier VARCHAR(20) NOT NULL CHECK (plan_tier IN ('BASIC', 'STANDARD', 'PREMIUM', 'VIP')),
    monthly_price NUMERIC(10, 2) NOT NULL,
    annual_price NUMERIC(10, 2) NOT NULL,
    max_washes_per_month INTEGER NOT NULL DEFAULT 4,
    discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.3 Member Subscriptions
CREATE TABLE IF NOT EXISTS public.member_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    plan_id BIGINT NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.4 Customer Vehicles
CREATE TABLE IF NOT EXISTS public.customer_vehicles (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    plate_number VARCHAR(20) NOT NULL UNIQUE,
    registration_number VARCHAR(50) NOT NULL DEFAULT '',
    color VARCHAR(30) NOT NULL DEFAULT '',
    year INTEGER,
    vehicle_type VARCHAR(20) NOT NULL DEFAULT 'SEDAN' CHECK (vehicle_type IN ('SEDAN', 'SUV', 'HATCHBACK', 'BIKE', 'LUXURY', 'OTHER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_vehicles_plate ON public.customer_vehicles (plate_number);
CREATE INDEX IF NOT EXISTS idx_customer_vehicles_reg ON public.customer_vehicles (registration_number);
CREATE INDEX IF NOT EXISTS idx_customer_vehicles_user ON public.customer_vehicles (user_id);

-- ==============================================================================
-- 4. SERVICES, PRICING & BOOKINGS
-- ==============================================================================

-- 4.1 Vehicle Categories
CREATE TABLE IF NOT EXISTS public.vehicle_categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT ''
);

-- 4.2 Service Packages
CREATE TABLE IF NOT EXISTS public.service_packages (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    is_popular BOOLEAN NOT NULL DEFAULT false,
    chemical_recipe JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.3 Service Package Pricing Matrix (Vehicle Type pricing)
CREATE TABLE IF NOT EXISTS public.service_package_pricings (
    id BIGSERIAL PRIMARY KEY,
    service_package_id BIGINT NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
    vehicle_category_id BIGINT REFERENCES public.vehicle_categories(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('SEDAN', 'SUV', 'HATCHBACK', 'BIKE', 'LUXURY', 'OTHER')),
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_pkg_veh_type UNIQUE (service_package_id, vehicle_type)
);

-- 4.4 Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
    id BIGSERIAL PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    vehicle_id BIGINT REFERENCES public.customer_vehicles(id) ON DELETE SET NULL,
    service_package_id BIGINT REFERENCES public.service_packages(id) ON DELETE RESTRICT,
    service_date DATE NOT NULL DEFAULT CURRENT_DATE,
    time_slot VARCHAR(50) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'WAITING' CHECK (status IN (
        'PENDING', 'CONFIRMED', 'WAITING', 'IN_BAY_1', 'IN_BAY_2', 'DETAILING', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
    )),
    bay_assignment VARCHAR(50),
    assigned_staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    assigned_technician_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    base_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    discount_reason VARCHAR(255) DEFAULT '',
    final_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON public.bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_service_date ON public.bookings (service_date);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle ON public.bookings (vehicle_id);

-- ==============================================================================
-- 5. INVOICES & FINANCIAL REVENUE
-- ==============================================================================

-- 5.1 Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT REFERENCES public.bookings(id) ON DELETE SET NULL,
    subscription_id BIGINT REFERENCES public.member_subscriptions(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    base_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    final_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    discount_reason VARCHAR(255) DEFAULT '',
    collector_type VARCHAR(20) DEFAULT 'ADMIN',
    cash_collected_by_staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    revenue_category_id BIGINT,
    is_deferred BOOLEAN NOT NULL DEFAULT false,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    payment_method VARCHAR(20) CHECK (payment_method IN ('CASH', 'CARD', 'ONLINE', 'SPLIT')),
    split_cash NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    split_online NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    split_khata NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_paid ON public.invoices (is_paid);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON public.invoices (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_collector_type ON public.invoices (collector_type);
CREATE INDEX IF NOT EXISTS idx_invoices_cash_staff ON public.invoices (cash_collected_by_staff_id);

-- ==============================================================================
-- 6. KHATA (CREDIT) LEDGER & REMINDER AUDIT
-- ==============================================================================

-- 6.1 Khata Ledgers
CREATE TABLE IF NOT EXISTS public.khata_ledgers (
    id BIGSERIAL PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('CHARGE', 'SETTLEMENT')),
    description TEXT NOT NULL DEFAULT '',
    related_booking_id BIGINT REFERENCES public.bookings(id) ON DELETE SET NULL,
    booking_id BIGINT REFERENCES public.bookings(id) ON DELETE SET NULL,
    invoice_id BIGINT REFERENCES public.invoices(id) ON DELETE SET NULL,
    number_plate_image TEXT,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_date TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIALLY_PAID', 'SETTLED')),
    settled_at TIMESTAMPTZ,
    last_reminder_sent_at TIMESTAMPTZ,
    reminder_count INTEGER NOT NULL DEFAULT 0,
    customer_phone VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_khata_customer ON public.khata_ledgers (customer_id);
CREATE INDEX IF NOT EXISTS idx_khata_tx_type ON public.khata_ledgers (transaction_type);
CREATE INDEX IF NOT EXISTS idx_khata_due_status ON public.khata_ledgers (status, due_date);
CREATE INDEX IF NOT EXISTS idx_khata_tx_date ON public.khata_ledgers (transaction_date DESC);

-- View alias for singular table compatibility
CREATE OR REPLACE VIEW public.khata_ledger AS SELECT * FROM public.khata_ledgers;

-- ==============================================================================
-- 7. BANKING, CASH CUSTODY, ADVANCES & PAYROLL
-- ==============================================================================

-- 7.1 Bank Transactions
CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id BIGSERIAL PRIMARY KEY,
    amount NUMERIC(10, 2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('DEPOSIT', 'WITHDRAWAL')),
    bank_name VARCHAR(100) NOT NULL DEFAULT 'Primary Bank Account',
    purpose TEXT NOT NULL DEFAULT '',
    reference_number VARCHAR(100),
    receipt_image TEXT,
    recorded_by_id UUID,
    recorded_by_name VARCHAR(100),
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_tx_date ON public.bank_transactions (transaction_date DESC);

-- 7.2 Collection Banks (Legacy support)
CREATE TABLE IF NOT EXISTS public.collection_banks (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(10, 2) NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7.3 Daily Register Audits (EOD Close Register)
CREATE TABLE IF NOT EXISTS public.daily_register_audits (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
    closed_by_id UUID,
    gross_revenue NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    expected_cash_in_till NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    actual_cash_counted NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    cash_discrepancy NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_expenses NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    locked_at TIMESTAMPTZ,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7.4 General Expenses
CREATE TABLE IF NOT EXISTS public.general_expenses (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT,
    staff_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expense_type VARCHAR(20) NOT NULL DEFAULT 'BUSINESS' CHECK (expense_type IN ('BUSINESS', 'STAFF')),
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PAID', 'CANCELLED')),
    receipt_image TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7.5 Staff Advances
CREATE TABLE IF NOT EXISTS public.staff_advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    purpose TEXT NOT NULL DEFAULT '',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_settled BOOLEAN NOT NULL DEFAULT false,
    settled_at TIMESTAMPTZ,
    payout_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_advances_staff ON public.staff_advances (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_advances_settled ON public.staff_advances (is_settled);

-- 7.6 Staff Cash Handovers
CREATE TABLE IF NOT EXISTS public.staff_cash_handovers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    handover_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    received_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_handovers_staff ON public.staff_cash_handovers (staff_id);

-- 7.7 Payroll Entries & Wage Retention Ledger
CREATE TABLE IF NOT EXISTS public.payroll_entries (
    id BIGSERIAL PRIMARY KEY,
    staff_user_id UUID,
    staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    base_wage NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    wash_revenue NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    commission_earned NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    commission_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tips_earned NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    gross_earnings NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    advance_deducted NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    previous_retained_applied NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    net_payable NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    balance_retained NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_settled BOOLEAN NOT NULL DEFAULT false,
    settled_at TIMESTAMPTZ,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_entries_date ON public.payroll_entries (date);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_settled ON public.payroll_entries (is_settled);

-- ==============================================================================
-- 8. INVENTORY & FLEET
-- ==============================================================================

-- 8.1 Inventory Items
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(50) NOT NULL UNIQUE,
    current_stock NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(20) NOT NULL DEFAULT 'L',
    minimum_threshold NUMERIC(10, 2) NOT NULL DEFAULT 5.00,
    cost_per_unit NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8.2 Chemical Usage Logs
CREATE TABLE IF NOT EXISTS public.chemical_usage_logs (
    id BIGSERIAL PRIMARY KEY,
    inventory_item_id BIGINT NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    booking_id BIGINT REFERENCES public.bookings(id) ON DELETE SET NULL,
    amount_used NUMERIC(10, 2) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 9. AUTOMATIC AUTH USER TO CUSTOMER SYNC TRIGGER
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.sync_auth_user_to_customer()
RETURNS TRIGGER AS $$
DECLARE
    resolved_name VARCHAR(255);
    clean_phone VARCHAR(50);
BEGIN
    resolved_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''),
        'Customer'
    );
    
    clean_phone := COALESCE(
        NULLIF(TRIM(NEW.phone), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'phone_number'), ''),
        ''
    );
    
    INSERT INTO public.customers (user_id, name, phone_number, outstanding_balance, credit_limit)
    VALUES (NEW.id, resolved_name, clean_phone, 0.00, 5000.00)
    ON CONFLICT (user_id) DO UPDATE SET
        name = CASE 
            WHEN public.customers.name IS NULL OR public.customers.name = 'Guest Customer' OR public.customers.name = 'Customer'
            THEN EXCLUDED.name 
            ELSE public.customers.name 
        END,
        phone_number = CASE 
            WHEN (public.customers.phone_number IS NULL OR public.customers.phone_number = '') AND EXCLUDED.phone_number <> '' 
            THEN EXCLUDED.phone_number 
            ELSE public.customers.phone_number 
        END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_auth_user_to_customer ON auth.users;
CREATE TRIGGER trg_sync_auth_user_to_customer
    AFTER INSERT OR UPDATE OF raw_user_meta_data, phone ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_auth_user_to_customer();

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

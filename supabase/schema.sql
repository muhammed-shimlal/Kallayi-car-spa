-- ==============================================================================
-- KALLAYI CAR SPA & AUTO CARE - COMPLETE SUPABASE POSTGRESQL SCHEMA (DDL)
-- Migration from Django 5.x ORM to Supabase (PostgreSQL 15+)
-- Replicates all tables, constraints, foreign keys, defaults, and indexes.
-- ==============================================================================

-- 0. ENABLE REQUIRED EXTENSIONS & ENSURE PUBLIC SCHEMA GRANTS
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
-- 1. CORE & AUTHENTICATION
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
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'WASHER' CHECK (role IN ('MANAGER', 'TECHNICIAN', 'DRIVER', 'WASHER', 'ADMIN')),
    phone_number VARCHAR(20) NOT NULL DEFAULT '',
    
    -- Financial details
    salary_type VARCHAR(20) NOT NULL DEFAULT 'COMMISSION' CHECK (salary_type IN ('DAILY', 'MONTHLY', 'COMMISSION', 'CUSTOM')),
    salary_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    hourly_rate NUMERIC(6, 2) NOT NULL DEFAULT 15.00,
    base_salary NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    commission_type VARCHAR(15) NOT NULL DEFAULT 'PERCENTAGE' CHECK (commission_type IN ('PERCENTAGE', 'FIXED')),
    commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00, -- Percentage (0-100)
    commission_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- Fixed amount per service
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

-- 2.2 Time Entries (Clock In/Out)
CREATE TABLE IF NOT EXISTS public.time_entries (
    id BIGSERIAL PRIMARY KEY,
    staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    clock_in_time TIMESTAMPTZ NOT NULL,
    clock_out_time TIMESTAMPTZ,
    clock_in_location VARCHAR(100) NOT NULL DEFAULT '',
    clock_out_location VARCHAR(100) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_staff ON public.time_entries (staff_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in ON public.time_entries (clock_in_time);

-- ==============================================================================
-- 3. CUSTOMERS, SUBSCRIPTIONS & VEHICLES
-- ==============================================================================

-- 3.1 Subscription Plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(6, 2) NOT NULL,
    interval_days INTEGER NOT NULL DEFAULT 30,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.2 Customers
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_member_subscriptions_customer ON public.member_subscriptions (customer_id);
CREATE INDEX IF NOT EXISTS idx_member_subscriptions_active ON public.member_subscriptions (is_active);

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
    notes TEXT NOT NULL DEFAULT '',
    vehicle_type VARCHAR(20) NOT NULL DEFAULT 'CAR' CHECK (vehicle_type IN (
        'HATCHBACK', 'SEDAN', 'SUV', 'COMPACT_SUV', 'MUV', 'BIKE', 'VAN', 'LUXURY', 'CAR', 'AUTO', 'TRUCK'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_vehicles_user ON public.customer_vehicles (user_id);
CREATE INDEX IF NOT EXISTS idx_customer_vehicles_plate ON public.customer_vehicles (plate_number);
CREATE INDEX IF NOT EXISTS idx_customer_vehicles_type ON public.customer_vehicles (vehicle_type);

-- 3.5 Coupons
CREATE TABLE IF NOT EXISTS public.coupons (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    discount_percentage NUMERIC(5, 2) NOT NULL,
    expiry_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons (code);

-- ==============================================================================
-- 4. BOOKINGS & SERVICES
-- ==============================================================================

-- 4.1 Commission Rules
CREATE TABLE IF NOT EXISTS public.commission_rules (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    flat_amount NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00, -- 0-100%
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.2 Service Packages
CREATE TABLE IF NOT EXISTS public.service_packages (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    vehicle_type VARCHAR(20) NOT NULL DEFAULT 'ALL' CHECK (vehicle_type IN (
        'ALL', 'HATCHBACK', 'SEDAN', 'COMPACT_SUV', 'SUV', 'MUV', 'BIKE', 'VAN', 'LUXURY', 'AUTO', 'TRUCK'
    )),
    chemical_recipe JSONB NOT NULL DEFAULT '{}'::jsonb,
    commission_rule_id BIGINT REFERENCES public.commission_rules(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_packages_type ON public.service_packages (vehicle_type);

-- 4.3 Service Package Tiered Prices
CREATE TABLE IF NOT EXISTS public.service_package_prices (
    id BIGSERIAL PRIMARY KEY,
    package_id BIGINT NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(30) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    CONSTRAINT uq_package_vehicle_type UNIQUE (package_id, vehicle_type)
);

-- 4.4 SOP Checklists
CREATE TABLE IF NOT EXISTS public.sop_checklists (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    service_package_id BIGINT REFERENCES public.service_packages(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.5 Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
    id BIGSERIAL PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    vehicle_id BIGINT NOT NULL REFERENCES public.customer_vehicles(id) ON DELETE CASCADE,
    technician_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    service_package_id BIGINT REFERENCES public.service_packages(id) ON DELETE SET NULL,
    time_slot TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    start_time TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'WAITING' CHECK (status IN (
        'PENDING', 'CONFIRMED', 'WAITING', 'IN_BAY_1', 'IN_BAY_2', 'DETAILING', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
    )),
    bay_assignment VARCHAR(50),
    points_redeemed INTEGER NOT NULL DEFAULT 0,
    
    -- Financial & Discount Derivation Fields
    base_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    final_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    
    -- Location details
    address TEXT NOT NULL DEFAULT '123 Main St, City',
    latitude DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    longitude DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle ON public.bookings (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_technician ON public.bookings (technician_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_timeslot ON public.bookings (time_slot);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON public.bookings (created_at DESC);

-- 4.6 Job Inspections
CREATE TABLE IF NOT EXISTS public.job_inspections (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
    performed_by_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    checklist_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    photo_proof TEXT,
    passed BOOLEAN NOT NULL DEFAULT true,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.7 Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
    id BIGSERIAL PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    booking_id BIGINT NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_customer ON public.reviews (customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews (rating);

-- ==============================================================================
-- 5. FINANCE, ACCOUNTING & INVENTORY
-- ==============================================================================

-- 5.1 Revenue Categories
CREATE TABLE IF NOT EXISTS public.revenue_categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.2 Expense Categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.3 General Expenses & Staff Advances/Deductions
CREATE TABLE IF NOT EXISTS public.general_expenses (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    expense_type VARCHAR(10) NOT NULL DEFAULT 'BUSINESS' CHECK (expense_type IN ('BUSINESS', 'STAFF')),
    transaction_type VARCHAR(15) CHECK (transaction_type IN ('ADVANCE', 'DEDUCTION', 'BONUS', 'REIMBURSEMENT', 'INCENTIVE')),
    payment_method VARCHAR(15) NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'CHEQUE')),
    staff_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_image TEXT,
    recorded_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('PENDING', 'APPROVED', 'PAID', 'CANCELLED')),
    approved_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    updated_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_general_expenses_date ON public.general_expenses (date DESC);
CREATE INDEX IF NOT EXISTS idx_general_expenses_expense_type ON public.general_expenses (expense_type);
CREATE INDEX IF NOT EXISTS idx_general_expenses_transaction_type ON public.general_expenses (transaction_type);
CREATE INDEX IF NOT EXISTS idx_general_expenses_status ON public.general_expenses (status);
CREATE INDEX IF NOT EXISTS idx_general_expenses_staff ON public.general_expenses (staff_id);

-- 5.4 Salary Payments
CREATE TABLE IF NOT EXISTS public.salary_payments (
    id BIGSERIAL PRIMARY KEY,
    staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    calculated_payable NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(10, 2) NOT NULL,
    remaining_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(15) NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'CHEQUE')),
    reference_number VARCHAR(100) NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_salary_payments_staff ON public.salary_payments (staff_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_date ON public.salary_payments (payment_date DESC);

-- 5.5 Chemical Inventory
CREATE TABLE IF NOT EXISTS public.chemical_inventory (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    current_volume NUMERIC(10, 2) NOT NULL,
    cost_per_unit NUMERIC(10, 2) NOT NULL,
    uom VARCHAR(20) NOT NULL DEFAULT 'oz', -- oz, liters, gallons, ml
    reorder_level NUMERIC(10, 2) NOT NULL DEFAULT 10.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.6 Chemical Usage Logs
CREATE TABLE IF NOT EXISTS public.chemical_usage_logs (
    id BIGSERIAL PRIMARY KEY,
    inventory_item_id BIGINT NOT NULL REFERENCES public.chemical_inventory(id) ON DELETE CASCADE,
    booking_id BIGINT REFERENCES public.bookings(id) ON DELETE SET NULL,
    amount_used NUMERIC(10, 2) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chemical_usage_logs_item ON public.chemical_usage_logs (inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_chemical_usage_logs_booking ON public.chemical_usage_logs (booking_id);

-- 5.7 Payroll Daily Aggregation Entries
CREATE TABLE IF NOT EXISTS public.payroll_entries (
    id BIGSERIAL PRIMARY KEY,
    staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    base_wage NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    commission_earned NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    tips_earned NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    is_settled BOOLEAN NOT NULL DEFAULT false,
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_payroll_staff_date UNIQUE (staff_user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_payroll_entries_date ON public.payroll_entries (date DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_staff ON public.payroll_entries (staff_user_id);

-- 5.8 Deferred Revenue (Subscription income amortized daily)
CREATE TABLE IF NOT EXISTS public.deferred_revenue (
    id BIGSERIAL PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    total_amount NUMERIC(10, 2) NOT NULL,
    remaining_balance NUMERIC(10, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    daily_amortization_rate NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deferred_revenue_customer ON public.deferred_revenue (customer_id);

-- 5.9 Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
    subscription_id BIGINT REFERENCES public.member_subscriptions(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    base_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    final_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    revenue_category_id BIGINT REFERENCES public.revenue_categories(id) ON DELETE SET NULL,
    is_deferred BOOLEAN NOT NULL DEFAULT false,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    payment_method VARCHAR(10) CHECK (payment_method IN ('CASH', 'CARD', 'ONLINE', 'SPLIT')),
    split_cash NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    split_online NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    split_khata NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_booking ON public.invoices (booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_paid ON public.invoices (is_paid);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON public.invoices (created_at DESC);

-- 5.10 Khata Ledger (Credit double-entry system)
CREATE TABLE IF NOT EXISTS public.khata_ledgers (
    id BIGSERIAL PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    transaction_type VARCHAR(15) NOT NULL CHECK (transaction_type IN ('CHARGE', 'SETTLEMENT')),
    description VARCHAR(255) NOT NULL,
    related_booking_id BIGINT REFERENCES public.bookings(id) ON DELETE SET NULL,
    number_plate_image TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_khata_ledgers_customer ON public.khata_ledgers (customer_id);
CREATE INDEX IF NOT EXISTS idx_khata_ledgers_type ON public.khata_ledgers (transaction_type);
CREATE INDEX IF NOT EXISTS idx_khata_ledgers_created ON public.khata_ledgers (created_at DESC);

-- 5.11 Daily Register Audit (End-of-Day EOD Close & Lock)
CREATE TABLE IF NOT EXISTS public.daily_register_audits (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
    closed_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    gross_revenue NUMERIC(10, 2) NOT NULL,
    expected_cash_in_till NUMERIC(10, 2) NOT NULL,
    total_expenses NUMERIC(10, 2) NOT NULL,
    is_locked BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_register_audits_date ON public.daily_register_audits (date DESC);

-- 5.12 Collection Bank (Daily Savings/Deposit Asset)
CREATE TABLE IF NOT EXISTS public.collection_banks (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
    amount NUMERIC(10, 2) NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    recorded_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collection_banks_date ON public.collection_banks (date DESC);

-- ==============================================================================
-- 6. NOTIFICATIONS & PAYMENTS
-- ==============================================================================

-- 6.1 Notification Logs (WhatsApp, SMS, Email)
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT REFERENCES public.bookings(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL DEFAULT 'WHATSAPP' CHECK (type IN ('SMS', 'EMAIL', 'WHATSAPP')),
    recipient VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SENT',
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_booking ON public.notification_logs (booking_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent ON public.notification_logs (sent_at DESC);

-- 6.2 Payment Transactions (Online Payment Intents)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(100) NOT NULL UNIQUE,
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED')),
    provider_response JSONB NOT NULL DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice ON public.payment_transactions (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_intent ON public.payment_transactions (stripe_payment_intent_id);

-- ==============================================================================
-- 7. FLEET & FIELD OPERATIONS
-- ==============================================================================

-- 7.1 Fleet Vehicles
CREATE TABLE IF NOT EXISTS public.fleet_vehicles (
    id BIGSERIAL PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    model VARCHAR(100) NOT NULL,
    plate_number VARCHAR(20) NOT NULL UNIQUE,
    last_wash_date DATE,
    gps_coordinates VARCHAR(100) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7.2 Fleet Accounts
CREATE TABLE IF NOT EXISTS public.fleet_accounts (
    id BIGSERIAL PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    billing_cycle_days INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7.3 Fleet Account Vehicles (ManyToMany)
CREATE TABLE IF NOT EXISTS public.fleet_account_vehicles (
    fleet_account_id BIGINT NOT NULL REFERENCES public.fleet_accounts(id) ON DELETE CASCADE,
    vehicle_id BIGINT NOT NULL REFERENCES public.fleet_vehicles(id) ON DELETE CASCADE,
    PRIMARY KEY (fleet_account_id, vehicle_id)
);

-- 7.4 Service Vehicles (Mobile vans/trucks)
CREATE TABLE IF NOT EXISTS public.service_vehicles (
    id BIGSERIAL PRIMARY KEY,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    plate_number VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_service_odometer INTEGER NOT NULL DEFAULT 0,
    service_interval_km INTEGER NOT NULL DEFAULT 5000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7.5 Vehicle Assignments
CREATE TABLE IF NOT EXISTS public.vehicle_assignments (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id BIGINT NOT NULL REFERENCES public.service_vehicles(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7.6 Fleet Logs
CREATE TABLE IF NOT EXISTS public.fleet_logs (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id BIGINT NOT NULL REFERENCES public.service_vehicles(id) ON DELETE CASCADE,
    log_type VARCHAR(20) NOT NULL CHECK (log_type IN ('FUEL', 'MAINTENANCE', 'OTHER')),
    amount NUMERIC(10, 2) NOT NULL,
    odometer INTEGER NOT NULL,
    receipt_photo TEXT,
    notes TEXT NOT NULL DEFAULT '',
    recorded_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7.7 Technician Live Location
CREATE TABLE IF NOT EXISTS public.technician_locations (
    technician_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 8. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS trg_staff_profiles_updated_at ON public.staff_profiles;
CREATE TRIGGER trg_staff_profiles_updated_at
    BEFORE UPDATE ON public.staff_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_general_expenses_updated_at ON public.general_expenses;
CREATE TRIGGER trg_general_expenses_updated_at
    BEFORE UPDATE ON public.general_expenses
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_salary_payments_updated_at ON public.salary_payments;
CREATE TRIGGER trg_salary_payments_updated_at
    BEFORE UPDATE ON public.salary_payments
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_chemical_inventory_updated_at ON public.chemical_inventory;
CREATE TRIGGER trg_chemical_inventory_updated_at
    BEFORE UPDATE ON public.chemical_inventory
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_collection_banks_updated_at ON public.collection_banks;
CREATE TRIGGER trg_collection_banks_updated_at
    BEFORE UPDATE ON public.collection_banks
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ==============================================================================
-- 8.1 AUTH USER TO CUSTOMER SYNCHRONIZATION TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sync_auth_user_to_customer()
RETURNS TRIGGER AS $$
DECLARE
    resolved_name VARCHAR(255);
    clean_phone VARCHAR(50);
    pure_phone VARCHAR(20);
    matched_cust_id UUID;
BEGIN
    resolved_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''),
        NULLIF(SPLIT_PART(NEW.email, '@', 1), ''),
        'Valued Customer'
    );

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

    SELECT id INTO matched_cust_id 
    FROM public.customers 
    WHERE user_id = NEW.id 
    LIMIT 1;

    IF matched_cust_id IS NOT NULL THEN
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
                name = resolved_name,
                phone_number = COALESCE(clean_phone, phone_number),
                updated_at = now()
            WHERE id = matched_cust_id;
        ELSE
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

DROP TRIGGER IF EXISTS trg_sync_auth_user_customer ON auth.users;
CREATE TRIGGER trg_sync_auth_user_customer
    AFTER INSERT OR UPDATE OF raw_user_meta_data, phone, email ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_auth_user_to_customer();

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_package_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chemical_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chemical_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deferred_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_register_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_account_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_locations ENABLE ROW LEVEL SECURITY;

-- 1. Public Read Policies
DROP POLICY IF EXISTS "Public can view service packages" ON public.service_packages;
CREATE POLICY "Public can view service packages" ON public.service_packages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view tiered prices" ON public.service_package_prices;
CREATE POLICY "Public can view tiered prices" ON public.service_package_prices FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view subscription plans" ON public.subscription_plans;
CREATE POLICY "Public can view subscription plans" ON public.subscription_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view revenue categories" ON public.revenue_categories;
CREATE POLICY "Public can view revenue categories" ON public.revenue_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view expense categories" ON public.expense_categories;
CREATE POLICY "Public can view expense categories" ON public.expense_categories FOR SELECT USING (true);

-- 2. Admin CRUD Enforcement Policies
DROP POLICY IF EXISTS "Allow admin full access on service_packages" ON public.service_packages;
CREATE POLICY "Allow admin full access on service_packages" ON public.service_packages FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.staff_profiles 
    WHERE staff_profiles.user_id = auth.uid() 
    AND staff_profiles.role = 'ADMIN'
  )
);

DROP POLICY IF EXISTS "Allow admin full access on service_package_prices" ON public.service_package_prices;
CREATE POLICY "Allow admin full access on service_package_prices" ON public.service_package_prices FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.staff_profiles 
    WHERE staff_profiles.user_id = auth.uid() 
    AND staff_profiles.role = 'ADMIN'
  )
);

DROP POLICY IF EXISTS "Allow admin full access on subscription_plans" ON public.subscription_plans;
CREATE POLICY "Allow admin full access on subscription_plans" ON public.subscription_plans FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.staff_profiles 
    WHERE staff_profiles.user_id = auth.uid() 
    AND staff_profiles.role = 'ADMIN'
  )
);

DROP POLICY IF EXISTS "Allow admin full access on revenue_categories" ON public.revenue_categories;
CREATE POLICY "Allow admin full access on revenue_categories" ON public.revenue_categories FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.staff_profiles 
    WHERE staff_profiles.user_id = auth.uid() 
    AND staff_profiles.role = 'ADMIN'
  )
);

DROP POLICY IF EXISTS "Allow admin full access on expense_categories" ON public.expense_categories;
CREATE POLICY "Allow admin full access on expense_categories" ON public.expense_categories FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.staff_profiles 
    WHERE staff_profiles.user_id = auth.uid() 
    AND staff_profiles.role = 'ADMIN'
  )
);

-- 3. Authenticated Users Policies
CREATE POLICY "Users can manage their own vehicles" ON public.customer_vehicles
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own customer record" ON public.customers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own bookings" ON public.bookings
    FOR SELECT USING (
        customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
        OR technician_id = auth.uid()
    );

CREATE POLICY "Users can create bookings" ON public.bookings
    FOR INSERT WITH CHECK (
        customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
    );

-- Service Role (Full access for Backend / Server Actions)
-- Supabase automatically grants full bypass to service_role key.

-- Refresh grants and reload PostgREST schema cache
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator, dashboard_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator, dashboard_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator, dashboard_user;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator, dashboard_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator, dashboard_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator, dashboard_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator, dashboard_user;

NOTIFY pgrst, 'reload schema';



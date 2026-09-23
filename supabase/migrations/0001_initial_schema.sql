-- ==============================================================================
-- KALLAYI CAR SPA & AUTO CARE - UNIFIED MASTER DATABASE SCHEMA (PRODUCTION DDL)
-- Complete, consolidated, idempotent PostgreSQL 15+ schema for Supabase
-- Strictly ordered according to dependency hierarchy.
-- ==============================================================================

-- ==============================================================================
-- 1. EXTENSIONS & BASE GRANTS
-- ==============================================================================
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
-- 2. AUTH & STAFF
-- ==============================================================================

-- 2.1 Password Reset OTPs
CREATE TABLE IF NOT EXISTS public.password_reset_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_used BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_password_reset_otps_phone ON public.password_reset_otps (phone_number);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_created ON public.password_reset_otps (created_at DESC);

-- 2.2 Staff Profiles
CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'WASHER' CHECK (role IN (
        'WASHER', 'TECHNICIAN', 'MANAGER', 'DRIVER', 'ADMIN', 'STAFF', 
        'staff', 'technician', 'washer', 'manager', 'driver', 'admin'
    )),
    phone_number VARCHAR(20) NOT NULL DEFAULT '',
    salary_type VARCHAR(20) NOT NULL DEFAULT 'COMMISSION' CHECK (salary_type IN ('DAILY', 'MONTHLY', 'COMMISSION', 'CUSTOM')),
    salary_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    hourly_rate NUMERIC(6, 2) NOT NULL DEFAULT 15.00,
    base_salary NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    commission_type VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE' CHECK (commission_type IN ('PERCENTAGE', 'FIXED')),
    commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 40.00,
    commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 40.00,
    commission_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    retained_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_online BOOLEAN NOT NULL DEFAULT false,
    current_latitude DOUBLE PRECISION,
    current_longitude DOUBLE PRECISION,
    last_location_update TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_profiles_user ON public.staff_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_active ON public.staff_profiles (is_active);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_phone ON public.staff_profiles (phone_number);

-- 2.3 Time Entries (Clock In/Out)
CREATE TABLE IF NOT EXISTS public.time_entries (
    id BIGSERIAL PRIMARY KEY,
    staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    clock_in TIMESTAMPTZ NOT NULL DEFAULT now(),
    clock_out TIMESTAMPTZ,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_staff ON public.time_entries (staff_id);

-- ==============================================================================
-- 3. CUSTOMERS, SUBSCRIPTIONS & COUPONS
-- ==============================================================================

-- 3.1 Customers
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Guest Customer',
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    address TEXT NOT NULL DEFAULT '',
    loyalty_points INTEGER NOT NULL DEFAULT 0,
    outstanding_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    credit_limit NUMERIC(10, 2) NOT NULL DEFAULT 5000.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_user ON public.customers (user_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers (name);
CREATE INDEX IF NOT EXISTS idx_customers_outstanding ON public.customers (outstanding_balance);

-- 3.2 Subscription Plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    interval_days INTEGER NOT NULL DEFAULT 30,
    description TEXT NOT NULL DEFAULT '',
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

CREATE INDEX IF NOT EXISTS idx_member_subs_customer ON public.member_subscriptions (customer_id);

-- 3.4 Coupons
CREATE TABLE IF NOT EXISTS public.coupons (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_percentage NUMERIC(5, 2) NOT NULL,
    expiry_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons (code);

-- ==============================================================================
-- 4. VEHICLES & CATEGORIES
-- ==============================================================================

-- 4.1 Vehicle Categories
CREATE TABLE IF NOT EXISTS public.vehicle_categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT ''
);

-- 4.2 Customer Vehicles
CREATE TABLE IF NOT EXISTS public.customer_vehicles (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    plate_number VARCHAR(20) NOT NULL UNIQUE,
    registration_number VARCHAR(50) NOT NULL DEFAULT '',
    color VARCHAR(30) NOT NULL DEFAULT '',
    year INTEGER,
    notes TEXT NOT NULL DEFAULT '',
    vehicle_type VARCHAR(20) NOT NULL DEFAULT 'SEDAN' CHECK (vehicle_type IN (
        'HATCHBACK', 'SEDAN', 'SUV', 'COMPACT_SUV', 'MUV', 'BIKE', 'VAN', 'LUXURY', 'CAR', 'AUTO', 'TRUCK', 'OTHER'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_vehicles_plate ON public.customer_vehicles (plate_number);
CREATE INDEX IF NOT EXISTS idx_customer_vehicles_reg ON public.customer_vehicles (registration_number);
CREATE INDEX IF NOT EXISTS idx_customer_vehicles_user ON public.customer_vehicles (user_id);
CREATE INDEX IF NOT EXISTS idx_customer_vehicles_type ON public.customer_vehicles (vehicle_type);

-- ==============================================================================
-- 5. SERVICES & PRICING MATRIX
-- ==============================================================================

-- 5.1 Commission Rules
CREATE TABLE IF NOT EXISTS public.commission_rules (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    percentage NUMERIC(5, 2) NOT NULL DEFAULT 40.00,
    fixed_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.2 Service Packages
CREATE TABLE IF NOT EXISTS public.service_packages (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    vehicle_type VARCHAR(20) NOT NULL DEFAULT 'ALL' CHECK (vehicle_type IN (
        'CAR', 'BIKE', 'SUV', 'SEDAN', 'HATCHBACK', 'COMPACT_SUV', 'MUV', 'VAN', 'LUXURY', 'AUTO', 'TRUCK', 'ALL', 'OTHER'
    )),
    is_popular BOOLEAN NOT NULL DEFAULT false,
    chemical_recipe JSONB NOT NULL DEFAULT '{}'::jsonb,
    commission_rule_id BIGINT REFERENCES public.commission_rules(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    icon_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_packages_type ON public.service_packages (vehicle_type);

-- 5.3 Service Package Tiered Prices per Body Type
CREATE TABLE IF NOT EXISTS public.service_package_prices (
    id BIGSERIAL PRIMARY KEY,
    package_id BIGINT NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(30) NOT NULL CHECK (vehicle_type IN (
        'HATCHBACK', 'SEDAN', 'SUV', 'COMPACT_SUV', 'MUV', 'BIKE', 'VAN', 'LUXURY', 'CAR', 'AUTO', 'TRUCK', 'ALL', 'OTHER'
    )),
    price NUMERIC(10, 2) NOT NULL,
    estimated_time_minutes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_package_vehicle_type UNIQUE (package_id, vehicle_type)
);

CREATE INDEX IF NOT EXISTS idx_pkg_prices_lookup ON public.service_package_prices (package_id, vehicle_type);

-- View alias for service_package_pricings compatibility
CREATE OR REPLACE VIEW public.service_package_pricings AS 
SELECT 
    id, 
    package_id AS service_package_id, 
    vehicle_type, 
    price, 
    created_at 
FROM public.service_package_prices;

-- 5.4 SOP Checklists
CREATE TABLE IF NOT EXISTS public.sop_checklists (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    service_package_id BIGINT REFERENCES public.service_packages(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 6. BOOKINGS & OPERATIONS
-- ==============================================================================

-- 6.1 Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
    id BIGSERIAL PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    vehicle_id BIGINT REFERENCES public.customer_vehicles(id) ON DELETE SET NULL,
    service_package_id BIGINT REFERENCES public.service_packages(id) ON DELETE SET NULL,
    service_date DATE NOT NULL DEFAULT CURRENT_DATE,
    time_slot VARCHAR(50) NOT NULL DEFAULT '',
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'WAITING' CHECK (status IN (
        'PENDING', 'CONFIRMED', 'WAITING', 'IN_BAY_1', 'IN_BAY_2', 'DETAILING', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
    )),
    bay_assignment VARCHAR(50),
    assigned_staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    technician_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_technician_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    points_redeemed INTEGER NOT NULL DEFAULT 0,
    base_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    discount_reason VARCHAR(255) DEFAULT '',
    final_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    cancellation_reason TEXT,
    address TEXT NOT NULL DEFAULT '123 Main St, City',
    latitude DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    longitude DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON public.bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_service_date ON public.bookings (service_date);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle ON public.bookings (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_staff ON public.bookings (assigned_staff_id);

-- 6.2 Job Inspections
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

-- 6.3 Customer Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
    id BIGSERIAL PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    booking_id BIGINT UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 7. REVENUE, INVOICING & PAYMENTS
-- ==============================================================================

-- 7.1 Revenue & Expense Categories
CREATE TABLE IF NOT EXISTS public.revenue_categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expense_categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7.2 Invoices
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
    revenue_category_id BIGINT REFERENCES public.revenue_categories(id) ON DELETE SET NULL,
    is_deferred BOOLEAN NOT NULL DEFAULT false,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'ONLINE', 'UPI', 'CARD', 'SPLIT', 'KHATA')),
    split_cash NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    split_online NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    split_khata NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    cash_collected_by_staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    collector_type VARCHAR(20) NOT NULL DEFAULT 'STAFF' CHECK (collector_type IN ('STAFF', 'ADMIN')),
    cash_handover_id UUID,
    is_cash_handed_over BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_booking ON public.invoices (booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_paid ON public.invoices (is_paid);
CREATE INDEX IF NOT EXISTS idx_invoices_method ON public.invoices (payment_method);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON public.invoices (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_collector_type ON public.invoices (collector_type);
CREATE INDEX IF NOT EXISTS idx_invoices_cash_staff ON public.invoices (cash_collected_by_staff_id);

-- 7.3 Payment Transactions
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT REFERENCES public.invoices(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    transaction_reference VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payment_transactions (invoice_id);

-- ==============================================================================
-- 8. CREDIT (KHATA), BANKING & CASH CUSTODY
-- ==============================================================================

-- 8.1 Khata Ledgers
CREATE TABLE IF NOT EXISTS public.khata_ledgers (
    id BIGSERIAL PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('CREDIT', 'DEBIT')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'SETTLED', 'OVERDUE', 'CANCELLED')),
    description TEXT NOT NULL DEFAULT '',
    related_booking_id BIGINT REFERENCES public.bookings(id) ON DELETE SET NULL,
    number_plate_image TEXT,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_date TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    last_reminder_sent_at TIMESTAMPTZ,
    reminder_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_khata_customer ON public.khata_ledgers (customer_id);
CREATE INDEX IF NOT EXISTS idx_khata_due_status ON public.khata_ledgers (status, due_date);
CREATE INDEX IF NOT EXISTS idx_khata_tx_date ON public.khata_ledgers (transaction_date DESC);

-- View alias for singular table compatibility
CREATE OR REPLACE VIEW public.khata_ledger AS SELECT * FROM public.khata_ledgers;

-- 8.2 Bank Transactions
CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id BIGSERIAL PRIMARY KEY,
    amount NUMERIC(10, 2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER')),
    bank_name VARCHAR(100) NOT NULL DEFAULT 'Primary Bank',
    reference_number VARCHAR(100) NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_url TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_tx_date ON public.bank_transactions (transaction_date DESC);

-- 8.3 Collection Banks (Legacy support)
CREATE TABLE IF NOT EXISTS public.collection_banks (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    bank_name VARCHAR(100) NOT NULL DEFAULT 'Primary Bank',
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8.4 Daily Register Audits (EOD Close Register)
CREATE TABLE IF NOT EXISTS public.daily_register_audits (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
    total_expected_cash NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    actual_cash_counted NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discrepancy NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT NOT NULL DEFAULT '',
    is_locked BOOLEAN NOT NULL DEFAULT false,
    locked_at TIMESTAMPTZ,
    locked_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_register_date ON public.daily_register_audits (date);

-- 8.5 General Expenses
CREATE TABLE IF NOT EXISTS public.general_expenses (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    expense_type VARCHAR(20) NOT NULL DEFAULT 'BUSINESS' CHECK (expense_type IN ('BUSINESS', 'STAFF')),
    status VARCHAR(20) NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    description TEXT NOT NULL DEFAULT '',
    receipt_image TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.general_expenses (category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_staff ON public.general_expenses (staff_id);

-- 8.6 Staff Advances
CREATE TABLE IF NOT EXISTS public.staff_advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT now(),
    purpose TEXT NOT NULL DEFAULT 'Cash Advance',
    is_settled BOOLEAN NOT NULL DEFAULT false,
    settled_at TIMESTAMPTZ,
    payout_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_advances_staff ON public.staff_advances (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_advances_settled ON public.staff_advances (is_settled);

-- 8.7 Staff Cash Handovers
CREATE TABLE IF NOT EXISTS public.staff_cash_handovers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    handover_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    received_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    vehicle_summary TEXT,
    reconciled_invoices_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_handovers_staff ON public.staff_cash_handovers (staff_id);

-- 8.8 Payroll Entries & Wage Retention Ledger
CREATE TABLE IF NOT EXISTS public.payroll_entries (
    id BIGSERIAL PRIMARY KEY,
    staff_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    commission_earned NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    advances_deducted NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    retained_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    net_payable NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_settled BOOLEAN NOT NULL DEFAULT false,
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_entries_staff ON public.payroll_entries (staff_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_date ON public.payroll_entries (date);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_settled ON public.payroll_entries (is_settled);

-- 8.9 Deferred Revenue
CREATE TABLE IF NOT EXISTS public.deferred_revenue (
    id BIGSERIAL PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    reason TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 9. INVENTORY & FLEET
-- ==============================================================================

-- 9.1 Inventory Items
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'CHEMICAL',
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(20) NOT NULL DEFAULT 'LITERS',
    cost_per_unit NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    minimum_threshold NUMERIC(10, 2) NOT NULL DEFAULT 5.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9.2 Chemical Inventory
CREATE TABLE IF NOT EXISTS public.chemical_inventory (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    current_stock_litres NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    cost_per_litre NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    alert_threshold_litres NUMERIC(8, 2) NOT NULL DEFAULT 10.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9.3 Chemical Usage Logs
CREATE TABLE IF NOT EXISTS public.chemical_usage_logs (
    id BIGSERIAL PRIMARY KEY,
    inventory_item_id BIGINT REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    chemical_id BIGINT REFERENCES public.chemical_inventory(id) ON DELETE CASCADE,
    booking_id BIGINT REFERENCES public.bookings(id) ON DELETE SET NULL,
    quantity_used NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9.4 Notification Logs
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id BIGSERIAL PRIMARY KEY,
    recipient_phone VARCHAR(20) NOT NULL,
    message_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SENT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9.5 Fleet Vehicles & Usage
CREATE TABLE IF NOT EXISTS public.fleet_vehicles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    plate_number VARCHAR(20) NOT NULL UNIQUE,
    model VARCHAR(50) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fleet_usage_logs (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id BIGINT REFERENCES public.fleet_vehicles(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    purpose TEXT NOT NULL DEFAULT '',
    start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 10. DEFENSIVE COLUMN ALIGNMENTS (IDEMPOTENT PRE-INDEX CHECKS)
-- Ensures all columns exist even if tables were partially created previously
-- ==============================================================================

-- Bookings columns
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS service_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS discount_reason VARCHAR(255) DEFAULT '';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS assigned_technician_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN vehicle_id DROP NOT NULL;

-- Invoices columns
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS collector_type VARCHAR(20) NOT NULL DEFAULT 'STAFF';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cash_collected_by_staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount_reason VARCHAR(255) DEFAULT '';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS split_cash NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS split_online NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS split_khata NUMERIC(10, 2) NOT NULL DEFAULT 0.00;

-- Service Packages columns
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(20) NOT NULL DEFAULT 'ALL';

-- Staff Profiles columns
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS retained_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 40.00;

-- Customers columns
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL DEFAULT 'Guest Customer';
ALTER TABLE public.customers ALTER COLUMN user_id DROP NOT NULL;

-- Customer Vehicles columns
ALTER TABLE public.customer_vehicles ALTER COLUMN user_id DROP NOT NULL;

-- Khata Ledgers columns
ALTER TABLE public.khata_ledgers ADD COLUMN IF NOT EXISTS transaction_date TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.khata_ledgers ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days');
ALTER TABLE public.khata_ledgers ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'PENDING';
ALTER TABLE public.khata_ledgers ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE public.khata_ledgers ADD COLUMN IF NOT EXISTS reminder_count INTEGER NOT NULL DEFAULT 0;

-- ==============================================================================
-- 11. FUNCTIONS, TRIGGERS & RLS POLICIES
-- ==============================================================================

-- 11.1 Auto-update updated_at Timestamp Trigger
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    DROP TRIGGER IF EXISTS trigger_customers_updated_at ON public.customers;
    CREATE TRIGGER trigger_customers_updated_at BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

    DROP TRIGGER IF EXISTS trigger_customer_vehicles_updated_at ON public.customer_vehicles;
    CREATE TRIGGER trigger_customer_vehicles_updated_at BEFORE UPDATE ON public.customer_vehicles
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

    DROP TRIGGER IF EXISTS trigger_service_packages_updated_at ON public.service_packages;
    CREATE TRIGGER trigger_service_packages_updated_at BEFORE UPDATE ON public.service_packages
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

    DROP TRIGGER IF EXISTS trigger_bookings_updated_at ON public.bookings;
    CREATE TRIGGER trigger_bookings_updated_at BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

    DROP TRIGGER IF EXISTS trigger_invoices_updated_at ON public.invoices;
    CREATE TRIGGER trigger_invoices_updated_at BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

    DROP TRIGGER IF EXISTS trigger_staff_profiles_updated_at ON public.staff_profiles;
    CREATE TRIGGER trigger_staff_profiles_updated_at BEFORE UPDATE ON public.staff_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
END $$;

-- 11.2 Auth User to Customer Sync Trigger
CREATE OR REPLACE FUNCTION public.sync_auth_user_to_customer()
RETURNS TRIGGER AS $$
DECLARE
    derived_name VARCHAR(255);
    derived_phone VARCHAR(20);
BEGIN
    derived_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''),
        NEW.email,
        'Guest Customer'
    );
    derived_phone := COALESCE(
        NULLIF(TRIM(NEW.phone), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'phone_number'), ''),
        ''
    );

    IF derived_phone = '' THEN
        derived_phone := '+91000' || SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 9);
    END IF;

    IF EXISTS (SELECT 1 FROM public.customers WHERE user_id = NEW.id) THEN
        UPDATE public.customers
        SET 
            name = CASE WHEN (name IS NULL OR name = 'Guest Customer' OR name = '') THEN derived_name ELSE name END,
            phone_number = CASE WHEN (phone_number IS NULL OR phone_number = '') THEN derived_phone ELSE phone_number END,
            updated_at = now()
        WHERE user_id = NEW.id;
    ELSIF derived_phone <> '' AND EXISTS (SELECT 1 FROM public.customers WHERE phone_number = derived_phone) THEN
        UPDATE public.customers
        SET 
            user_id = NEW.id,
            name = CASE WHEN (name IS NULL OR name = 'Guest Customer' OR name = '') THEN derived_name ELSE name END,
            updated_at = now()
        WHERE phone_number = derived_phone;
    ELSE
        INSERT INTO public.customers (
            user_id,
            name,
            phone_number,
            loyalty_points,
            outstanding_balance,
            credit_limit,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            derived_name,
            derived_phone,
            0,
            0.00,
            5000.00,
            now(),
            now()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind Auth Sync Trigger
DROP TRIGGER IF EXISTS on_auth_user_created_sync_customer ON auth.users;
CREATE TRIGGER on_auth_user_created_sync_customer
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_auth_user_to_customer();

-- 11.3 Enable Row Level Security (RLS)
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_package_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_register_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_cash_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deferred_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chemical_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chemical_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_usage_logs ENABLE ROW LEVEL SECURITY;

-- 11.4 Idempotent RLS Access Policies
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'password_reset_otps', 'staff_profiles', 'time_entries', 'customers',
        'subscription_plans', 'member_subscriptions', 'coupons', 'vehicle_categories',
        'customer_vehicles', 'commission_rules', 'service_packages', 'service_package_prices',
        'sop_checklists', 'bookings', 'job_inspections', 'reviews', 'revenue_categories',
        'expense_categories', 'invoices', 'payment_transactions', 'khata_ledgers',
        'bank_transactions', 'collection_banks', 'daily_register_audits', 'general_expenses',
        'staff_advances', 'staff_cash_handovers', 'payroll_entries', 'deferred_revenue',
        'inventory_items', 'chemical_inventory', 'chemical_usage_logs', 'notification_logs',
        'fleet_vehicles', 'fleet_usage_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "service_role_all_%I" ON public.%I;', tbl, tbl);
        EXECUTE format('CREATE POLICY "service_role_all_%I" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', tbl, tbl);
        
        EXECUTE format('DROP POLICY IF EXISTS "auth_read_%I" ON public.%I;', tbl, tbl);
        EXECUTE format('CREATE POLICY "auth_read_%I" ON public.%I FOR SELECT TO authenticated USING (true);', tbl, tbl);
    END LOOP;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
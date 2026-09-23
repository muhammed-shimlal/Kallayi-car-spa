-- ==============================================================================
-- KALLAYI CAR SPA & AUTO CARE - END OF DAY (EOD) REGISTER CLOSEOUT MIGRATION
-- Migration: 20260921_eod_closings.sql
-- ==============================================================================

-- 1. Create eod_closings table
CREATE TABLE IF NOT EXISTS public.eod_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    closing_date DATE NOT NULL UNIQUE,
    total_washes INTEGER NOT NULL DEFAULT 0,
    gross_revenue NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    cash_collected NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    upi_collected NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    credit_issued NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    expenses_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    staff_wages_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    bank_deposited NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    expected_cash NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    actual_cash NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discrepancy NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    net_profit NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    opening_float NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    closed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Performance indexes for fast historical lookups
CREATE INDEX IF NOT EXISTS idx_eod_closings_date ON public.eod_closings (closing_date DESC);
CREATE INDEX IF NOT EXISTS idx_eod_closings_discrepancy ON public.eod_closings (discrepancy);

-- 3. Row Level Security (RLS) Policies
ALTER TABLE public.eod_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read eod_closings" 
    ON public.eod_closings 
    FOR SELECT 
    TO authenticated, anon, service_role 
    USING (true);

CREATE POLICY "Allow authenticated insert eod_closings" 
    ON public.eod_closings 
    FOR INSERT 
    TO authenticated, anon, service_role 
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update eod_closings" 
    ON public.eod_closings 
    FOR UPDATE 
    TO authenticated, anon, service_role 
    USING (true) 
    WITH CHECK (true);

-- 4. Grant table privileges
GRANT ALL ON TABLE public.eod_closings TO postgres, anon, authenticated, service_role;

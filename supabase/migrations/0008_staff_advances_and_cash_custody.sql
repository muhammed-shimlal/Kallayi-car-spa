-- ==============================================================================
-- KALLAYI CAR SPA & AUTO CARE - STAFF ADVANCES, SETTLEMENTS & CASH CUSTODY
-- Migration: 20260921_staff_advances_and_cash_custody.sql
-- ==============================================================================

-- 1. Table: staff_advances (Records salary advances taken by workers)
CREATE TABLE IF NOT EXISTS public.staff_advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    date TIMESTAMPTZ NOT NULL DEFAULT now(),
    purpose TEXT NOT NULL DEFAULT 'Staff Advance',
    is_settled BOOLEAN NOT NULL DEFAULT false,
    settled_at TIMESTAMPTZ DEFAULT NULL,
    payout_id BIGINT REFERENCES public.payroll_entries(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_advances_staff_settled ON public.staff_advances (staff_id, is_settled);
CREATE INDEX IF NOT EXISTS idx_staff_advances_date ON public.staff_advances (date DESC);

-- 2. Table: staff_cash_handovers (Records when staff hand over collected cash to admin/owner)
CREATE TABLE IF NOT EXISTS public.staff_cash_handovers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    notes TEXT DEFAULT '',
    handover_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    received_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_cash_handovers_staff ON public.staff_cash_handovers (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_cash_handovers_date ON public.staff_cash_handovers (handover_date DESC);

-- 3. Extend invoices table to track cash custody
ALTER TABLE public.invoices 
    ADD COLUMN IF NOT EXISTS cash_collected_by_staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_cash_staff ON public.invoices (cash_collected_by_staff_id);

-- 4. Enable Row Level Security
ALTER TABLE public.staff_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_cash_handovers ENABLE ROW LEVEL SECURITY;

-- 5. Service role / authenticated policies
DROP POLICY IF EXISTS "Allow all staff advances access for authenticated" ON public.staff_advances;
CREATE POLICY "Allow all staff advances access for authenticated"
    ON public.staff_advances
    FOR ALL
    TO authenticated, service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all staff cash handovers access for authenticated" ON public.staff_cash_handovers;
CREATE POLICY "Allow all staff cash handovers access for authenticated"
    ON public.staff_cash_handovers
    FOR ALL
    TO authenticated, service_role
    USING (true)
    WITH CHECK (true);

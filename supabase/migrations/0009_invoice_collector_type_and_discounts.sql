-- ==============================================================================
-- KALLAYI CAR SPA & AUTO CARE - DATABASE MIGRATION 0009
-- Migration: Add collector_type, cash_collected_by_staff_id, and discount_reason columns
-- ==============================================================================

-- 1. Invoices Table Enhancements
ALTER TABLE public.invoices 
    ADD COLUMN IF NOT EXISTS collector_type VARCHAR(20) DEFAULT 'ADMIN',
    ADD COLUMN IF NOT EXISTS cash_collected_by_staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS discount_reason VARCHAR(255) DEFAULT '',
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS idx_invoices_collector_type ON public.invoices (collector_type);
CREATE INDEX IF NOT EXISTS idx_invoices_cash_staff ON public.invoices (cash_collected_by_staff_id);

-- 2. Bookings Table Enhancements
ALTER TABLE public.bookings 
    ADD COLUMN IF NOT EXISTS discount_reason VARCHAR(255) DEFAULT '',
    ADD COLUMN IF NOT EXISTS base_price NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS final_price NUMERIC(10, 2) DEFAULT 0.00;

-- 3. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

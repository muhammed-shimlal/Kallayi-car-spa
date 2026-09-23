-- ==============================================================================
-- KALLAYI CAR SPA & AUTO CARE - CASH HANDOVER VEHICLE RECONCILIATION
-- Migration: 20260921_cash_handover_reconciliation.sql
-- ==============================================================================

-- 1. Extend invoices table with handover tracking
ALTER TABLE public.invoices 
    ADD COLUMN IF NOT EXISTS cash_handover_id UUID REFERENCES public.staff_cash_handovers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_cash_handed_over BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_invoices_cash_handover ON public.invoices (cash_handover_id);
CREATE INDEX IF NOT EXISTS idx_invoices_cash_custody_reconciled ON public.invoices (cash_collected_by_staff_id, is_cash_handed_over);

-- 2. Extend staff_cash_handovers table with vehicle audit metadata
ALTER TABLE public.staff_cash_handovers
    ADD COLUMN IF NOT EXISTS vehicle_summary TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS reconciled_invoices_count INT DEFAULT 0;

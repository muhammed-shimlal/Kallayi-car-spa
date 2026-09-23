-- Migration: Add collector_type to invoices table
-- Enables tracking whether cash was deposited directly into the Admin/Shop Till ('ADMIN')
-- or physically held by a floor staff member ('STAFF') awaiting EOD reconciliation.

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS collector_type VARCHAR(20) DEFAULT 'ADMIN';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cash_collected_by_staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_collector_type ON public.invoices (collector_type);
CREATE INDEX IF NOT EXISTS idx_invoices_cash_staff ON public.invoices (cash_collected_by_staff_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

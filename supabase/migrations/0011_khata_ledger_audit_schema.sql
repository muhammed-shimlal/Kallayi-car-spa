-- Migration: 20260923_ensure_khata_ledger_audit_schema.sql
-- Description: Strict Timestamps, Due Dates, Status, Audit Fields & Indexes for Digital Khata (Credit) Transactions

-- 1. Ensure all timestamp, due date, status, and reminder audit columns exist on khata_ledgers
ALTER TABLE public.khata_ledgers
    ADD COLUMN IF NOT EXISTS transaction_date TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS invoice_id BIGINT REFERENCES public.invoices(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS booking_id BIGINT REFERENCES public.bookings(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(25);

-- 2. Add status check constraint safely
DO $$
BEGIN
    ALTER TABLE public.khata_ledgers 
        ADD CONSTRAINT khata_ledgers_status_check 
        CHECK (status IN ('PENDING', 'PARTIALLY_PAID', 'SETTLED'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 3. Backfill historical records with accurate dates and statuses
UPDATE public.khata_ledgers
SET transaction_date = created_at
WHERE transaction_date IS NULL;

UPDATE public.khata_ledgers
SET due_date = created_at + INTERVAL '7 days'
WHERE due_date IS NULL;

UPDATE public.khata_ledgers
SET status = 'SETTLED', settled_at = created_at
WHERE transaction_type = 'SETTLEMENT' AND (status IS NULL OR status = 'PENDING');

UPDATE public.khata_ledgers
SET status = 'PENDING'
WHERE transaction_type = 'CHARGE' AND status IS NULL;

-- Backfill booking_id from related_booking_id
UPDATE public.khata_ledgers
SET booking_id = related_booking_id
WHERE booking_id IS NULL AND related_booking_id IS NOT NULL;

-- Backfill customer_phone from public.customers
UPDATE public.khata_ledgers l
SET customer_phone = c.phone_number
FROM public.customers c
WHERE l.customer_id = c.id AND l.customer_phone IS NULL;

-- 4. Fast querying indexes for AI WhatsApp automation & overdue filters
CREATE INDEX IF NOT EXISTS idx_khata_due_status ON public.khata_ledgers (status, due_date);
CREATE INDEX IF NOT EXISTS idx_khata_ledgers_transaction_date ON public.khata_ledgers (transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_khata_ledgers_customer_phone ON public.khata_ledgers (customer_phone);
CREATE INDEX IF NOT EXISTS idx_khata_ledgers_booking_id ON public.khata_ledgers (booking_id);
CREATE INDEX IF NOT EXISTS idx_khata_ledgers_invoice_id ON public.khata_ledgers (invoice_id);

-- 5. Create compatibility view alias for singular 'khata_ledger'
CREATE OR REPLACE VIEW public.khata_ledger AS 
SELECT * FROM public.khata_ledgers;

-- 6. Grant permissions on view and table
GRANT SELECT, INSERT, UPDATE ON public.khata_ledgers TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.khata_ledger TO authenticated, service_role;

-- 7. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

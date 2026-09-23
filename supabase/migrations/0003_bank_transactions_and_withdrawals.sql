-- ==============================================================================
-- KALLAYI CAR SPA & AUTO CARE - BANK TRANSACTIONS & WITHDRAWALS MIGRATION
-- Migration: 20260921_bank_transactions_and_withdrawals.sql
-- ==============================================================================

-- 1. Create bank_transactions table supporting both DEPOSIT and WITHDRAWAL
CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id BIGSERIAL PRIMARY KEY,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('DEPOSIT', 'WITHDRAWAL')),
    bank_name VARCHAR(100) NOT NULL DEFAULT 'Primary Bank Account',
    purpose TEXT NOT NULL DEFAULT '',
    reference_number VARCHAR(100) DEFAULT NULL,
    receipt_image TEXT DEFAULT NULL,
    recorded_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    recorded_by_name VARCHAR(100) DEFAULT 'Admin Manager',
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for fast date and type queries
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON public.bank_transactions (transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_type ON public.bank_transactions (transaction_type);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_bank ON public.bank_transactions (bank_name);

-- 3. Relax unique constraint on legacy collection_banks if multiple records occur
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'collection_banks_date_key' AND conrelid = 'public.collection_banks'::regclass
    ) THEN
        ALTER TABLE public.collection_banks DROP CONSTRAINT collection_banks_date_key;
    END IF;
END $$;

ALTER TABLE IF EXISTS public.collection_banks 
    ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(20) DEFAULT 'DEPOSIT',
    ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) DEFAULT 'Primary Bank Account',
    ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS receipt_image TEXT DEFAULT NULL;

-- 4. Migrate any legacy deposits from collection_banks into bank_transactions (if not already copied)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collection_banks') THEN
        INSERT INTO public.bank_transactions (
            amount, 
            transaction_type, 
            bank_name, 
            purpose, 
            recorded_by_id, 
            recorded_by_name,
            transaction_date, 
            created_at
        )
        SELECT 
            cb.amount,
            'DEPOSIT',
            'Primary Bank Account',
            COALESCE(NULLIF(cb.notes, ''), 'Daily Reserved Savings Deposit'),
            cb.recorded_by_id,
            'Admin Manager',
            cb.date::timestamptz,
            cb.created_at
        FROM public.collection_banks cb
        WHERE NOT EXISTS (
            SELECT 1 FROM public.bank_transactions bt 
            WHERE bt.transaction_date::date = cb.date 
            AND bt.amount = cb.amount 
            AND bt.transaction_type = 'DEPOSIT'
        );
    END IF;
END $$;

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bank_transactions_updated_at ON public.bank_transactions;
CREATE TRIGGER trg_bank_transactions_updated_at
    BEFORE UPDATE ON public.bank_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 6. Enable RLS and Grant Permissions
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to authenticated users and service role" 
    ON public.bank_transactions 
    FOR ALL 
    TO authenticated, service_role 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Allow public read access" 
    ON public.bank_transactions 
    FOR SELECT 
    TO anon 
    USING (true);

GRANT ALL ON TABLE public.bank_transactions TO postgres, anon, authenticated, service_role;
GRANT ALL ON SEQUENCE public.bank_transactions_id_seq TO postgres, anon, authenticated, service_role;

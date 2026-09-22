-- ==============================================================================
-- KALLAYI CAR SPA & AUTO CARE - PAYROLL PERCENTAGE COMMISSION & WAGE RETENTION MIGRATION
-- Migration: 20260921_payroll_percentage_commission_and_wage_retention.sql
-- ==============================================================================

-- 1. Add percentage commission and cumulative retained balance to staff_profiles
ALTER TABLE public.staff_profiles
    ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5, 2) DEFAULT 40.00,
    ADD COLUMN IF NOT EXISTS retained_balance NUMERIC(10, 2) DEFAULT 0.00;

-- Backfill commission_percentage from existing commission_rate if set
UPDATE public.staff_profiles
SET commission_percentage = commission_rate
WHERE commission_rate IS NOT NULL AND commission_rate > 0 AND (commission_percentage IS NULL OR commission_percentage = 40.00);

-- 2. Add breakdown and retention columns to payroll_entries
ALTER TABLE public.payroll_entries
    ADD COLUMN IF NOT EXISTS gross_earnings NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS advance_deducted NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS previous_retained_applied NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS net_payable NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS balance_retained NUMERIC(10, 2) DEFAULT 0.00;

-- Add index for fast lookup of pending retained balances
CREATE INDEX IF NOT EXISTS idx_staff_profiles_retained_balance 
    ON public.staff_profiles(retained_balance) WHERE retained_balance > 0;

-- Comments for schema documentation
COMMENT ON COLUMN public.staff_profiles.commission_percentage IS 'Configured commission percentage (e.g. 45.00%) for wash jobs attributed to this staff member.';
COMMENT ON COLUMN public.staff_profiles.retained_balance IS 'Cumulative unpaid/withheld wage balance owed to worker (ബാക്കി കുടിശ്ശിക) rolling over across settlement cycles.';
COMMENT ON COLUMN public.payroll_entries.gross_earnings IS 'Total earned before deductions: Base Wage + Earned Commission + Tips.';
COMMENT ON COLUMN public.payroll_entries.commission_amount IS 'Calculated wash commission earned on this date.';
COMMENT ON COLUMN public.payroll_entries.advance_deducted IS 'Total unsettled cash advances automatically deducted during settlement.';
COMMENT ON COLUMN public.payroll_entries.previous_retained_applied IS 'Previous retained balance rolled over into this settlement.';
COMMENT ON COLUMN public.payroll_entries.net_payable IS 'Total due to worker: (Gross Earnings + Previous Retained - Advances Deducted).';
COMMENT ON COLUMN public.payroll_entries.amount_paid IS 'Actual cash/UPI amount paid to worker today.';
COMMENT ON COLUMN public.payroll_entries.balance_retained IS 'Portion withheld today to carry forward as pending retained balance.';

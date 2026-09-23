-- Migration: 20260922_add_discount_reason_columns.sql
-- Add discount_reason and related pricing columns to bookings and invoices tables

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_reason VARCHAR(255) DEFAULT '';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS base_price NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS final_price NUMERIC(10,2) DEFAULT 0.00;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_reason VARCHAR(255) DEFAULT '';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0.00;

-- Reload PostgREST schema cache:
NOTIFY pgrst, 'reload schema';

-- Add settlement-related columns to projects table
-- Migration: 20260205000000_add_settlement_columns_to_projects.sql

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS settlement_status TEXT DEFAULT NULL
  CHECK (settlement_status IN ('pending', 'paid', 'cancelled', 'refund_requested', 'refunded')),
ADD COLUMN IF NOT EXISTS confirmed_budget INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS settlement_fee_rate NUMERIC(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS settlement_paid_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS settlement_order_id UUID DEFAULT NULL
  REFERENCES orders(id) ON DELETE SET NULL;

-- Add index for settlement_order_id lookups
CREATE INDEX IF NOT EXISTS idx_projects_settlement_order_id
  ON public.projects(settlement_order_id)
  WHERE settlement_order_id IS NOT NULL;

-- Add index for settlement_status filtering
CREATE INDEX IF NOT EXISTS idx_projects_settlement_status
  ON public.projects(settlement_status)
  WHERE settlement_status IS NOT NULL;

COMMENT ON COLUMN public.projects.settlement_status IS 'Status of project settlement payment: pending, paid, cancelled, refund_requested, refunded';
COMMENT ON COLUMN public.projects.confirmed_budget IS 'Confirmed budget amount in KRW (원 단위)';
COMMENT ON COLUMN public.projects.settlement_fee_rate IS 'Settlement fee rate in percentage (0.00 to 100.00)';
COMMENT ON COLUMN public.projects.settlement_paid_at IS 'Timestamp when settlement payment was completed (for 7-day cancellation window)';
COMMENT ON COLUMN public.projects.settlement_order_id IS 'Reference to the orders table for the settlement payment';

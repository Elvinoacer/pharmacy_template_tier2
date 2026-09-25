-- Provider checkout attempts have their own reference. Existing rows remain
-- nullable for legacy webhook reconciliation.
ALTER TABLE billing_payments ADD COLUMN IF NOT EXISTS attempt_ref TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS billing_payments_attempt_ref_key ON billing_payments (attempt_ref);

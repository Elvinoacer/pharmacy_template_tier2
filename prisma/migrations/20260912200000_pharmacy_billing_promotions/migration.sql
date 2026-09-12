CREATE TABLE pharmacy_promotions (
 id UUID PRIMARY KEY, name TEXT NOT NULL, capacity INTEGER NOT NULL CHECK (capacity > 0),
 claimed INTEGER NOT NULL DEFAULT 0 CHECK (claimed >= 0 AND claimed <= capacity),
 verification BOOLEAN NOT NULL DEFAULT false, recurring BOOLEAN NOT NULL DEFAULT false,
 recurring_months INTEGER NOT NULL DEFAULT 1 CHECK (recurring_months BETWEEN 1 AND 120),
 active BOOLEAN NOT NULL DEFAULT true, created_by UUID NOT NULL REFERENCES users(id),
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK (verification OR recurring)
);
CREATE TABLE pharmacy_promotion_grants (
 id UUID PRIMARY KEY, pharmacy_id UUID NOT NULL UNIQUE REFERENCES pharmacies(id) ON DELETE CASCADE,
 promotion_id UUID NOT NULL REFERENCES pharmacy_promotions(id), verification BOOLEAN NOT NULL,
 recurring_months INTEGER NOT NULL CHECK (recurring_months BETWEEN 0 AND 120),
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX billing_payments_checkout_unique ON billing_payments(checkout_request_id) WHERE checkout_request_id IS NOT NULL;
CREATE UNIQUE INDEX billing_payments_receipt_unique ON billing_payments(provider, provider_ref) WHERE provider_ref IS NOT NULL AND status = 'succeeded';
CREATE UNIQUE INDEX billing_payments_one_pending ON billing_payments(invoice_id) WHERE status IN ('pending', 'processing');
ALTER TABLE pharmacy_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_promotions FORCE ROW LEVEL SECURITY;
CREATE POLICY platform_only ON pharmacy_promotions USING (app.platform_bypass()) WITH CHECK (app.platform_bypass());
ALTER TABLE pharmacy_promotion_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_promotion_grants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_read ON pharmacy_promotion_grants FOR SELECT USING (app.platform_bypass() OR pharmacy_id = app.current_pharmacy_id());
CREATE POLICY platform_write ON pharmacy_promotion_grants FOR ALL USING (app.platform_bypass()) WITH CHECK (app.platform_bypass());
GRANT ALL ON pharmacy_promotions, pharmacy_promotion_grants TO aether_runtime;
-- New periods use the agreed service price; issued invoices remain historical records.
UPDATE plans SET price_kes = 500, active = (slug = 'starter') WHERE slug IN ('starter', 'professional', 'enterprise');
UPDATE plans SET name = 'Pharmacy Platform' WHERE slug = 'starter';

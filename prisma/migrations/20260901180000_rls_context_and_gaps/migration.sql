-- Invoice numbering sequence (collision-safe vs Math.random).
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;

ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "pending_plan_id" UUID;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "progress" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "result" JSONB;
ALTER TABLE "data_export_requests" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3);
ALTER TABLE "data_export_requests" ADD COLUMN IF NOT EXISTS "download_token_hash" TEXT;

ALTER TYPE "WebhookDeliveryStatus" ADD VALUE IF NOT EXISTS 'processing';

DO $$ BEGIN
  CREATE TYPE "SyncConflictStatus" AS ENUM ('open', 'accepted_pos', 'accepted_platform', 'merged', 'ignored');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BillingPaymentStatus" AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "inventory_sync_conflicts" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "inventory_id" UUID NOT NULL,
  "job_id" UUID,
  "sku" TEXT,
  "platform_stock" INTEGER NOT NULL,
  "pos_stock" INTEGER NOT NULL,
  "platform_version" INTEGER NOT NULL,
  "pos_version" INTEGER,
  "status" "SyncConflictStatus" NOT NULL DEFAULT 'open',
  "resolved_at" TIMESTAMP(3),
  "resolved_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventory_sync_conflicts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_sync_conflicts_pharmacy_id_status_idx" ON "inventory_sync_conflicts"("pharmacy_id", "status");
CREATE INDEX IF NOT EXISTS "inventory_sync_conflicts_inventory_id_idx" ON "inventory_sync_conflicts"("inventory_id");

CREATE TABLE IF NOT EXISTS "billing_payments" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "invoice_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "status" "BillingPaymentStatus" NOT NULL DEFAULT 'pending',
  "amount_kes" DECIMAL(12,2) NOT NULL,
  "phone" TEXT,
  "checkout_request_id" TEXT,
  "merchant_request_id" TEXT,
  "provider_ref" TEXT,
  "failure_reason" TEXT,
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "billing_payments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "billing_payments_pharmacy_id_invoice_id_idx" ON "billing_payments"("pharmacy_id", "invoice_id");
CREATE INDEX IF NOT EXISTS "billing_payments_checkout_request_id_idx" ON "billing_payments"("checkout_request_id");

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_subscription_period_key"
  ON "invoices"("subscription_id", "period_start", "period_end");

DO $$ BEGIN
  ALTER TABLE "subscriptions"
    ADD CONSTRAINT "subscriptions_pending_plan_id_fkey"
    FOREIGN KEY ("pending_plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "inventory_sync_conflicts"
    ADD CONSTRAINT "inventory_sync_conflicts_pharmacy_id_fkey"
    FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "inventory_sync_conflicts"
    ADD CONSTRAINT "inventory_sync_conflicts_inventory_id_fkey"
    FOREIGN KEY ("inventory_id") REFERENCES "pharmacy_inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "billing_payments"
    ADD CONSTRAINT "billing_payments_pharmacy_id_fkey"
    FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "billing_payments"
    ADD CONSTRAINT "billing_payments_invoice_id_fkey"
    FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Fail-closed RLS on additional tenant tables introduced here.
CREATE OR REPLACE FUNCTION app.current_pharmacy_id() RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.pharmacy_id', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION app.platform_bypass() RETURNS boolean AS $$
BEGIN
  RETURN current_setting('app.platform_bypass', true) = '1';
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'orders','payments','notifications','audit_logs','pharmacy_inventory','outbox_events',
    'api_keys','subscriptions','invoices','usage_records','webhook_events','notification_deliveries',
    'webhook_deliveries','billing_payments','inventory_sync_conflicts'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      $p$CREATE POLICY tenant_isolation ON %I
        USING (app.platform_bypass() OR (app.current_pharmacy_id() IS NOT NULL AND pharmacy_id = app.current_pharmacy_id()))
        WITH CHECK (app.platform_bypass() OR (app.current_pharmacy_id() IS NOT NULL AND pharmacy_id = app.current_pharmacy_id()))$p$,
      t
    );
  END LOOP;
END $$;

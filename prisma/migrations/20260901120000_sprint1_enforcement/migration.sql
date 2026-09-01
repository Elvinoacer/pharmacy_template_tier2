ALTER TABLE "notification_deliveries" ADD COLUMN IF NOT EXISTS "payload" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "usage_records" ADD COLUMN IF NOT EXISTS "event_id" TEXT;
ALTER TABLE "usage_records" ADD COLUMN IF NOT EXISTS "billable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "usage_records" ADD COLUMN IF NOT EXISTS "unit" TEXT NOT NULL DEFAULT 'count';
CREATE UNIQUE INDEX IF NOT EXISTS "usage_records_pharmacy_id_event_id_key" ON "usage_records"("pharmacy_id","event_id");

DROP INDEX IF EXISTS "webhook_events_provider_provider_event_id_key";
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_pharmacy_id_provider_provider_event_id_key"
  ON "webhook_events"("pharmacy_id","provider","provider_event_id");

CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "endpoint_id" UUID NOT NULL,
  "event_type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "delivered_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "webhook_deliveries_status_next_attempt_at_idx" ON "webhook_deliveries"("status","next_attempt_at");
CREATE INDEX IF NOT EXISTS "webhook_deliveries_pharmacy_id_idx" ON "webhook_deliveries"("pharmacy_id");

-- Fail-closed RLS: NULL tenant is not "all tenants". Platform bypass is explicit.
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
    'api_keys','subscriptions','invoices','usage_records','webhook_events','notification_deliveries'
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

REVOKE UPDATE, DELETE ON "audit_logs" FROM PUBLIC;
CREATE OR REPLACE FUNCTION app.deny_audit_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs are append-only';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS audit_logs_immutable ON "audit_logs";
CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION app.deny_audit_mutation();

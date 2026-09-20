ALTER TABLE "pharmacy_promotions"
  ADD COLUMN IF NOT EXISTS "verification_discount_kes" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "recurring_discount_kes" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "pharmacy_promotion_grants"
  ADD COLUMN IF NOT EXISTS "verification_discount_kes" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "recurring_discount_kes" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "pharmacy_promotions"
SET "verification_discount_kes" = 100
WHERE "verification" = true AND "verification_discount_kes" = 0;

UPDATE "pharmacy_promotions"
SET "recurring_discount_kes" = 500
WHERE "recurring" = true AND "recurring_discount_kes" = 0;

UPDATE "pharmacy_promotion_grants"
SET "verification_discount_kes" = 100
WHERE "verification" = true AND "verification_discount_kes" = 0;

UPDATE "pharmacy_promotion_grants" AS promotion_grant
SET "recurring_discount_kes" = 500
WHERE promotion_grant."recurring_months" > 0
  AND promotion_grant."recurring_discount_kes" = 0;

CREATE TABLE IF NOT EXISTS "pharmacy_waiver_requests" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "requested_amount_kes" DECIMAL(12,2),
  "status" TEXT NOT NULL DEFAULT 'pending',
  "decision_note" TEXT,
  "approved_verification_kes" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "approved_monthly_kes" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "approved_months" INTEGER NOT NULL DEFAULT 0,
  "decided_by" UUID,
  "decided_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pharmacy_waiver_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pharmacy_waiver_requests_pharmacy_id_fkey"
    FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "pharmacy_waiver_requests_status_created_at_idx"
  ON "pharmacy_waiver_requests"("status", "created_at");
CREATE INDEX IF NOT EXISTS "pharmacy_waiver_requests_pharmacy_id_created_at_idx"
  ON "pharmacy_waiver_requests"("pharmacy_id", "created_at" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "pharmacy_waiver_requests_one_pending"
  ON "pharmacy_waiver_requests"("pharmacy_id") WHERE "status" = 'pending';

ALTER TABLE "pharmacy_waiver_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pharmacy_waiver_requests" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_read ON "pharmacy_waiver_requests";
CREATE POLICY tenant_read ON "pharmacy_waiver_requests" FOR SELECT
  USING (app.platform_bypass() OR pharmacy_id = app.current_pharmacy_id());
DROP POLICY IF EXISTS tenant_submit ON "pharmacy_waiver_requests";
CREATE POLICY tenant_submit ON "pharmacy_waiver_requests" FOR INSERT
  WITH CHECK (app.platform_bypass() OR pharmacy_id = app.current_pharmacy_id());
DROP POLICY IF EXISTS platform_write ON "pharmacy_waiver_requests";
CREATE POLICY platform_write ON "pharmacy_waiver_requests" FOR UPDATE
  USING (app.platform_bypass()) WITH CHECK (app.platform_bypass());
GRANT ALL ON "pharmacy_waiver_requests" TO aether_runtime;

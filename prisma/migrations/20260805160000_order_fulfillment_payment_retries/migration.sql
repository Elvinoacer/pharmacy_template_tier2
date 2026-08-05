-- Order fulfillment tracking (counter auto-dispatch vs remote reservation)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "guest_name" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "guest_phone" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "fulfillment" TEXT NOT NULL DEFAULT 'reserve';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "dispatched_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "dispatched_by" UUID;

CREATE INDEX IF NOT EXISTS "orders_guest_phone_idx" ON "orders"("guest_phone");
CREATE INDEX IF NOT EXISTS "orders_dispatched_at_idx" ON "orders"("dispatched_at");

-- Payment STK polling + retries
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "checkout_request_id" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "merchant_request_id" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "attempt_count" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "last_attempt_at" TIMESTAMP(3);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "initiated_by" UUID;

-- Backfill checkout_request_id from provider_ref for pending Daraja payments
-- (legacy STK stored CheckoutRequestID in provider_ref until callback overwrote it).
UPDATE "payments"
SET "checkout_request_id" = "provider_ref"
WHERE "provider" = 'daraja'
  AND "status" = 'pending'
  AND "provider_ref" IS NOT NULL
  AND "checkout_request_id" IS NULL;

CREATE INDEX IF NOT EXISTS "payments_checkout_request_id_idx" ON "payments"("checkout_request_id");
CREATE INDEX IF NOT EXISTS "payments_phone_idx" ON "payments"("phone");

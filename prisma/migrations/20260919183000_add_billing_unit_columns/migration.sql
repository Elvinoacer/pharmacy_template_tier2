-- Reconcile the BillingUnit enum/columns already present in schema.prisma.
-- Older databases were missing these columns, causing any Order.items include
-- to fail before Daraja payment logic could run.

DO $$
BEGIN
  CREATE TYPE "BillingUnit" AS ENUM (
    'TABLET',
    'CAPSULE',
    'BOTTLE',
    'BOX',
    'PACK',
    'STRIP',
    'AMPOULE',
    'ML',
    'UNIT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE "prescriptions"
  ADD COLUMN IF NOT EXISTS "billing_unit" "BillingUnit" DEFAULT 'UNIT';

ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "billing_unit" "BillingUnit" DEFAULT 'UNIT';

ALTER TABLE "prescription_fills"
  ADD COLUMN IF NOT EXISTS "billing_unit" "BillingUnit" DEFAULT 'UNIT';

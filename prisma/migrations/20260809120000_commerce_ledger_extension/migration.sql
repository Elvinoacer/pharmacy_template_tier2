-- ════════════════════════════════════════════════════════════════
-- Commerce ledger extension (audit §40–§77)
-- Adds first-class PrescriptionFill, InventoryReservation, Refund,
-- InventoryAllocation, CommerceEvent, MedicationPriceHistory,
-- CashierSession — plus enriched Order/OrderItem financial fields.
-- All additive: existing columns + statuses stay untouched so legacy
-- rows keep working; new writes populate the new fields.
-- ════════════════════════════════════════════════════════════════

-- ── Enums ──────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "OrderType" AS ENUM ('OTC_PURCHASE', 'PRESCRIPTION_FILL', 'REFILL', 'RESERVATION', 'SERVICE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "OrderLifecycleStatus" AS ENUM ('draft', 'active', 'completed', 'cancelled', 'expired', 'voided');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentStage" AS ENUM ('unpaid', 'pending', 'partially_paid', 'paid', 'failed', 'refunded', 'partially_refunded', 'waived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FulfillmentStage" AS ENUM ('unfulfilled', 'reserved', 'preparing', 'ready', 'out_for_delivery', 'fulfilled', 'partially_fulfilled', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ReservationStatus" AS ENUM ('active', 'converted', 'released', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PrescriptionFillStatus" AS ENUM ('pending', 'preparing', 'ready', 'dispatched', 'collected', 'cancelled', 'reversed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RefundStatus" AS ENUM ('pending', 'approved', 'completed', 'failed', 'reversed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CommerceEventType" AS ENUM (
    'order_created', 'order_reserved', 'payment_initiated', 'payment_completed',
    'payment_failed', 'order_fulfilled', 'prescription_filled', 'refill_requested',
    'refill_approved', 'refill_collected', 'reservation_expired', 'order_cancelled',
    'refund_created', 'refund_completed', 'stock_reserved', 'stock_released',
    'stock_sold', 'stock_returned', 'waiver_applied', 'coupon_redeemed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── New tables ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "prescription_fills" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "prescription_id" UUID NOT NULL,
  "order_id" UUID,
  "refill_request_id" UUID,
  "fill_number" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_price_snapshot" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "net_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "cost_price_snapshot" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "status" "PrescriptionFillStatus" NOT NULL DEFAULT 'pending',
  "filled_at" TIMESTAMP(3),
  "dispatched_at" TIMESTAMP(3),
  "collected_at" TIMESTAMP(3),
  "dispensed_by_id" UUID,
  "medication_id" UUID,
  "medication_name" TEXT NOT NULL,
  "lot_ids" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "prescription_fills_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prescription_fills_prescription_id_fill_number_key" UNIQUE ("prescription_id", "fill_number"),
  CONSTRAINT "prescription_fills_order_id_key" UNIQUE ("order_id"),
  CONSTRAINT "prescription_fills_refill_request_id_key" UNIQUE ("refill_request_id")
);

CREATE INDEX IF NOT EXISTS "prescription_fills_prescription_id_idx" ON "prescription_fills"("prescription_id");
CREATE INDEX IF NOT EXISTS "prescription_fills_order_id_idx" ON "prescription_fills"("order_id");
CREATE INDEX IF NOT EXISTS "prescription_fills_refill_request_id_idx" ON "prescription_fills"("refill_request_id");
CREATE INDEX IF NOT EXISTS "prescription_fills_status_idx" ON "prescription_fills"("status");
CREATE INDEX IF NOT EXISTS "prescription_fills_dispatched_at_idx" ON "prescription_fills"("dispatched_at" DESC);
CREATE INDEX IF NOT EXISTS "prescription_fills_created_at_idx" ON "prescription_fills"("created_at" DESC);

ALTER TABLE "prescription_fills"
  ADD CONSTRAINT IF NOT EXISTS "prescription_fills_prescription_id_fkey"
    FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE;
ALTER TABLE "prescription_fills"
  ADD CONSTRAINT IF NOT EXISTS "prescription_fills_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL;
ALTER TABLE "prescription_fills"
  ADD CONSTRAINT IF NOT EXISTS "prescription_fills_refill_request_id_fkey"
    FOREIGN KEY ("refill_request_id") REFERENCES "refill_requests"("id") ON DELETE SET NULL;
ALTER TABLE "prescription_fills"
  ADD CONSTRAINT IF NOT EXISTS "prescription_fills_dispensed_by_id_fkey"
    FOREIGN KEY ("dispensed_by_id") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "prescription_fills"
  ADD CONSTRAINT IF NOT EXISTS "prescription_fills_medication_id_fkey"
    FOREIGN KEY ("medication_id") REFERENCES "pharmacy_inventory"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "inventory_reservations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "order_item_id" UUID,
  "inventory_id" UUID NOT NULL,
  "inventory_lot_id" UUID,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "status" "ReservationStatus" NOT NULL DEFAULT 'active',
  "reserved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3),
  "released_at" TIMESTAMP(3),
  "released_reason" TEXT,
  "created_by_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "inventory_reservations_order_id_idx" ON "inventory_reservations"("order_id");
CREATE INDEX IF NOT EXISTS "inventory_reservations_order_item_id_idx" ON "inventory_reservations"("order_item_id");
CREATE INDEX IF NOT EXISTS "inventory_reservations_inventory_id_idx" ON "inventory_reservations"("inventory_id");
CREATE INDEX IF NOT EXISTS "inventory_reservations_status_idx" ON "inventory_reservations"("status");
CREATE INDEX IF NOT EXISTS "inventory_reservations_expires_at_idx" ON "inventory_reservations"("expires_at");

ALTER TABLE "inventory_reservations"
  ADD CONSTRAINT IF NOT EXISTS "inventory_reservations_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
ALTER TABLE "inventory_reservations"
  ADD CONSTRAINT IF NOT EXISTS "inventory_reservations_order_item_id_fkey"
    FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL;
ALTER TABLE "inventory_reservations"
  ADD CONSTRAINT IF NOT EXISTS "inventory_reservations_inventory_id_fkey"
    FOREIGN KEY ("inventory_id") REFERENCES "pharmacy_inventory"("id") ON DELETE CASCADE;
ALTER TABLE "inventory_reservations"
  ADD CONSTRAINT IF NOT EXISTS "inventory_reservations_inventory_lot_id_fkey"
    FOREIGN KEY ("inventory_lot_id") REFERENCES "inventory_lots"("id") ON DELETE SET NULL;
ALTER TABLE "inventory_reservations"
  ADD CONSTRAINT IF NOT EXISTS "inventory_reservations_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "refunds" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "payment_id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'cash',
  "provider_ref" TEXT,
  "reason" TEXT,
  "status" "RefundStatus" NOT NULL DEFAULT 'pending',
  "created_by_id" UUID,
  "approved_by_id" UUID,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "refunds_payment_id_idx" ON "refunds"("payment_id");
CREATE INDEX IF NOT EXISTS "refunds_order_id_idx" ON "refunds"("order_id");
CREATE INDEX IF NOT EXISTS "refunds_status_idx" ON "refunds"("status");
CREATE INDEX IF NOT EXISTS "refunds_created_at_idx" ON "refunds"("created_at" DESC);

ALTER TABLE "refunds"
  ADD CONSTRAINT IF NOT EXISTS "refunds_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE;
ALTER TABLE "refunds"
  ADD CONSTRAINT IF NOT EXISTS "refunds_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
ALTER TABLE "refunds"
  ADD CONSTRAINT IF NOT EXISTS "refunds_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "refunds"
  ADD CONSTRAINT IF NOT EXISTS "refunds_approved_by_id_fkey"
    FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "inventory_allocations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_item_id" UUID NOT NULL,
  "inventory_lot_id" UUID NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "unit_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_allocations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "inventory_allocations_order_item_id_idx" ON "inventory_allocations"("order_item_id");
CREATE INDEX IF NOT EXISTS "inventory_allocations_inventory_lot_id_idx" ON "inventory_allocations"("inventory_lot_id");

ALTER TABLE "inventory_allocations"
  ADD CONSTRAINT IF NOT EXISTS "inventory_allocations_order_item_id_fkey"
    FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE;
ALTER TABLE "inventory_allocations"
  ADD CONSTRAINT IF NOT EXISTS "inventory_allocations_inventory_lot_id_fkey"
    FOREIGN KEY ("inventory_lot_id") REFERENCES "inventory_lots"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "commerce_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_type" "CommerceEventType" NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" UUID NOT NULL,
  "order_id" UUID,
  "customer_id" UUID,
  "actor_id" UUID,
  "amount" DECIMAL(10,2),
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "commerce_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "commerce_events_event_type_idx" ON "commerce_events"("event_type");
CREATE INDEX IF NOT EXISTS "commerce_events_entity_type_entity_id_idx" ON "commerce_events"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "commerce_events_order_id_idx" ON "commerce_events"("order_id");
CREATE INDEX IF NOT EXISTS "commerce_events_customer_id_idx" ON "commerce_events"("customer_id");
CREATE INDEX IF NOT EXISTS "commerce_events_occurred_at_idx" ON "commerce_events"("occurred_at" DESC);

ALTER TABLE "commerce_events"
  ADD CONSTRAINT IF NOT EXISTS "commerce_events_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "medication_price_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "inventory_id" UUID NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "cost_price" DECIMAL(10,2),
  "reason" TEXT NOT NULL DEFAULT 'catalogue',
  "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effective_to" TIMESTAMP(3),
  "changed_by_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "medication_price_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "medication_price_history_inventory_id_effective_from_idx"
  ON "medication_price_history"("inventory_id", "effective_from" DESC);
CREATE INDEX IF NOT EXISTS "medication_price_history_effective_to_idx"
  ON "medication_price_history"("effective_to");

ALTER TABLE "medication_price_history"
  ADD CONSTRAINT IF NOT EXISTS "medication_price_history_inventory_id_fkey"
    FOREIGN KEY ("inventory_id") REFERENCES "pharmacy_inventory"("id") ON DELETE CASCADE;
ALTER TABLE "medication_price_history"
  ADD CONSTRAINT IF NOT EXISTS "medication_price_history_changed_by_id_fkey"
    FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "cashier_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "opening_float" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "closed_at" TIMESTAMP(3),
  "closing_cash" DECIMAL(10,2),
  "expected_cash" DECIMAL(10,2),
  "variance" DECIMAL(10,2),
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cashier_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "cashier_sessions_user_id_idx" ON "cashier_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "cashier_sessions_opened_at_idx" ON "cashier_sessions"("opened_at" DESC);

ALTER TABLE "cashier_sessions"
  ADD CONSTRAINT IF NOT EXISTS "cashier_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- ── Additive columns on existing tables ──────────────────────

-- Order: financial + lifecycle + timestamps (audit §16, §42, §63)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "guest_email" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "type" "OrderType";
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "lifecycle_status" "OrderLifecycleStatus";
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_stage" "PaymentStage";
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "fulfillment_stage" "FulfillmentStage";
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'KES';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discount_total" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tax_total" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "net_total" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "amount_paid" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "amount_refunded" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "amount_due" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "reserved_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_initiated_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "preparing_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "ready_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "out_for_delivery_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "fulfilled_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "expired_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancellation_reason" TEXT;

CREATE INDEX IF NOT EXISTS "orders_type_idx" ON "orders"("type");
CREATE INDEX IF NOT EXISTS "orders_payment_stage_idx" ON "orders"("payment_stage");
CREATE INDEX IF NOT EXISTS "orders_fulfillment_stage_idx" ON "orders"("fulfillment_stage");
CREATE INDEX IF NOT EXISTS "orders_lifecycle_status_idx" ON "orders"("lifecycle_status");
CREATE INDEX IF NOT EXISTS "orders_paid_at_idx" ON "orders"("paid_at");
CREATE INDEX IF NOT EXISTS "orders_fulfilled_at_idx" ON "orders"("fulfilled_at");

-- OrderItem: cost snapshot + margin + linkage (audit §17, §41.D)
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "unit_cost_snapshot" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "gross_amount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "net_amount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "gross_profit" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'KES';
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "pricing_rule" TEXT;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "prescription_fill_id" UUID;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "refill_request_id" UUID;

CREATE INDEX IF NOT EXISTS "order_items_prescription_fill_id_idx" ON "order_items"("prescription_fill_id");
CREATE INDEX IF NOT EXISTS "order_items_refill_request_id_idx" ON "order_items"("refill_request_id");
CREATE INDEX IF NOT EXISTS "order_items_medication_id_idx" ON "order_items"("medication_id");

-- Payment: explicit paid_at timestamp (audit §62)
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "payments_paid_at_idx" ON "payments"("paid_at");

-- ── Backfill Order lifecycle/payment/fulfillment from legacy status (audit §15) ──
-- Map old `status` to the new separation so existing rows are queryable
-- immediately without requiring the analytics layer to know both worlds.
UPDATE "orders" SET "lifecycle_status" = 'completed'
  WHERE "lifecycle_status" IS NULL AND "status" IN ('paid','fulfilled');
UPDATE "orders" SET "lifecycle_status" = 'active'
  WHERE "lifecycle_status" IS NULL AND "status" IN ('pending');
UPDATE "orders" SET "lifecycle_status" = 'cancelled'
  WHERE "lifecycle_status" IS NULL AND "status" = 'cancelled';
UPDATE "orders" SET "lifecycle_status" = 'completed'
  WHERE "lifecycle_status" IS NULL AND "status" = 'waived';

UPDATE "orders" SET "payment_stage" = 'paid'
  WHERE "payment_stage" IS NULL AND "status" IN ('paid','fulfilled');
UPDATE "orders" SET "payment_stage" = 'waived'
  WHERE "payment_stage" IS NULL AND "status" = 'waived';
UPDATE "orders" SET "payment_stage" = 'unpaid'
  WHERE "payment_stage" IS NULL AND "status" = 'pending';
UPDATE "orders" SET "payment_stage" = 'unpaid'
  WHERE "payment_stage" IS NULL AND "status" = 'cancelled';

UPDATE "orders" SET "fulfillment_stage" = 'fulfilled'
  WHERE "fulfillment_stage" IS NULL AND "status" = 'fulfilled';
UPDATE "orders" SET "fulfillment_stage" = 'reserved'
  WHERE "fulfillment_stage" IS NULL AND "fulfillment" = 'reserve' AND "status" = 'pending';
UPDATE "orders" SET "fulfillment_stage" = 'unfulfilled'
  WHERE "fulfillment_stage" IS NULL AND "fulfillment" = 'immediate' AND "status" = 'pending';
UPDATE "orders" SET "fulfillment_stage" = 'cancelled'
  WHERE "fulfillment_stage" IS NULL AND "status" = 'cancelled';

-- Mirror legacy `total` into `net_total`/`subtotal` and `amount_paid` for completed orders.
UPDATE "orders" SET "subtotal" = "total", "net_total" = "total", "amount_due" = "total"
  WHERE "net_total" = 0 AND "total" > 0;
UPDATE "orders" SET "amount_paid" = "total"
  WHERE "amount_paid" = 0 AND "status" IN ('paid','fulfilled');
UPDATE "orders" SET "amount_due" = 0
  WHERE "amount_due" = "total" AND "status" IN ('paid','fulfilled','waived');

-- Backfill OrderItem gross/net amounts from existing columns (audit §17)
UPDATE "order_items"
SET "gross_amount" = ("unit_price" * "quantity"),
    "net_amount"   = ("unit_price" * "quantity") - "discount_applied",
    "gross_profit" = (("unit_price" * "quantity") - "discount_applied") - 0
WHERE "gross_amount" = 0;

-- Backfill Payment.paidAt from createdAt for already-completed payments (audit §62)
UPDATE "payments" SET "paid_at" = "updated_at"
  WHERE "paid_at" IS NULL AND "status" = 'completed';

-- ── Backfill type from source for legacy orders (audit §20) ──
UPDATE "orders" SET "type" = 'RESERVATION'
  WHERE "type" IS NULL AND "source" = 'website';
UPDATE "orders" SET "type" = 'OTC_PURCHASE'
  WHERE "type" IS NULL AND "source" = 'portal';
UPDATE "orders" SET "type" = 'REFILL'
  WHERE "type" IS NULL AND "source" = 'refill';
UPDATE "orders" SET "type" = 'OTC_PURCHASE'
  WHERE "type" IS NULL AND "source" = 'counter';

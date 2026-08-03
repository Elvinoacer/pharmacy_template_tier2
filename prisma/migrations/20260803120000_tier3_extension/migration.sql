-- Tier 3 extension: onboarding, age segments, prescription adherence,
-- medication catalog, orders & payments, loyalty rules, caregiver invites,
-- admin notifications, customer note ordering, coupon per-customer limits.

-- CustomerProfile: new columns
ALTER TABLE "customer_profiles"
  ADD COLUMN IF NOT EXISTS "age_segment" TEXT,
  ADD COLUMN IF NOT EXISTS "onboarding_completed_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "customer_profiles_age_segment_idx" ON "customer_profiles"("age_segment");

-- CustomerNote: sortOrder
ALTER TABLE "customer_notes"
  ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "customer_notes_customer_id_sort_order_idx" ON "customer_notes"("customer_id", "sort_order");

-- Notification: fullBody + soft delete
ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "full_body" TEXT,
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "notifications_customer_id_deleted_at_idx" ON "notifications"("customer_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "notifications_status_idx" ON "notifications"("status");

-- Prescription: schedule, daysSupply, endDate, unitPrice
ALTER TABLE "prescriptions"
  ADD COLUMN IF NOT EXISTS "schedule" TEXT,
  ADD COLUMN IF NOT EXISTS "days_supply" INTEGER,
  ADD COLUMN IF NOT EXISTS "end_date" DATE,
  ADD COLUMN IF NOT EXISTS "unit_price" DECIMAL(10,2);
CREATE INDEX IF NOT EXISTS "prescriptions_status_idx" ON "prescriptions"("status");

-- Coupon: per-customer limit + updatedAt
ALTER TABLE "coupons"
  ADD COLUMN IF NOT EXISTS "max_redemptions_per_customer" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- LoyaltyTransaction: source
ALTER TABLE "loyalty_transactions"
  ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'manual';
CREATE INDEX IF NOT EXISTS "loyalty_transactions_account_id_created_at_desc_idx" ON "loyalty_transactions"("account_id", "created_at" DESC);

-- Message templates: updatedById (for audit trail of who last edited a template)
ALTER TABLE "message_templates"
  ADD COLUMN IF NOT EXISTS "updated_by" UUID;

-- Caregiver invites
CREATE TABLE IF NOT EXISTS "caregiver_invites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caregiver_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "caregiver_invites_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "caregiver_invites_token_hash_key" UNIQUE ("token_hash"),
    CONSTRAINT "caregiver_invites_caregiver_id_fkey"
      FOREIGN KEY ("caregiver_id") REFERENCES "caregivers"("id") ON DELETE CASCADE
);

-- PrescriptionAdherence
CREATE TABLE IF NOT EXISTS "prescription_adherence" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "prescription_id" UUID NOT NULL,
    "taken_on" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'taken',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "prescription_adherence_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "prescription_adherence_prescription_id_taken_on_key" UNIQUE ("prescription_id", "taken_on"),
    CONSTRAINT "prescription_adherence_customer_id_fkey"
      FOREIGN KEY ("customer_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "prescription_adherence_prescription_id_fkey"
      FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "prescription_adherence_customer_id_taken_on_idx" ON "prescription_adherence"("customer_id", "taken_on");

-- Medications
CREATE TABLE IF NOT EXISTS "medications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "indications" TEXT,
    "dosage" TEXT,
    "side_effects" TEXT,
    "contraindications" TEXT,
    "storage" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "over_the_counter" BOOLEAN NOT NULL DEFAULT false,
    "public_listing" BOOLEAN NOT NULL DEFAULT false,
    "prescription_required" BOOLEAN NOT NULL DEFAULT true,
    "stock_qty" INTEGER NOT NULL DEFAULT 0,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 10,
    "image_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "medications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "medications_slug_key" UNIQUE ("slug"),
    CONSTRAINT "medications_sku_key" UNIQUE ("sku")
);
CREATE INDEX IF NOT EXISTS "medications_category_idx" ON "medications"("category");
CREATE INDEX IF NOT EXISTS "medications_over_the_counter_idx" ON "medications"("over_the_counter");
CREATE INDEX IF NOT EXISTS "medications_public_listing_idx" ON "medications"("public_listing");

-- Orders + OrderItems + Payments
CREATE TABLE IF NOT EXISTS "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID,
    "source" TEXT NOT NULL DEFAULT 'counter',
    "refill_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "waived" BOOLEAN NOT NULL DEFAULT false,
    "waived_reason" TEXT,
    "waived_scope" TEXT,
    "waived_until" TIMESTAMP(3),
    "notes" TEXT,
    "served_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "orders_customer_id_fkey"
      FOREIGN KEY ("customer_id") REFERENCES "customer_profiles"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "orders_customer_id_idx" ON "orders"("customer_id");
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status");
CREATE INDEX IF NOT EXISTS "orders_created_at_desc_idx" ON "orders"("created_at" DESC);

CREATE TABLE IF NOT EXISTS "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "medication_id" UUID,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount_applied" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "coupon_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_items_order_id_fkey"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
    CONSTRAINT "order_items_medication_id_fkey"
      FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE SET NULL,
    CONSTRAINT "order_items_coupon_id_fkey"
      FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "order_items_order_id_idx" ON "order_items"("order_id");

CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded', 'waived');
CREATE TYPE "PaymentProvider" AS ENUM ('daraja', 'cash', 'card', 'other');

CREATE TABLE IF NOT EXISTS "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "customer_id" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'daraja',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "provider_ref" TEXT,
    "phone" TEXT,
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payments_order_id_fkey"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
    CONSTRAINT "payments_customer_id_fkey"
      FOREIGN KEY ("customer_id") REFERENCES "customer_profiles"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "payments_order_id_idx" ON "payments"("order_id");
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments"("status");

-- Loyalty rules
CREATE TABLE IF NOT EXISTS "loyalty_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "multiplier" DECIMAL(10,4),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "loyalty_rules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "loyalty_rules_name_key" UNIQUE ("name")
);

-- Admin notifications (inbound, separate from outbound Notification)
CREATE TABLE IF NOT EXISTS "admin_notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "related_type" TEXT,
    "related_id" UUID,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "retry_action" TEXT,
    "retry_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "admin_notifications_is_read_idx" ON "admin_notifications"("is_read");
CREATE INDEX IF NOT EXISTS "admin_notifications_created_at_desc_idx" ON "admin_notifications"("created_at" DESC);

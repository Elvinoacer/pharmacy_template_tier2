-- Pharmacy services catalogue + bookings
CREATE TABLE IF NOT EXISTS "pharmacy_services" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "short" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "benefits" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "eligibility" TEXT,
    "duration" TEXT,
    "image_url" TEXT,
    "icon" TEXT,
    "price" DECIMAL(10,2),
    "bookable" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pharmacy_services_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pharmacy_services_slug_key" ON "pharmacy_services"("slug");
CREATE INDEX IF NOT EXISTS "pharmacy_services_active_sort_order_idx" ON "pharmacy_services"("active", "sort_order");

CREATE TABLE IF NOT EXISTS "service_bookings" (
    "id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "customer_id" UUID,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "notes" TEXT,
    "preferred_date" TEXT,
    "preferred_time" TEXT,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "payment_status" TEXT NOT NULL DEFAULT 'none',
    "amount" DECIMAL(10,2),
    "order_id" UUID,
    "paid_at" TIMESTAMP(3),
    "paid_via" TEXT,
    "payment_ref" TEXT,
    "recorded_by" UUID,
    "staff_notes" TEXT,
    "push_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_bookings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "service_bookings_order_id_key" ON "service_bookings"("order_id");
CREATE INDEX IF NOT EXISTS "service_bookings_service_id_idx" ON "service_bookings"("service_id");
CREATE INDEX IF NOT EXISTS "service_bookings_status_idx" ON "service_bookings"("status");
CREATE INDEX IF NOT EXISTS "service_bookings_payment_status_idx" ON "service_bookings"("payment_status");
CREATE INDEX IF NOT EXISTS "service_bookings_phone_idx" ON "service_bookings"("phone");
CREATE INDEX IF NOT EXISTS "service_bookings_created_at_idx" ON "service_bookings"("created_at" DESC);

-- Category public media fields
ALTER TABLE "medication_categories" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
ALTER TABLE "medication_categories" ADD COLUMN IF NOT EXISTS "brands" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "medication_categories" ADD COLUMN IF NOT EXISTS "tips" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "medication_categories" ADD COLUMN IF NOT EXISTS "public_visible" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "medication_categories_public_visible_idx" ON "medication_categories"("public_visible");

-- FKs
DO $$ BEGIN
  ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_service_id_fkey"
    FOREIGN KEY ("service_id") REFERENCES "pharmacy_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_recorded_by_fkey"
    FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Multi-tenancy: pharmacies, memberships, pharmacyId on tenant tables
CREATE TYPE "PharmacyStatus" AS ENUM ('draft', 'submitted', 'under_review', 'needs_info', 'approved', 'active', 'suspended', 'rejected');
CREATE TYPE "PharmacyMemberRole" AS ENUM ('owner', 'manager', 'pharmacist', 'staff');
CREATE TYPE "PharmacyMemberStatus" AS ENUM ('invited', 'active', 'suspended');

CREATE TABLE "pharmacies" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "tagline" TEXT,
    "description" TEXT,
    "license_number" TEXT,
    "license_document_url" TEXT,
    "ppb_premises_number" TEXT,
    "kra_pin" TEXT,
    "status" "PharmacyStatus" NOT NULL DEFAULT 'draft',
    "listed" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "verification_notes" TEXT,
    "rejection_reason" TEXT,
    "verified_at" TIMESTAMP(3),
    "verified_by" UUID,
    "submitted_at" TIMESTAMP(3),
    "go_live_at" TIMESTAMP(3),
    "setup_completed_at" TIMESTAMP(3),
    "owner_user_id" UUID,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "city" TEXT,
    "county" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Kenya',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "logo_url" TEXT,
    "cover_image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pharmacies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pharmacies_slug_key" ON "pharmacies"("slug");
CREATE INDEX "pharmacies_status_idx" ON "pharmacies"("status");
CREATE INDEX "pharmacies_listed_featured_idx" ON "pharmacies"("listed", "featured");
CREATE INDEX "pharmacies_city_idx" ON "pharmacies"("city");
CREATE INDEX "pharmacies_county_idx" ON "pharmacies"("county");

INSERT INTO "pharmacies" (
  "id", "slug", "name", "legal_name", "tagline", "description",
  "license_number", "status", "listed", "featured", "email", "phone", "whatsapp",
  "city", "county", "country", "go_live_at", "setup_completed_at", "verified_at", "created_at", "updated_at"
) VALUES (
  '00000000-0000-4000-a000-000000000001',
  'aether',
  'Aether Pharmacy',
  'Aether Pharmacy Ltd',
  'Your neighbourhood pharmacy, built on trust',
  'Aether Pharmacy has served families across the community for over 15 years with expert dispensing, personalised counselling, and convenient care services.',
  'PPB-DEMO-0001',
  'active',
  true,
  true,
  'support@gtss.software',
  '+254790670542',
  '+254790670542',
  'Nairobi',
  'Nairobi',
  'Kenya',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

CREATE TABLE "pharmacy_memberships" (
    "id" UUID NOT NULL,
    "pharmacy_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "PharmacyMemberRole" NOT NULL DEFAULT 'staff',
    "status" "PharmacyMemberStatus" NOT NULL DEFAULT 'active',
    "invited_by" UUID,
    "invited_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pharmacy_memberships_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pharmacy_memberships_pharmacy_id_user_id_key" ON "pharmacy_memberships"("pharmacy_id", "user_id");
CREATE INDEX "pharmacy_memberships_user_id_idx" ON "pharmacy_memberships"("user_id");

CREATE TABLE "customer_pharmacies" (
    "customer_id" UUID NOT NULL,
    "pharmacy_id" UUID NOT NULL,
    "preferred" BOOLEAN NOT NULL DEFAULT false,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_pharmacies_pkey" PRIMARY KEY ("customer_id", "pharmacy_id")
);
CREATE INDEX "customer_pharmacies_pharmacy_id_idx" ON "customer_pharmacies"("pharmacy_id");

CREATE TABLE "pharmacy_integrations" (
    "id" UUID NOT NULL,
    "pharmacy_id" UUID NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Nairobi',
    "locale" TEXT NOT NULL DEFAULT 'en-KE',
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "loyalty_spend_multiplier" DECIMAL(10,4) NOT NULL DEFAULT 0.01,
    "email_from_override" TEXT,
    "support_email_override" TEXT,
    "support_phone_override" TEXT,
    "daraja_env" TEXT,
    "daraja_shortcode" TEXT,
    "daraja_consumer_key_enc" TEXT,
    "daraja_consumer_secret_enc" TEXT,
    "daraja_passkey_enc" TEXT,
    "twilio_sms_from" TEXT,
    "twilio_account_sid_enc" TEXT,
    "twilio_auth_token_enc" TEXT,
    "whatsapp_phone_number_id" TEXT,
    "whatsapp_access_token_enc" TEXT,
    "pos_api_key_hash" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pharmacy_integrations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pharmacy_integrations_pharmacy_id_key" ON "pharmacy_integrations"("pharmacy_id");

CREATE TABLE "pharmacy_onboarding_events" (
    "id" UUID NOT NULL,
    "pharmacy_id" UUID NOT NULL,
    "actor_id" UUID,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pharmacy_onboarding_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pharmacy_onboarding_events_pharmacy_id_created_at_idx" ON "pharmacy_onboarding_events"("pharmacy_id", "created_at" DESC);

CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Aether',
    "tagline" TEXT NOT NULL DEFAULT 'The pharmacy network for Kenya',
    "description" TEXT NOT NULL DEFAULT 'One account. Every neighbourhood pharmacy.',
    "support_email" TEXT NOT NULL DEFAULT 'support@gtss.software',
    "support_phone" TEXT NOT NULL DEFAULT '0790670542',
    "marketplace_hero" TEXT,
    "about_markdown" TEXT,
    "for_pharmacies_md" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);
INSERT INTO "platform_settings" ("id") VALUES ('platform') ON CONFLICT DO NOTHING;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "platform_admin" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "pharmacy_inventory" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "pharmacy_inventory" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "pharmacy_inventory" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "pharmacy_inventory_pharmacy_id_idx" ON "pharmacy_inventory"("pharmacy_id");
DROP INDEX IF EXISTS "pharmacy_inventory_slug_key";
ALTER TABLE "pharmacy_inventory" DROP CONSTRAINT IF EXISTS "pharmacy_inventory_slug_key";
CREATE UNIQUE INDEX IF NOT EXISTS "pharmacy_inventory_pharmacy_slug_key" ON "pharmacy_inventory"("pharmacy_id", "slug");
DROP INDEX IF EXISTS "pharmacy_inventory_sku_key";
ALTER TABLE "pharmacy_inventory" DROP CONSTRAINT IF EXISTS "pharmacy_inventory_sku_key";
CREATE UNIQUE INDEX IF NOT EXISTS "pharmacy_inventory_pharmacy_sku_key" ON "pharmacy_inventory"("pharmacy_id", "sku") WHERE "sku" IS NOT NULL;

ALTER TABLE "medication_categories" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "medication_categories" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "medication_categories" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "medication_categories_pharmacy_id_idx" ON "medication_categories"("pharmacy_id");
DROP INDEX IF EXISTS "medication_categories_slug_key";
ALTER TABLE "medication_categories" DROP CONSTRAINT IF EXISTS "medication_categories_slug_key";
CREATE UNIQUE INDEX IF NOT EXISTS "medication_categories_pharmacy_slug_key" ON "medication_categories"("pharmacy_id", "slug");

ALTER TABLE "pharmacy_settings" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "pharmacy_settings" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "pharmacy_settings" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "pharmacy_settings_pharmacy_id_key" ON "pharmacy_settings"("pharmacy_id");

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "orders" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "orders" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "orders_pharmacy_id_idx" ON "orders"("pharmacy_id");

ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "prescriptions" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "prescriptions" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "prescriptions_pharmacy_id_idx" ON "prescriptions"("pharmacy_id");

ALTER TABLE "refill_requests" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "refill_requests" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "refill_requests" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "refill_requests_pharmacy_id_idx" ON "refill_requests"("pharmacy_id");

ALTER TABLE "segments" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "segments" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "segments" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "segments_pharmacy_id_idx" ON "segments"("pharmacy_id");
DROP INDEX IF EXISTS "segments_name_key";
ALTER TABLE "segments" DROP CONSTRAINT IF EXISTS "segments_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "segments_pharmacy_name_key" ON "segments"("pharmacy_id", "name");

ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "conversations" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "conversations" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "conversations_pharmacy_id_idx" ON "conversations"("pharmacy_id");

ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "campaigns" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "campaigns" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "campaigns_pharmacy_id_idx" ON "campaigns"("pharmacy_id");

ALTER TABLE "loyalty_accounts" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "loyalty_accounts" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "loyalty_accounts" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "loyalty_accounts_pharmacy_id_idx" ON "loyalty_accounts"("pharmacy_id");
DROP INDEX IF EXISTS "loyalty_accounts_customer_id_key";
ALTER TABLE "loyalty_accounts" DROP CONSTRAINT IF EXISTS "loyalty_accounts_customer_id_key";
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_accounts_pharmacy_customer_id_key" ON "loyalty_accounts"("pharmacy_id", "customer_id");

ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "coupons" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "coupons" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "coupons_pharmacy_id_idx" ON "coupons"("pharmacy_id");
DROP INDEX IF EXISTS "coupons_code_key";
ALTER TABLE "coupons" DROP CONSTRAINT IF EXISTS "coupons_code_key";
CREATE UNIQUE INDEX IF NOT EXISTS "coupons_pharmacy_code_key" ON "coupons"("pharmacy_id", "code");

ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "enquiries" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "enquiries" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "enquiries_pharmacy_id_idx" ON "enquiries"("pharmacy_id");

ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "feedback" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "feedback" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "feedback_pharmacy_id_idx" ON "feedback"("pharmacy_id");

ALTER TABLE "knowledge_articles" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "knowledge_articles" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "knowledge_articles" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "knowledge_articles_pharmacy_id_idx" ON "knowledge_articles"("pharmacy_id");

ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "ai_conversations" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "ai_conversations" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "ai_conversations_pharmacy_id_idx" ON "ai_conversations"("pharmacy_id");

ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "audit_logs" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "audit_logs_pharmacy_id_idx" ON "audit_logs"("pharmacy_id");

ALTER TABLE "customer_notes" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "customer_notes" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "customer_notes" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "customer_notes_pharmacy_id_idx" ON "customer_notes"("pharmacy_id");

ALTER TABLE "timeline_events" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "timeline_events" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "timeline_events" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "timeline_events_pharmacy_id_idx" ON "timeline_events"("pharmacy_id");

ALTER TABLE "message_templates" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "message_templates" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "message_templates" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "message_templates_pharmacy_id_idx" ON "message_templates"("pharmacy_id");

ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "notifications" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "notifications" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "notifications_pharmacy_id_idx" ON "notifications"("pharmacy_id");

ALTER TABLE "reminders" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "reminders" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "reminders" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "reminders_pharmacy_id_idx" ON "reminders"("pharmacy_id");

ALTER TABLE "loyalty_rules" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "loyalty_rules" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "loyalty_rules" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "loyalty_rules_pharmacy_id_idx" ON "loyalty_rules"("pharmacy_id");
DROP INDEX IF EXISTS "loyalty_rules_name_key";
ALTER TABLE "loyalty_rules" DROP CONSTRAINT IF EXISTS "loyalty_rules_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_rules_pharmacy_name_key" ON "loyalty_rules"("pharmacy_id", "name");

ALTER TABLE "pharmacy_services" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "pharmacy_services" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "pharmacy_services" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "pharmacy_services_pharmacy_id_idx" ON "pharmacy_services"("pharmacy_id");
DROP INDEX IF EXISTS "pharmacy_services_slug_key";
ALTER TABLE "pharmacy_services" DROP CONSTRAINT IF EXISTS "pharmacy_services_slug_key";
CREATE UNIQUE INDEX IF NOT EXISTS "pharmacy_services_pharmacy_slug_key" ON "pharmacy_services"("pharmacy_id", "slug");

ALTER TABLE "service_bookings" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "service_bookings" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "service_bookings" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "service_bookings_pharmacy_id_idx" ON "service_bookings"("pharmacy_id");

ALTER TABLE "admin_notifications" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "admin_notifications" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "admin_notifications" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "admin_notifications_pharmacy_id_idx" ON "admin_notifications"("pharmacy_id");

ALTER TABLE "symptom_sessions" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "symptom_sessions" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "symptom_sessions" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "symptom_sessions_pharmacy_id_idx" ON "symptom_sessions"("pharmacy_id");

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "payments" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "payments" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "payments_pharmacy_id_idx" ON "payments"("pharmacy_id");

ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "stock_movements" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "stock_movements" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "stock_movements_pharmacy_id_idx" ON "stock_movements"("pharmacy_id");

ALTER TABLE "cashier_sessions" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "cashier_sessions" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "cashier_sessions" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "cashier_sessions_pharmacy_id_idx" ON "cashier_sessions"("pharmacy_id");

ALTER TABLE "health_screening_records" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "health_screening_records" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "health_screening_records" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "health_screening_records_pharmacy_id_idx" ON "health_screening_records"("pharmacy_id");

ALTER TABLE "clinical_referrals" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "clinical_referrals" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "clinical_referrals" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "clinical_referrals_pharmacy_id_idx" ON "clinical_referrals"("pharmacy_id");

ALTER TABLE "pharmacy_immunization_policy" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "pharmacy_immunization_policy" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "pharmacy_immunization_policy" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "pharmacy_immunization_policy_pharmacy_id_key" ON "pharmacy_immunization_policy"("pharmacy_id");

ALTER TABLE "vaccine_products" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "vaccine_products" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "vaccine_products" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "vaccine_products_pharmacy_id_idx" ON "vaccine_products"("pharmacy_id");
DROP INDEX IF EXISTS "vaccine_products_slug_key";
ALTER TABLE "vaccine_products" DROP CONSTRAINT IF EXISTS "vaccine_products_slug_key";
CREATE UNIQUE INDEX IF NOT EXISTS "vaccine_products_pharmacy_slug_key" ON "vaccine_products"("pharmacy_id", "slug");

ALTER TABLE "immunizer_credentials" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "immunizer_credentials" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "immunizer_credentials" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "immunizer_credentials_pharmacy_id_idx" ON "immunizer_credentials"("pharmacy_id");

ALTER TABLE "immunization_appointments" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "immunization_appointments" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "immunization_appointments" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "immunization_appointments_pharmacy_id_idx" ON "immunization_appointments"("pharmacy_id");

ALTER TABLE "preventive_counselling_sessions" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "preventive_counselling_sessions" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "preventive_counselling_sessions" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "preventive_counselling_sessions_pharmacy_id_idx" ON "preventive_counselling_sessions"("pharmacy_id");

ALTER TABLE "public_health_campaigns" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "public_health_campaigns" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "public_health_campaigns" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "public_health_campaigns_pharmacy_id_idx" ON "public_health_campaigns"("pharmacy_id");
DROP INDEX IF EXISTS "public_health_campaigns_slug_key";
ALTER TABLE "public_health_campaigns" DROP CONSTRAINT IF EXISTS "public_health_campaigns_slug_key";
CREATE UNIQUE INDEX IF NOT EXISTS "public_health_campaigns_pharmacy_slug_key" ON "public_health_campaigns"("pharmacy_id", "slug");

ALTER TABLE "medication_schedules" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "medication_schedules" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "medication_schedules" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "medication_schedules_pharmacy_id_idx" ON "medication_schedules"("pharmacy_id");

ALTER TABLE "prescription_fills" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "prescription_fills" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "prescription_fills" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "prescription_fills_pharmacy_id_idx" ON "prescription_fills"("pharmacy_id");

ALTER TABLE "inventory_reservations" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "inventory_reservations" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "inventory_reservations" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "inventory_reservations_pharmacy_id_idx" ON "inventory_reservations"("pharmacy_id");

ALTER TABLE "refunds" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "refunds" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "refunds" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "refunds_pharmacy_id_idx" ON "refunds"("pharmacy_id");

ALTER TABLE "medication_price_history" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "medication_price_history" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "medication_price_history" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "medication_price_history_pharmacy_id_idx" ON "medication_price_history"("pharmacy_id");

ALTER TABLE "commerce_events" ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID;
UPDATE "commerce_events" SET "pharmacy_id" = '00000000-0000-4000-a000-000000000001' WHERE "pharmacy_id" IS NULL;
ALTER TABLE "commerce_events" ALTER COLUMN "pharmacy_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "commerce_events_pharmacy_id_idx" ON "commerce_events"("pharmacy_id");

ALTER TABLE "pharmacy_settings" ADD COLUMN IF NOT EXISTS "tagline" TEXT;
ALTER TABLE "pharmacy_settings" ADD COLUMN IF NOT EXISTS "about" TEXT;
ALTER TABLE "pharmacy_settings" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
ALTER TABLE "pharmacy_settings" ADD COLUMN IF NOT EXISTS "cover_image_url" TEXT;
ALTER TABLE "pharmacy_settings" ADD COLUMN IF NOT EXISTS "brand_primary" TEXT;
ALTER TABLE "pharmacy_settings" ADD COLUMN IF NOT EXISTS "brand_accent" TEXT;
ALTER TABLE "pharmacy_settings" ADD COLUMN IF NOT EXISTS "social" JSONB DEFAULT '{}';
ALTER TABLE "pharmacy_settings" ADD COLUMN IF NOT EXISTS "team" JSONB DEFAULT '[]';
ALTER TABLE "pharmacy_settings" ADD COLUMN IF NOT EXISTS "testimonials" JSONB DEFAULT '[]';
ALTER TABLE "pharmacy_settings" ADD COLUMN IF NOT EXISTS "faq" JSONB DEFAULT '[]';
ALTER TABLE "pharmacy_settings" ADD COLUMN IF NOT EXISTS "insurance" JSONB DEFAULT '[]';
ALTER TABLE "pharmacy_settings" ADD COLUMN IF NOT EXISTS "certifications" JSONB DEFAULT '[]';
ALTER TABLE "pharmacy_settings" ADD COLUMN IF NOT EXISTS "delivery_notes" TEXT;
ALTER TABLE "pharmacy_settings" ADD COLUMN IF NOT EXISTS "delivery_fee_kes" DECIMAL(10,2);
ALTER TABLE "pharmacy_settings" ADD COLUMN IF NOT EXISTS "delivery_radius_km" DOUBLE PRECISION;
ALTER TABLE "pharmacy_settings" ADD COLUMN IF NOT EXISTS "careers_email" TEXT;

ALTER TABLE "pharmacies" ADD CONSTRAINT "pharmacies_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pharmacies" ADD CONSTRAINT "pharmacies_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pharmacy_memberships" ADD CONSTRAINT "pharmacy_memberships_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pharmacy_memberships" ADD CONSTRAINT "pharmacy_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_pharmacies" ADD CONSTRAINT "customer_pharmacies_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_pharmacies" ADD CONSTRAINT "customer_pharmacies_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pharmacy_integrations" ADD CONSTRAINT "pharmacy_integrations_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pharmacy_onboarding_events" ADD CONSTRAINT "pharmacy_onboarding_events_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pharmacy_inventory" ADD CONSTRAINT "pharmacy_inventory_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "medication_categories" ADD CONSTRAINT "medication_categories_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pharmacy_settings" ADD CONSTRAINT "pharmacy_settings_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refill_requests" ADD CONSTRAINT "refill_requests_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "segments" ADD CONSTRAINT "segments_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "loyalty_rules" ADD CONSTRAINT "loyalty_rules_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pharmacy_services" ADD CONSTRAINT "pharmacy_services_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "symptom_sessions" ADD CONSTRAINT "symptom_sessions_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cashier_sessions" ADD CONSTRAINT "cashier_sessions_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "health_screening_records" ADD CONSTRAINT "health_screening_records_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinical_referrals" ADD CONSTRAINT "clinical_referrals_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pharmacy_immunization_policy" ADD CONSTRAINT "pharmacy_immunization_policy_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vaccine_products" ADD CONSTRAINT "vaccine_products_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "immunizer_credentials" ADD CONSTRAINT "immunizer_credentials_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "immunization_appointments" ADD CONSTRAINT "immunization_appointments_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "preventive_counselling_sessions" ADD CONSTRAINT "preventive_counselling_sessions_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public_health_campaigns" ADD CONSTRAINT "public_health_campaigns_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "medication_schedules" ADD CONSTRAINT "medication_schedules_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prescription_fills" ADD CONSTRAINT "prescription_fills_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "medication_price_history" ADD CONSTRAINT "medication_price_history_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_events" ADD CONSTRAINT "commerce_events_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "pharmacy_memberships" ("id", "pharmacy_id", "user_id", "role", "status", "accepted_at")
SELECT gen_random_uuid(), '00000000-0000-4000-a000-000000000001', u.id,
  CASE WHEN u.role::text = 'manager' THEN 'owner'::"PharmacyMemberRole"
       WHEN u.role::text = 'pharmacist' THEN 'pharmacist'::"PharmacyMemberRole"
       ELSE 'staff'::"PharmacyMemberRole" END,
  'active'::"PharmacyMemberStatus",
  CURRENT_TIMESTAMP
FROM "users" u
WHERE u.role::text IN ('manager', 'pharmacist', 'staff')
ON CONFLICT DO NOTHING;
INSERT INTO "customer_pharmacies" ("customer_id", "pharmacy_id", "preferred")
SELECT c.id, '00000000-0000-4000-a000-000000000001', true FROM "customer_profiles" c
ON CONFLICT DO NOTHING;
INSERT INTO "pharmacy_integrations" ("id", "pharmacy_id")
VALUES (gen_random_uuid(), '00000000-0000-4000-a000-000000000001')
ON CONFLICT DO NOTHING;

-- Each pharmacy gets its own settings / immunization-policy row (no more singleton TEXT id='default').
ALTER TABLE "pharmacy_settings" DROP CONSTRAINT IF EXISTS "pharmacy_settings_pkey";
ALTER TABLE "pharmacy_settings" ALTER COLUMN "id" DROP DEFAULT;
UPDATE "pharmacy_settings"
  SET "id" = gen_random_uuid()::text
  WHERE "id" IS NULL OR "id" = 'default' OR "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
ALTER TABLE "pharmacy_settings" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "pharmacy_settings" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "pharmacy_settings" ADD PRIMARY KEY ("id");

ALTER TABLE "pharmacy_immunization_policy" DROP CONSTRAINT IF EXISTS "pharmacy_immunization_policy_pkey";
ALTER TABLE "pharmacy_immunization_policy" ALTER COLUMN "id" DROP DEFAULT;
UPDATE "pharmacy_immunization_policy"
  SET "id" = gen_random_uuid()::text
  WHERE "id" IS NULL OR "id" = 'default' OR "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
ALTER TABLE "pharmacy_immunization_policy" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "pharmacy_immunization_policy" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "pharmacy_immunization_policy" ADD PRIMARY KEY ("id");

-- Referral codes are unique per pharmacy, not globally.
ALTER TABLE "loyalty_accounts" DROP CONSTRAINT IF EXISTS "loyalty_accounts_referral_code_key";
DROP INDEX IF EXISTS "loyalty_accounts_referral_code_key";
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_accounts_pharmacy_id_referral_code_key"
  ON "loyalty_accounts"("pharmacy_id", "referral_code");


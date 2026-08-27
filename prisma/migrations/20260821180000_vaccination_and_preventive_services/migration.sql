-- Vaccination & preventive services (immunisation clinic, consent, AEFI, counselling, campaigns)

CREATE TABLE IF NOT EXISTS "pharmacy_immunization_policy" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "jurisdiction" TEXT NOT NULL DEFAULT 'Kenya',
    "authorizing_body" TEXT NOT NULL DEFAULT 'Pharmacy and Poisons Board (PPB) / Ministry of Health',
    "authorizing_regulation" TEXT,
    "supervising_pharmacist_required" BOOLEAN NOT NULL DEFAULT true,
    "observation_minutes_default" INTEGER NOT NULL DEFAULT 15,
    "vis_required" BOOLEAN NOT NULL DEFAULT true,
    "aefi_reporting_contact" TEXT,
    "aefi_reporting_authority" TEXT NOT NULL DEFAULT 'PPB / Division of Disease Surveillance and Response',
    "cold_chain_notes" TEXT,
    "public_disclaimer" TEXT,
    "walk_in_accepted" BOOLEAN NOT NULL DEFAULT true,
    "paediatric_on_site" BOOLEAN NOT NULL DEFAULT false,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pharmacy_immunization_policy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "vaccine_products" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "antigen" TEXT NOT NULL,
    "brand_name" TEXT,
    "manufacturer" TEXT,
    "category" TEXT NOT NULL,
    "diseases_prevented" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "description" TEXT NOT NULL,
    "indications" TEXT NOT NULL,
    "who_should_get" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "who_should_wait" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "contraindications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "precautions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "common_side_effects" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "rare_risks" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "route" TEXT NOT NULL DEFAULT 'IM',
    "site_options" TEXT[] NOT NULL DEFAULT ARRAY['Left deltoid','Right deltoid']::TEXT[],
    "dose_ml" DECIMAL(4,2),
    "series_doses" INTEGER NOT NULL DEFAULT 1,
    "series_interval_days" INTEGER,
    "booster_interval_months" INTEGER,
    "min_age_months" INTEGER NOT NULL DEFAULT 0,
    "max_age_months" INTEGER,
    "vis_title" TEXT,
    "vis_version" TEXT,
    "vis_summary" TEXT NOT NULL,
    "storage_requirements" TEXT NOT NULL DEFAULT '2–8°C cold chain. Do not freeze unless labelled.',
    "price_kes" DECIMAL(10,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "bookable" BOOLEAN NOT NULL DEFAULT true,
    "pharmacy_administered" BOOLEAN NOT NULL DEFAULT true,
    "travel_related" BOOLEAN NOT NULL DEFAULT false,
    "season_label" TEXT,
    "regulatory_notes" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vaccine_products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "vaccine_products_slug_key" ON "vaccine_products"("slug");
CREATE INDEX IF NOT EXISTS "vaccine_products_active_sort_order_idx" ON "vaccine_products"("active", "sort_order");
CREATE INDEX IF NOT EXISTS "vaccine_products_category_idx" ON "vaccine_products"("category");

CREATE TABLE IF NOT EXISTS "immunizer_credentials" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "credential_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "license_number" TEXT,
    "issued_by" TEXT NOT NULL,
    "issued_at" DATE,
    "expires_at" DATE,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "immunizer_credentials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "immunizer_credentials_user_id_idx" ON "immunizer_credentials"("user_id");
CREATE INDEX IF NOT EXISTS "immunizer_credentials_expires_at_idx" ON "immunizer_credentials"("expires_at");

CREATE TABLE IF NOT EXISTS "immunization_appointments" (
    "id" UUID NOT NULL,
    "vaccine_product_id" UUID NOT NULL,
    "customer_id" UUID,
    "service_booking_id" UUID,
    "campaign_id" UUID,
    "patient_name" TEXT NOT NULL,
    "patient_phone" TEXT NOT NULL,
    "patient_email" TEXT,
    "patient_dob" DATE,
    "patient_gender" TEXT,
    "preferred_date" TEXT,
    "preferred_time" TEXT,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "source" TEXT NOT NULL DEFAULT 'online',
    "notes" TEXT,
    "staff_notes" TEXT,
    "assigned_to" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "immunization_appointments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "immunization_appointments_service_booking_id_key" ON "immunization_appointments"("service_booking_id");
CREATE INDEX IF NOT EXISTS "immunization_appointments_status_idx" ON "immunization_appointments"("status");
CREATE INDEX IF NOT EXISTS "immunization_appointments_vaccine_product_id_idx" ON "immunization_appointments"("vaccine_product_id");
CREATE INDEX IF NOT EXISTS "immunization_appointments_customer_id_idx" ON "immunization_appointments"("customer_id");
CREATE INDEX IF NOT EXISTS "immunization_appointments_created_at_idx" ON "immunization_appointments"("created_at" DESC);

CREATE TABLE IF NOT EXISTS "pre_vaccination_screenings" (
    "id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "customer_id" UUID,
    "screened_by" UUID,
    "answers" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "allergy_flag" BOOLEAN NOT NULL DEFAULT false,
    "pregnancy_flag" BOOLEAN NOT NULL DEFAULT false,
    "immunocompromised_flag" BOOLEAN NOT NULL DEFAULT false,
    "recent_illness_flag" BOOLEAN NOT NULL DEFAULT false,
    "previous_reaction_flag" BOOLEAN NOT NULL DEFAULT false,
    "anticoagulant_flag" BOOLEAN NOT NULL DEFAULT false,
    "outcome" TEXT NOT NULL DEFAULT 'eligible',
    "outcome_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pre_vaccination_screenings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pre_vaccination_screenings_appointment_id_key" ON "pre_vaccination_screenings"("appointment_id");

CREATE TABLE IF NOT EXISTS "vaccination_consents" (
    "id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "vaccine_product_id" UUID NOT NULL,
    "customer_id" UUID,
    "vis_provided" BOOLEAN NOT NULL DEFAULT true,
    "vis_version" TEXT,
    "vis_provided_at" TIMESTAMP(3),
    "consent_type" TEXT NOT NULL DEFAULT 'self',
    "consenter_name" TEXT NOT NULL,
    "consenter_relationship" TEXT,
    "signature_name" TEXT NOT NULL,
    "consent_text_snapshot" TEXT NOT NULL,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawn_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vaccination_consents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "vaccination_consents_appointment_id_key" ON "vaccination_consents"("appointment_id");

CREATE TABLE IF NOT EXISTS "immunization_records" (
    "id" UUID NOT NULL,
    "appointment_id" UUID,
    "vaccine_product_id" UUID NOT NULL,
    "customer_id" UUID,
    "consent_id" UUID,
    "administered_by" UUID,
    "supervising_pharmacist_id" UUID,
    "patient_name" TEXT NOT NULL,
    "patient_dob" DATE,
    "patient_gender" TEXT,
    "patient_phone" TEXT,
    "dose_number" INTEGER NOT NULL DEFAULT 1,
    "series_complete" BOOLEAN NOT NULL DEFAULT true,
    "administered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "route" TEXT NOT NULL DEFAULT 'IM',
    "site" TEXT,
    "dose_ml" DECIMAL(4,2),
    "lot_number" TEXT NOT NULL,
    "expiry_date" DATE,
    "manufacturer" TEXT,
    "vis_given_at" TIMESTAMP(3),
    "vis_version" TEXT,
    "observation_minutes" INTEGER NOT NULL DEFAULT 15,
    "observation_until" TIMESTAMP(3),
    "observation_outcome" TEXT NOT NULL DEFAULT 'uneventful',
    "next_due_date" DATE,
    "certificate_code" TEXT NOT NULL,
    "campaign_id" UUID,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'administered',
    "void_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "immunization_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "immunization_records_appointment_id_key" ON "immunization_records"("appointment_id");
CREATE UNIQUE INDEX IF NOT EXISTS "immunization_records_certificate_code_key" ON "immunization_records"("certificate_code");
CREATE INDEX IF NOT EXISTS "immunization_records_customer_id_idx" ON "immunization_records"("customer_id");
CREATE INDEX IF NOT EXISTS "immunization_records_vaccine_product_id_idx" ON "immunization_records"("vaccine_product_id");
CREATE INDEX IF NOT EXISTS "immunization_records_administered_at_idx" ON "immunization_records"("administered_at" DESC);

CREATE TABLE IF NOT EXISTS "aefi_reports" (
    "id" UUID NOT NULL,
    "immunization_id" UUID NOT NULL,
    "onset_at" TIMESTAMP(3) NOT NULL,
    "severity" TEXT NOT NULL,
    "symptoms" TEXT NOT NULL,
    "action_taken" TEXT NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'recovering',
    "reported_to_authority" BOOLEAN NOT NULL DEFAULT false,
    "reported_at" TIMESTAMP(3),
    "reported_by" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "aefi_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "aefi_reports_immunization_id_idx" ON "aefi_reports"("immunization_id");
CREATE INDEX IF NOT EXISTS "aefi_reports_severity_idx" ON "aefi_reports"("severity");

CREATE TABLE IF NOT EXISTS "preventive_counselling_sessions" (
    "id" UUID NOT NULL,
    "customer_id" UUID,
    "counsellor_id" UUID,
    "campaign_id" UUID,
    "topic" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'in_person',
    "duration_minutes" INTEGER NOT NULL DEFAULT 20,
    "patient_name" TEXT NOT NULL,
    "patient_phone" TEXT,
    "summary" TEXT,
    "goals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "resources_given" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "follow_up_date" DATE,
    "preferred_date" TEXT,
    "preferred_time" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "source" TEXT NOT NULL DEFAULT 'online',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "preventive_counselling_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "preventive_counselling_sessions_customer_id_idx" ON "preventive_counselling_sessions"("customer_id");
CREATE INDEX IF NOT EXISTS "preventive_counselling_sessions_topic_idx" ON "preventive_counselling_sessions"("topic");
CREATE INDEX IF NOT EXISTS "preventive_counselling_sessions_status_idx" ON "preventive_counselling_sessions"("status");
CREATE INDEX IF NOT EXISTS "preventive_counselling_sessions_created_at_idx" ON "preventive_counselling_sessions"("created_at" DESC);

CREATE TABLE IF NOT EXISTS "public_health_campaigns" (
    "id" UUID NOT NULL,
    "crm_campaign_id" UUID,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "short" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "target_population" TEXT NOT NULL,
    "vaccines_offered" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "walk_in_days" TEXT,
    "target_doses" INTEGER,
    "doses_administered" INTEGER NOT NULL DEFAULT 0,
    "education_topics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "location_notes" TEXT,
    "regulatory_notes" TEXT,
    "hero_image" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "public_health_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "public_health_campaigns_crm_campaign_id_key" ON "public_health_campaigns"("crm_campaign_id");
CREATE UNIQUE INDEX IF NOT EXISTS "public_health_campaigns_slug_key" ON "public_health_campaigns"("slug");
CREATE INDEX IF NOT EXISTS "public_health_campaigns_theme_idx" ON "public_health_campaigns"("theme");
CREATE INDEX IF NOT EXISTS "public_health_campaigns_active_idx" ON "public_health_campaigns"("active");

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "pharmacy_immunization_policy" ADD CONSTRAINT "pharmacy_immunization_policy_updated_by_fkey"
    FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "immunizer_credentials" ADD CONSTRAINT "immunizer_credentials_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "immunization_appointments" ADD CONSTRAINT "immunization_appointments_vaccine_product_id_fkey"
    FOREIGN KEY ("vaccine_product_id") REFERENCES "vaccine_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "immunization_appointments" ADD CONSTRAINT "immunization_appointments_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "immunization_appointments" ADD CONSTRAINT "immunization_appointments_service_booking_id_fkey"
    FOREIGN KEY ("service_booking_id") REFERENCES "service_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "immunization_appointments" ADD CONSTRAINT "immunization_appointments_assigned_to_fkey"
    FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "pre_vaccination_screenings" ADD CONSTRAINT "pre_vaccination_screenings_appointment_id_fkey"
    FOREIGN KEY ("appointment_id") REFERENCES "immunization_appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "pre_vaccination_screenings" ADD CONSTRAINT "pre_vaccination_screenings_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "pre_vaccination_screenings" ADD CONSTRAINT "pre_vaccination_screenings_screened_by_fkey"
    FOREIGN KEY ("screened_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "vaccination_consents" ADD CONSTRAINT "vaccination_consents_appointment_id_fkey"
    FOREIGN KEY ("appointment_id") REFERENCES "immunization_appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "vaccination_consents" ADD CONSTRAINT "vaccination_consents_vaccine_product_id_fkey"
    FOREIGN KEY ("vaccine_product_id") REFERENCES "vaccine_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "vaccination_consents" ADD CONSTRAINT "vaccination_consents_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "immunization_records" ADD CONSTRAINT "immunization_records_appointment_id_fkey"
    FOREIGN KEY ("appointment_id") REFERENCES "immunization_appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "immunization_records" ADD CONSTRAINT "immunization_records_vaccine_product_id_fkey"
    FOREIGN KEY ("vaccine_product_id") REFERENCES "vaccine_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "immunization_records" ADD CONSTRAINT "immunization_records_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "immunization_records" ADD CONSTRAINT "immunization_records_administered_by_fkey"
    FOREIGN KEY ("administered_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "immunization_records" ADD CONSTRAINT "immunization_records_supervising_pharmacist_id_fkey"
    FOREIGN KEY ("supervising_pharmacist_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "aefi_reports" ADD CONSTRAINT "aefi_reports_immunization_id_fkey"
    FOREIGN KEY ("immunization_id") REFERENCES "immunization_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "aefi_reports" ADD CONSTRAINT "aefi_reports_reported_by_fkey"
    FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "preventive_counselling_sessions" ADD CONSTRAINT "preventive_counselling_sessions_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "preventive_counselling_sessions" ADD CONSTRAINT "preventive_counselling_sessions_counsellor_id_fkey"
    FOREIGN KEY ("counsellor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "public_health_campaigns" ADD CONSTRAINT "public_health_campaigns_crm_campaign_id_fkey"
    FOREIGN KEY ("crm_campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

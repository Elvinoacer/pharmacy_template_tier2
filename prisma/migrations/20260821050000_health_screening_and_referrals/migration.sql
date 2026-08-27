-- Health screening records + Clinical referrals for Kenyan Pharmacy Practice
CREATE TABLE IF NOT EXISTS "health_screening_records" (
    "id" UUID NOT NULL,
    "customer_id" UUID,
    "conducted_by_id" UUID,
    "screening_type" TEXT NOT NULL DEFAULT 'general',
    "patient_name" TEXT NOT NULL,
    "patient_phone" TEXT,
    "patient_email" TEXT,
    "patient_age" INTEGER,
    "patient_gender" TEXT,
    "systolic_bp" INTEGER,
    "diastolic_bp" INTEGER,
    "pulse_rate" INTEGER,
    "bp_category" TEXT,
    "blood_glucose" DECIMAL(5,2),
    "glucose_unit" TEXT DEFAULT 'mmol/L',
    "fasting_status" TEXT DEFAULT 'random',
    "glucose_category" TEXT,
    "weight_kg" DECIMAL(5,2),
    "height_cm" DECIMAL(5,2),
    "bmi" DECIMAL(4,1),
    "bmi_category" TEXT,
    "waist_circumference_cm" DECIMAL(5,2),
    "temperature_c" DECIMAL(4,1),
    "temp_category" TEXT,
    "spo2_percent" INTEGER,
    "poct_type" TEXT,
    "poct_result" TEXT,
    "poct_values" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "notes" TEXT,
    "non_diagnostic_disclaimer" BOOLEAN NOT NULL DEFAULT true,
    "equipment_used" TEXT,
    "requires_referral" BOOLEAN NOT NULL DEFAULT false,
    "referral_urgency" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "health_screening_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "health_screening_records_customer_id_idx" ON "health_screening_records"("customer_id");
CREATE INDEX IF NOT EXISTS "health_screening_records_screening_type_idx" ON "health_screening_records"("screening_type");
CREATE INDEX IF NOT EXISTS "health_screening_records_requires_referral_idx" ON "health_screening_records"("requires_referral");
CREATE INDEX IF NOT EXISTS "health_screening_records_created_at_idx" ON "health_screening_records"("created_at" DESC);

CREATE TABLE IF NOT EXISTS "clinical_referrals" (
    "id" UUID NOT NULL,
    "screening_id" UUID,
    "customer_id" UUID,
    "referred_by_id" UUID,
    "reference_code" TEXT NOT NULL,
    "patient_name" TEXT NOT NULL,
    "patient_phone" TEXT,
    "patient_email" TEXT,
    "patient_dob" DATE,
    "patient_gender" TEXT,
    "destination_type" TEXT NOT NULL,
    "facility_name" TEXT NOT NULL,
    "facility_contact" TEXT,
    "specialist_type" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'routine',
    "reason" TEXT NOT NULL,
    "clinical_summary" TEXT NOT NULL,
    "pharmacist_recommendations" TEXT,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clinical_referrals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "clinical_referrals_reference_code_key" ON "clinical_referrals"("reference_code");
CREATE INDEX IF NOT EXISTS "clinical_referrals_screening_id_idx" ON "clinical_referrals"("screening_id");
CREATE INDEX IF NOT EXISTS "clinical_referrals_customer_id_idx" ON "clinical_referrals"("customer_id");
CREATE INDEX IF NOT EXISTS "clinical_referrals_destination_type_idx" ON "clinical_referrals"("destination_type");
CREATE INDEX IF NOT EXISTS "clinical_referrals_urgency_idx" ON "clinical_referrals"("urgency");
CREATE INDEX IF NOT EXISTS "clinical_referrals_status_idx" ON "clinical_referrals"("status");
CREATE INDEX IF NOT EXISTS "clinical_referrals_issued_at_idx" ON "clinical_referrals"("issued_at" DESC);

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "health_screening_records" ADD CONSTRAINT "health_screening_records_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "health_screening_records" ADD CONSTRAINT "health_screening_records_conducted_by_id_fkey"
    FOREIGN KEY ("conducted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "clinical_referrals" ADD CONSTRAINT "clinical_referrals_screening_id_fkey"
    FOREIGN KEY ("screening_id") REFERENCES "health_screening_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "clinical_referrals" ADD CONSTRAINT "clinical_referrals_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "clinical_referrals" ADD CONSTRAINT "clinical_referrals_referred_by_id_fkey"
    FOREIGN KEY ("referred_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

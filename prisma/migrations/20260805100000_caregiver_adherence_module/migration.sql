-- Caregiver adherence module: schedule generation, dose logs, escalation chain.
-- Extends the existing adherence feature from a simple daily log into a full
-- medication adherence management system (Level 2 + Level 3 from the spec).

-- 1) Add canLogAdherence flag to caregivers table (defaults to true so existing
--    caregivers keep the permission patients implicitly granted).
ALTER TABLE "caregivers"
    ADD COLUMN IF NOT EXISTS "can_log_adherence" BOOLEAN NOT NULL DEFAULT true;

-- 2) Extend ReminderType enum with medication_dose + ReminderStatus with answered/escalated.
ALTER TYPE "ReminderType" ADD VALUE IF NOT EXISTS 'medication_dose';
ALTER TYPE "ReminderStatus" ADD VALUE IF NOT EXISTS 'answered';
ALTER TYPE "ReminderStatus" ADD VALUE IF NOT EXISTS 'escalated';

-- 3) Add recorded_by + caregiver_id to prescription_adherence so we can tell who
--    logged a dose (customer self vs caregiver on behalf).
ALTER TABLE "prescription_adherence"
    ADD COLUMN IF NOT EXISTS "recorded_by" TEXT NOT NULL DEFAULT 'customer',
    ADD COLUMN IF NOT EXISTS "caregiver_id" UUID;

-- 4) Per-dose schedule (one row per prescription + time-of-day).
CREATE TABLE IF NOT EXISTS "medication_schedules" (
    "id" UUID NOT NULL,
    "prescription_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "time_of_day" TEXT NOT NULL,
    "dose_quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "label" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "medication_schedules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "medication_schedules_prescription_id_time_of_day_key"
    ON "medication_schedules"("prescription_id", "time_of_day");
CREATE INDEX IF NOT EXISTS "medication_schedules_customer_id_idx"
    ON "medication_schedules"("customer_id");

ALTER TABLE "medication_schedules"
    ADD CONSTRAINT "medication_schedules_prescription_id_fkey"
    FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "medication_schedules_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE;

-- 5) Granular dose log — one row per scheduled dose (vs. PrescriptionAdherence which is one-per-day).
CREATE TABLE IF NOT EXISTS "dose_logs" (
    "id" UUID NOT NULL,
    "prescription_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "schedule_id" UUID,
    "scheduled_date" DATE NOT NULL,
    "scheduled_time" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'taken',
    "recorded_by" TEXT NOT NULL DEFAULT 'customer',
    "caregiver_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dose_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "dose_logs_prescription_id_scheduled_date_scheduled_time_key"
    ON "dose_logs"("prescription_id", "scheduled_date", "scheduled_time");
CREATE INDEX IF NOT EXISTS "dose_logs_customer_id_scheduled_date_idx"
    ON "dose_logs"("customer_id", "scheduled_date");
CREATE INDEX IF NOT EXISTS "dose_logs_status_idx"
    ON "dose_logs"("status");

ALTER TABLE "dose_logs"
    ADD CONSTRAINT "dose_logs_prescription_id_fkey"
    FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "dose_logs_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "dose_logs_schedule_id_fkey"
    FOREIGN KEY ("schedule_id") REFERENCES "medication_schedules"("id") ON DELETE SET NULL;

-- 6) Escalation chain — one row per escalation step (reminder_sent, follow_up_sent,
--    marked_unknown, caregiver_notified).
CREATE TABLE IF NOT EXISTS "adherence_escalations" (
    "id" UUID NOT NULL,
    "prescription_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "reminder_id" UUID,
    "dose_log_id" UUID,
    "scheduled_date" DATE NOT NULL,
    "scheduled_time" TEXT,
    "step" INTEGER NOT NULL DEFAULT 1,
    "action" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "adherence_escalations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "adherence_escalations_prescription_id_scheduled_date_idx"
    ON "adherence_escalations"("prescription_id", "scheduled_date");

ALTER TABLE "adherence_escalations"
    ADD CONSTRAINT "adherence_escalations_prescription_id_fkey"
    FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "adherence_escalations_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE;

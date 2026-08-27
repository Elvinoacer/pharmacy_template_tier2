-- Audit fixes: prescription start_date, medication gallery + alternatives
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "start_date" DATE;
ALTER TABLE "medications" ADD COLUMN IF NOT EXISTS "image_urls" TEXT;
ALTER TABLE "medications" ADD COLUMN IF NOT EXISTS "alternative_ids" TEXT;

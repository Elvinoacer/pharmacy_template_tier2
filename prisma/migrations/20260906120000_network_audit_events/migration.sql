-- Identity and platform security events do not belong to a pharmacy.
-- Existing tenant events and foreign keys are preserved; RLS still requires
-- platform bypass to read or write rows without a pharmacy.
ALTER TABLE "audit_logs" ALTER COLUMN "pharmacy_id" DROP NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "pharmacy_id" DROP DEFAULT;

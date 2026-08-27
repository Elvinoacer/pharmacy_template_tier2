-- Prescription ↔ Medication linkage + dispatch workflow.
--
-- Problem this solves:
--   - Prescriptions previously had only a free-text `medicine_name`.
--   - Stock was deducted at order creation, not at prescription dispatch.
--   - No audit trail of who dispatched a prescription and when.
--
-- This migration:
--   1. Adds `medication_id` to prescriptions (nullable, so existing rows still work).
--   2. Adds `dispatched_at` and `dispatched_by_id` so we can audit dispatches.
--   3. Adds a `dispatched` status enum value (used by the dispatch action).
--   4. Adds an index on `medication_id` for quick lookups.

-- Add nullable medication link — old prescriptions stay valid (medicineName still used as a snapshot).
ALTER TABLE "prescriptions"
  ADD COLUMN IF NOT EXISTS "medication_id" UUID;

-- Audit columns for the dispatch workflow.
ALTER TABLE "prescriptions"
  ADD COLUMN IF NOT EXISTS "dispatched_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "dispatched_by_id" UUID;

-- Index for the "list prescriptions for this medication" query.
CREATE INDEX IF NOT EXISTS "prescriptions_medication_id_idx" ON "prescriptions"("medication_id");

-- Foreign key from prescriptions.medication_id → medications.id.
-- OnDelete: SetNull — if a medication is hard-deleted, the prescription stays but loses its link.
-- (OrderItem already does the same.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prescriptions_medication_id_fkey'
  ) THEN
    ALTER TABLE "prescriptions"
      ADD CONSTRAINT "prescriptions_medication_id_fkey"
      FOREIGN KEY ("medication_id") REFERENCES "medications"("id")
      ON DELETE SET NULL;
  END IF;
END$$;

-- Foreign key from prescriptions.dispatched_by_id → users.id.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prescriptions_dispatched_by_id_fkey'
  ) THEN
    ALTER TABLE "prescriptions"
      ADD CONSTRAINT "prescriptions_dispatched_by_id_fkey"
      FOREIGN KEY ("dispatched_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL;
  END IF;
END$$;

-- Note: the PrescriptionStatus enum doesn't need a new value — we track dispatch
-- via `dispatched_at IS NOT NULL` rather than a status change, so a prescription
-- can remain `active` after dispatch (the customer may still have refills remaining).

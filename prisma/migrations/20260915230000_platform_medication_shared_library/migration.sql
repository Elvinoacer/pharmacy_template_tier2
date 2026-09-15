-- Redesign and complete the medication shared-library architecture:
-- 1. Add canonical lifecycle status & merged_into_id to medication_masters
-- 2. Restrict deletion of medication_masters when referenced by pharmacy_inventory
-- 3. Add platform medication_import_batches tracking table
-- 4. Add trigram search indexes and foreign key indexes

ALTER TABLE "medication_masters" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "medication_masters" ADD COLUMN IF NOT EXISTS "merged_into_id" UUID;

ALTER TABLE "medication_masters"
  DROP CONSTRAINT IF EXISTS "medication_masters_merged_into_id_fkey",
  ADD CONSTRAINT "medication_masters_merged_into_id_fkey"
  FOREIGN KEY ("merged_into_id") REFERENCES "medication_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "medication_masters_status_idx" ON "medication_masters"("status");
CREATE INDEX IF NOT EXISTS "medication_masters_dosage_form_id_idx" ON "medication_masters"("dosage_form_id");
CREATE INDEX IF NOT EXISTS "medication_masters_manufacturer_id_idx" ON "medication_masters"("manufacturer_id");
CREATE INDEX IF NOT EXISTS "medication_masters_created_at_idx" ON "medication_masters"("created_at" DESC);

-- Restrict deletion of MedicationMaster if referenced by PharmacyInventory
ALTER TABLE "pharmacy_inventory"
  DROP CONSTRAINT IF EXISTS "pharmacy_inventory_medication_master_id_fkey",
  ADD CONSTRAINT "pharmacy_inventory_medication_master_id_fkey"
  FOREIGN KEY ("medication_master_id") REFERENCES "medication_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Shared medication platform import batches table
CREATE TABLE IF NOT EXISTS "medication_import_batches" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actor_id" UUID,
  "filename" TEXT,
  "total_rows" INTEGER NOT NULL DEFAULT 0,
  "created_count" INTEGER NOT NULL DEFAULT 0,
  "matched_count" INTEGER NOT NULL DEFAULT 0,
  "review_count" INTEGER NOT NULL DEFAULT 0,
  "error_count" INTEGER NOT NULL DEFAULT 0,
  "errors" JSONB DEFAULT '[]'::jsonb,
  "summary" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "medication_import_batches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "medication_import_batches_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "medication_import_batches_created_at_idx" ON "medication_import_batches"("created_at" DESC);

-- Trigram indexing for fast text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "medication_masters_name_trgm_idx" ON "medication_masters" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "medication_masters_generic_trgm_idx" ON "medication_masters" USING gin ("generic_name" gin_trgm_ops);

-- Ensure protect_shared_medication_master_delete correctly recognizes '1', 'true', or 'on' from platform bypass
CREATE OR REPLACE FUNCTION protect_shared_medication_master_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(current_setting('app.platform_bypass', true), '') NOT IN ('1', 'true', 'on') THEN
    RAISE EXCEPTION 'shared medication masters are platform-managed and cannot be deleted by a pharmacy'
      USING ERRCODE = '23503';
  END IF;
  RETURN OLD;
END;
$$;

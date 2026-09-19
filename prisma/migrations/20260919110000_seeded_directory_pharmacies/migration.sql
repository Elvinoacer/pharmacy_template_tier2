ALTER TABLE "pharmacies"
  ADD COLUMN IF NOT EXISTS "is_seeded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "seeded_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "seeded_source_url" TEXT;

CREATE INDEX IF NOT EXISTS "pharmacies_is_seeded_idx" ON "pharmacies"("is_seeded");

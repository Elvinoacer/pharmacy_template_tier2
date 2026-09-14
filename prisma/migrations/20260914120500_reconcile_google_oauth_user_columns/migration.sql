-- Reconcile the committed migration history with the current User model.
-- Google OAuth accounts do not have a local password, and Prisma expects the
-- Google subject identifier to be available as a unique nullable column.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "google_id" TEXT,
  ALTER COLUMN "password_hash" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_google_id_key" ON "users"("google_id");

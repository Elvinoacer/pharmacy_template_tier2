-- Customer clinical reason for OTC/reservation + structured dispenser note at handoff.
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "reason" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "dispenser_note" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "dispenser_note_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "dispenser_note_by" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_dispenser_note_by_fkey'
  ) THEN
    ALTER TABLE "orders"
      ADD CONSTRAINT "orders_dispenser_note_by_fkey"
      FOREIGN KEY ("dispenser_note_by") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

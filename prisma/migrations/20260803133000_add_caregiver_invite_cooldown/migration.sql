ALTER TABLE "caregivers"
  ADD COLUMN "last_invite_sent_at" TIMESTAMP(3),
  ADD COLUMN "invite_send_count" INTEGER NOT NULL DEFAULT 0;

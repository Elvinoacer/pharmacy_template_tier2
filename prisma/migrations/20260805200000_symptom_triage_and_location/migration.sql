-- CreateEnum
CREATE TYPE "SymptomSessionStatus" AS ENUM ('active', 'monitoring', 'escalated', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "SymptomSeverity" AS ENUM ('mild', 'moderate', 'urgent', 'emergency');

-- CreateEnum
CREATE TYPE "SymptomFeeling" AS ENUM ('better', 'same', 'worse');

-- CreateTable
CREATE TABLE "pharmacy_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "display_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "whatsapp" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "country" TEXT DEFAULT 'Kenya',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "place_id" TEXT,
    "maps_embed_url" TEXT,
    "hours" JSONB NOT NULL DEFAULT '[]',
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptom_sessions" (
    "id" UUID NOT NULL,
    "guest_key" TEXT,
    "customer_id" UUID,
    "user_id" UUID,
    "status" "SymptomSessionStatus" NOT NULL DEFAULT 'active',
    "category" TEXT,
    "chief_complaint" TEXT,
    "structured_answers" JSONB NOT NULL DEFAULT '{}',
    "ai_summary" TEXT,
    "provisional_label" TEXT,
    "severity" "SymptomSeverity",
    "feeling_trend" "SymptomFeeling",
    "escalated_at" TIMESTAMP(3),
    "escalated_reason" TEXT,
    "conversation_id" UUID,
    "enquiry_id" UUID,
    "last_check_in_at" TIMESTAMP(3),
    "next_check_in_at" TIMESTAMP(3),
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "assigned_to" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "symptom_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptom_messages" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sender_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "symptom_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptom_check_ins" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "feeling" "SymptomFeeling" NOT NULL,
    "notes" TEXT,
    "score" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "symptom_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "symptom_sessions_guest_key_idx" ON "symptom_sessions"("guest_key");

-- CreateIndex
CREATE INDEX "symptom_sessions_customer_id_idx" ON "symptom_sessions"("customer_id");

-- CreateIndex
CREATE INDEX "symptom_sessions_status_idx" ON "symptom_sessions"("status");

-- CreateIndex
CREATE INDEX "symptom_sessions_last_message_at_idx" ON "symptom_sessions"("last_message_at" DESC);

-- CreateIndex
CREATE INDEX "symptom_messages_session_id_created_at_idx" ON "symptom_messages"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "symptom_check_ins_session_id_created_at_idx" ON "symptom_check_ins"("session_id", "created_at");

-- AddForeignKey
ALTER TABLE "pharmacy_settings" ADD CONSTRAINT "pharmacy_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptom_sessions" ADD CONSTRAINT "symptom_sessions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptom_sessions" ADD CONSTRAINT "symptom_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptom_messages" ADD CONSTRAINT "symptom_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "symptom_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptom_messages" ADD CONSTRAINT "symptom_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptom_check_ins" ADD CONSTRAINT "symptom_check_ins_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "symptom_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

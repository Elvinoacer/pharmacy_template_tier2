-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'intasend';
ALTER TYPE "IntegrationKind" ADD VALUE IF NOT EXISTS 'intasend';

-- AlterTable
ALTER TABLE "billing_payments" ADD COLUMN IF NOT EXISTS "checkout_url" TEXT;
ALTER TABLE "pharmacy_promotions" ADD COLUMN IF NOT EXISTS "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "pharmacy_promotions_code_key" ON "pharmacy_promotions"("code");

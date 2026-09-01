-- Platform SaaS foundation: tenant lifecycle, billing, jobs, integrations, MFA, branches.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Enums ─────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE "PharmacyLifecycleStatus" AS ENUM ('onboarding','trial','active','past_due','restricted','suspended','archived','pending_deletion','deleted','regulatory_hold','migration'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "SupportSessionMode" AS ENUM ('read_only','act_as_tenant'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing','active','past_due','cancelled','unpaid','paused'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "InvoiceStatus" AS ENUM ('draft','open','paid','void','uncollectible'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "BillingInterval" AS ENUM ('monthly','yearly'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "DunningStatus" AS ENUM ('open','warning','grace','restricted','suspended','resolved','written_off'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "JobStatus" AS ENUM ('queued','running','succeeded','failed','cancelled','dead_letter'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "OutboxStatus" AS ENUM ('pending','processing','processed','failed','dead_letter'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "IntegrationKind" AS ENUM ('daraja','twilio_sms','whatsapp','email','pos','storage','maps','ai','custom'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "IntegrationHealth" AS ENUM ('unconfigured','connected','warning','error','disabled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PlatformRoleName" AS ENUM ('none','owner','super_admin','billing_admin','support','security','operator','auditor'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('pending','delivered','failed','retrying','dead_letter'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('queued','processing','sent','delivered','failed','retrying','dead_letter','cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "LedgerDirection" AS ENUM ('debit','credit'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "DataRequestStatus" AS ENUM ('requested','processing','ready','failed','cancelled','completed'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Replace Aether tenant default with fail-closed zero UUID (not a real pharmacy).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_default LIKE '%00000000-0000-4000-a000-000000000001%'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN %I SET DEFAULT %L::uuid',
      r.table_schema, r.table_name, r.column_name, '00000000-0000-0000-0000-000000000000'
    );
  END LOOP;
END $$;

-- ── Existing table columns ────────────────────────────────────
ALTER TABLE "pharmacies"
  ADD COLUMN IF NOT EXISTS "lifecycle_status" "PharmacyLifecycleStatus" NOT NULL DEFAULT 'onboarding',
  ADD COLUMN IF NOT EXISTS "trial_ends_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "restricted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "suspended_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletion_requested_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "default_branch_id" UUID;

UPDATE "pharmacies" SET "lifecycle_status" = 'active' WHERE "status" = 'active';
UPDATE "pharmacies" SET "lifecycle_status" = 'trial' WHERE "status" = 'approved';
UPDATE "pharmacies" SET "lifecycle_status" = 'suspended' WHERE "status" = 'suspended';

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "mfa_enforced" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "mfa_enrolled_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_reauth_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "platform_role" "PlatformRoleName" NOT NULL DEFAULT 'none';

UPDATE "users" SET "platform_role" = 'super_admin' WHERE "platform_admin" = true AND "platform_role" = 'none';

ALTER TABLE "sessions"
  ADD COLUMN IF NOT EXISTS "last_seen_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "revoked_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "mfa_verified_at" TIMESTAMP(3);

ALTER TABLE "push_devices"
  ADD COLUMN IF NOT EXISTS "pharmacy_id" UUID,
  ADD COLUMN IF NOT EXISTS "browser" TEXT,
  ADD COLUMN IF NOT EXISTS "os" TEXT,
  ADD COLUMN IF NOT EXISTS "ip_address" TEXT,
  ADD COLUMN IF NOT EXISTS "revoked_at" TIMESTAMP(3);

ALTER TABLE "customer_preferences"
  ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Africa/Nairobi',
  ADD COLUMN IF NOT EXISTS "quiet_hours_start" TEXT,
  ADD COLUMN IF NOT EXISTS "quiet_hours_end" TEXT,
  ADD COLUMN IF NOT EXISTS "preferred_channel" TEXT,
  ADD COLUMN IF NOT EXISTS "fallback_channel" TEXT,
  ADD COLUMN IF NOT EXISTS "frequency_cap_daily" INTEGER;

ALTER TABLE "pharmacy_memberships"
  ADD COLUMN IF NOT EXISTS "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "pharmacy_integrations"
  ADD COLUMN IF NOT EXISTS "daraja_last_success_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "daraja_last_error" TEXT,
  ADD COLUMN IF NOT EXISTS "comms_last_success_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "comms_last_error" TEXT,
  ADD COLUMN IF NOT EXISTS "pos_last_sync_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pos_last_error" TEXT,
  ADD COLUMN IF NOT EXISTS "secrets_version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "secrets_rotated_at" TIMESTAMP(3);

ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "provider" TEXT,
  ADD COLUMN IF NOT EXISTS "provider_message_id" TEXT,
  ADD COLUMN IF NOT EXISTS "attempt_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_error" TEXT;

ALTER TABLE "audit_logs"
  ADD COLUMN IF NOT EXISTS "actor_type" TEXT NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS "before" JSONB,
  ADD COLUMN IF NOT EXISTS "after" JSONB,
  ADD COLUMN IF NOT EXISTS "reason" TEXT,
  ADD COLUMN IF NOT EXISTS "request_id" TEXT,
  ADD COLUMN IF NOT EXISTS "correlation_id" TEXT,
  ADD COLUMN IF NOT EXISTS "branch_id" UUID,
  ADD COLUMN IF NOT EXISTS "user_agent" TEXT;

ALTER TABLE "pharmacy_inventory"
  ADD COLUMN IF NOT EXISTS "branch_id" UUID,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "branch_id" UUID;

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS "expected_amount" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "expected_shortcode" TEXT,
  ADD COLUMN IF NOT EXISTS "payer_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "reconciled_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reconciliation_notes" TEXT;

-- ── New tables ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "pharmacy_branches" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "phone" TEXT,
  "email" TEXT,
  "address_line1" TEXT,
  "city" TEXT,
  "county" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pharmacy_branches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "branch_memberships" (
  "id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "membership_id" UUID NOT NULL,
  "role" "PharmacyMemberRole" NOT NULL DEFAULT 'staff',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "branch_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "branch_hours" (
  "id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "day" TEXT NOT NULL,
  "open_time" TEXT,
  "close_time" TEXT,
  "closed" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "branch_hours_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "branch_delivery_zones" (
  "id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "radius_km" DOUBLE PRECISION,
  "fee_kes" DECIMAL(10,2),
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "branch_delivery_zones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pharmacy_lifecycle_events" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "from_status" TEXT,
  "to_status" TEXT,
  "reason" TEXT,
  "actor_id" UUID,
  "meta" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pharmacy_lifecycle_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "plans" (
  "id" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price_kes" DECIMAL(12,2) NOT NULL,
  "interval" "BillingInterval" NOT NULL DEFAULT 'monthly',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "plan_features" (
  "id" UUID NOT NULL,
  "plan_id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "limit_int" INTEGER,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "plan_features_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "plan_id" UUID NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'trialing',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "current_period_start" TIMESTAMP(3) NOT NULL,
  "current_period_end" TIMESTAMP(3) NOT NULL,
  "trial_ends_at" TIMESTAMP(3),
  "cancel_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "external_subscription_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "invoices" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "subscription_id" UUID,
  "number" TEXT NOT NULL,
  "period_start" TIMESTAMP(3) NOT NULL,
  "period_end" TIMESTAMP(3) NOT NULL,
  "subtotal_kes" DECIMAL(12,2) NOT NULL,
  "tax_kes" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total_kes" DECIMAL(12,2) NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'open',
  "due_at" TIMESTAMP(3) NOT NULL,
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "invoice_items" (
  "id" UUID NOT NULL,
  "invoice_id" UUID NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_kes" DECIMAL(12,2) NOT NULL,
  "total_kes" DECIMAL(12,2) NOT NULL,
  CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "usage_records" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "metric" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "period" TEXT NOT NULL,
  "meta" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "billing_events" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "billing_payment_methods" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "label" TEXT,
  "last4" TEXT,
  "mpesa_phone" TEXT,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "billing_payment_methods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "dunning_cases" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "invoice_id" UUID NOT NULL,
  "status" "DunningStatus" NOT NULL DEFAULT 'open',
  "warning_at" TIMESTAMP(3),
  "grace_until" TIMESTAMP(3),
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dunning_cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "tenant_entitlements" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "limit_int" INTEGER,
  "source" TEXT NOT NULL DEFAULT 'plan',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "feature_flags" (
  "id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "description" TEXT,
  "default_on" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "feature_overrides" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "flag_id" UUID NOT NULL,
  "enabled" BOOLEAN NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "feature_overrides_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "hash" TEXT NOT NULL,
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "last_used_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "webhook_endpoints" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "url" TEXT NOT NULL,
  "secret_enc" TEXT NOT NULL,
  "events" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "active" BOOLEAN NOT NULL DEFAULT true,
  "last_delivery_at" TIMESTAMP(3),
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "webhook_events" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "endpoint_id" UUID,
  "provider" TEXT NOT NULL,
  "provider_event_id" TEXT,
  "event_type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "processed_at" TIMESTAMP(3),
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "outbox_events" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "event_type" TEXT NOT NULL,
  "aggregate_type" TEXT NOT NULL,
  "aggregate_id" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "OutboxStatus" NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "jobs" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID,
  "type" TEXT NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'queued',
  "payload" JSONB NOT NULL DEFAULT '{}',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 8,
  "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "locked_at" TIMESTAMP(3),
  "locked_by" TEXT,
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "job_attempts" (
  "id" UUID NOT NULL,
  "job_id" UUID NOT NULL,
  "attempt" INTEGER NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  "error" TEXT,
  "output" JSONB,
  CONSTRAINT "job_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "notification_deliveries" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "notification_id" UUID,
  "channel" "NotificationChannel" NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'queued',
  "provider" TEXT,
  "provider_message_id" TEXT,
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "scheduled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_at" TIMESTAMP(3),
  "delivered_at" TIMESTAMP(3),
  "opened_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "notification_attempts" (
  "id" UUID NOT NULL,
  "delivery_id" UUID NOT NULL,
  "attempt" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "error" TEXT,
  "latency_ms" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "notification_templates" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID,
  "key" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "integration_accounts" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "kind" "IntegrationKind" NOT NULL,
  "provider" TEXT NOT NULL,
  "status" "IntegrationHealth" NOT NULL DEFAULT 'unconfigured',
  "config" JSONB NOT NULL DEFAULT '{}',
  "secrets_enc" TEXT,
  "webhook_secret_enc" TEXT,
  "cursor" TEXT,
  "last_sync_at" TIMESTAMP(3),
  "last_success_at" TIMESTAMP(3),
  "last_error" TEXT,
  "secrets_version" INTEGER NOT NULL DEFAULT 1,
  "rotated_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "integration_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "integration_health_checks" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "ok" BOOLEAN NOT NULL,
  "latency_ms" INTEGER,
  "error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "integration_health_checks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "support_sessions" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "platform_admin_id" UUID NOT NULL,
  "mode" "SupportSessionMode" NOT NULL DEFAULT 'read_only',
  "reason" TEXT NOT NULL,
  "ticket_ref" TEXT,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "ended_at" TIMESTAMP(3),
  "ip_address" TEXT,
  "user_agent" TEXT,
  CONSTRAINT "support_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "mfa_recovery_codes" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "code_hash" TEXT NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mfa_recovery_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "step_up_challenges" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "action" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "step_up_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "idempotency_keys" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "request_hash" TEXT NOT NULL,
  "response_code" INTEGER,
  "response_body" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "rate_limit_counters" (
  "id" UUID NOT NULL,
  "bucket_key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "reset_at" TIMESTAMP(3) NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rate_limit_counters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "custom_domains" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "hostname" TEXT NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "verified_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "custom_domains_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "data_export_requests" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "actor_id" UUID,
  "status" "DataRequestStatus" NOT NULL DEFAULT 'requested',
  "archive_url" TEXT,
  "error" TEXT,
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "data_export_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "data_deletion_requests" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "actor_id" UUID,
  "status" "DataRequestStatus" NOT NULL DEFAULT 'requested',
  "retain_legal" BOOLEAN NOT NULL DEFAULT true,
  "scheduled_for" TIMESTAMP(3) NOT NULL,
  "completed_at" TIMESTAMP(3),
  "error" TEXT,
  CONSTRAINT "data_deletion_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "retention_policies" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID,
  "resource" TEXT NOT NULL,
  "retain_days" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ledger_accounts" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ledger_entries" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "direction" "LedgerDirection" NOT NULL,
  "amount_kes" DECIMAL(12,2) NOT NULL,
  "reference" TEXT,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sensitive_access_logs" (
  "id" UUID NOT NULL,
  "actor_id" UUID,
  "pharmacy_id" UUID,
  "resource" TEXT NOT NULL,
  "resource_id" TEXT NOT NULL,
  "purpose" TEXT,
  "ip_address" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sensitive_access_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "order_access_tokens" (
  "id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_access_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "tenant_configs" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "suppliers" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "purchase_orders" (
  "id" UUID NOT NULL,
  "pharmacy_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "purchase_order_items" (
  "id" UUID NOT NULL,
  "purchase_order_id" UUID NOT NULL,
  "inventory_id" UUID,
  "name" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_cost_kes" DECIMAL(10,2) NOT NULL,
  CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "goods_receipts" (
  "id" UUID NOT NULL,
  "purchase_order_id" UUID NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

-- ── Uniques / indexes ─────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "plans_slug_key" ON "plans"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "plan_features_plan_id_key_key" ON "plan_features"("plan_id","key");
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_number_key" ON "invoices"("number");
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_entitlements_pharmacy_id_key_key" ON "tenant_entitlements"("pharmacy_id","key");
CREATE UNIQUE INDEX IF NOT EXISTS "feature_flags_key_key" ON "feature_flags"("key");
CREATE UNIQUE INDEX IF NOT EXISTS "feature_overrides_pharmacy_id_flag_id_key" ON "feature_overrides"("pharmacy_id","flag_id");
CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_hash_key" ON "api_keys"("hash");
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_provider_provider_event_id_key" ON "webhook_events"("provider","provider_event_id");
CREATE UNIQUE INDEX IF NOT EXISTS "step_up_challenges_token_hash_key" ON "step_up_challenges"("token_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_keys_pharmacy_id_key_method_path_key" ON "idempotency_keys"("pharmacy_id","key","method","path");
CREATE UNIQUE INDEX IF NOT EXISTS "rate_limit_counters_bucket_key_key" ON "rate_limit_counters"("bucket_key");
CREATE UNIQUE INDEX IF NOT EXISTS "custom_domains_hostname_key" ON "custom_domains"("hostname");
CREATE UNIQUE INDEX IF NOT EXISTS "order_access_tokens_token_hash_key" ON "order_access_tokens"("token_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "pharmacy_branches_pharmacy_id_code_key" ON "pharmacy_branches"("pharmacy_id","code");
CREATE UNIQUE INDEX IF NOT EXISTS "branch_memberships_branch_id_membership_id_key" ON "branch_memberships"("branch_id","membership_id");
CREATE UNIQUE INDEX IF NOT EXISTS "branch_hours_branch_id_day_key" ON "branch_hours"("branch_id","day");
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_configs_pharmacy_id_key_key" ON "tenant_configs"("pharmacy_id","key");
CREATE UNIQUE INDEX IF NOT EXISTS "ledger_accounts_pharmacy_id_code_key" ON "ledger_accounts"("pharmacy_id","code");
CREATE UNIQUE INDEX IF NOT EXISTS "integration_accounts_pharmacy_id_kind_provider_key" ON "integration_accounts"("pharmacy_id","kind","provider");
CREATE UNIQUE INDEX IF NOT EXISTS "notification_templates_pharmacy_id_key_channel_key" ON "notification_templates"("pharmacy_id","key","channel");
CREATE UNIQUE INDEX IF NOT EXISTS "retention_policies_pharmacy_id_resource_key" ON "retention_policies"("pharmacy_id","resource");

CREATE INDEX IF NOT EXISTS "pharmacies_lifecycle_status_idx" ON "pharmacies"("lifecycle_status");
CREATE INDEX IF NOT EXISTS "jobs_status_run_at_idx" ON "jobs"("status","run_at");
CREATE INDEX IF NOT EXISTS "outbox_events_status_next_attempt_at_idx" ON "outbox_events"("status","next_attempt_at");
CREATE INDEX IF NOT EXISTS "webhook_events_pharmacy_id_status_idx" ON "webhook_events"("pharmacy_id","status");
CREATE INDEX IF NOT EXISTS "usage_records_pharmacy_id_metric_period_idx" ON "usage_records"("pharmacy_id","metric","period");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "pharmacy_inventory_branch_id_idx" ON "pharmacy_inventory"("branch_id");
CREATE INDEX IF NOT EXISTS "orders_branch_id_idx" ON "orders"("branch_id");

-- ── Foreign keys ──────────────────────────────────────────────
ALTER TABLE "pharmacy_branches" ADD CONSTRAINT "pharmacy_branches_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "branch_memberships" ADD CONSTRAINT "branch_memberships_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "pharmacy_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "branch_memberships" ADD CONSTRAINT "branch_memberships_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "pharmacy_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "branch_hours" ADD CONSTRAINT "branch_hours_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "pharmacy_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "branch_delivery_zones" ADD CONSTRAINT "branch_delivery_zones_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "pharmacy_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pharmacy_lifecycle_events" ADD CONSTRAINT "pharmacy_lifecycle_events_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_payment_methods" ADD CONSTRAINT "billing_payment_methods_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dunning_cases" ADD CONSTRAINT "dunning_cases_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dunning_cases" ADD CONSTRAINT "dunning_cases_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_entitlements" ADD CONSTRAINT "tenant_entitlements_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feature_overrides" ADD CONSTRAINT "feature_overrides_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feature_overrides" ADD CONSTRAINT "feature_overrides_flag_id_fkey" FOREIGN KEY ("flag_id") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "webhook_endpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_attempts" ADD CONSTRAINT "job_attempts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notification_attempts" ADD CONSTRAINT "notification_attempts_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "notification_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "integration_accounts" ADD CONSTRAINT "integration_accounts_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "integration_health_checks" ADD CONSTRAINT "integration_health_checks_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "integration_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_sessions" ADD CONSTRAINT "support_sessions_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_sessions" ADD CONSTRAINT "support_sessions_platform_admin_id_fkey" FOREIGN KEY ("platform_admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mfa_recovery_codes" ADD CONSTRAINT "mfa_recovery_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "step_up_challenges" ADD CONSTRAINT "step_up_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "data_export_requests" ADD CONSTRAINT "data_export_requests_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "data_export_requests" ADD CONSTRAINT "data_export_requests_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "data_deletion_requests" ADD CONSTRAINT "data_deletion_requests_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "data_deletion_requests" ADD CONSTRAINT "data_deletion_requests_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sensitive_access_logs" ADD CONSTRAINT "sensitive_access_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_access_tokens" ADD CONSTRAINT "order_access_tokens_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_configs" ADD CONSTRAINT "tenant_configs_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pharmacy_inventory" ADD CONSTRAINT "pharmacy_inventory_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "pharmacy_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "pharmacy_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Default main branch per existing pharmacy
INSERT INTO "pharmacy_branches" ("id","pharmacy_id","name","code","is_default","city","county","phone","email")
SELECT gen_random_uuid(), p."id", 'Main Branch', 'MAIN', true, p."city", p."county", p."phone", p."email"
FROM "pharmacies" p
WHERE NOT EXISTS (SELECT 1 FROM "pharmacy_branches" b WHERE b."pharmacy_id" = p."id");

UPDATE "pharmacies" p
SET "default_branch_id" = b."id"
FROM "pharmacy_branches" b
WHERE b."pharmacy_id" = p."id" AND b."is_default" = true AND p."default_branch_id" IS NULL;

-- ── RLS (defense in depth; app still sets tenant via Prisma) ──
CREATE SCHEMA IF NOT EXISTS app;
CREATE OR REPLACE FUNCTION app.current_pharmacy_id() RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.pharmacy_id', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'orders','payments','notifications','audit_logs','pharmacy_inventory','outbox_events',
    'api_keys','subscriptions','invoices','usage_records','webhook_events'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (pharmacy_id = app.current_pharmacy_id() OR app.current_pharmacy_id() IS NULL) WITH CHECK (pharmacy_id = app.current_pharmacy_id() OR app.current_pharmacy_id() IS NULL)',
      t
    );
  END LOOP;
END $$;

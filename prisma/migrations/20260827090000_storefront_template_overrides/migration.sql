-- Storefront template overrides: per-tenant customization document written by
-- the Storefront Studio (/admin/settings/storefront) and deep-merged over the
-- shared template in app/lib/storefront-template.ts.
ALTER TABLE "pharmacy_settings" ADD COLUMN "storefront" JSONB NOT NULL DEFAULT '{}';

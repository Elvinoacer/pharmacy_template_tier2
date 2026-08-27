-- ─────────────────────────────────────────────────────────────────────
-- Medication Module — Master / Inventory Split (Phase 0 + Phase 1)
-- Implements DECISIONS.md D1-D4, D5-D15, D25.
--
-- This migration:
--   1. Creates the new medication-related tables.
--   2. Seeds MedicationLookup with dosage forms, routes, pregnancy categories.
--   3. Seeds a default Manufacturer + ClinicalTag set.
--   4. Splits each existing `medications` row into one `medication_masters`
--      row (NEW uuid) + one `pharmacy_inventory` row (REUSING the old
--      medication id — Decision D3, so OrderItem/Prescription FKs keep resolving).
--   5. Repoints order_items.medication_id + prescriptions.medication_id
--      FK constraints from `medications` to `pharmacy_inventory`.
--   6. Drops the old `medications` table.
--   7. Creates unique indexes (barcode, sku) + CHECK constraint
--      (controlled_drug_schedule requires controlled_drug=true).
-- ─────────────────────────────────────────────────────────────────────

-- ── 1. Editable lookup tables ────────────────────────────────────────

CREATE TABLE "manufacturers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "country" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "manufacturers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "manufacturers_name_key" ON "manufacturers"("name");
CREATE INDEX "manufacturers_active_idx" ON "manufacturers"("active");

CREATE TABLE "active_ingredients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "active_ingredients_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "active_ingredients_name_key" ON "active_ingredients"("name");
CREATE INDEX "active_ingredients_active_idx" ON "active_ingredients"("active");

CREATE TABLE "clinical_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clinical_tags_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "clinical_tags_name_key" ON "clinical_tags"("name");
CREATE UNIQUE INDEX "clinical_tags_slug_key" ON "clinical_tags"("slug");
CREATE INDEX "clinical_tags_active_idx" ON "clinical_tags"("active");

CREATE TABLE "medication_lookups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "medication_lookups_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "medication_lookups_kind_slug_key" ON "medication_lookups"("kind", "slug");
CREATE INDEX "medication_lookups_kind_active_idx" ON "medication_lookups"("kind", "active");

-- Seed lookup values (Phase 1.3 enumerated lists, editable going forward).
INSERT INTO "medication_lookups" ("kind", "value", "slug", "sort_order") VALUES
    ('dosage_form', 'Tablet', 'tablet', 10),
    ('dosage_form', 'Capsule', 'capsule', 20),
    ('dosage_form', 'Syrup', 'syrup', 30),
    ('dosage_form', 'Injection', 'injection', 40),
    ('dosage_form', 'Cream', 'cream', 50),
    ('dosage_form', 'Ointment', 'ointment', 60),
    ('dosage_form', 'Eye Drops', 'eye-drops', 70),
    ('dosage_form', 'Ear Drops', 'ear-drops', 80),
    ('dosage_form', 'Nasal Spray', 'nasal-spray', 90),
    ('dosage_form', 'Suspension', 'suspension', 100),
    ('dosage_form', 'Inhaler', 'inhaler', 110),
    ('dosage_form', 'Sachet', 'sachet', 120),
    ('route', 'Oral', 'oral', 10),
    ('route', 'Topical', 'topical', 20),
    ('route', 'Intravenous', 'intravenous', 30),
    ('route', 'Intramuscular', 'intramuscular', 40),
    ('route', 'Inhalation', 'inhalation', 50),
    ('route', 'Rectal', 'rectal', 60),
    ('route', 'Ophthalmic', 'ophthalmic', 70),
    ('route', 'Nasal', 'nasal', 80),
    ('pregnancy_category', 'A', 'a', 10),
    ('pregnancy_category', 'B', 'b', 20),
    ('pregnancy_category', 'C', 'c', 30),
    ('pregnancy_category', 'D', 'd', 40),
    ('pregnancy_category', 'X', 'x', 50);

-- Default manufacturer so existing meds have somewhere to point (nullable anyway).
INSERT INTO "manufacturers" ("name", "country", "active")
VALUES ('Unknown Manufacturer', NULL, true)
ON CONFLICT ("name") DO NOTHING;

-- Default clinical tags (Phase 1.2 examples).
INSERT INTO "clinical_tags" ("name", "slug") VALUES
    ('Antibiotic', 'antibiotic'),
    ('NSAID', 'nsaid'),
    ('Antihypertensive', 'antihypertensive'),
    ('Antidiabetic', 'antidiabetic'),
    ('Anticoagulant', 'anticoagulant'),
    ('Analgesic', 'analgesic'),
    ('Antihistamine', 'antihistamine'),
    ('Vitamin', 'vitamin'),
    ('Supplement', 'supplement')
ON CONFLICT ("name") DO NOTHING;

-- ── 2. MedicationMaster (shared clinical registry) ─────────────────

CREATE TABLE "medication_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "generic_name" TEXT NOT NULL,
    "brand_name" TEXT,
    "strength_value" DECIMAL(10,4),
    "strength_unit" TEXT,
    "strength_display" TEXT,
    "pack_size" TEXT,
    "dosage_form_id" UUID,
    "route_id" UUID,
    "pregnancy_category_id" UUID,
    "manufacturer_id" UUID,
    "country_of_origin" TEXT,
    "barcode" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "indications" TEXT,
    "dosage" TEXT,
    "side_effects" TEXT,
    "contraindications" TEXT,
    "storage" TEXT,
    "clinical_notes" TEXT,
    "image_url" TEXT,
    "image_urls" TEXT,
    "alternative_ids" TEXT,
    "controlled_drug" BOOLEAN NOT NULL DEFAULT false,
    "controlled_drug_schedule" TEXT,
    "pediatric_use" BOOLEAN NOT NULL DEFAULT false,
    "requires_refrigeration" BOOLEAN NOT NULL DEFAULT false,
    "enrichment_status" TEXT NOT NULL DEFAULT 'minimal',
    "enrichment_score" INTEGER NOT NULL DEFAULT 0,
    "enriched_at" TIMESTAMPTZ,
    "acquisition_method" TEXT NOT NULL DEFAULT 'unknown',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "medication_masters_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "medication_masters_barcode_key" ON "medication_masters"("barcode") WHERE "barcode" IS NOT NULL;
CREATE INDEX "medication_masters_generic_name_idx" ON "medication_masters"("generic_name");
CREATE INDEX "medication_masters_category_idx" ON "medication_masters"("category");
CREATE INDEX "medication_masters_controlled_drug_idx" ON "medication_masters"("controlled_drug");
CREATE INDEX "medication_masters_enrichment_status_idx" ON "medication_masters"("enrichment_status");
CREATE INDEX "medication_masters_acquisition_method_idx" ON "medication_masters"("acquisition_method");

ALTER TABLE "medication_masters"
    ADD CONSTRAINT "medication_masters_dosage_form_id_fkey"
    FOREIGN KEY ("dosage_form_id") REFERENCES "medication_lookups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "medication_masters"
    ADD CONSTRAINT "medication_masters_route_id_fkey"
    FOREIGN KEY ("route_id") REFERENCES "medication_lookups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "medication_masters"
    ADD CONSTRAINT "medication_masters_pregnancy_category_id_fkey"
    FOREIGN KEY ("pregnancy_category_id") REFERENCES "medication_lookups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "medication_masters"
    ADD CONSTRAINT "medication_masters_manufacturer_id_fkey"
    FOREIGN KEY ("manufacturer_id") REFERENCES "manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CHECK: controlled drug must carry a schedule (Decision D11).
ALTER TABLE "medication_masters"
    ADD CONSTRAINT "medication_masters_controlled_schedule_check"
    CHECK (
        "controlled_drug" = false
        OR ("controlled_drug_schedule" IS NOT NULL
            AND "controlled_drug_schedule" IN
                ('schedule_1','schedule_2','schedule_3','schedule_4','schedule_5'))
    );

-- ── 3. PharmacyInventory (per-pharmacy commercial) ───────────────────
-- IMPORTANT (Decision D3): the `id` column REUSES the old medications.id so
-- order_items.medication_id and prescriptions.medication_id keep resolving.
CREATE TABLE "pharmacy_inventory" (
    "id" UUID NOT NULL,
    "medication_master_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "sku" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "purchase_price" DECIMAL(10,2),
    "current_stock" INTEGER NOT NULL DEFAULT 0,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 10,
    "supplier" TEXT,
    "shelf_location" TEXT,
    "promotions" TEXT,
    "over_the_counter" BOOLEAN NOT NULL DEFAULT false,
    "prescription_required" BOOLEAN NOT NULL DEFAULT true,
    "public_listing" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "synced_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pharmacy_inventory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pharmacy_inventory_slug_key" ON "pharmacy_inventory"("slug");
CREATE UNIQUE INDEX "pharmacy_inventory_sku_key" ON "pharmacy_inventory"("sku") WHERE "sku" IS NOT NULL;
CREATE INDEX "pharmacy_inventory_medication_master_id_idx" ON "pharmacy_inventory"("medication_master_id");
CREATE INDEX "pharmacy_inventory_over_the_counter_idx" ON "pharmacy_inventory"("over_the_counter");
CREATE INDEX "pharmacy_inventory_public_listing_idx" ON "pharmacy_inventory"("public_listing");
CREATE INDEX "pharmacy_inventory_active_idx" ON "pharmacy_inventory"("active");

ALTER TABLE "pharmacy_inventory"
    ADD CONSTRAINT "pharmacy_inventory_medication_master_id_fkey"
    FOREIGN KEY ("medication_master_id") REFERENCES "medication_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 4. InventoryLot (batch + expiry tracking, Phase 1.5) ────────────

CREATE TABLE "inventory_lots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pharmacy_inventory_id" UUID NOT NULL,
    "batch_number" TEXT NOT NULL,
    "expiry_date" DATE NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_lots_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_lots_pharmacy_inventory_id_idx" ON "inventory_lots"("pharmacy_inventory_id");
CREATE INDEX "inventory_lots_expiry_date_idx" ON "inventory_lots"("expiry_date");
CREATE INDEX "inventory_lots_active_idx" ON "inventory_lots"("active");

ALTER TABLE "inventory_lots"
    ADD CONSTRAINT "inventory_lots_pharmacy_inventory_id_fkey"
    FOREIGN KEY ("pharmacy_inventory_id") REFERENCES "pharmacy_inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 5. Join tables (active ingredients, clinical tags, interactions) ─

CREATE TABLE "medication_active_ingredients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "medication_master_id" UUID NOT NULL,
    "active_ingredient_id" UUID NOT NULL,
    "amount" TEXT,
    "unit" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "medication_active_ingredients_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "medication_active_ingredients_medication_master_id_active_ingr_key"
    ON "medication_active_ingredients"("medication_master_id", "active_ingredient_id");
CREATE INDEX "medication_active_ingredients_medication_master_id_idx"
    ON "medication_active_ingredients"("medication_master_id");
CREATE INDEX "medication_active_ingredients_active_ingredient_id_idx"
    ON "medication_active_ingredients"("active_ingredient_id");

ALTER TABLE "medication_active_ingredients"
    ADD CONSTRAINT "medication_active_ingredients_medication_master_id_fkey"
    FOREIGN KEY ("medication_master_id") REFERENCES "medication_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medication_active_ingredients"
    ADD CONSTRAINT "medication_active_ingredients_active_ingredient_id_fkey"
    FOREIGN KEY ("active_ingredient_id") REFERENCES "active_ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "medication_interactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "medication_master_id" UUID NOT NULL,
    "interacts_with_id" UUID NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'moderate',
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "medication_interactions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "medication_interactions_medication_master_id_interacts_with_id_key"
    ON "medication_interactions"("medication_master_id", "interacts_with_id");
CREATE INDEX "medication_interactions_medication_master_id_idx"
    ON "medication_interactions"("medication_master_id");
CREATE INDEX "medication_interactions_interacts_with_id_idx"
    ON "medication_interactions"("interacts_with_id");

ALTER TABLE "medication_interactions"
    ADD CONSTRAINT "medication_interactions_medication_master_id_fkey"
    FOREIGN KEY ("medication_master_id") REFERENCES "medication_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medication_interactions"
    ADD CONSTRAINT "medication_interactions_interacts_with_id_fkey"
    FOREIGN KEY ("interacts_with_id") REFERENCES "medication_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "medication_clinical_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "medication_master_id" UUID NOT NULL,
    "clinical_tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "medication_clinical_tags_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "medication_clinical_tags_medication_master_id_clinical_tag_id_key"
    ON "medication_clinical_tags"("medication_master_id", "clinical_tag_id");
CREATE INDEX "medication_clinical_tags_medication_master_id_idx"
    ON "medication_clinical_tags"("medication_master_id");
CREATE INDEX "medication_clinical_tags_clinical_tag_id_idx"
    ON "medication_clinical_tags"("clinical_tag_id");

ALTER TABLE "medication_clinical_tags"
    ADD CONSTRAINT "medication_clinical_tags_medication_master_id_fkey"
    FOREIGN KEY ("medication_master_id") REFERENCES "medication_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medication_clinical_tags"
    ADD CONSTRAINT "medication_clinical_tags_clinical_tag_id_fkey"
    FOREIGN KEY ("clinical_tag_id") REFERENCES "clinical_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 6. Data migration: split each medications row ────────────────────
-- For each existing medication, create:
--   (a) a new medication_masters row with a fresh UUID carrying all clinical fields;
--   (b) a pharmacy_inventory row REUSING the old medication id, linked to the new master,
--       carrying all commercial fields.
-- The old `name` is also used as `generic_name` fallback (existing data doesn't separate them).

INSERT INTO "medication_masters" (
    "id", "name", "slug", "generic_name", "brand_name",
    "category", "description", "indications", "dosage", "side_effects",
    "contraindications", "storage", "image_url", "image_urls", "alternative_ids",
    "enrichment_status", "enrichment_score", "acquisition_method",
    "created_at", "updated_at"
)
SELECT
    gen_random_uuid() AS id,
    m.name AS name,
    m.slug AS slug,
    COALESCE(NULLIF(SPLIT_PART(m.name, ' ', 1), ''), m.name) AS generic_name,
    NULL AS brand_name,
    COALESCE(NULLIF(m.category, ''), 'general') AS category,
    m.description,
    m.indications,
    m.dosage,
    m.side_effects,
    m.contraindications,
    m.storage,
    m.image_url,
    m.image_urls,
    m.alternative_ids,
    'partial' AS enrichment_status,
    40 AS enrichment_score,
    'unknown' AS acquisition_method,
    m.created_at,
    m.updated_at
FROM "medications" m;

-- Now build pharmacy_inventory REUSING the old medication id.
INSERT INTO "pharmacy_inventory" (
    "id", "medication_master_id", "slug", "sku", "price",
    "current_stock", "low_stock_threshold",
    "over_the_counter", "prescription_required", "public_listing", "active",
    "synced_at", "created_at", "updated_at"
)
SELECT
    m.id AS id,
    mm.id AS medication_master_id,
    m.slug AS slug,
    m.sku AS sku,
    m.price AS price,
    m.stock_qty AS current_stock,
    m.low_stock_threshold AS low_stock_threshold,
    m.over_the_counter AS over_the_counter,
    m.prescription_required AS prescription_required,
    m.public_listing AS public_listing,
    m.active AS active,
    m.synced_at AS synced_at,
    m.created_at AS created_at,
    m.updated_at AS updated_at
FROM "medications" m
JOIN "medication_masters" mm ON mm.slug = m.slug AND mm.name = m.name;

-- Reassign alternative_ids to point at the new medication_masters ids (best-effort by slug match).
-- (alternative_ids stores comma-separated UUIDs; we leave them as-is for now since the old
--  medication ids still resolve to pharmacy_inventory ids — and alternative matching is a
--  display concern handled in the new medicines/[slug] route via pharmacy_inventory lookup.)

-- ── 7. Repoint FKs from order_items + prescriptions to pharmacy_inventory ─

ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_medication_id_fkey";
ALTER TABLE "order_items"
    ADD CONSTRAINT "order_items_medication_id_fkey"
    FOREIGN KEY ("medication_id") REFERENCES "pharmacy_inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "prescriptions" DROP CONSTRAINT IF EXISTS "prescriptions_medication_id_fkey";
ALTER TABLE "prescriptions"
    ADD CONSTRAINT "prescriptions_medication_id_fkey"
    FOREIGN KEY ("medication_id") REFERENCES "pharmacy_inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 8. Drop the old medications table ────────────────────────────────
-- Safe now: all data migrated, all FKs repointed.
DROP TABLE IF EXISTS "medications";

-- ── 9. Final indexes for query performance on the new schema ─────────
CREATE INDEX "medication_masters_name_idx" ON "medication_masters"("name");
CREATE INDEX "medication_masters_slug_idx" ON "medication_masters"("slug");
CREATE INDEX "pharmacy_inventory_slug_idx" ON "pharmacy_inventory"("slug");

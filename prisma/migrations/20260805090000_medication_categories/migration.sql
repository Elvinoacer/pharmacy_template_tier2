-- Medication category registry for admin CRUD (create empty cats, rename, merge, delete).
CREATE TABLE IF NOT EXISTS "medication_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "medication_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "medication_categories_slug_key" ON "medication_categories"("slug");
CREATE INDEX IF NOT EXISTS "medication_categories_active_idx" ON "medication_categories"("active");

-- Backfill from existing medication.category values (and a sensible default set).
INSERT INTO "medication_categories" ("id", "name", "slug", "description", "sort_order", "active", "created_at", "updated_at")
SELECT gen_random_uuid(),
       initcap(replace(c.category, '-', ' ')),
       c.category,
       NULL,
       0,
       true,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT lower(trim(category)) AS category
  FROM "medications"
  WHERE category IS NOT NULL AND trim(category) <> ''
) c
ON CONFLICT ("slug") DO NOTHING;

-- Ensure common defaults exist even when no meds use them yet.
INSERT INTO "medication_categories" ("id", "name", "slug", "sort_order", "active", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'General', 'general', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Pain Relief', 'pain-relief', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Antibiotics', 'antibiotics', 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Cardiovascular', 'cardiovascular', 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Diabetes', 'diabetes', 40, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Respiratory', 'respiratory', 50, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Vitamins', 'vitamins', 60, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'First Aid', 'first-aid', 70, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Cold Flu', 'cold-flu', 80, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Skin Care', 'skin-care', 90, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Baby Care', 'baby-care', 100, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Womens Health', 'womens-health', 110, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Mens Health', 'mens-health', 120, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Mental Health', 'mental-health', 130, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Digestive', 'digestive', 140, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Allergy', 'allergy', 150, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

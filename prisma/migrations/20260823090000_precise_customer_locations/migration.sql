-- Precise customer location captured with explicit browser geolocation consent.
-- One default/current location per customer; the table intentionally supports
-- additional saved locations later by allowing non-default rows.
CREATE TABLE IF NOT EXISTS "customer_locations" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Current location',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy_meters" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'browser_geolocation',
    "is_default" BOOLEAN NOT NULL DEFAULT true,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_locations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_locations_customer_id_fkey"
      FOREIGN KEY ("customer_id") REFERENCES "customer_profiles"("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "customer_locations_latitude_check"
      CHECK ("latitude" >= -90 AND "latitude" <= 90),
    CONSTRAINT "customer_locations_longitude_check"
      CHECK ("longitude" >= -180 AND "longitude" <= 180),
    CONSTRAINT "customer_locations_accuracy_check"
      CHECK ("accuracy_meters" IS NULL OR "accuracy_meters" >= 0)
);

CREATE INDEX IF NOT EXISTS "customer_locations_customer_id_idx"
  ON "customer_locations"("customer_id");

CREATE UNIQUE INDEX IF NOT EXISTS "customer_locations_one_default_idx"
  ON "customer_locations"("customer_id")
  WHERE "is_default" = true;

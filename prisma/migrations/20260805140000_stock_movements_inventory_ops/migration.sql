-- Production inventory ops: stock movement ledger + indexes for health scans

CREATE TABLE IF NOT EXISTS "stock_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pharmacy_inventory_id" UUID NOT NULL,
    "inventory_lot_id" UUID,
    "reason" TEXT NOT NULL,
    "quantity_delta" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "notes" TEXT,
    "related_type" TEXT,
    "related_id" UUID,
    "actor_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "stock_movements_pharmacy_inventory_id_created_at_idx"
  ON "stock_movements"("pharmacy_inventory_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "stock_movements_reason_idx" ON "stock_movements"("reason");
CREATE INDEX IF NOT EXISTS "stock_movements_related_type_related_id_idx"
  ON "stock_movements"("related_type", "related_id");
CREATE INDEX IF NOT EXISTS "stock_movements_created_at_idx" ON "stock_movements"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "pharmacy_inventory_current_stock_idx" ON "pharmacy_inventory"("current_stock");

DO $$ BEGIN
  ALTER TABLE "stock_movements"
    ADD CONSTRAINT "stock_movements_pharmacy_inventory_id_fkey"
    FOREIGN KEY ("pharmacy_inventory_id") REFERENCES "pharmacy_inventory"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "stock_movements"
    ADD CONSTRAINT "stock_movements_inventory_lot_id_fkey"
    FOREIGN KEY ("inventory_lot_id") REFERENCES "inventory_lots"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Normalize the legacy camelCase OrderItem price column to the Prisma-mapped name.
-- Some databases were created before the snake_case mapping was introduced.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_items'
      AND column_name = 'unitPrice'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_items'
      AND column_name = 'unit_price'
  ) THEN
    ALTER TABLE "order_items" RENAME COLUMN "unitPrice" TO "unit_price";
  END IF;
END $$;

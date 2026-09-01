-- Link stock-in inventory movements to the supplier that provided the batch.
-- Existing movements remain untouched because supplierId is nullable.
ALTER TABLE "InventoryMovement"
  ADD COLUMN IF NOT EXISTS "supplierId" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'InventoryMovement_supplierId_fkey'
  ) THEN
    ALTER TABLE "InventoryMovement"
      ADD CONSTRAINT "InventoryMovement_supplierId_fkey"
      FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "InventoryMovement_shopId_supplierId_createdAt_idx"
  ON "InventoryMovement"("shopId", "supplierId", "createdAt" DESC);

ALTER TABLE "SupplierInvoice"
  ADD COLUMN IF NOT EXISTS "attachmentData" bytea NULL;

ALTER TABLE "SupplierInvoiceItem"
  ADD COLUMN IF NOT EXISTS "movementId" uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SupplierInvoiceItem_movementId_fkey'
  ) THEN
    ALTER TABLE "SupplierInvoiceItem"
      ADD CONSTRAINT "SupplierInvoiceItem_movementId_fkey"
      FOREIGN KEY ("movementId") REFERENCES "InventoryMovement"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "SupplierInvoiceItem_movementId_key"
  ON "SupplierInvoiceItem" ("movementId")
  WHERE "movementId" IS NOT NULL;

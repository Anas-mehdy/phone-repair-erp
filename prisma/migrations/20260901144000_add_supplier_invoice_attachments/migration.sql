CREATE TABLE IF NOT EXISTS "SupplierInvoiceAttachment" (
  "movementId" UUID PRIMARY KEY,
  "shopId" UUID NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" VARCHAR(100) NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "fileData" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierInvoiceAttachment_movementId_fkey"
    FOREIGN KEY ("movementId") REFERENCES "InventoryMovement"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SupplierInvoiceAttachment_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SupplierInvoiceAttachment_shopId_createdAt_idx"
  ON "SupplierInvoiceAttachment"("shopId", "createdAt");

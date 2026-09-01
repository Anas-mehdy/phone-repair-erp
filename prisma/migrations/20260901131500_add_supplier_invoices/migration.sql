CREATE TABLE IF NOT EXISTS "SupplierInvoice" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "shopId" uuid NOT NULL,
  "supplierId" uuid NOT NULL,
  "createdByUserId" uuid,
  "invoiceNumber" text,
  "invoiceDate" date NOT NULL,
  "notes" text,
  "total" numeric(12,2) NOT NULL DEFAULT 0 CHECK ("total" >= 0),
  "attachmentPath" text,
  "attachmentName" text,
  "attachmentMimeType" varchar(100),
  "attachmentSize" integer CHECK ("attachmentSize" IS NULL OR "attachmentSize" >= 0),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "deletedAt" timestamptz,
  "version" integer NOT NULL DEFAULT 1,
  CONSTRAINT "SupplierInvoice_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE,
  CONSTRAINT "SupplierInvoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT,
  CONSTRAINT "SupplierInvoice_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "SupplierInvoiceItem" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "shopId" uuid NOT NULL,
  "supplierInvoiceId" uuid NOT NULL,
  "inventoryItemId" uuid NOT NULL,
  "itemName" text NOT NULL,
  "quantity" integer NOT NULL CHECK ("quantity" > 0),
  "unitCost" numeric(12,2) NOT NULL CHECK ("unitCost" >= 0),
  "lineTotal" numeric(12,2) NOT NULL CHECK ("lineTotal" >= 0),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "SupplierInvoiceItem_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE,
  CONSTRAINT "SupplierInvoiceItem_supplierInvoiceId_fkey" FOREIGN KEY ("supplierInvoiceId") REFERENCES "SupplierInvoice"("id") ON DELETE CASCADE,
  CONSTRAINT "SupplierInvoiceItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT
);

ALTER TABLE "InventoryMovement"
  ADD COLUMN IF NOT EXISTS "supplierInvoiceId" uuid,
  ADD COLUMN IF NOT EXISTS "supplierInvoiceItemId" uuid;

DO $$ BEGIN
  ALTER TABLE "InventoryMovement"
    ADD CONSTRAINT "InventoryMovement_supplierInvoiceId_fkey"
    FOREIGN KEY ("supplierInvoiceId") REFERENCES "SupplierInvoice"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "InventoryMovement"
    ADD CONSTRAINT "InventoryMovement_supplierInvoiceItemId_fkey"
    FOREIGN KEY ("supplierInvoiceItemId") REFERENCES "SupplierInvoiceItem"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "SupplierInvoice_shop_supplier_date_idx"
  ON "SupplierInvoice" ("shopId", "supplierId", "invoiceDate" DESC);
CREATE INDEX IF NOT EXISTS "SupplierInvoice_shop_created_idx"
  ON "SupplierInvoice" ("shopId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "SupplierInvoiceItem_invoice_idx"
  ON "SupplierInvoiceItem" ("shopId", "supplierInvoiceId");
CREATE INDEX IF NOT EXISTS "SupplierInvoiceItem_inventory_idx"
  ON "SupplierInvoiceItem" ("shopId", "inventoryItemId");
CREATE INDEX IF NOT EXISTS "InventoryMovement_supplierInvoiceId_idx"
  ON "InventoryMovement" ("shopId", "supplierInvoiceId");

ALTER TABLE "SupplierInvoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupplierInvoiceItem" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "SupplierInvoice" FROM anon, authenticated;
REVOKE ALL ON TABLE "SupplierInvoiceItem" FROM anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'supplier-invoices',
  'supplier-invoices',
  false,
  4194304,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

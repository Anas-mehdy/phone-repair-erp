CREATE TABLE IF NOT EXISTS "SupplierInvoice" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "shopId" uuid NOT NULL,
  "supplierId" uuid NOT NULL,
  "createdByUserId" uuid NULL,
  "invoiceNumber" text NULL,
  "invoiceDate" date NOT NULL DEFAULT CURRENT_DATE,
  "notes" text NULL,
  "total" numeric(12,2) NOT NULL DEFAULT 0,
  "attachmentPath" text NULL,
  "attachmentName" text NULL,
  "attachmentMimeType" varchar(120) NULL,
  "attachmentSize" integer NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "deletedAt" timestamptz NULL,
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

CREATE INDEX IF NOT EXISTS "SupplierInvoice_shop_supplier_date_idx" ON "SupplierInvoice" ("shopId", "supplierId", "invoiceDate" DESC);
CREATE INDEX IF NOT EXISTS "SupplierInvoiceItem_shop_invoice_idx" ON "SupplierInvoiceItem" ("shopId", "supplierInvoiceId");

ALTER TABLE "SupplierInvoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupplierInvoiceItem" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "SupplierInvoice" FROM anon, authenticated;
REVOKE ALL ON TABLE "SupplierInvoiceItem" FROM anon, authenticated;

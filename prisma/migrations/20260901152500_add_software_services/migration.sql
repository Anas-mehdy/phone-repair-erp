CREATE TABLE IF NOT EXISTS "SoftwareServiceCatalog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "defaultPrice" DECIMAL(12,2),
  "defaultCost" DECIMAL(12,2),
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "SoftwareServiceCatalog_shopId_name_idx"
  ON "SoftwareServiceCatalog"("shopId", "name");

CREATE TABLE IF NOT EXISTS "SoftwareServiceSale" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
  "customerId" UUID REFERENCES "Customer"("id") ON DELETE SET NULL,
  "catalogId" UUID REFERENCES "SoftwareServiceCatalog"("id") ON DELETE SET NULL,
  "invoiceId" UUID NOT NULL UNIQUE REFERENCES "Invoice"("id") ON DELETE CASCADE,
  "createdByUserId" UUID,
  "serviceName" TEXT NOT NULL,
  "deviceBrand" TEXT,
  "deviceModel" TEXT,
  "deviceSerial" TEXT,
  "salePrice" DECIMAL(12,2) NOT NULL,
  "serviceCost" DECIMAL(12,2),
  "notes" TEXT,
  "deviceKept" BOOLEAN NOT NULL DEFAULT FALSE,
  "deliveredAt" TIMESTAMP(3),
  "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "SoftwareServiceSale_shopId_soldAt_idx"
  ON "SoftwareServiceSale"("shopId", "soldAt");
CREATE INDEX IF NOT EXISTS "SoftwareServiceSale_shopId_customerId_idx"
  ON "SoftwareServiceSale"("shopId", "customerId");
CREATE INDEX IF NOT EXISTS "SoftwareServiceSale_shopId_deviceKept_idx"
  ON "SoftwareServiceSale"("shopId", "deviceKept", "deliveredAt");

ALTER TABLE "InventoryItem"
  ADD COLUMN "isDevice" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "deviceModel" VARCHAR(80),
  ADD COLUMN "deviceCondition" VARCHAR(16),
  ADD COLUMN "batteryHealth" INTEGER,
  ADD COLUMN "storageCapacity" VARCHAR(24),
  ADD COLUMN "deviceIdentifier" VARCHAR(40);
ALTER TABLE "PurchaseItem" ADD COLUMN "deviceDetails" JSONB;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_device_metadata_check" CHECK (
  NOT "isDevice" OR (
    "deviceModel" IS NOT NULL AND length(btrim("deviceModel")) > 0
    AND "deviceCondition" IS NOT NULL AND "deviceCondition" IN ('NEW','USED','REFURBISHED')
    AND "storageCapacity" IS NOT NULL AND length(btrim("storageCapacity")) > 0
    AND "barcode" IS NOT NULL AND length(btrim("barcode")) > 0
    AND "quantity" BETWEEN 0 AND 1
    AND ("batteryHealth" IS NULL OR "batteryHealth" BETWEEN 0 AND 100)
  )
);
CREATE UNIQUE INDEX "InventoryItem_device_barcode_key" ON "InventoryItem" ("shopId", "barcode")
  WHERE "isDevice" AND "deletedAt" IS NULL;
CREATE UNIQUE INDEX "InventoryItem_device_identifier_key" ON "InventoryItem" ("shopId", "deviceIdentifier")
  WHERE "deviceIdentifier" IS NOT NULL AND "deletedAt" IS NULL;

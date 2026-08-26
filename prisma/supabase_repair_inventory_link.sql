-- Migration Script for Supabase / PostgreSQL
-- 1. Add REPAIR_RETURN to InventoryMovementType enum if not exists
ALTER TYPE "InventoryMovementType" ADD VALUE IF NOT EXISTS 'REPAIR_RETURN';

-- 2. Create RepairOrderItem table
CREATE TABLE IF NOT EXISTS "RepairOrderItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shopId" UUID NOT NULL,
    "repairOrderId" UUID NOT NULL,
    "inventoryItemId" UUID,
    "supplierId" UUID,
    "clientGeneratedId" TEXT,
    "partName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitCost" DECIMAL(12,2),
    "unitPrice" DECIMAL(12,2),
    "supplierName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RepairOrderItem_pkey" PRIMARY KEY ("id")
);

-- 3. Add repairOrderItemId to InventoryMovement table
ALTER TABLE "InventoryMovement" ADD COLUMN IF NOT EXISTS "repairOrderItemId" UUID;

-- 4. Create Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "RepairOrderItem_shopId_clientGeneratedId_key" ON "RepairOrderItem"("shopId", "clientGeneratedId");
CREATE INDEX IF NOT EXISTS "RepairOrderItem_shopId_repairOrderId_idx" ON "RepairOrderItem"("shopId", "repairOrderId");
CREATE INDEX IF NOT EXISTS "RepairOrderItem_shopId_inventoryItemId_idx" ON "RepairOrderItem"("shopId", "inventoryItemId");
CREATE INDEX IF NOT EXISTS "RepairOrderItem_shopId_supplierId_idx" ON "RepairOrderItem"("shopId", "supplierId");
CREATE INDEX IF NOT EXISTS "RepairOrderItem_shopId_updatedAt_idx" ON "RepairOrderItem"("shopId", "updatedAt");
CREATE INDEX IF NOT EXISTS "RepairOrderItem_shopId_deletedAt_idx" ON "RepairOrderItem"("shopId", "deletedAt");
CREATE INDEX IF NOT EXISTS "InventoryMovement_shopId_repairOrderItemId_idx" ON "InventoryMovement"("shopId", "repairOrderItemId");

-- 5. Create Foreign Keys
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RepairOrderItem_shopId_fkey') THEN
    ALTER TABLE "RepairOrderItem" ADD CONSTRAINT "RepairOrderItem_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RepairOrderItem_repairOrderId_fkey') THEN
    ALTER TABLE "RepairOrderItem" ADD CONSTRAINT "RepairOrderItem_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RepairOrderItem_inventoryItemId_fkey') THEN
    ALTER TABLE "RepairOrderItem" ADD CONSTRAINT "RepairOrderItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RepairOrderItem_supplierId_fkey') THEN
    ALTER TABLE "RepairOrderItem" ADD CONSTRAINT "RepairOrderItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryMovement_repairOrderItemId_fkey') THEN
    ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_repairOrderItemId_fkey" FOREIGN KEY ("repairOrderItemId") REFERENCES "RepairOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

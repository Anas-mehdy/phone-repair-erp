-- Dedicated inventory damage/write-off log.
-- Inventory quantity continues to move through InventoryMovement (STOCK_OUT),
-- while this table keeps structured damage data for reporting and audit.

CREATE TABLE IF NOT EXISTS "InventoryDamage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "shopId" uuid NOT NULL,
  "inventoryItemId" uuid NOT NULL,
  "movementId" uuid NOT NULL,
  "createdByUserId" uuid NULL,
  "quantity" integer NOT NULL,
  "reason" text NOT NULL,
  "note" text NULL,
  "unitCostSnapshot" numeric(12, 2) NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "InventoryDamage_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "InventoryDamage_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE,
  CONSTRAINT "InventoryDamage_inventoryItemId_fkey"
    FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE,
  CONSTRAINT "InventoryDamage_movementId_fkey"
    FOREIGN KEY ("movementId") REFERENCES "InventoryMovement"("id") ON DELETE CASCADE,
  CONSTRAINT "InventoryDamage_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "InventoryDamage_movementId_key"
  ON "InventoryDamage" ("movementId");

CREATE INDEX IF NOT EXISTS "InventoryDamage_shopId_createdAt_idx"
  ON "InventoryDamage" ("shopId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "InventoryDamage_shopId_inventoryItemId_createdAt_idx"
  ON "InventoryDamage" ("shopId", "inventoryItemId", "createdAt" DESC);

ALTER TABLE "InventoryDamage" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "InventoryDamage" FROM anon, authenticated;

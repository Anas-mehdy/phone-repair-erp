-- AlterEnum
ALTER TYPE "MembershipRole" ADD VALUE IF NOT EXISTS 'ACCOUNTANT';

-- CreateTable
CREATE TABLE "StocktakeSession" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "closedByUserId" UUID,
    "title" VARCHAR(120) NOT NULL,
    "scope" VARCHAR(16) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    "shopNameSnapshot" TEXT NOT NULL,
    "currency" VARCHAR(8) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "StocktakeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StocktakeLine" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "inventoryItemId" UUID NOT NULL,
    "barcodeSnapshot" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "modelSnapshot" TEXT,
    "conditionSnapshot" TEXT,
    "unitCostSnapshot" DECIMAL(18,6),
    "unitPriceSnapshot" DECIMAL(12,2),
    "quantitySnapshot" INTEGER NOT NULL,
    "versionSnapshot" INTEGER NOT NULL,
    "countedAt" TIMESTAMP(3),
    "countedByUserId" UUID,
    "countedVersion" INTEGER,
    "countedBarcode" TEXT,
    "countedMovementIds" UUID[] DEFAULT ARRAY[]::UUID[],
    "closingQuantity" INTEGER,
    "observedQuantity" INTEGER,
    "result" VARCHAR(16),
    "reason" TEXT,

    CONSTRAINT "StocktakeLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StocktakeScan" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "inventoryItemId" UUID,
    "barcode" VARCHAR(160) NOT NULL,
    "result" VARCHAR(24) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StocktakeScan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StocktakeSession_shopId_startedAt_idx" ON "StocktakeSession"("shopId", "startedAt");

-- CreateIndex
CREATE INDEX "StocktakeLine_shopId_sessionId_result_idx" ON "StocktakeLine"("shopId", "sessionId", "result");

-- CreateIndex
CREATE UNIQUE INDEX "StocktakeLine_sessionId_inventoryItemId_key" ON "StocktakeLine"("sessionId", "inventoryItemId");

-- CreateIndex
CREATE INDEX "StocktakeScan_shopId_sessionId_createdAt_idx" ON "StocktakeScan"("shopId", "sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "StocktakeSession" ADD CONSTRAINT "StocktakeSession_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakeSession" ADD CONSTRAINT "StocktakeSession_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakeSession" ADD CONSTRAINT "StocktakeSession_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakeLine" ADD CONSTRAINT "StocktakeLine_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakeLine" ADD CONSTRAINT "StocktakeLine_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StocktakeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakeLine" ADD CONSTRAINT "StocktakeLine_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakeLine" ADD CONSTRAINT "StocktakeLine_countedByUserId_fkey" FOREIGN KEY ("countedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakeScan" ADD CONSTRAINT "StocktakeScan_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakeScan" ADD CONSTRAINT "StocktakeScan_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StocktakeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakeScan" ADD CONSTRAINT "StocktakeScan_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakeScan" ADD CONSTRAINT "StocktakeScan_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Fail closed for clients bypassing the application. Stocktake access is server-only.
ALTER TABLE "StocktakeSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StocktakeLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StocktakeScan" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "StocktakeSession", "StocktakeLine", "StocktakeScan" FROM PUBLIC;
-- Supabase may give these roles explicit privileges through default grants.
-- Keep these accountant-only tables reachable exclusively through server code.
DO $$
DECLARE api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON "StocktakeSession", "StocktakeLine", "StocktakeScan" FROM %I', api_role);
    END IF;
  END LOOP;
END $$;

ALTER TABLE "StocktakeSession" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "StocktakeLine" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "StocktakeScan" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "StocktakeSession" ADD CONSTRAINT "StocktakeSession_scope_check" CHECK ("scope" IN ('ALL','NEW','USED','REFURBISHED')),
 ADD CONSTRAINT "StocktakeSession_status_check" CHECK (("status"='OPEN' AND "closedAt" IS NULL AND "closedByUserId" IS NULL) OR ("status"='CLOSED' AND "closedAt" IS NOT NULL AND "closedByUserId" IS NOT NULL));
ALTER TABLE "StocktakeLine" ADD CONSTRAINT "StocktakeLine_quantity_check" CHECK ("quantitySnapshot" IN (0,1)),
 ADD CONSTRAINT "StocktakeLine_result_check" CHECK ("result" IS NULL OR "result" IN ('COUNTED','MISSING','MOVED','REVIEW'));
CREATE INDEX "InventoryItem_stocktake_scope_idx" ON "InventoryItem" ("shopId", "deviceCondition") WHERE "isDevice"=true AND "deletedAt" IS NULL AND "quantity">0;

ALTER TABLE "StocktakeLine" ALTER COLUMN "countedMovementIds" SET NOT NULL;
ALTER TABLE "StocktakeLine" ADD CONSTRAINT "StocktakeLine_count_anchor_check" CHECK (("countedAt" IS NULL AND "countedByUserId" IS NULL AND "countedVersion" IS NULL AND "countedBarcode" IS NULL) OR ("countedAt" IS NOT NULL AND "countedVersion" IS NOT NULL AND "countedBarcode" IS NOT NULL));
ALTER TABLE "StocktakeScan" ADD CONSTRAINT "StocktakeScan_result_check" CHECK ("result" IN ('COUNTED','RECOUNTED','DUPLICATE','UNKNOWN','OUT_OF_SCOPE','AMBIGUOUS'));

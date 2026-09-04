CREATE TABLE "ElectronicServiceProvider" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "typeLabel" VARCHAR(160),
  "currencyCode" VARCHAR(12) NOT NULL,
  "currentBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ElectronicServiceProvider_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ElectronicServiceProvider_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ElectronicServiceProvider_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ElectronicServiceProvider_currentBalance_check" CHECK ("currentBalance" >= 0),
  CONSTRAINT "ElectronicServiceProvider_openingBalance_check" CHECK ("openingBalance" >= 0)
);
CREATE UNIQUE INDEX "ElectronicServiceProvider_shop_name_ci_key" ON "ElectronicServiceProvider" ("shopId", lower(trim("name")));
CREATE INDEX "ElectronicServiceProvider_shop_active_name_idx" ON "ElectronicServiceProvider" ("shopId", "isActive", "name");

CREATE TABLE "ElectronicServiceProviderMovement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL,
  "providerId" UUID NOT NULL,
  "createdByUserId" UUID,
  "type" VARCHAR(40) NOT NULL,
  "direction" VARCHAR(3) NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "balanceBefore" DECIMAL(14,2) NOT NULL,
  "balanceAfter" DECIMAL(14,2) NOT NULL,
  "description" TEXT,
  "reference" VARCHAR(160),
  "sourceType" VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
  "sourceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ElectronicServiceProviderMovement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ElectronicServiceProviderMovement_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ElectronicServiceProviderMovement_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ElectronicServiceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ElectronicServiceProviderMovement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ElectronicServiceProviderMovement_direction_check" CHECK ("direction" IN ('IN', 'OUT')),
  CONSTRAINT "ElectronicServiceProviderMovement_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "ElectronicServiceProviderMovement_balanceBefore_check" CHECK ("balanceBefore" >= 0),
  CONSTRAINT "ElectronicServiceProviderMovement_balanceAfter_check" CHECK ("balanceAfter" >= 0)
);
CREATE INDEX "ElectronicServiceProviderMovement_shop_createdAt_idx" ON "ElectronicServiceProviderMovement" ("shopId", "createdAt" DESC);
CREATE INDEX "ElectronicServiceProviderMovement_provider_createdAt_idx" ON "ElectronicServiceProviderMovement" ("providerId", "createdAt" DESC);
CREATE INDEX "ElectronicServiceProviderMovement_source_idx" ON "ElectronicServiceProviderMovement" ("shopId", "sourceType", "sourceId");

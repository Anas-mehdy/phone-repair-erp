CREATE TABLE "ElectronicServiceTemplate" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL,
  "providerId" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "category" VARCHAR(120) NOT NULL,
  "faceValue" DECIMAL(14,2),
  "providerCost" DECIMAL(14,2) NOT NULL,
  "customerCharge" DECIMAL(14,2) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ElectronicServiceTemplate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ElectronicServiceTemplate_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ElectronicServiceTemplate_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ElectronicServiceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ElectronicServiceTemplate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ElectronicServiceTemplate_faceValue_check" CHECK ("faceValue" IS NULL OR "faceValue" >= 0),
  CONSTRAINT "ElectronicServiceTemplate_providerCost_check" CHECK ("providerCost" >= 0),
  CONSTRAINT "ElectronicServiceTemplate_customerCharge_check" CHECK ("customerCharge" >= 0)
);
CREATE INDEX "ElectronicServiceTemplate_shop_active_idx" ON "ElectronicServiceTemplate" ("shopId", "isActive", "category", "name");
CREATE INDEX "ElectronicServiceTemplate_provider_active_idx" ON "ElectronicServiceTemplate" ("providerId", "isActive", "name");

CREATE TABLE "ElectronicServiceTransaction" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL,
  "providerId" UUID NOT NULL,
  "templateId" UUID,
  "createdByUserId" UUID,
  "category" VARCHAR(120) NOT NULL,
  "serviceName" VARCHAR(160) NOT NULL,
  "faceValue" DECIMAL(14,2) NOT NULL,
  "providerCost" DECIMAL(14,2) NOT NULL,
  "customerCharge" DECIMAL(14,2) NOT NULL,
  "profit" DECIMAL(14,2) NOT NULL,
  "profitMode" VARCHAR(32) NOT NULL,
  "profitValue" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "customerPhone" VARCHAR(80),
  "reference" VARCHAR(160),
  "notes" TEXT,
  "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ElectronicServiceTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ElectronicServiceTransaction_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ElectronicServiceTransaction_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ElectronicServiceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ElectronicServiceTransaction_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ElectronicServiceTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ElectronicServiceTransaction_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ElectronicServiceTransaction_faceValue_check" CHECK ("faceValue" >= 0),
  CONSTRAINT "ElectronicServiceTransaction_providerCost_check" CHECK ("providerCost" >= 0),
  CONSTRAINT "ElectronicServiceTransaction_customerCharge_check" CHECK ("customerCharge" >= 0),
  CONSTRAINT "ElectronicServiceTransaction_profitMode_check" CHECK ("profitMode" IN ('AUTO_DIFFERENCE','FIXED','PERCENTAGE','NONE')),
  CONSTRAINT "ElectronicServiceTransaction_profitValue_check" CHECK ("profitValue" >= 0),
  CONSTRAINT "ElectronicServiceTransaction_status_check" CHECK ("status" IN ('ACTIVE','VOID'))
);
CREATE INDEX "ElectronicServiceTransaction_shop_createdAt_idx" ON "ElectronicServiceTransaction" ("shopId", "createdAt" DESC);
CREATE INDEX "ElectronicServiceTransaction_provider_createdAt_idx" ON "ElectronicServiceTransaction" ("providerId", "createdAt" DESC);
CREATE INDEX "ElectronicServiceTransaction_template_createdAt_idx" ON "ElectronicServiceTransaction" ("templateId", "createdAt" DESC);

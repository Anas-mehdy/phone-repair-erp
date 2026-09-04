CREATE TABLE "ElectronicServiceProviderReconciliation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL,
  "providerId" UUID NOT NULL,
  "movementId" UUID,
  "systemBalance" DECIMAL(14,2) NOT NULL,
  "actualBalance" DECIMAL(14,2) NOT NULL,
  "difference" DECIMAL(14,2) NOT NULL,
  "reasonCode" VARCHAR(40) NOT NULL,
  "notes" TEXT,
  "reference" VARCHAR(160),
  "createdByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ElectronicServiceProviderReconciliation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ElectronicServiceProviderReconciliation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ElectronicServiceProviderReconciliation_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ElectronicServiceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ElectronicServiceProviderReconciliation_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "ElectronicServiceProviderMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ElectronicServiceProviderReconciliation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ElectronicServiceProviderReconciliation_actualBalance_check" CHECK ("actualBalance" >= 0),
  CONSTRAINT "ElectronicServiceProviderReconciliation_reasonCode_check" CHECK ("reasonCode" IN ('UNRECORDED_TRANSACTION','PROVIDER_FEE','OPERATOR_ERROR','ROUNDING','OTHER'))
);

CREATE INDEX "ElectronicServiceProviderReconciliation_shop_createdAt_idx" ON "ElectronicServiceProviderReconciliation" ("shopId", "createdAt" DESC);
CREATE INDEX "ElectronicServiceProviderReconciliation_provider_createdAt_idx" ON "ElectronicServiceProviderReconciliation" ("providerId", "createdAt" DESC);

CREATE OR REPLACE FUNCTION "capture_legacy_electronic_provider_adjustment"()
RETURNS trigger AS $$
BEGIN
  IF NEW."type" = 'ADJUSTMENT' AND COALESCE(NEW."sourceType", 'MANUAL') = 'MANUAL' THEN
    INSERT INTO "ElectronicServiceProviderReconciliation" (
      "shopId", "providerId", "movementId", "systemBalance", "actualBalance", "difference",
      "reasonCode", "notes", "reference", "createdByUserId", "createdAt"
    ) VALUES (
      NEW."shopId", NEW."providerId", NEW."id", NEW."balanceBefore", NEW."balanceAfter",
      NEW."balanceAfter" - NEW."balanceBefore", 'OTHER', NEW."description", NEW."reference", NEW."createdByUserId", NEW."createdAt"
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ElectronicServiceProviderMovement_capture_adjustment"
AFTER INSERT ON "ElectronicServiceProviderMovement"
FOR EACH ROW EXECUTE FUNCTION "capture_legacy_electronic_provider_adjustment"();

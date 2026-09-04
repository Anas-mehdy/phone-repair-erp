ALTER TABLE "ElectronicServiceTransaction"
  ADD COLUMN "customerId" UUID,
  ADD COLUMN "paymentDestination" VARCHAR(20) NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "walletId" UUID,
  ADD COLUMN "debtEntryId" UUID,
  ADD COLUMN "cashDrawerMovementId" UUID,
  ADD COLUMN "financialTransferId" UUID,
  ADD COLUMN "voidedByUserId" UUID,
  ADD COLUMN "voidedAt" TIMESTAMP(3),
  ADD COLUMN "voidReason" TEXT;

ALTER TABLE "ElectronicServiceTransaction"
  ADD CONSTRAINT "ElectronicServiceTransaction_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ElectronicServiceTransaction_voidedByUserId_fkey"
    FOREIGN KEY ("voidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ElectronicServiceTransaction_paymentDestination_check"
    CHECK ("paymentDestination" IN ('DRAWER','WALLET','OTHER','DEBT'));

CREATE INDEX "ElectronicServiceTransaction_customer_createdAt_idx"
  ON "ElectronicServiceTransaction" ("customerId", "createdAt" DESC);
CREATE INDEX "ElectronicServiceTransaction_paymentDestination_idx"
  ON "ElectronicServiceTransaction" ("shopId", "paymentDestination", "createdAt" DESC);
CREATE INDEX "ElectronicServiceTransaction_status_createdAt_idx"
  ON "ElectronicServiceTransaction" ("shopId", "status", "createdAt" DESC);

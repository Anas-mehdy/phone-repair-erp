CREATE TABLE IF NOT EXISTS "FinancialWallet" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "currentBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "monthlyLimit" DECIMAL(14,2),
  "defaultDepositCommission" DECIMAL(8,4) NOT NULL DEFAULT 0,
  "defaultWithdrawalCommission" DECIMAL(8,4) NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "FinancialWallet_shopId_name_idx"
  ON "FinancialWallet"("shopId", "name");

CREATE TABLE IF NOT EXISTS "FinancialTransfer" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
  "walletId" UUID NOT NULL REFERENCES "FinancialWallet"("id") ON DELETE RESTRICT,
  "customerId" UUID REFERENCES "Customer"("id") ON DELETE SET NULL,
  "createdByUserId" UUID,
  "voidedByUserId" UUID,
  "operationType" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "commission" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "voidedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "FinancialTransfer_shopId_createdAt_idx"
  ON "FinancialTransfer"("shopId", "createdAt");
CREATE INDEX IF NOT EXISTS "FinancialTransfer_walletId_createdAt_idx"
  ON "FinancialTransfer"("walletId", "createdAt");
CREATE INDEX IF NOT EXISTS "FinancialTransfer_shopId_status_idx"
  ON "FinancialTransfer"("shopId", "status");

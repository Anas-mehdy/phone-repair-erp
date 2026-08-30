CREATE TABLE "DebtLedgerAccount" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "DebtLedgerAccount_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DebtLedgerAccount_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DebtLedgerAccount_shop_customer_unique" UNIQUE ("shopId", "customerId")
);

CREATE TABLE "DebtLedgerEntry" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL,
  "accountId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "type" VARCHAR(32) NOT NULL,
  "amount" NUMERIC(12,2) NOT NULL,
  "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "dueAt" TIMESTAMPTZ,
  "description" TEXT,
  "reference" VARCHAR(120),
  "paymentMethod" VARCHAR(50),
  "createdByUserId" UUID,
  "isReversed" BOOLEAN NOT NULL DEFAULT FALSE,
  "reversedAt" TIMESTAMPTZ,
  "reversedByUserId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "DebtLedgerEntry_amount_positive" CHECK ("amount" > 0),
  CONSTRAINT "DebtLedgerEntry_type_check" CHECK ("type" IN ('DEBT','PAYMENT','OPENING_BALANCE','ADJUSTMENT_DEBIT','ADJUSTMENT_CREDIT')),
  CONSTRAINT "DebtLedgerEntry_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DebtLedgerEntry_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "DebtLedgerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DebtLedgerEntry_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DebtLedgerEntry_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DebtLedgerEntry_reversedByUserId_fkey"
    FOREIGN KEY ("reversedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "DebtLedgerAccount_shopId_idx" ON "DebtLedgerAccount"("shopId");
CREATE INDEX "DebtLedgerAccount_customerId_idx" ON "DebtLedgerAccount"("customerId");
CREATE INDEX "DebtLedgerEntry_shop_customer_occurred_idx" ON "DebtLedgerEntry"("shopId", "customerId", "occurredAt" DESC);
CREATE INDEX "DebtLedgerEntry_account_occurred_idx" ON "DebtLedgerEntry"("accountId", "occurredAt" DESC);
CREATE INDEX "DebtLedgerEntry_dueAt_idx" ON "DebtLedgerEntry"("shopId", "dueAt") WHERE "dueAt" IS NOT NULL AND "isReversed" = FALSE;
CREATE INDEX "DebtLedgerEntry_type_idx" ON "DebtLedgerEntry"("shopId", "type", "occurredAt" DESC);

ALTER TABLE "DebtLedgerAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DebtLedgerEntry" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "DebtLedgerAccount" FROM anon, authenticated;
REVOKE ALL ON TABLE "DebtLedgerEntry" FROM anon, authenticated;

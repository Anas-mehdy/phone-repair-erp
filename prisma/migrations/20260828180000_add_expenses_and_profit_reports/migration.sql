CREATE TYPE "ExpenseCategory" AS ENUM (
  'RENT',
  'SALARIES',
  'UTILITIES',
  'MARKETING',
  'TRANSPORT',
  'MAINTENANCE',
  'OTHER'
);

CREATE TABLE "Expense" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL,
  "createdByUserId" UUID,
  "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
  "title" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "spentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Expense_amount_positive" CHECK ("amount" > 0)
);

CREATE INDEX "Expense_shopId_spentAt_idx" ON "Expense"("shopId", "spentAt");
CREATE INDEX "Expense_shopId_category_spentAt_idx" ON "Expense"("shopId", "category", "spentAt");
CREATE INDEX "Expense_shopId_deletedAt_idx" ON "Expense"("shopId", "deletedAt");
CREATE INDEX "Expense_createdByUserId_idx" ON "Expense"("createdByUserId");

ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "Expense" FROM anon, authenticated;

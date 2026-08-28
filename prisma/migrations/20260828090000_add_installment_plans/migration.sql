CREATE TYPE "InstallmentPlanSource" AS ENUM ('MANUAL', 'INVOICE');
CREATE TYPE "InstallmentFrequency" AS ENUM ('WEEKLY', 'MONTHLY');
CREATE TYPE "InstallmentPlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "InstallmentScheduleStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

CREATE TABLE "InstallmentPlan" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "invoiceId" UUID,
  "createdByUserId" UUID,
  "clientGeneratedId" TEXT,
  "planNumber" TEXT NOT NULL,
  "source" "InstallmentPlanSource" NOT NULL DEFAULT 'MANUAL',
  "status" "InstallmentPlanStatus" NOT NULL DEFAULT 'ACTIVE',
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "totalAmount" DECIMAL(12,2) NOT NULL,
  "downPayment" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "financedAmount" DECIMAL(12,2) NOT NULL,
  "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "balanceDue" DECIMAL(12,2) NOT NULL,
  "installmentCount" INTEGER NOT NULL,
  "frequency" "InstallmentFrequency" NOT NULL,
  "firstDueAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "publicAccessEnabled" BOOLEAN NOT NULL DEFAULT true,
  "publicTokenVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "InstallmentPlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InstallmentPlan_amounts_check" CHECK (
    "totalAmount" > 0 AND "downPayment" >= 0 AND "financedAmount" > 0
    AND "amountPaid" >= 0 AND "balanceDue" >= 0
    AND "downPayment" + "financedAmount" = "totalAmount"
  ),
  CONSTRAINT "InstallmentPlan_count_check" CHECK ("installmentCount" BETWEEN 1 AND 120)
);

CREATE TABLE "InstallmentSchedule" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "planId" UUID NOT NULL,
  "installmentNo" INTEGER NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "status" "InstallmentScheduleStatus" NOT NULL DEFAULT 'PENDING',
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InstallmentSchedule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InstallmentSchedule_amount_check" CHECK (
    "amount" > 0 AND "amountPaid" >= 0 AND "amountPaid" <= "amount"
  ),
  CONSTRAINT "InstallmentSchedule_number_check" CHECK ("installmentNo" > 0)
);

CREATE TABLE "InstallmentPayment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL,
  "planId" UUID NOT NULL,
  "createdByUserId" UUID,
  "clientGeneratedId" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "reference" TEXT,
  "note" TEXT,
  "isDownPayment" BOOLEAN NOT NULL DEFAULT false,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "voidedAt" TIMESTAMP(3),
  "voidReason" TEXT,
  CONSTRAINT "InstallmentPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InstallmentPayment_amount_check" CHECK ("amount" > 0)
);

CREATE TABLE "InstallmentPaymentAllocation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "paymentId" UUID NOT NULL,
  "installmentId" UUID NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InstallmentPaymentAllocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InstallmentPaymentAllocation_amount_check" CHECK ("amount" > 0)
);

CREATE UNIQUE INDEX "InstallmentPlan_invoiceId_key" ON "InstallmentPlan"("invoiceId");
CREATE UNIQUE INDEX "InstallmentPlan_shopId_planNumber_key" ON "InstallmentPlan"("shopId", "planNumber");
CREATE UNIQUE INDEX "InstallmentPlan_shopId_clientGeneratedId_key" ON "InstallmentPlan"("shopId", "clientGeneratedId");
CREATE INDEX "InstallmentPlan_shopId_status_firstDueAt_idx" ON "InstallmentPlan"("shopId", "status", "firstDueAt");
CREATE INDEX "InstallmentPlan_shopId_customerId_createdAt_idx" ON "InstallmentPlan"("shopId", "customerId", "createdAt");
CREATE INDEX "InstallmentPlan_customerId_idx" ON "InstallmentPlan"("customerId");
CREATE INDEX "InstallmentPlan_createdByUserId_idx" ON "InstallmentPlan"("createdByUserId");
CREATE INDEX "InstallmentPlan_shopId_balanceDue_idx" ON "InstallmentPlan"("shopId", "balanceDue");
CREATE INDEX "InstallmentPlan_shopId_deletedAt_idx" ON "InstallmentPlan"("shopId", "deletedAt");
CREATE UNIQUE INDEX "InstallmentSchedule_planId_installmentNo_key" ON "InstallmentSchedule"("planId", "installmentNo");
CREATE INDEX "InstallmentSchedule_planId_dueAt_idx" ON "InstallmentSchedule"("planId", "dueAt");
CREATE INDEX "InstallmentSchedule_status_dueAt_idx" ON "InstallmentSchedule"("status", "dueAt");
CREATE INDEX "InstallmentPayment_shopId_planId_paidAt_idx" ON "InstallmentPayment"("shopId", "planId", "paidAt");
CREATE UNIQUE INDEX "InstallmentPayment_shopId_clientGeneratedId_key" ON "InstallmentPayment"("shopId", "clientGeneratedId");
CREATE INDEX "InstallmentPayment_shopId_createdByUserId_idx" ON "InstallmentPayment"("shopId", "createdByUserId");
CREATE INDEX "InstallmentPayment_createdByUserId_idx" ON "InstallmentPayment"("createdByUserId");
CREATE INDEX "InstallmentPayment_planId_voidedAt_idx" ON "InstallmentPayment"("planId", "voidedAt");
CREATE UNIQUE INDEX "InstallmentPaymentAllocation_paymentId_installmentId_key" ON "InstallmentPaymentAllocation"("paymentId", "installmentId");
CREATE INDEX "InstallmentPaymentAllocation_installmentId_idx" ON "InstallmentPaymentAllocation"("installmentId");

ALTER TABLE "InstallmentPlan" ADD CONSTRAINT "InstallmentPlan_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstallmentPlan" ADD CONSTRAINT "InstallmentPlan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InstallmentPlan" ADD CONSTRAINT "InstallmentPlan_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InstallmentPlan" ADD CONSTRAINT "InstallmentPlan_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InstallmentSchedule" ADD CONSTRAINT "InstallmentSchedule_planId_fkey" FOREIGN KEY ("planId") REFERENCES "InstallmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstallmentPayment" ADD CONSTRAINT "InstallmentPayment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstallmentPayment" ADD CONSTRAINT "InstallmentPayment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "InstallmentPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InstallmentPayment" ADD CONSTRAINT "InstallmentPayment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InstallmentPaymentAllocation" ADD CONSTRAINT "InstallmentPaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "InstallmentPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstallmentPaymentAllocation" ADD CONSTRAINT "InstallmentPaymentAllocation_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "InstallmentSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InstallmentPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InstallmentSchedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InstallmentPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InstallmentPaymentAllocation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "InstallmentPlan", "InstallmentSchedule", "InstallmentPayment", "InstallmentPaymentAllocation" FROM anon, authenticated;

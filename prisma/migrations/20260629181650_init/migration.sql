-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "RepairStatus" AS ENUM ('PENDING', 'DIAGNOSING', 'REPAIRING', 'WAITING_PARTS', 'DONE', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'SALE', 'REPAIR_USAGE', 'RETURN');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('REPAIR', 'SALE', 'MANUAL');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "Shop" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "clientGeneratedId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "phoneNormalized" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairOrder" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "customerId" UUID,
    "createdByUserId" UUID,
    "clientGeneratedId" TEXT,
    "ticketNumber" TEXT NOT NULL,
    "status" "RepairStatus" NOT NULL DEFAULT 'PENDING',
    "deviceBrand" TEXT,
    "deviceModel" TEXT,
    "deviceSerial" TEXT,
    "reportedIssue" TEXT NOT NULL,
    "diagnosis" TEXT,
    "resolutionNotes" TEXT,
    "estimatedTotal" DECIMAL(12,2),
    "finalTotal" DECIMAL(12,2),
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RepairOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairStatusHistory" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "repairOrderId" UUID NOT NULL,
    "createdByUserId" UUID,
    "clientGeneratedId" TEXT,
    "fromStatus" "RepairStatus",
    "toStatus" "RepairStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RepairStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "clientGeneratedId" TEXT,
    "sku" TEXT,
    "category" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unitCost" DECIMAL(12,2),
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "inventoryItemId" UUID NOT NULL,
    "repairOrderId" UUID,
    "saleId" UUID,
    "saleItemId" UUID,
    "createdByUserId" UUID,
    "clientGeneratedId" TEXT,
    "type" "InventoryMovementType" NOT NULL,
    "quantityChange" INTEGER NOT NULL,
    "quantityAfter" INTEGER,
    "unitCostSnapshot" DECIMAL(12,2),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "customerId" UUID,
    "createdByUserId" UUID,
    "clientGeneratedId" TEXT,
    "receiptNumber" TEXT,
    "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "inventoryItemId" UUID,
    "clientGeneratedId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceSnapshot" DECIMAL(12,2) NOT NULL,
    "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "customerId" UUID,
    "repairOrderId" UUID,
    "saleId" UUID,
    "createdByUserId" UUID,
    "clientGeneratedId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balanceDue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "createdByUserId" UUID,
    "clientGeneratedId" TEXT,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Shop_updatedAt_idx" ON "Shop"("updatedAt");

-- CreateIndex
CREATE INDEX "Shop_deletedAt_idx" ON "Shop"("deletedAt");

-- CreateIndex
CREATE INDEX "User_shopId_updatedAt_idx" ON "User"("shopId", "updatedAt");

-- CreateIndex
CREATE INDEX "User_shopId_deletedAt_idx" ON "User"("shopId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_shopId_email_key" ON "User"("shopId", "email");

-- CreateIndex
CREATE INDEX "Customer_shopId_name_idx" ON "Customer"("shopId", "name");

-- CreateIndex
CREATE INDEX "Customer_shopId_phone_idx" ON "Customer"("shopId", "phone");

-- CreateIndex
CREATE INDEX "Customer_shopId_phoneNormalized_idx" ON "Customer"("shopId", "phoneNormalized");

-- CreateIndex
CREATE INDEX "Customer_shopId_updatedAt_idx" ON "Customer"("shopId", "updatedAt");

-- CreateIndex
CREATE INDEX "Customer_shopId_deletedAt_idx" ON "Customer"("shopId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_shopId_clientGeneratedId_key" ON "Customer"("shopId", "clientGeneratedId");

-- CreateIndex
CREATE INDEX "RepairOrder_shopId_status_idx" ON "RepairOrder"("shopId", "status");

-- CreateIndex
CREATE INDEX "RepairOrder_shopId_customerId_idx" ON "RepairOrder"("shopId", "customerId");

-- CreateIndex
CREATE INDEX "RepairOrder_shopId_createdByUserId_idx" ON "RepairOrder"("shopId", "createdByUserId");

-- CreateIndex
CREATE INDEX "RepairOrder_shopId_updatedAt_idx" ON "RepairOrder"("shopId", "updatedAt");

-- CreateIndex
CREATE INDEX "RepairOrder_shopId_deletedAt_idx" ON "RepairOrder"("shopId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RepairOrder_shopId_ticketNumber_key" ON "RepairOrder"("shopId", "ticketNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RepairOrder_shopId_clientGeneratedId_key" ON "RepairOrder"("shopId", "clientGeneratedId");

-- CreateIndex
CREATE INDEX "RepairStatusHistory_shopId_repairOrderId_createdAt_idx" ON "RepairStatusHistory"("shopId", "repairOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "RepairStatusHistory_shopId_createdByUserId_idx" ON "RepairStatusHistory"("shopId", "createdByUserId");

-- CreateIndex
CREATE INDEX "RepairStatusHistory_shopId_updatedAt_idx" ON "RepairStatusHistory"("shopId", "updatedAt");

-- CreateIndex
CREATE INDEX "RepairStatusHistory_shopId_deletedAt_idx" ON "RepairStatusHistory"("shopId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RepairStatusHistory_shopId_clientGeneratedId_key" ON "RepairStatusHistory"("shopId", "clientGeneratedId");

-- CreateIndex
CREATE INDEX "InventoryItem_shopId_sku_idx" ON "InventoryItem"("shopId", "sku");

-- CreateIndex
CREATE INDEX "InventoryItem_shopId_name_idx" ON "InventoryItem"("shopId", "name");

-- CreateIndex
CREATE INDEX "InventoryItem_shopId_updatedAt_idx" ON "InventoryItem"("shopId", "updatedAt");

-- CreateIndex
CREATE INDEX "InventoryItem_shopId_deletedAt_idx" ON "InventoryItem"("shopId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_shopId_clientGeneratedId_key" ON "InventoryItem"("shopId", "clientGeneratedId");

-- CreateIndex
CREATE INDEX "InventoryMovement_shopId_inventoryItemId_createdAt_idx" ON "InventoryMovement"("shopId", "inventoryItemId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_shopId_repairOrderId_idx" ON "InventoryMovement"("shopId", "repairOrderId");

-- CreateIndex
CREATE INDEX "InventoryMovement_shopId_saleId_idx" ON "InventoryMovement"("shopId", "saleId");

-- CreateIndex
CREATE INDEX "InventoryMovement_shopId_saleItemId_idx" ON "InventoryMovement"("shopId", "saleItemId");

-- CreateIndex
CREATE INDEX "InventoryMovement_shopId_createdByUserId_idx" ON "InventoryMovement"("shopId", "createdByUserId");

-- CreateIndex
CREATE INDEX "InventoryMovement_shopId_updatedAt_idx" ON "InventoryMovement"("shopId", "updatedAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_shopId_deletedAt_idx" ON "InventoryMovement"("shopId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_shopId_clientGeneratedId_key" ON "InventoryMovement"("shopId", "clientGeneratedId");

-- CreateIndex
CREATE INDEX "Sale_shopId_soldAt_idx" ON "Sale"("shopId", "soldAt");

-- CreateIndex
CREATE INDEX "Sale_shopId_customerId_idx" ON "Sale"("shopId", "customerId");

-- CreateIndex
CREATE INDEX "Sale_shopId_createdByUserId_idx" ON "Sale"("shopId", "createdByUserId");

-- CreateIndex
CREATE INDEX "Sale_shopId_updatedAt_idx" ON "Sale"("shopId", "updatedAt");

-- CreateIndex
CREATE INDEX "Sale_shopId_deletedAt_idx" ON "Sale"("shopId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_shopId_receiptNumber_key" ON "Sale"("shopId", "receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_shopId_clientGeneratedId_key" ON "Sale"("shopId", "clientGeneratedId");

-- CreateIndex
CREATE INDEX "SaleItem_shopId_saleId_idx" ON "SaleItem"("shopId", "saleId");

-- CreateIndex
CREATE INDEX "SaleItem_shopId_inventoryItemId_idx" ON "SaleItem"("shopId", "inventoryItemId");

-- CreateIndex
CREATE INDEX "SaleItem_shopId_updatedAt_idx" ON "SaleItem"("shopId", "updatedAt");

-- CreateIndex
CREATE INDEX "SaleItem_shopId_deletedAt_idx" ON "SaleItem"("shopId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SaleItem_shopId_clientGeneratedId_key" ON "SaleItem"("shopId", "clientGeneratedId");

-- CreateIndex
CREATE INDEX "Invoice_shopId_status_idx" ON "Invoice"("shopId", "status");

-- CreateIndex
CREATE INDEX "Invoice_shopId_type_idx" ON "Invoice"("shopId", "type");

-- CreateIndex
CREATE INDEX "Invoice_shopId_customerId_idx" ON "Invoice"("shopId", "customerId");

-- CreateIndex
CREATE INDEX "Invoice_shopId_repairOrderId_idx" ON "Invoice"("shopId", "repairOrderId");

-- CreateIndex
CREATE INDEX "Invoice_shopId_saleId_idx" ON "Invoice"("shopId", "saleId");

-- CreateIndex
CREATE INDEX "Invoice_shopId_createdByUserId_idx" ON "Invoice"("shopId", "createdByUserId");

-- CreateIndex
CREATE INDEX "Invoice_shopId_issuedAt_idx" ON "Invoice"("shopId", "issuedAt");

-- CreateIndex
CREATE INDEX "Invoice_shopId_updatedAt_idx" ON "Invoice"("shopId", "updatedAt");

-- CreateIndex
CREATE INDEX "Invoice_shopId_deletedAt_idx" ON "Invoice"("shopId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_shopId_invoiceNumber_key" ON "Invoice"("shopId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_shopId_clientGeneratedId_key" ON "Invoice"("shopId", "clientGeneratedId");

-- CreateIndex
CREATE INDEX "Payment_shopId_invoiceId_idx" ON "Payment"("shopId", "invoiceId");

-- CreateIndex
CREATE INDEX "Payment_shopId_createdByUserId_idx" ON "Payment"("shopId", "createdByUserId");

-- CreateIndex
CREATE INDEX "Payment_shopId_paidAt_idx" ON "Payment"("shopId", "paidAt");

-- CreateIndex
CREATE INDEX "Payment_shopId_updatedAt_idx" ON "Payment"("shopId", "updatedAt");

-- CreateIndex
CREATE INDEX "Payment_shopId_deletedAt_idx" ON "Payment"("shopId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_shopId_clientGeneratedId_key" ON "Payment"("shopId", "clientGeneratedId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairOrder" ADD CONSTRAINT "RepairOrder_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairOrder" ADD CONSTRAINT "RepairOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairStatusHistory" ADD CONSTRAINT "RepairStatusHistory_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairStatusHistory" ADD CONSTRAINT "RepairStatusHistory_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "SaleItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

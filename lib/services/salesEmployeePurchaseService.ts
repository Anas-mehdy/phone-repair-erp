import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SalesEmployeePurchaseRow = {
  id: string;
  supplierName: string | null;
  supplierInvoiceNumber: string | null;
  invoiceDate: Date;
  currency: string;
  total: Prisma.Decimal;
  itemCount: number;
  unitCount: number;
  createdAt: Date;
};

export async function listOwnPurchases(shopId: string, userId: string, take = 100) {
  return prisma.$queryRaw<SalesEmployeePurchaseRow[]>`
    SELECT p."id", COALESCE(s."name", p."supplierNameSnapshot") AS "supplierName",
      p."supplierInvoiceNumber", p."invoiceDate", p."currency", p."total", p."createdAt",
      COUNT(pi."id")::int AS "itemCount", COALESCE(SUM(pi."orderedQuantity"), 0)::int AS "unitCount"
    FROM "PurchaseInvoice" p
    LEFT JOIN "Supplier" s ON s."id"=p."supplierId" AND s."shopId"=p."shopId" AND s."deletedAt" IS NULL
    LEFT JOIN "PurchaseItem" pi ON pi."purchaseInvoiceId"=p."id" AND pi."shopId"=p."shopId"
    WHERE p."shopId"=${shopId}::uuid
      AND p."createdByUserId"=${userId}::uuid
      AND p."deletedAt" IS NULL
      AND p."status"='POSTED'
    GROUP BY p."id", s."name"
    ORDER BY p."createdAt" DESC
    LIMIT ${take}
  `;
}

export async function getOwnPurchase(shopId: string, userId: string, purchaseId: string) {
  const rows = await prisma.$queryRaw<Array<{
    id: string; supplierName: string | null; supplierInvoiceNumber: string | null; invoiceDate: Date; currency: string; total: Prisma.Decimal; notes: string | null;
  }>>`
    SELECT p."id", COALESCE(s."name", p."supplierNameSnapshot") AS "supplierName",
      p."supplierInvoiceNumber", p."invoiceDate", p."currency", p."total", p."notes"
    FROM "PurchaseInvoice" p
    LEFT JOIN "Supplier" s ON s."id"=p."supplierId" AND s."shopId"=p."shopId" AND s."deletedAt" IS NULL
    WHERE p."id"=${purchaseId}::uuid AND p."shopId"=${shopId}::uuid
      AND p."createdByUserId"=${userId}::uuid AND p."deletedAt" IS NULL
    LIMIT 1
  `;
  if (!rows[0]) return null;
  const items = await prisma.$queryRaw<Array<{ id: string; name: string; quantity: number; unitCost: Prisma.Decimal; lineTotal: Prisma.Decimal }>>`
    SELECT pi."id", COALESCE(i."name", pi."newItemName", 'صنف') AS "name",
      pi."orderedQuantity" AS "quantity", pi."unitCost", pi."lineTotal"
    FROM "PurchaseItem" pi
    LEFT JOIN "InventoryItem" i ON i."id"=pi."inventoryItemId" AND i."shopId"=pi."shopId"
    WHERE pi."shopId"=${shopId}::uuid AND pi."purchaseInvoiceId"=${purchaseId}::uuid
    ORDER BY pi."sortOrder" ASC
  `;
  return { ...rows[0], items };
}

export const salesEmployeePurchaseService = { listOwnPurchases, getOwnPurchase };

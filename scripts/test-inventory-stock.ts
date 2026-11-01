import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { listInventoryItems } from "../lib/services/inventoryService";
import { getDashboardMetrics } from "../lib/services/dashboardService";
import { softwareServiceService } from "../lib/services/softwareServiceService";
import { inventoryCategoryService } from "../lib/services/inventoryCategoryService";

async function main() {
  const rows = [
    { id: "used", quantity: 1, reorderLevel: 5, isDevice: true },
    { id: "new-sold", quantity: 0, reorderLevel: 0, isDevice: true },
    { id: "screen", quantity: 1, reorderLevel: 5, isDevice: false },
    { id: "cable", quantity: 20, reorderLevel: 5, isDevice: false },
  ];
  const original = { findMany: prisma.inventoryItem.findMany, shop: prisma.shop.findFirst, count: prisma.repairOrder.count, sale: prisma.sale.aggregate, invoice: prisma.invoice.aggregate, query: prisma.$queryRaw, software: softwareServiceService.getFinancialRows, categories: inventoryCategoryService.listInventoryItemIdsForCategory };
  try {
    prisma.inventoryItem.findMany = (async (args: { where: { shopId: string; isDevice?: boolean }; select?: Record<string, boolean> }) => {
      assert.equal(args.where.shopId, "shop-test");
      return rows.filter(row => args.where.isDevice === undefined || row.isDevice === args.where.isDevice).map(row => args.select ? Object.fromEntries(Object.entries(row).filter(([key]) => args.select?.[key])) : row);
    }) as unknown as typeof prisma.inventoryItem.findMany;
    inventoryCategoryService.listInventoryItemIdsForCategory = async () => null;
    prisma.shop.findFirst = (async () => ({ countryCode: "JO" })) as unknown as typeof prisma.shop.findFirst;
    prisma.repairOrder.count = (async () => 0) as typeof prisma.repairOrder.count;
    prisma.sale.aggregate = (async () => ({ _sum: { total: 0 } })) as unknown as typeof prisma.sale.aggregate;
    prisma.invoice.aggregate = (async () => ({ _sum: { balanceDue: 0 }, _count: { id: 0 } })) as unknown as typeof prisma.invoice.aggregate;
    prisma.$queryRaw = (async () => [{ totalOutstanding: 0 }]) as unknown as typeof prisma.$queryRaw;
    softwareServiceService.getFinancialRows = async () => [];
    assert.deepEqual((await listInventoryItems("shop-test", { lowStockOnly: true })).map(row => row.id), ["screen"]);
    assert.equal((await listInventoryItems("shop-test")).length, 4, "phones remain visible in normal inventory");
    assert.equal((await getDashboardMetrics("shop-test")).lowStockItemsCount, 1, "dashboard excludes both in-stock and sold phones");
    console.log("PASS low-stock services: tenant-scoped inventory filter and dashboard exclude individual phones while retaining ordinary stock alerts.");
  } finally {
    prisma.inventoryItem.findMany = original.findMany; prisma.shop.findFirst = original.shop;
    prisma.repairOrder.count = original.count; prisma.sale.aggregate = original.sale; prisma.invoice.aggregate = original.invoice;
    prisma.$queryRaw = original.query; softwareServiceService.getFinancialRows = original.software;
    inventoryCategoryService.listInventoryItemIdsForCategory = original.categories;
    await prisma.$disconnect();
  }
}
void main();

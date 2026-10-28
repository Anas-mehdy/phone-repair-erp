import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { calculateSaleLine, assertSaleCoversCost } from "../lib/sale-pricing";
import { saleCostWarning, saleGiftWarning } from "../lib/sale-cost-warning";
import { createSale, type CreateSaleLineItemInput } from "../lib/services/salesService";
import { updateOwnSaleQuantities } from "../lib/services/salesEmployeeService";
import { moneyAccountService } from "../lib/services/moneyAccountService";
import { sourceDebtService } from "../lib/services/sourceDebtService";

const d = (value: string | number) => new Prisma.Decimal(value);
const line = (price: string, quantity = 1, discountTotal = "0"): CreateSaleLineItemInput => ({ inventoryItemId: "item", description: "جهاز", quantity, unitPrice: price, discountTotal });

async function main() {
  // Exercise the real service functions with a transactional in-memory DB boundary.
  // No production database, authentication session, or payment provider is used.
  const original = {
    transaction: prisma.$transaction, count: prisma.sale.count,
    findUnique: prisma.sale.findUnique, findFirst: prisma.sale.findFirst,
    executeRaw: prisma.$executeRaw, executeRawUnsafe: prisma.$executeRawUnsafe,
    money: { ...moneyAccountService }, debt: sourceDebtService.createSourceDebtTx,
  };
  let cost: Prisma.Decimal | null = d(100);
  let stock = 30;
  let giftAllowed = false;
  let committedMovements: Array<Record<string, unknown>> = [];
  let moneyWrites = 0;
  let debtWrites = 0;
  let committedSales = 0;
  let committedItems: Array<Record<string, unknown>> = [];
  let editItems: Array<{ id: string; inventoryItemId: string; description: string; quantity: number; isGift?: boolean; unitPriceSnapshot: Prisma.Decimal; discountTotal: Prisma.Decimal }> = [];
  try {
    prisma.sale.count = (async () => 0) as typeof prisma.sale.count;
    prisma.sale.findUnique = (async () => null) as unknown as typeof prisma.sale.findUnique;
    prisma.sale.findFirst = (async () => ({ soldAt: new Date() })) as typeof prisma.sale.findFirst;
    prisma.$executeRaw = (async () => 1) as typeof prisma.$executeRaw;
    prisma.$executeRawUnsafe = (async () => 1) as typeof prisma.$executeRawUnsafe;
    moneyAccountService.prepareMoneyAccounts = async () => {};
    moneyAccountService.lockMoneyAccountEndpointsTx = async () => {};
    moneyAccountService.applyIncomingMoneyTx = (async () => { moneyWrites++; }) as typeof moneyAccountService.applyIncomingMoneyTx;
    moneyAccountService.applyOutgoingMoneyTx = (async () => { moneyWrites++; }) as typeof moneyAccountService.applyOutgoingMoneyTx;
    sourceDebtService.createSourceDebtTx = (async () => { debtWrites++; return "debt"; }) as typeof sourceDebtService.createSourceDebtTx;
    prisma.$transaction = (async (run: (tx: unknown) => Promise<unknown>) => {
      let nextStock = stock;
      let nextSales = committedSales;
      const nextItems: Array<Record<string, unknown>> = [];
      const nextMovements: Array<Record<string, unknown>> = [];
      const inventory = () => ({ id: "item", name: "جهاز", unitCost: cost, giftAllowed, quantity: nextStock, salePriceConfigured: true });
      const tx = {
        customer: { findFirst: async () => ({ id: "customer", name: "عميل" }) },
        invoice: { count: async () => 0 },
        sale: {
          create: async ({ data }: { data: Record<string, unknown> }) => { nextSales++; return { id: "sale", ...data }; },
          update: async ({ data }: { data: Record<string, unknown> }) => { nextItems.push({ kind: "sale", ...data }); },
        },
        saleItem: {
          create: async ({ data }: { data: Record<string, unknown> }) => { nextItems.push(data); return { id: "sale-item", ...data }; },
          findMany: async () => editItems,
          update: async ({ data }: { data: Record<string, unknown> }) => { nextItems.push({ kind: "item", ...data }); },
        },
        inventoryItem: {
          findFirst: async () => inventory(),
          update: async ({ data }: { data: { quantity: number } }) => { nextStock = data.quantity; },
        },
        inventoryMovement: { create: async ({ data }: { data: Record<string, unknown> }) => { nextMovements.push(data); } },
        $queryRaw: async (query: TemplateStringsArray) => {
          const sql = query.join("?");
          if (sql.includes('FROM "Sale"')) return [{ id: "sale", status: "COMPLETED", subtotal: d(220), total: d(205), receiptNumber: "test", customerId: null }];
          if (sql.includes('FROM "InventoryItem"')) return [inventory()];
          throw new Error("Unexpected query in isolated test");
        },
      };
      const result = await run(tx);
      // Commit only after the callback succeeds, just as Prisma does.
      stock = nextStock; committedSales = nextSales; committedItems = nextItems; committedMovements = nextMovements;
      return result;
    }) as typeof prisma.$transaction;

    async function rejected(items: CreateSaleLineItemInput[], pattern = /أقل من التكلفة/, debt = false) {
      const before = { stock, committedSales, moneyWrites, debtWrites };
      await assert.rejects(() => createSale("shop", "user", { items, ...(debt ? { customerId: "customer", paymentDestination: "DEBT" as const } : {}) }), pattern);
      assert.deepEqual({ stock, committedSales, moneyWrites, debtWrites }, before, "rejected sale must not commit stock, sales or financial writes");
    }

    await rejected([line("99.99")]);
    await rejected([line("110", 1, "15")]);
    await rejected([line("110", 2, "20.01")]);
    await rejected([line("500"), line("90")]); // Profit on another row cannot hide a loss.
    await rejected([line("90")], /أقل من التكلفة/, true); // Credit sales use the same rule.
    await rejected([line("1", 1, "2"), line("500")], /خصم البند/);
    cost = null;
    await rejected([line("500")], /غير مسجلة/);
    cost = d("100.000001");
    await rejected([line("100")]); // Six-decimal cost must never round down.
    await rejected([line("100.004")]); // Compare persisted cents, not submitted sub-cents.
    cost = d(100);
    await createSale("shop", "user", { items: [line("110", 2, "20")] });
    assert.equal(stock, 28);
    assert.equal(committedItems[0].lineTotal?.toString(), "200");
    assert.equal(committedItems[0].unitPriceSnapshot?.toString(), "110");
    assert.equal(moneyWrites, 1);
    await createSale("shop", "user", { items: [line("120")] });
    cost = d(0);
    await createSale("shop", "user", { items: [line("0")] }); // Explicit zero cost is known.
    cost = null;
    const manualStock = stock;
    await createSale("shop", "user", { items: [{ ...line("10"), inventoryItemId: null, description: "خدمة" }] });
    assert.equal(stock, manualStock); // Manual services remain independent of inventory.

    // A fixed line discount can turn a safe two-unit sale into a loss after
    // reducing quantity. Employee edits must recheck before stock or money writes.
    cost = d(100);
    editItems = [{ id: "sale-item", inventoryItemId: "item", description: "جهاز", quantity: 2, unitPriceSnapshot: d(110), discountTotal: d(15) }];
    let before = { stock, moneyWrites };
    await assert.rejects(() => updateOwnSaleQuantities("shop", "user", "sale", "UTC", [{ saleItemId: "sale-item", quantity: 1 }]), /أقل من التكلفة/);
    assert.deepEqual({ stock, moneyWrites }, before);
    editItems[0].unitPriceSnapshot = d(120);
    await updateOwnSaleQuantities("shop", "user", "sale", "UTC", [{ saleItemId: "sale-item", quantity: 1 }]);
    assert.equal(stock, before.stock + 1);
    assert.equal(committedItems.find((item) => item.kind === "item")?.discountTotal?.toString(), "15");
    cost = null;
    before = { stock, moneyWrites };
    await assert.rejects(() => updateOwnSaleQuantities("shop", "user", "sale", "UTC", [{ saleItemId: "sale-item", quantity: 3 }]), /غير مسجلة/);
    assert.deepEqual({ stock, moneyWrites }, before);
    cost = d(130); // Fetch current database cost, including changes after form load.
    await assert.rejects(() => updateOwnSaleQuantities("shop", "user", "sale", "UTC", [{ saleItemId: "sale-item", quantity: 3 }]), /أقل من التكلفة/);

    // Only explicit gift eligibility bypasses the cost floor. Price/discount
    // tampering cannot charge for a gift or erase its cost snapshot.
    await rejected([{ ...line("500"), isGift: true }], /غير مسموح/);
    giftAllowed = true;
    cost = d(100);
    await rejected([line("90")]);
    await rejected([{ ...line("0"), isGift: true, inventoryItemId: null }], /من المخزون/);
    cost = null;
    await rejected([{ ...line("0"), isGift: true }], /غير مسجلة/);
    cost = d(100);
    const beforeGift = stock;
    await createSale("shop", "user", { items: [{ ...line("999", 2, "9999"), isGift: true }] });
    assert.equal(stock, beforeGift - 2);
    assert.equal(committedItems[0].isGift, true);
    assert.equal(committedItems[0].unitPriceSnapshot?.toString(), "0");
    assert.equal(committedItems[0].discountTotal?.toString(), "0");
    assert.equal(committedItems[0].lineTotal?.toString(), "0");
    assert.equal(committedMovements[0].unitCostSnapshot?.toString(), "100");
    assert.equal(committedMovements[0].quantityChange, -2);
    assert.match(String(committedMovements[0].note), /هدية/);
    await createSale("shop", "user", { items: [line("120"), { ...line("0"), isGift: true }] });
    assert.equal(committedItems[0].lineTotal?.toString(), "120");
    assert.equal(committedItems[1].lineTotal?.toString(), "0");

    editItems = [{ id: "sale-item", inventoryItemId: "item", description: "هدية", quantity: 2, isGift: true, unitPriceSnapshot: d(0), discountTotal: d(0) }];
    giftAllowed = false;
    before = { stock, moneyWrites };
    await assert.rejects(() => updateOwnSaleQuantities("shop", "user", "sale", "UTC", [{ saleItemId: "sale-item", quantity: 3 }]), /غير مسموح/);
    assert.deepEqual({ stock, moneyWrites }, before);
    giftAllowed = true;
    await updateOwnSaleQuantities("shop", "user", "sale", "UTC", [{ saleItemId: "sale-item", quantity: 3 }]);
    assert.equal(stock, before.stock - 1);
    assert.equal(committedItems.find((item) => item.kind === "item")?.lineTotal?.toString(), "0");
    assert.equal(saleGiftWarning(false, "100") !== null, true);
    assert.equal(saleGiftWarning(true, "100"), null);
    assert.equal(saleGiftWarning(true, null) !== null, true);

    assert.equal(saleCostWarning("100", 1, "110", "15") !== null, true);
    assert.equal(saleCostWarning("100", 2, "110", "20"), null);
    assert.equal(saleCostWarning(null, 1, "500") !== null, true);
    assert.equal(saleCostWarning("0", 1, "0"), null);
    assert.equal(saleCostWarning("0.1", 3, "0.1"), null);
    assert.equal(saleCostWarning("100.000001", 1, "100") !== null, true);
    assert.throws(() => calculateSaleLine("NaN", 1), /غير صالح/);
    assert.throws(() => calculateSaleLine("100", 0), /غير صالح/);
    assert.throws(() => calculateSaleLine("100", 1, "-1"), /غير صالح/);
    assert.doesNotThrow(() => assertSaleCoversCost("جهاز", d("0.1"), 3, calculateSaleLine("0.1", 3).lineTotal));
    console.log("PASS sale cost floor and gifts: real sale and employee-edit services; permitted/rejected/manual gifts, zero prices, retained costs and gift edits; discounts, quantities, per-row loss, credit sales, current/missing/zero/six-decimal costs, stored cents, manual services and rejected-transaction effects (mock DB).");
  } finally {
    prisma.$transaction = original.transaction;
    prisma.sale.count = original.count;
    prisma.sale.findUnique = original.findUnique;
    prisma.sale.findFirst = original.findFirst;
    prisma.$executeRaw = original.executeRaw;
    prisma.$executeRawUnsafe = original.executeRawUnsafe;
    Object.assign(moneyAccountService, original.money);
    sourceDebtService.createSourceDebtTx = original.debt;
    await prisma.$disconnect();
  }
}
void main();

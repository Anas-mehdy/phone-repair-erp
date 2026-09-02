import { Prisma } from "@prisma/client";
import { cashDrawerService } from "@/lib/services/cashDrawerService";
import { financialTransferService } from "@/lib/services/financialTransferService";

export type MoneyAccountDestination = "DRAWER" | "WALLET" | "OTHER";

function decimal(value: string | number | Prisma.Decimal) {
  return new Prisma.Decimal(String(value).replace(",", "."));
}

export async function prepareMoneyAccounts(shopId: string, destination: MoneyAccountDestination) {
  if (destination === "DRAWER") {
    await cashDrawerService.getSnapshot(shopId, 1);
  } else if (destination === "WALLET") {
    await financialTransferService.listWallets(shopId);
  }
}

export async function applyIncomingMoneyTx(
  tx: Prisma.TransactionClient,
  shopId: string,
  userId: string | null,
  input: {
    destination: MoneyAccountDestination;
    walletId?: string;
    amount: string | number | Prisma.Decimal;
    reference?: string | null;
    description: string;
    drawerType: "INVOICE_PAYMENT" | "SALE_CASH";
  },
) {
  const amount = decimal(input.amount);
  if (amount.lte(0) || input.destination === "OTHER") return input.destination === "OTHER" ? null : undefined;

  if (input.destination === "DRAWER") {
    const drawerRows = await tx.$queryRaw<Array<{ id: string; currentBalance: Prisma.Decimal }>>`
      SELECT "id", "currentBalance" FROM "CashDrawer"
      WHERE "shopId" = ${shopId}::uuid FOR UPDATE
    `;
    const drawer = drawerRows[0];
    if (!drawer) throw new Error("الدرج النقدي غير موجود.");
    const next = drawer.currentBalance.add(amount);
    await tx.$executeRaw`UPDATE "CashDrawer" SET "currentBalance" = ${next}, "updatedAt" = NOW() WHERE "id" = ${drawer.id}::uuid`;
    await tx.$executeRaw`
      INSERT INTO "CashDrawerMovement" ("shopId", "drawerId", "createdByUserId", "type", "direction", "amount", "description", "reference")
      VALUES (${shopId}::uuid, ${drawer.id}::uuid, ${userId}::uuid, ${input.drawerType}, 'IN', ${amount}, ${input.description}, ${input.reference ?? null})
    `;
    return "الدرج النقدي";
  }

  if (!input.walletId) throw new Error("اختر المحفظة التي استلمت المبلغ.");
  const walletRows = await tx.$queryRaw<Array<{ id: string; name: string; currentBalance: Prisma.Decimal }>>`
    SELECT "id", "name", "currentBalance" FROM "FinancialWallet"
    WHERE "id" = ${input.walletId}::uuid AND "shopId" = ${shopId}::uuid AND "deletedAt" IS NULL AND "isActive" = TRUE FOR UPDATE
  `;
  const wallet = walletRows[0];
  if (!wallet) throw new Error("المحفظة المحددة غير موجودة.");
  const next = wallet.currentBalance.add(amount);
  await tx.$executeRaw`UPDATE "FinancialWallet" SET "currentBalance" = ${next}, "updatedAt" = NOW() WHERE "id" = ${wallet.id}::uuid`;
  await tx.$executeRaw`
    INSERT INTO "FinancialTransfer" ("shopId", "walletId", "createdByUserId", "operationType", "amount", "walletAmount", "commission", "commissionMode", "isDeferred", "notes")
    VALUES (${shopId}::uuid, ${wallet.id}::uuid, ${userId}::uuid, 'WALLET_TOPUP', ${amount}, ${amount}, 0, 'NONE', FALSE, ${input.description})
  `;
  return wallet.name;
}

export async function applyOutgoingMoneyTx(
  tx: Prisma.TransactionClient,
  shopId: string,
  userId: string | null,
  input: {
    destination: Exclude<MoneyAccountDestination, "OTHER">;
    walletId?: string;
    amount: string | number | Prisma.Decimal;
    reference?: string | null;
    description: string;
  },
) {
  const amount = decimal(input.amount);
  if (amount.lte(0)) return;

  if (input.destination === "DRAWER") {
    const drawerRows = await tx.$queryRaw<Array<{ id: string; currentBalance: Prisma.Decimal }>>`
      SELECT "id", "currentBalance" FROM "CashDrawer"
      WHERE "shopId" = ${shopId}::uuid FOR UPDATE
    `;
    const drawer = drawerRows[0];
    if (!drawer) throw new Error("الدرج النقدي غير موجود.");
    const next = drawer.currentBalance.sub(amount);
    if (next.lt(0)) throw new Error("رصيد الدرج غير كافٍ لإرجاع الباقي.");
    await tx.$executeRaw`UPDATE "CashDrawer" SET "currentBalance" = ${next}, "updatedAt" = NOW() WHERE "id" = ${drawer.id}::uuid`;
    await tx.$executeRaw`
      INSERT INTO "CashDrawerMovement" ("shopId", "drawerId", "createdByUserId", "type", "direction", "amount", "description", "reference")
      VALUES (${shopId}::uuid, ${drawer.id}::uuid, ${userId}::uuid, 'CHANGE_RETURN', 'OUT', ${amount}, ${input.description}, ${input.reference ?? null})
    `;
    return;
  }

  if (!input.walletId) throw new Error("اختر محفظة إرجاع الباقي.");
  const walletRows = await tx.$queryRaw<Array<{ id: string; name: string; currentBalance: Prisma.Decimal }>>`
    SELECT "id", "name", "currentBalance" FROM "FinancialWallet"
    WHERE "id" = ${input.walletId}::uuid AND "shopId" = ${shopId}::uuid AND "deletedAt" IS NULL AND "isActive" = TRUE FOR UPDATE
  `;
  const wallet = walletRows[0];
  if (!wallet) throw new Error("محفظة إرجاع الباقي غير موجودة.");
  const next = wallet.currentBalance.sub(amount);
  if (next.lt(0)) throw new Error(`رصيد محفظة ${wallet.name} غير كافٍ لإرجاع الباقي.`);
  await tx.$executeRaw`UPDATE "FinancialWallet" SET "currentBalance" = ${next}, "updatedAt" = NOW() WHERE "id" = ${wallet.id}::uuid`;
  await tx.$executeRaw`
    INSERT INTO "FinancialTransfer" ("shopId", "walletId", "createdByUserId", "operationType", "amount", "walletAmount", "commission", "commissionMode", "isDeferred", "notes")
    VALUES (${shopId}::uuid, ${wallet.id}::uuid, ${userId}::uuid, 'WALLET_WITHDRAWAL', ${amount}, ${amount}, 0, 'NONE', FALSE, ${input.description})
  `;
}

export const moneyAccountService = {
  prepareMoneyAccounts,
  applyIncomingMoneyTx,
  applyOutgoingMoneyTx,
};

import { InstallmentPlanStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CustomerDebtOverview = {
  accountExists: boolean;
  balance: number;
  totalDebt: number;
  totalCollected: number;
  entryCount: number;
  lastActivityAt: Date | null;
  entries: Array<{
    id: string;
    type: string;
    amount: number;
    occurredAt: Date;
    description: string | null;
    reference: string | null;
    sourceName: string | null;
    isReversed: boolean;
  }>;
};

export type CustomerInstallmentOverview = {
  plans: Array<{
    id: string;
    planNumber: string;
    title: string;
    status: InstallmentPlanStatus;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    firstDueAt: Date;
    completedAt: Date | null;
    invoiceNumber: string | null;
    nextDueAt: Date | null;
    nextDueAmount: number | null;
  }>;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  activeCount: number;
};

export async function getCustomerDebtOverview(
  shopId: string,
  customerId: string,
): Promise<CustomerDebtOverview> {
  const summaryRows = await prisma.$queryRaw<Array<{
    accountExists: boolean;
    balance: Prisma.Decimal | number | string;
    totalDebt: Prisma.Decimal | number | string;
    totalCollected: Prisma.Decimal | number | string;
    entryCount: bigint | number | string;
    lastActivityAt: Date | null;
  }>>`
    SELECT
      EXISTS (
        SELECT 1 FROM "DebtLedgerAccount" a
        WHERE a."shopId" = ${shopId}::uuid AND a."customerId" = ${customerId}::uuid
      ) AS "accountExists",
      COALESCE(SUM(CASE
        WHEN e."isReversed" THEN 0
        WHEN e."type" IN ('DEBT','OPENING_BALANCE','ADJUSTMENT_DEBIT') THEN e."amount"
        WHEN e."type" IN ('PAYMENT','ADJUSTMENT_CREDIT') THEN -e."amount"
        ELSE 0 END), 0) AS balance,
      COALESCE(SUM(CASE
        WHEN e."isReversed" = FALSE AND e."type" IN ('DEBT','OPENING_BALANCE','ADJUSTMENT_DEBIT') THEN e."amount"
        ELSE 0 END), 0) AS "totalDebt",
      COALESCE(SUM(CASE
        WHEN e."isReversed" = FALSE AND e."type" IN ('PAYMENT','ADJUSTMENT_CREDIT') THEN e."amount"
        ELSE 0 END), 0) AS "totalCollected",
      COUNT(e."id") FILTER (WHERE e."isReversed" = FALSE) AS "entryCount",
      MAX(e."occurredAt") FILTER (WHERE e."isReversed" = FALSE) AS "lastActivityAt"
    FROM "DebtLedgerEntry" e
    WHERE e."shopId" = ${shopId}::uuid
      AND e."customerId" = ${customerId}::uuid
  `;

  const entryRows = await prisma.$queryRaw<Array<{
    id: string;
    type: string;
    amount: Prisma.Decimal | number | string;
    occurredAt: Date;
    description: string | null;
    reference: string | null;
    sourceName: string | null;
    isReversed: boolean;
  }>>`
    SELECT
      e."id", e."type", e."amount", e."occurredAt", e."description",
      e."reference", COALESCE(e."sourceName", e."paymentMethod") AS "sourceName", e."isReversed"
    FROM "DebtLedgerEntry" e
    WHERE e."shopId" = ${shopId}::uuid
      AND e."customerId" = ${customerId}::uuid
    ORDER BY e."occurredAt" DESC, e."createdAt" DESC
    LIMIT 12
  `;

  const row = summaryRows[0];
  return {
    accountExists: Boolean(row?.accountExists),
    balance: Math.max(0, Number(row?.balance ?? 0)),
    totalDebt: Number(row?.totalDebt ?? 0),
    totalCollected: Number(row?.totalCollected ?? 0),
    entryCount: Number(row?.entryCount ?? 0),
    lastActivityAt: row?.lastActivityAt ?? null,
    entries: entryRows.map((entry) => ({ ...entry, amount: Number(entry.amount) })),
  };
}

export async function getCustomerInstallmentOverview(
  shopId: string,
  customerId: string,
): Promise<CustomerInstallmentOverview> {
  const plans = await prisma.installmentPlan.findMany({
    where: { shopId, customerId, deletedAt: null },
    select: {
      id: true,
      planNumber: true,
      title: true,
      status: true,
      totalAmount: true,
      amountPaid: true,
      balanceDue: true,
      firstDueAt: true,
      completedAt: true,
      invoice: { select: { invoiceNumber: true } },
      schedules: {
        where: { status: { not: "PAID" } },
        orderBy: [{ dueAt: "asc" }, { installmentNo: "asc" }],
        take: 1,
        select: { dueAt: true, amount: true, amountPaid: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const normalized = plans.map((plan) => {
    const next = plan.schedules[0];
    return {
      id: plan.id,
      planNumber: plan.planNumber,
      title: plan.title,
      status: plan.status,
      totalAmount: Number(plan.totalAmount),
      amountPaid: Number(plan.amountPaid),
      balanceDue: Number(plan.balanceDue),
      firstDueAt: plan.firstDueAt,
      completedAt: plan.completedAt,
      invoiceNumber: plan.invoice?.invoiceNumber ?? null,
      nextDueAt: next?.dueAt ?? null,
      nextDueAmount: next ? Math.max(0, Number(next.amount) - Number(next.amountPaid)) : null,
    };
  });

  return {
    plans: normalized,
    totalAmount: normalized.reduce((sum, plan) => sum + plan.totalAmount, 0),
    amountPaid: normalized.reduce((sum, plan) => sum + plan.amountPaid, 0),
    balanceDue: normalized.reduce((sum, plan) => sum + plan.balanceDue, 0),
    activeCount: normalized.filter((plan) => plan.status === InstallmentPlanStatus.ACTIVE).length,
  };
}

export const customerOverviewService = {
  getCustomerDebtOverview,
  getCustomerInstallmentOverview,
};

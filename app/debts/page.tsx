import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { getDebtDashboard } from "@/lib/services/debtLedgerService";
import { getDebtAgingSummary } from "@/lib/services/debtAgingService";
import { DebtDashboard } from "./_debt-dashboard";

export const dynamic = "force-dynamic";

export default async function DebtsPage() {
  const auth = await requirePermission("debts:manage");

  const [dashboard, aging, customers] = await Promise.all([
    getDebtDashboard(),
    getDebtAgingSummary(),
    prisma.customer.findMany({
      where: { shopId: auth.shop.id, deletedAt: null },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <DebtDashboard
      customers={customers}
      rows={dashboard.customers.map((row) => ({
        ...row,
        lastActivityAt: row.lastActivityAt?.toISOString() ?? null,
        oldestDebtAt: row.oldestDebtAt?.toISOString() ?? null,
      }))}
      totalOutstanding={dashboard.totalOutstanding}
      debtorCount={dashboard.debtorCount}
      collectedThisMonth={dashboard.collectedThisMonth}
      aging={aging}
      currency={auth.shop.currency || "SAR"}
    />
  );
}

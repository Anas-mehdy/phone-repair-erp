import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { getDebtDashboardWithHistory } from "@/lib/services/debtDashboardHistoryService";
import { getDebtAgingSummary } from "@/lib/services/debtAgingService";
import { timeZoneForCountry } from "@/lib/timezone";
import { DebtDashboard } from "./_debt-dashboard";
import { OnboardingDebtForm } from "./_onboarding-debt-form";

export const dynamic = "force-dynamic";

export default async function DebtsPage({ searchParams }: { searchParams: Promise<{ onboarding?: string }> }) {
  const auth = await requirePermission("debts:manage");
  const query = await searchParams;

  if (query.onboarding === "1") {
    const customers = await prisma.customer.findMany({
      where: { shopId: auth.shop.id, deletedAt: null },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    });
    return (
      <div className="pb-8 pt-1">
        <OnboardingDebtForm customers={customers} currency={auth.shop.currency || "SAR"} />
      </div>
    );
  }

  const [dashboard, aging, customers] = await Promise.all([
    getDebtDashboardWithHistory(),
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
      timeZone={timeZoneForCountry(auth.shop.countryCode)}
    />
  );
}

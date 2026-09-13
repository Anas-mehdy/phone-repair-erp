import { ArrowDownLeft, Banknote, Landmark, WalletCards, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { can, requirePermission } from "@/lib/auth/context";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { bankAccountService } from "@/lib/services/bankAccountService";
import { cashDrawerService } from "@/lib/services/cashDrawerService";
import { financialTransferService } from "@/lib/services/financialTransferService";
import { dateInputValueForTimeZone, timeZoneForCountry } from "@/lib/timezone";
import { resolveExpenseRange, type ExpenseSearchParams } from "./_range";
import { ExpenseForm } from "./_expense-form";
import { categoryLabels, ExpenseTable } from "./_expense-table";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<ExpenseSearchParams> }) {
  const params = await searchParams;
  const auth = await requirePermission("reports:read");
  const timeZone = timeZoneForCountry(auth.shop.countryCode);
  const range = resolveExpenseRange(params, timeZone);
  const canManageExpenses = can(auth, "expenses:manage");
  const expenseWhere = { shopId: auth.shop.id, deletedAt: null, spentAt: { gte: range.start, lt: range.end } } as const;

  const [expenses, aggregate, sourceGroups, wallets, bankAccounts, drawer] = await Promise.all([
    prisma.expense.findMany({
      where: expenseWhere,
      include: { createdByUser: { select: { name: true } } },
      orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
      take: 300,
    }),
    prisma.expense.aggregate({ where: expenseWhere, _sum: { amount: true }, _count: { _all: true } }),
    prisma.expense.groupBy({ by: ["fundingSource"], where: expenseWhere, _sum: { amount: true } }),
    financialTransferService.listWallets(auth.shop.id).catch(() => []),
    bankAccountService.listAccounts(auth.shop.id, { includeInactive: true }).catch(() => []),
    cashDrawerService.getSnapshot(auth.shop.id, 1).catch(() => null),
  ]);

  const currency = auth.shop.currency || "SAR";
  const total = Number(aggregate._sum.amount ?? 0);
  const count = aggregate._count._all;
  const rangeLastInstant = new Date(range.end.getTime() - 1);
  const rangeStartInput = dateInputValueForTimeZone(range.start, timeZone);
  const rangeEndInput = dateInputValueForTimeZone(rangeLastInstant, timeZone);
  const todayInput = dateInputValueForTimeZone(new Date(), timeZone);
  const sourceTotals = new Map(sourceGroups.map((row) => [row.fundingSource, Number(row._sum.amount ?? 0)]));

  return (
    <div className="space-y-7 pb-10">
      <PageHeader
        eyebrow="المالية • المصروفات"
        title="المصروفات"
        description="سجل المصروفات التشغيلية ومصدر سحب كل مصروف، مع تأثيره المباشر على صافي الربح والسيولة."
        actions={<Button asChild variant="outline" className="rounded-xl font-black"><Link href="/reports">العودة للتقارير والأرباح</Link></Button>}
      />

      {(params.expenseSaved || params.expenseDeleted) ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-200">
          {params.expenseSaved ? "تم حفظ المصروف وتحديث الأرصدة والأرباح." : "تم حذف المصروف وعكس حركته المالية بأمان."}
        </div>
      ) : null}

      <section className="erp-filter-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-black text-slate-800 dark:text-slate-100">الفترة: {range.label}</p><p className="mt-1 text-[10px] font-bold text-slate-400">من {formatDate(range.start, timeZone)} إلى {formatDate(rangeLastInstant, timeZone)}</p></div>
          <div className="flex flex-wrap gap-2">
            {[["today", "اليوم"], ["week", "7 أيام"], ["month", "هذا الشهر"], ["year", "هذه السنة"]].map(([value, label]) => (
              <Button key={value} asChild size="sm" variant={range.preset === value ? "default" : "outline"} className="rounded-xl text-xs font-bold"><Link href={`/expenses?preset=${value}`}>{label}</Link></Button>
            ))}
          </div>
        </div>
        <form className="grid gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <input type="hidden" name="preset" value="custom" />
          <label className="grid gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">من تاريخ<input className="erp-input" type="date" name="start" defaultValue={rangeStartInput} required /></label>
          <label className="grid gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">إلى تاريخ<input className="erp-input" type="date" name="end" defaultValue={rangeEndInput} required /></label>
          <Button type="submit" className="h-11 rounded-xl font-bold">عرض الفترة</Button>
        </form>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ExpenseMetric label="إجمالي المصروفات" value={formatCurrency(total, currency)} helper={`${count} حركة ضمن الفترة`} icon={ArrowDownLeft} emphasized />
        <ExpenseMetric label="من الدرج النقدي" value={formatCurrency(sourceTotals.get("DRAWER") ?? 0, currency)} helper="إجمالي ما سُحب من الكاش" icon={Banknote} />
        <ExpenseMetric label="من المحافظ" value={formatCurrency(sourceTotals.get("WALLET") ?? 0, currency)} helper="إجمالي ما سُحب من المحافظ" icon={WalletCards} />
        <ExpenseMetric label="من الحسابات البنكية" value={formatCurrency(sourceTotals.get("BANK") ?? 0, currency)} helper="إجمالي ما سُحب من البنوك" icon={Landmark} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <ExpenseTable
          expenses={expenses}
          total={total}
          count={count}
          currency={currency}
          timeZone={timeZone}
          bankAccounts={bankAccounts}
          canManageExpenses={canManageExpenses}
          selectedExpenseId={params.expense}
        />

        {canManageExpenses ? (
          <ExpenseForm
            categories={Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))}
            wallets={wallets.map((wallet) => ({ id: wallet.id, name: wallet.name, balance: Number(wallet.currentBalance) }))}
            bankAccounts={bankAccounts.filter((account) => account.isActive).map((account) => ({ id: account.id, name: account.name, bankName: account.bankName, balance: Number(account.currentBalance) }))}
            currency={currency}
            todayInput={todayInput}
            drawerBalance={drawer?.currentBalance ?? null}
          />
        ) : (
          <div className="erp-section h-fit text-xs font-bold leading-6 text-slate-500">لديك صلاحية مشاهدة المصروفات فقط. إضافة أو حذف المصروفات تتطلب صلاحية إدارة المصروفات.</div>
        )}
      </section>
    </div>
  );
}

function ExpenseMetric({ label, value, helper, icon: Icon, emphasized = false }: { label: string; value: string; helper: string; icon: LucideIcon; emphasized?: boolean }) {
  return <div className={`rounded-2xl border p-5 shadow-sm ${emphasized ? "border-rose-200 bg-rose-50/62 dark:border-rose-900/62 dark:bg-rose-950/20" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-black text-slate-600 dark:text-slate-300">{label}</p><p className={`mt-2 font-numeric text-xl font-black ${emphasized ? "text-rose-700 dark:text-rose-300" : "text-slate-950 dark:text-slate-50"}`}>{value}</p><p className="mt-2 text-[9px] font-bold text-slate-400">{helper}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800"><Icon className="h-5 w-5" /></span></div></div>;
}

import { ExpenseCategory } from "@prisma/client";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Boxes,
  CircleDollarSign,
  Landmark,
  Plus,
  ReceiptText,
  Trash2,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { can, requirePermission } from "@/lib/auth/context";
import { formatCurrency, formatDate } from "@/lib/format";
import { getInventoryDamageReportSummary } from "@/lib/services/inventoryDamageReportService";
import { reportService } from "@/lib/services/reportService";
import { getTransferCommissionReportSummary } from "@/lib/services/transferCommissionReportService";
import { createExpenseAction, deleteExpenseAction } from "./actions";

export const dynamic = "force-dynamic";

const categoryLabels: Record<ExpenseCategory, string> = {
  RENT: "إيجار",
  SALARIES: "رواتب وأجور",
  UTILITIES: "كهرباء وإنترنت وخدمات",
  MARKETING: "تسويق وإعلانات",
  TRANSPORT: "نقل وتوصيل",
  MAINTENANCE: "صيانة وتجهيزات",
  OTHER: "مصروف آخر",
};

type ReportsPageProps = {
  searchParams: Promise<{
    preset?: string;
    start?: string;
    end?: string;
    expenseSaved?: string;
    expenseDeleted?: string;
  }>;
};

function dateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function resolveRange(params: Awaited<ReportsPageProps["searchParams"]>) {
  const now = new Date();
  const tomorrow = addDays(startOfUtcDay(now), 1);
  const preset = ["today", "week", "month", "year", "custom"].includes(params.preset ?? "")
    ? params.preset!
    : "month";

  if (preset === "today") {
    return { preset, start: addDays(tomorrow, -1), end: tomorrow, label: "اليوم" };
  }
  if (preset === "week") {
    return { preset, start: addDays(tomorrow, -7), end: tomorrow, label: "آخر 7 أيام" };
  }
  if (preset === "year") {
    return {
      preset,
      start: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)),
      end: tomorrow,
      label: "هذه السنة",
    };
  }
  if (preset === "custom" && params.start && params.end) {
    const start = new Date(`${params.start}T00:00:00.000Z`);
    const end = addDays(new Date(`${params.end}T00:00:00.000Z`), 1);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start < end) {
      return { preset, start, end, label: "فترة مخصصة" };
    }
  }

  return {
    preset: "month",
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: tomorrow,
    label: "هذا الشهر",
  };
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const auth = await requirePermission("reports:read");
  const range = resolveRange(params);
  const [report, damageSummary, transferCommission] = await Promise.all([
    reportService.getFinancialReport(auth.shop.id, range),
    getInventoryDamageReportSummary(auth.shop.id, range.start, range.end),
    getTransferCommissionReportSummary(auth.shop.id, range.start, range.end),
  ]);
  const currency = auth.shop.currency || "SAR";
  const canManageExpenses = can(auth, "expenses:manage");
  const maxMix = Math.max(...report.revenueMix.map((item) => item.value), 1);
  const maxSource = Math.max(...report.paymentSources.map((item) => item.value), 1);
  const grossProfit = Math.round((report.metrics.grossProfit + transferCommission.totalProfit + Number.EPSILON) * 100) / 100;
  const netProfit = Math.round((report.metrics.netProfit + transferCommission.totalProfit + Number.EPSILON) * 100) / 100;
  const profitBase = report.metrics.netRevenueBeforeTax + transferCommission.totalProfit;
  const profitMargin = profitBase > 0 ? Math.round(((netProfit / profitBase) * 100 + Number.EPSILON) * 100) / 100 : 0;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="المالية في صورة واضحة"
        title="التقارير والأرباح"
        description="المبيعات والمقبوضات والمستحقات وتكلفة القطع والمصروفات وعمولات التحويلات، بدون احتساب المبلغ مرتين."
      />

      {(params.expenseSaved || params.expenseDeleted) && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
          {params.expenseSaved ? "تم حفظ المصروف وتحديث الأرباح." : "تم حذف المصروف وتحديث التقرير."}
        </div>
      )}

      <section className="erp-filter-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-slate-800">الفترة المعروضة: {range.label}</p>
            <p className="mt-1 text-[10px] font-bold text-slate-400">
              من {formatDate(range.start)} إلى {formatDate(addDays(range.end, -1))}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["today", "اليوم"],
              ["week", "7 أيام"],
              ["month", "هذا الشهر"],
              ["year", "هذه السنة"],
            ].map(([value, label]) => (
              <Button key={value} asChild size="sm" variant={range.preset === value ? "default" : "outline"} className="rounded-xl text-xs font-bold">
                <Link href={`/reports?preset=${value}`}>{label}</Link>
              </Button>
            ))}
          </div>
        </div>

        <form className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <input type="hidden" name="preset" value="custom" />
          <label className="grid gap-1.5 text-xs font-bold text-slate-600">
            من تاريخ
            <input className="erp-input" type="date" name="start" defaultValue={dateInput(range.start)} required />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-slate-600">
            إلى تاريخ
            <input className="erp-input" type="date" name="end" defaultValue={dateInput(addDays(range.end, -1))} required />
          </label>
          <Button type="submit" className="h-11 rounded-xl font-bold">عرض الفترة</Button>
        </form>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="إجمالي المبيعات" helper="شامل الضريبة إن وجدت" value={formatCurrency(report.metrics.grossRevenue, currency)} icon={ReceiptText} tone="indigo" />
        <MetricCard label="المقبوض فعلياً" helper="دخل الصندوق ووسائل الدفع" value={formatCurrency(report.metrics.collected, currency)} icon={Banknote} tone="emerald" />
        <MetricCard label="المتبقي عند العملاء" helper="فواتير وخطط هذه الفترة" value={formatCurrency(report.metrics.outstanding, currency)} icon={Wallet} tone="amber" />
        <MetricCard label="تكلفة القطع المستخدمة" helper="مخزون وقطع صيانة خارجية" value={formatCurrency(report.metrics.directCosts, currency)} icon={Boxes} tone="rose" />
        <MetricCard label="إجمالي التوالف" helper={`${damageSummary.movementCount} حركة تالف — لا تؤثر على الربح`} value={formatCurrency(damageSummary.totalValue, currency)} icon={Boxes} tone="rose" />
        <MetricCard label="ربح التحويلات" helper={`${transferCommission.operationCount} عملية بعمولة — دون أصل مبلغ التحويل`} value={formatCurrency(transferCommission.totalProfit, currency)} icon={ArrowLeftRight} tone="teal" />
        <MetricCard label="مجمل الربح" helper="يشمل عمولات التحويلات وقبل المصروفات" value={formatCurrency(grossProfit, currency)} icon={TrendingUp} tone={grossProfit >= 0 ? "teal" : "rose"} />
        <MetricCard label="المصروفات" helper={`${report.counts.expenses} حركة مصروف`} value={formatCurrency(report.metrics.expenseTotal, currency)} icon={ArrowDownLeft} tone="orange" />
        <MetricCard label="صافي الربح" helper={`هامش ${profitMargin.toFixed(1)}%`} value={formatCurrency(netProfit, currency)} icon={CircleDollarSign} tone={netProfit >= 0 ? "emerald" : "rose"} featured />
        <MetricCard label="قيمة المخزون الحالية" helper="بسعر التكلفة وليس البيع" value={formatCurrency(report.metrics.inventoryValue, currency)} icon={Landmark} tone="slate" />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <BreakdownCard
          title="من أين جاءت المبيعات؟"
          description="تفصيل يمنع تكرار البيع عند إصدار فاتورة له"
          items={report.revenueMix}
          max={maxMix}
          currency={currency}
          empty="لا توجد مبيعات في هذه الفترة."
        />
        <BreakdownCard
          title="مصادر الأموال المقبوضة"
          description="نقدي، بطاقة، تحويل أو مصدر مخصص"
          items={report.paymentSources}
          max={maxSource}
          currency={currency}
          empty="لا توجد دفعات في هذه الفترة."
        />
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">سجل المصروفات</h3>
              <p className="mt-1 text-[10px] font-bold text-slate-400">المصروفات المسجلة ضمن الفترة المعروضة</p>
            </div>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-[10px] font-black text-rose-700">
              {formatCurrency(report.metrics.expenseTotal, currency)}
            </span>
          </div>
          {report.expenses.length === 0 ? (
            <div className="p-10 text-center text-xs font-bold text-slate-400">لا توجد مصروفات مسجلة في هذه الفترة.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="erp-table min-w-[700px]">
                <thead><tr><th>المصروف</th><th>الفئة</th><th>التاريخ</th><th>المبلغ</th><th>أضيف بواسطة</th>{canManageExpenses && <th>إجراء</th>}</tr></thead>
                <tbody>
                  {report.expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td><div className="font-black text-slate-800">{expense.title}</div>{expense.notes && <div className="mt-1 max-w-xs truncate text-[10px] text-slate-400">{expense.notes}</div>}</td>
                      <td>{categoryLabels[expense.category]}</td>
                      <td>{formatDate(expense.spentAt)}</td>
                      <td className="font-numeric font-black text-rose-700">{formatCurrency(expense.amount, currency)}</td>
                      <td>{expense.createdByUser?.name || "-"}</td>
                      {canManageExpenses && <td><form action={deleteExpenseAction}><input type="hidden" name="expenseId" value={expense.id} /><Button type="submit" size="sm" variant="outline" className="rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5 ml-1" />حذف</Button></form></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {canManageExpenses && (
          <form action={createExpenseAction} className="erp-section h-fit space-y-4 xl:sticky xl:top-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="flex items-center gap-2 text-sm font-black text-slate-900"><Plus className="h-4 w-4 text-primary" />تسجيل مصروف</h3>
              <p className="mt-1 text-[10px] font-bold text-slate-400">يُطرح مباشرة من صافي الربح.</p>
            </div>
            <label className="grid gap-1.5 text-xs font-bold text-slate-700">اسم المصروف<input name="title" className="erp-input" placeholder="مثال: إيجار المحل" required /></label>
            <label className="grid gap-1.5 text-xs font-bold text-slate-700">الفئة<select name="category" className="erp-input" defaultValue="OTHER">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-xs font-bold text-slate-700">المبلغ<input name="amount" className="erp-input font-numeric" type="number" min="0.01" step="0.01" required /></label>
              <label className="grid gap-1.5 text-xs font-bold text-slate-700">التاريخ<input name="spentAt" className="erp-input font-numeric" type="date" defaultValue={dateInput(new Date())} required /></label>
            </div>
            <label className="grid gap-1.5 text-xs font-bold text-slate-700">ملاحظات<textarea name="notes" className="erp-textarea" rows={3} placeholder="اختياري" /></label>
            <Button type="submit" className="h-11 w-full rounded-xl font-black"><Plus className="h-4 w-4 ml-1.5" />حفظ المصروف</Button>
          </form>
        )}
      </section>

      <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-[11px] font-bold leading-6 text-sky-900">
        <strong>كيف نقرأ الأرقام؟</strong> المبيعات ليست هي المقبوضات. الربح يحسب من قيمة البيع قبل الضريبة ناقص تكلفة القطع، وتضاف إليه عمولات التحويلات كربح مستقل دون احتساب أصل مبلغ التحويل، ثم تُطرح المصروفات للوصول إلى صافي الربح. مبيعات POS غير المفوترة تعتبر مقبوضة مباشرة، بينما الفواتير تعتمد على الدفعات المسجلة.
      </div>
    </div>
  );
}

type Tone = "indigo" | "emerald" | "amber" | "rose" | "teal" | "orange" | "slate";

const toneClasses: Record<Tone, string> = {
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  rose: "bg-rose-50 text-rose-700 border-rose-100",
  teal: "bg-teal-50 text-teal-700 border-teal-100",
  orange: "bg-orange-50 text-orange-700 border-orange-100",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
};

function MetricCard({ label, helper, value, icon: Icon, tone, featured = false }: { label: string; helper: string; value: string; icon: LucideIcon; tone: Tone; featured?: boolean }) {
  return <div className={`rounded-2xl border p-5 shadow-sm ${featured ? "ring-2 ring-emerald-500/15" : ""} ${toneClasses[tone]}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-black opacity-80">{label}</p><p className="mt-2 break-words font-numeric text-xl font-black text-slate-900">{value}</p><p className="mt-2 text-[10px] font-bold opacity-70">{helper}</p></div><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm"><Icon className="h-5 w-5" /></div></div></div>;
}

function BreakdownCard({ title, description, items, max, currency, empty }: { title: string; description: string; items: Array<{ label: string; value: number }>; max: number; currency: string; empty: string }) {
  const visible = items.filter((item) => item.value > 0);
  return <section className="erp-section"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black text-slate-900">{title}</h3><p className="mt-1 text-[10px] font-bold text-slate-400">{description}</p></div><ArrowUpRight className="h-5 w-5 text-primary" /></div>{visible.length === 0 ? <p className="py-10 text-center text-xs font-bold text-slate-400">{empty}</p> : <div className="mt-6 space-y-4">{visible.map((item) => <div key={item.label}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="font-bold text-slate-700">{item.label}</span><span className="font-numeric font-black text-slate-900">{formatCurrency(item.value, currency)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-l from-primary to-indigo-500" style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }} /></div></div>)}</div>}</section>;
}

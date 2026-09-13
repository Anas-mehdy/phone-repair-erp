import { ExpenseCategory } from "@prisma/client";
import { ReceiptText, Save } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/context";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { localDateString, timeZoneForCountry } from "@/lib/timezone";
import { createSalesEmployeeExpenseAction } from "../actions";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ saved?: string }> };
const categoryLabel: Record<ExpenseCategory, string> = {
  RENT: "إيجار", SALARIES: "رواتب", UTILITIES: "خدمات وفواتير", MARKETING: "تسويق", TRANSPORT: "نقل", MAINTENANCE: "صيانة", OTHER: "أخرى",
};

export default async function EmployeeExpensesPage({ searchParams }: Props) {
  const auth = await requirePermission("expenses:read_own");
  const query = await searchParams;
  const expenses = await prisma.expense.findMany({
    where: { shopId: auth.shop.id, createdByUserId: auth.user.id, deletedAt: null },
    select: { id: true, title: true, category: true, amount: true, spentAt: true, notes: true },
    orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
    take: 150,
  });
  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const timeZone = timeZoneForCountry(auth.shop.countryCode);
  const currency = auth.shop.currency || "SAR";

  return <div className="space-y-6">
    <PageHeader eyebrow="موظف المبيعات" title="مصروفاتي" description="أضف مصروفاً نقدياً وشاهد فقط المصروفات التي سجلتها أنت. لا تظهر أرصدة الدرج أو البنوك أو المحافظ." />
    {query.saved === "1" ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-black text-emerald-800">تم تسجيل المصروف باسمك وخصمه من الدرج النقدي.</div> : null}

    <form action={createSalesEmployeeExpenseAction} className="erp-section space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800"><ReceiptText className="h-4 w-4 text-primary" /><div><h2 className="text-sm font-black">إضافة مصروف</h2><p className="mt-1 text-[10px] font-bold text-slate-400">المصدر المالي ثابت على الدرج النقدي ولا يتم عرض رصيده لك.</p></div></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1.5 text-xs font-bold">اسم المصروف<input name="title" required maxLength={120} className="erp-input" /></label>
        <label className="grid gap-1.5 text-xs font-bold">التصنيف<select name="category" defaultValue="OTHER" className="erp-input">{Object.values(ExpenseCategory).map((category) => <option key={category} value={category}>{categoryLabel[category]}</option>)}</select></label>
        <label className="grid gap-1.5 text-xs font-bold">القيمة<input name="amount" type="number" min="0.01" step="0.01" required className="erp-input font-numeric" /></label>
        <label className="grid gap-1.5 text-xs font-bold">التاريخ<input name="spentAt" type="date" defaultValue={localDateString(new Date(), timeZone)} required className="erp-input font-numeric" /></label>
      </div>
      <label className="grid gap-1.5 text-xs font-bold">ملاحظة<input name="notes" maxLength={500} className="erp-input" /></label>
      <div className="flex justify-end"><Button type="submit" className="rounded-xl font-black"><Save className="ml-1.5 h-4 w-4" />حفظ المصروف</Button></div>
    </form>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800"><div><h2 className="text-sm font-black">سجل مصروفاتي</h2><p className="mt-1 text-[10px] font-bold text-slate-400">آخر {expenses.length} حركة مسجلة باسمك.</p></div><div className="text-left"><p className="text-[9px] font-bold text-slate-400">إجمالي المعروض</p><p className="font-numeric text-sm font-black">{formatCurrency(total, currency)}</p></div></div>
      {expenses.length === 0 ? <div className="p-10 text-center text-xs font-bold text-slate-400">لا توجد مصروفات مسجلة باسمك بعد.</div> : <div className="overflow-x-auto"><table className="erp-table min-w-[760px]"><thead><tr><th>المصروف</th><th>التصنيف</th><th>القيمة</th><th>التاريخ</th><th>الملاحظة</th></tr></thead><tbody>{expenses.map((expense) => <tr key={expense.id}><td className="font-black">{expense.title}</td><td>{categoryLabel[expense.category]}</td><td className="font-numeric font-black">{formatCurrency(Number(expense.amount), currency)}</td><td>{formatDate(expense.spentAt, timeZone)}</td><td className="text-xs text-slate-500">{expense.notes || "—"}</td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}

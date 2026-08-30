import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { getCustomerDebtLedger } from "@/lib/services/debtLedgerService";
import { PrintStatementButton } from "./_print-button";

export const dynamic = "force-dynamic";

function isDebit(type: string) {
  return ["DEBT", "OPENING_BALANCE", "ADJUSTMENT_DEBIT"].includes(type);
}

function typeLabel(type: string) {
  if (type === "PAYMENT") return "تحصيل";
  if (type === "OPENING_BALANCE") return "رصيد افتتاحي";
  if (type === "ADJUSTMENT_DEBIT") return "تسوية مدينة";
  if (type === "ADJUSTMENT_CREDIT") return "تسوية دائنة";
  return "دين جديد";
}

export default async function DebtStatementPrintPage({ params }: { params: Promise<{ customerId: string }> }) {
  const auth = await requirePermission("debts:manage");
  const { customerId } = await params;
  const [ledger, shop] = await Promise.all([
    getCustomerDebtLedger(customerId),
    prisma.shop.findUnique({
      where: { id: auth.shop.id },
      select: { name: true, phone: true, address: true, currency: true },
    }),
  ]);

  const currency = shop?.currency || auth.shop.currency || "SAR";
  const money = (value: number) => `${value.toFixed(2)} ${currency}`;
  const entries = [...ledger.entries].sort((a, b) => {
    const time = a.occurredAt.getTime() - b.occurredAt.getTime();
    return time !== 0 ? time : a.id.localeCompare(b.id);
  });

  let runningBalance = 0;
  const statementRows = entries.map((entry) => {
    if (!entry.isReversed) runningBalance += isDebit(entry.type) ? entry.amount : -entry.amount;
    return { ...entry, runningBalance: Math.max(0, runningBalance) };
  });

  return (
    <div className="mx-auto min-h-screen max-w-5xl bg-white p-5 text-slate-900 sm:p-8 print:max-w-none print:p-0" dir="rtl">
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <Link href={`/debts/${customerId}`} className="inline-flex items-center gap-1 text-xs font-black text-sky-700 hover:underline">
          <ArrowRight className="h-4 w-4" /> العودة لكشف الحساب
        </Link>
        <PrintStatementButton />
      </div>

      <header className="border-b-2 border-slate-900 pb-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="text-2xl font-black">{shop?.name || auth.shop.name}</div>
            <div className="mt-1 text-sm font-bold text-slate-500">كشف حساب عميل — دفتر الديون</div>
            {shop?.phone ? <div className="mt-2 text-xs text-slate-500">هاتف المتجر: {shop.phone}</div> : null}
            {shop?.address ? <div className="mt-1 text-xs text-slate-500">{shop.address}</div> : null}
          </div>
          <div className="text-sm">
            <div className="font-black">العميل: {ledger.customer.name}</div>
            {ledger.customer.phone ? <div className="mt-1 text-slate-600">الهاتف: {ledger.customer.phone}</div> : null}
            {ledger.customer.email ? <div className="mt-1 text-slate-600">البريد: {ledger.customer.email}</div> : null}
            <div className="mt-2 text-xs text-slate-500">تاريخ الكشف: {new Date().toLocaleDateString("ar")}</div>
          </div>
        </div>
      </header>

      <section className="my-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-300 p-4">
          <div className="text-[11px] font-black text-slate-500">الرصيد المستحق</div>
          <div className="mt-1 text-xl font-black">{money(ledger.balance)}</div>
        </div>
        <div className="rounded-xl border border-slate-300 p-4">
          <div className="text-[11px] font-black text-slate-500">إجمالي الحركات</div>
          <div className="mt-1 text-xl font-black">{entries.filter((entry) => !entry.isReversed).length}</div>
        </div>
        <div className="rounded-xl border border-slate-300 p-4">
          <div className="text-[11px] font-black text-slate-500">حالة الحساب</div>
          <div className="mt-1 text-xl font-black">{ledger.balance > 0.005 ? "عليه رصيد" : "مسدد"}</div>
        </div>
      </section>

      <section className="overflow-hidden border border-slate-300">
        <table className="w-full border-collapse text-right text-[11px] sm:text-xs">
          <thead className="bg-slate-100">
            <tr>
              <th className="border-b border-slate-300 p-2">التاريخ</th>
              <th className="border-b border-slate-300 p-2">الحركة</th>
              <th className="border-b border-slate-300 p-2">مدين</th>
              <th className="border-b border-slate-300 p-2">دائن / تحصيل</th>
              <th className="border-b border-slate-300 p-2">الرصيد</th>
              <th className="border-b border-slate-300 p-2">البيان / المرجع</th>
            </tr>
          </thead>
          <tbody>
            {statementRows.map((entry) => (
              <tr key={entry.id} className={entry.isReversed ? "line-through opacity-50" : ""}>
                <td className="border-b border-slate-200 p-2">{entry.occurredAt.toLocaleDateString("ar")}</td>
                <td className="border-b border-slate-200 p-2 font-bold">{typeLabel(entry.type)}</td>
                <td className="border-b border-slate-200 p-2">{isDebit(entry.type) ? money(entry.amount) : "—"}</td>
                <td className="border-b border-slate-200 p-2">{!isDebit(entry.type) ? money(entry.amount) : "—"}</td>
                <td className="border-b border-slate-200 p-2 font-black">{money(entry.runningBalance)}</td>
                <td className="border-b border-slate-200 p-2 text-slate-600">{entry.description || entry.paymentMethod || "—"}{entry.reference ? ` · ${entry.reference}` : ""}</td>
              </tr>
            ))}
            {statementRows.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center font-bold text-slate-400">لا توجد حركات في كشف الحساب.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <footer className="mt-6 border-t border-slate-300 pt-3 text-[10px] leading-5 text-slate-500">
        هذا الكشف يعرض الحركات المسجلة في دفتر الديون حتى تاريخ الطباعة. الحركات الملغاة تظهر مشطوبة ولا تدخل في الرصيد.
      </footer>
    </div>
  );
}

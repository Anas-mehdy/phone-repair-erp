import { ExpenseCategory, Prisma } from "@prisma/client";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { deleteExpenseAction } from "./actions";

const categoryLabels: Record<ExpenseCategory, string> = {
  RENT: "إيجار",
  SALARIES: "رواتب وأجور",
  UTILITIES: "كهرباء وإنترنت وخدمات",
  MARKETING: "تسويق وإعلانات",
  TRANSPORT: "نقل وتوصيل",
  MAINTENANCE: "صيانة وتجهيزات",
  OTHER: "مصروف آخر",
};

type ExpenseRow = {
  id: string;
  title: string;
  notes: string | null;
  category: ExpenseCategory;
  spentAt: Date;
  amount: Prisma.Decimal;
  fundingSource: string | null;
  fundingWalletName: string | null;
  fundingBankAccountId: string | null;
  createdByUser: { name: string } | null;
};

type BankRow = { id: string; name: string };

export function ExpenseTable({
  expenses,
  total,
  count,
  currency,
  timeZone,
  bankAccounts,
  canManageExpenses,
  selectedExpenseId,
}: {
  expenses: ExpenseRow[];
  total: number;
  count: number;
  currency: string;
  timeZone: string;
  bankAccounts: BankRow[];
  canManageExpenses: boolean;
  selectedExpenseId?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div><h2 className="text-sm font-black text-slate-900 dark:text-slate-100">سجل المصروفات</h2><p className="mt-1 text-[10px] font-bold text-slate-400">كل المصروفات ضمن الفترة المختارة</p></div>
        <span className="rounded-full bg-rose-50 px-3 py-1 text-[10px] font-black text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{formatCurrency(total, currency)}</span>
      </div>

      {expenses.length === 0 ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400">لا توجد مصروفات مسجلة في هذه الفترة.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="erp-table min-w-[760px]">
            <thead><tr><th>المصروف</th><th>الفئة</th><th>التاريخ</th><th>المبلغ</th><th>مصدر السحب</th><th>أضيف بواسطة</th>{canManageExpenses ? <th>إجراء</th> : null}</tr></thead>
            <tbody>
              {expenses.map((expense) => {
                const bankName = bankAccounts.find((account) => account.id === expense.fundingBankAccountId)?.name;
                return (
                  <tr key={expense.id} className={selectedExpenseId === expense.id ? "bg-amber-50/80 dark:bg-amber-950/20" : undefined}>
                    <td><div className="font-black text-slate-800 dark:text-slate-100">{expense.title}</div>{expense.notes ? <div className="mt-1 max-w-xs truncate text-[10px] text-slate-400">{expense.notes}</div> : null}</td>
                    <td>{categoryLabels[expense.category]}</td>
                    <td>{formatDate(expense.spentAt, timeZone)}</td>
                    <td className="font-numeric font-black text-rose-700 dark:text-rose-300">{formatCurrency(Number(expense.amount), currency)}</td>
                    <td className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {expense.fundingSource === "DRAWER" ? "الدرج النقدي" : expense.fundingSource === "WALLET" ? `محفظة — ${expense.fundingWalletName || "محفظة إلكترونية"}` : expense.fundingSource === "BANK" ? `حساب بنكي — ${bankName || "حساب بنكي"}` : "غير محدد (مصروف سابق)"}
                    </td>
                    <td>{expense.createdByUser?.name || "—"}</td>
                    {canManageExpenses ? <td><form action={deleteExpenseAction}><input type="hidden" name="expenseId" value={expense.id} /><Button type="submit" size="sm" variant="outline" className="rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300"><Trash2 className="ml-1 h-3.5 w-3.5" />حذف</Button></form></td> : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {count > expenses.length ? <div className="border-t border-amber-100 bg-amber-50 px-5 py-3 text-[10px] font-bold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">يوجد {count - expenses.length} حركة أقدم غير معروضة في الجدول الحالي. إجمالي البطاقة يحسب جميع الحركات.</div> : null}
    </div>
  );
}

export { categoryLabels };

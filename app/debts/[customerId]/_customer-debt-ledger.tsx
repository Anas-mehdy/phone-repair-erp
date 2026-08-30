"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Banknote, CalendarDays, CreditCard, Printer, ReceiptText, Trash2 } from "lucide-react";
import { deleteDebtLedgerAction, recordDebtPaymentAction } from "../actions";

interface Entry {
  id: string;
  type: "DEBT" | "PAYMENT" | "OPENING_BALANCE" | "ADJUSTMENT_DEBIT" | "ADJUSTMENT_CREDIT";
  amount: number;
  occurredAt: string;
  dueAt: string | null;
  description: string | null;
  reference: string | null;
  paymentMethod: string | null;
  createdByName: string | null;
  isReversed: boolean;
}

function typeLabel(type: Entry["type"]) {
  if (type === "PAYMENT") return "تحصيل";
  if (type === "OPENING_BALANCE") return "رصيد افتتاحي";
  if (type === "ADJUSTMENT_DEBIT") return "تسوية مدينة";
  if (type === "ADJUSTMENT_CREDIT") return "تسوية دائنة";
  return "دين جديد";
}

function isDebit(type: Entry["type"]) {
  return ["DEBT", "OPENING_BALANCE", "ADJUSTMENT_DEBIT"].includes(type);
}

export function CustomerDebtLedger({
  customer,
  entries,
  balance,
  currency,
}: {
  customer: { id: string; name: string; phone: string | null; email: string | null };
  entries: Entry[];
  balance: number;
  currency: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, startDeleteTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("نقدي");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const money = (value: number) => `${value.toFixed(2)} ${currency}`;

  function submitPayment() {
    setMessage(null);
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setMessage("أدخل مبلغ تحصيل صحيحاً أكبر من صفر.");
      return;
    }

    startTransition(async () => {
      const result = await recordDebtPaymentAction({
        customerId: customer.id,
        amount: numeric,
        paymentMethod,
        reference: reference || null,
        description: description || null,
      });
      if (!result.success) {
        setMessage(result.error);
        return;
      }
      setAmount("");
      setReference("");
      setDescription("");
      setMessage("تم تسجيل التحصيل بنجاح.");
      router.refresh();
    });
  }

  function deleteLedger() {
    setMessage(null);
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف دفتر دين العميل «${customer.name}»؟\n\nسيتم حذف جميع حركات الدين والتحصيل المرتبطة بهذا الدفتر نهائياً، ولا يمكن التراجع عن هذه العملية.`,
    );
    if (!confirmed) return;

    startDeleteTransition(async () => {
      const result = await deleteDebtLedgerAction(customer.id);
      if (!result.success) {
        setMessage(result.error);
        return;
      }
      router.push("/debts");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/debts" className="inline-flex items-center gap-1 text-xs font-black text-sky-700 hover:underline"><ArrowRight className="h-3.5 w-3.5" /> العودة إلى دفتر الديون</Link>
          <h1 className="mt-2 text-2xl font-black text-slate-900">كشف حساب: {customer.name}</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">{customer.phone || "بدون رقم هاتف"}{customer.email ? ` · ${customer.email}` : ""}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/debts/${customer.id}/print`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50">
              <Printer className="h-4 w-4" /> طباعة كشف الحساب / PDF
            </Link>
            <button
              type="button"
              disabled={deleting}
              onClick={deleteLedger}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 shadow-sm hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> {deleting ? "جارٍ الحذف..." : "حذف دفتر الدين"}
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
          <div className="text-[11px] font-black text-rose-600">الرصيد المستحق حالياً</div>
          <div className="mt-1 text-2xl font-black text-rose-700">{money(balance)}</div>
        </div>
      </div>

      {message ? <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-bold text-sky-800">{message}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2"><Banknote className="h-5 w-5 text-emerald-600" /><h2 className="text-sm font-black text-slate-900">تسجيل تحصيل من العميل</h2></div>
        <p className="mt-1 text-[11px] font-semibold text-slate-500">التحصيل لا يعدّل الدين القديم؛ يسجّل كحركة مستقلة حتى يبقى كشف الحساب محفوظاً.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5 text-xs font-bold text-slate-700"><span>المبلغ المدفوع</span><input type="number" min="0.01" step="0.01" max={balance || undefined} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-400" placeholder={`0.00 ${currency}`} /></label>
          <label className="space-y-1.5 text-xs font-bold text-slate-700"><span>طريقة الدفع</span><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-emerald-400"><option>نقدي</option><option>تحويل بنكي</option><option>بطاقة</option><option>محفظة إلكترونية</option><option>أخرى</option></select></label>
          <label className="space-y-1.5 text-xs font-bold text-slate-700"><span>مرجع (اختياري)</span><input value={reference} onChange={(e) => setReference(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-400" placeholder="رقم حوالة أو إيصال" /></label>
          <label className="space-y-1.5 text-xs font-bold text-slate-700"><span>ملاحظة</span><input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-400" placeholder="دفعة على الحساب" /></label>
        </div>
        <button type="button" disabled={pending || balance <= 0 || deleting} onClick={submitPayment} className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">{pending ? "جارٍ التسجيل..." : "تسجيل التحصيل"}</button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4"><div className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-sky-600" /><h2 className="text-sm font-black text-slate-900">حركات كشف الحساب</h2></div><p className="mt-1 text-[11px] font-semibold text-slate-500">كل دين أو تحصيل محفوظ كسجل مستقل وبترتيب زمني.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-right text-xs">
            <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">التاريخ</th><th className="p-3">الحركة</th><th className="p-3">مدين</th><th className="p-3">دائن / تحصيل</th><th className="p-3">البيان</th><th className="p-3">المرجع</th><th className="p-3">المستخدم</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <tr key={entry.id} className={entry.isReversed ? "opacity-40 line-through" : ""}>
                  <td className="p-3 text-slate-500"><span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{new Date(entry.occurredAt).toLocaleDateString("ar")}</span></td>
                  <td className="p-3 font-black text-slate-800">{typeLabel(entry.type)}</td>
                  <td className="p-3 font-black text-rose-600">{isDebit(entry.type) ? money(entry.amount) : "—"}</td>
                  <td className="p-3 font-black text-emerald-600">{!isDebit(entry.type) ? money(entry.amount) : "—"}</td>
                  <td className="p-3 text-slate-600">{entry.description || (entry.paymentMethod ? <span className="inline-flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" />{entry.paymentMethod}</span> : "—")}</td>
                  <td className="p-3 text-slate-500">{entry.reference || "—"}</td>
                  <td className="p-3 text-slate-500">{entry.createdByName || "—"}</td>
                </tr>
              ))}
              {entries.length === 0 ? <tr><td colSpan={7} className="p-8 text-center font-bold text-slate-400">لا توجد حركات لهذا العميل بعد.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

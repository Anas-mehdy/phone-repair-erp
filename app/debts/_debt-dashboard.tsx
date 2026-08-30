"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  BookOpenText,
  CalendarClock,
  Clock3,
  Plus,
  Search,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { createDebtAction, createDebtCustomerAction } from "./actions";

interface CustomerOption {
  id: string;
  name: string;
  phone: string | null;
}

interface DebtRow {
  customerId: string;
  customerName: string;
  phone: string | null;
  balance: number;
  lastActivityAt: string | null;
  oldestDebtAt: string | null;
}

interface AgingSummary {
  current0To30: number;
  days31To60: number;
  days61To90: number;
  over90Days: number;
  total: number;
}

type LedgerStatusFilter = "ALL" | "SETTLED" | "OUTSTANDING";

export function DebtDashboard({
  customers,
  rows,
  totalOutstanding,
  debtorCount,
  collectedThisMonth,
  aging,
  currency,
}: {
  customers: CustomerOption[];
  rows: DebtRow[];
  totalOutstanding: number;
  debtorCount: number;
  collectedThisMonth: number;
  aging: AgingSummary;
  currency: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [customerPending, startCustomerTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LedgerStatusFilter>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>(customers);
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"DEBT" | "OPENING_BALANCE">("DEBT");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [dueAt, setDueAt] = useState("");

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return rows.filter((row) => {
      if (normalized && !`${row.customerName} ${row.phone ?? ""}`.toLowerCase().includes(normalized)) {
        return false;
      }

      const isSettled = row.balance <= 0.005;
      if (statusFilter === "SETTLED" && !isSettled) return false;
      if (statusFilter === "OUTSTANDING" && isSettled) return false;

      if (dateFrom || dateTo) {
        if (!row.lastActivityAt) return false;
        const activityDate = row.lastActivityAt.slice(0, 10);
        if (dateFrom && activityDate < dateFrom) return false;
        if (dateTo && activityDate > dateTo) return false;
      }

      return true;
    });
  }, [query, statusFilter, dateFrom, dateTo, rows]);

  const money = (value: number) => `${value.toFixed(2)} ${currency}`;

  function clearFilters() {
    setQuery("");
    setStatusFilter("ALL");
    setDateFrom("");
    setDateTo("");
  }

  function submitNewCustomer() {
    setMessage(null);
    if (!newCustomerName.trim()) {
      setMessage("اسم العميل مطلوب.");
      return;
    }

    startCustomerTransition(async () => {
      const result = await createDebtCustomerAction({
        name: newCustomerName,
        phone: newCustomerPhone || null,
        email: newCustomerEmail || null,
      });
      if (!result.success) {
        setMessage(result.error);
        return;
      }

      setCustomerOptions((current) =>
        [...current, result.customer].sort((a, b) => a.name.localeCompare(b.name, "ar")),
      );
      setCustomerId(result.customer.id);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerEmail("");
      setShowNewCustomer(false);
      setMessage(`تمت إضافة العميل «${result.customer.name}» واختياره للدين الحالي.`);
      router.refresh();
    });
  }

  function submitDebt() {
    setMessage(null);
    const numericAmount = Number(amount);
    if (!customerId || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setMessage("اختر العميل وأدخل مبلغاً صحيحاً أكبر من صفر.");
      return;
    }

    startTransition(async () => {
      const result = await createDebtAction({
        customerId,
        amount: numericAmount,
        type,
        dueAt: dueAt || null,
        description: description || null,
        reference: reference || null,
      });
      if (!result.success) {
        setMessage(result.error);
        return;
      }
      setAmount("");
      setDescription("");
      setReference("");
      setDueAt("");
      setType("DEBT");
      setShowForm(false);
      setMessage("تم تسجيل الدين في دفتر العميل بنجاح.");
      router.refresh();
    });
  }

  const agingBuckets = [
    { label: "0–30 يوم", value: aging.current0To30, hint: "ديون حديثة" },
    { label: "31–60 يوم", value: aging.days31To60, hint: "تحتاج متابعة" },
    { label: "61–90 يوم", value: aging.days61To90, hint: "متأخرة" },
    { label: "أكثر من 90 يوم", value: aging.over90Days, hint: "أولوية تحصيل" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-sky-700">
            <BookOpenText className="h-5 w-5" /> دفتر الديون
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900">ذمم العملاء والتحصيلات</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">قسم محاسبي مستقل عن الأقساط لمتابعة ما على العملاء من مبالغ.</p>
        </div>
        <button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-black text-white shadow-sm hover:bg-slate-800">
          <Plus className="h-4 w-4" /> إضافة دين
        </button>
      </div>

      {message ? <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-bold text-sky-800">{message}</div> : null}

      {showForm ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-black text-slate-900">تسجيل حركة مدينة جديدة</h2>
            <p className="mt-1 text-[11px] font-semibold text-slate-500">اختر عميلاً موجوداً أو أضف عميلاً جديداً مباشرة من هنا، حتى لو لم تكن لديه تذاكر صيانة أو مبيعات.</p>
          </div>

          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <label className="space-y-1.5 text-xs font-bold text-slate-700">
                <span>العميل</span>
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-sky-400">
                  {customerOptions.length === 0 ? <option value="">لا يوجد عملاء بعد</option> : null}
                  {customerOptions.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` — ${customer.phone}` : ""}</option>)}
                </select>
              </label>
              <button type="button" onClick={() => setShowNewCustomer((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs font-black text-sky-700 hover:bg-sky-100">
                <UserPlus className="h-4 w-4" /> عميل جديد
              </button>
            </div>

            {showNewCustomer ? (
              <div className="mt-3 border-t border-slate-200 pt-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="space-y-1 text-xs font-bold text-slate-700"><span>اسم العميل *</span><input value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-sky-400" placeholder="اسم العميل" /></label>
                  <label className="space-y-1 text-xs font-bold text-slate-700"><span>رقم الهاتف</span><input value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-sky-400" placeholder="اختياري" /></label>
                  <label className="space-y-1 text-xs font-bold text-slate-700"><span>البريد الإلكتروني</span><input type="email" value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-sky-400" placeholder="اختياري" /></label>
                </div>
                <div className="mt-3 flex gap-2"><button type="button" disabled={customerPending} onClick={submitNewCustomer} className="rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{customerPending ? "جارٍ الإضافة..." : "إضافة العميل واختياره"}</button><button type="button" onClick={() => setShowNewCustomer(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600">إلغاء</button></div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-1.5 text-xs font-bold text-slate-700">
              <span>نوع الحركة</span>
              <select value={type} onChange={(e) => setType(e.target.value as "DEBT" | "OPENING_BALANCE")} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-sky-400">
                <option value="DEBT">دين جديد</option>
                <option value="OPENING_BALANCE">رصيد افتتاحي</option>
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-bold text-slate-700"><span>المبلغ</span><input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-400" placeholder={`0.00 ${currency}`} /></label>
            <label className="space-y-1.5 text-xs font-bold text-slate-700"><span>تاريخ الاستحقاق (اختياري)</span><input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-400" /></label>
            <label className="space-y-1.5 text-xs font-bold text-slate-700"><span>مرجع (اختياري)</span><input value={reference} onChange={(e) => setReference(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-400" placeholder="رقم فاتورة أو تذكرة..." /></label>
            <label className="space-y-1.5 text-xs font-bold text-slate-700 md:col-span-2"><span>البيان / السبب</span><input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-400" placeholder="مثال: باقي قيمة صيانة الجهاز" /></label>
          </div>
          <div className="mt-4 flex gap-2"><button type="button" disabled={isPending || !customerId} onClick={submitDebt} className="rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">{isPending ? "جارٍ الحفظ..." : "حفظ الحركة"}</button><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-black text-slate-600">إلغاء</button></div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Banknote className="h-5 w-5 text-rose-500" /><div className="mt-3 text-2xl font-black text-slate-900">{money(totalOutstanding)}</div><div className="mt-1 text-xs font-bold text-slate-500">إجمالي المستحق على العملاء</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><UsersRound className="h-5 w-5 text-sky-500" /><div className="mt-3 text-2xl font-black text-slate-900">{debtorCount}</div><div className="mt-1 text-xs font-bold text-slate-500">عملاء لديهم رصيد مستحق</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><CalendarClock className="h-5 w-5 text-emerald-500" /><div className="mt-3 text-2xl font-black text-slate-900">{money(collectedThisMonth)}</div><div className="mt-1 text-xs font-bold text-slate-500">المحصل خلال هذا الشهر</div></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Clock3 className="h-5 w-5" /></div><div><h2 className="text-sm font-black text-slate-900">أعمار الديون (Aging)</h2><p className="mt-1 text-[11px] font-semibold text-slate-500">التحصيلات تُحتسب محاسبياً على أقدم الديون أولاً، ثم يظهر المتبقي حسب عمره الحقيقي.</p></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{agingBuckets.map((bucket) => <div key={bucket.label} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"><div className="text-[11px] font-black text-slate-500">{bucket.label}</div><div className="mt-2 text-lg font-black text-slate-900">{money(bucket.value)}</div><div className="mt-1 text-[10px] font-bold text-slate-400">{bucket.hint}</div></div>)}</div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div><h2 className="text-sm font-black text-slate-900">دفاتر ديون العملاء</h2><p className="mt-1 text-[11px] font-semibold text-slate-500">المسدد بالكامل يبقى محفوظاً في السجل، ويمكن فلترة الدفاتر بالحالة وتاريخ آخر حركة.</p></div>
            <div className="grid w-full gap-2 sm:grid-cols-2 lg:grid-cols-5 xl:w-auto">
              <div className="relative sm:col-span-2 lg:col-span-1 lg:w-64"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث بالاسم أو الهاتف" className="w-full rounded-xl border border-slate-200 py-2.5 pr-9 pl-3 text-xs font-semibold outline-none focus:border-sky-400" /></div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as LedgerStatusFilter)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-sky-400">
                <option value="ALL">كل الحالات</option>
                <option value="OUTSTANDING">باقي عليه</option>
                <option value="SETTLED">مسدد بالكامل</option>
              </select>
              <label className="grid gap-1 text-[10px] font-bold text-slate-500"><span>آخر حركة من</span><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-sky-400" /></label>
              <label className="grid gap-1 text-[10px] font-bold text-slate-500"><span>آخر حركة إلى</span><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-sky-400" /></label>
              <button type="button" onClick={clearFilters} className="self-end rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-50">مسح الفلاتر</button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-right text-xs">
            <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">العميل</th><th className="p-3">الهاتف</th><th className="p-3">الحالة</th><th className="p-3">الرصيد المستحق</th><th className="p-3">أقدم دين</th><th className="p-3">آخر حركة</th><th className="p-3"></th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const isSettled = row.balance <= 0.005;
                return (
                  <tr key={row.customerId} className="hover:bg-slate-50/70">
                    <td className="p-3 font-black text-slate-900">{row.customerName}</td>
                    <td className="p-3 text-slate-500">{row.phone || "—"}</td>
                    <td className="p-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${isSettled ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{isSettled ? "مسدد بالكامل" : "باقي عليه"}</span></td>
                    <td className={`p-3 font-black ${isSettled ? "text-emerald-700" : "text-rose-600"}`}>{money(row.balance)}</td>
                    <td className="p-3 text-slate-500">{row.oldestDebtAt ? new Date(row.oldestDebtAt).toLocaleDateString("ar") : "—"}</td>
                    <td className="p-3 text-slate-500">{row.lastActivityAt ? new Date(row.lastActivityAt).toLocaleDateString("ar") : "—"}</td>
                    <td className="p-3"><Link href={`/debts/${row.customerId}`} className="font-black text-sky-700 hover:underline">فتح الدفتر</Link></td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 ? <tr><td colSpan={7} className="p-8 text-center font-bold text-slate-400">لا توجد دفاتر مطابقة للفلاتر الحالية.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

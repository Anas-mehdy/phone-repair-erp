"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, BookOpenText, Loader2, UserPlus, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureClientEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { isPositiveDebtAmount, parseDebtAmount } from "@/lib/onboarding/debt-activation";
import { createDebtAction, createDebtCustomerAction } from "./actions";

type CustomerOption = { id: string; name: string; phone: string | null };
type CustomerMode = "EXISTING" | "NEW";

export function OnboardingDebtForm({
  customers,
  currency,
}: {
  customers: CustomerOption[];
  currency: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [customerMode, setCustomerMode] = useState<CustomerMode>(customers.length ? "EXISTING" : "NEW");
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    captureClientEvent(ANALYTICS_EVENTS.DEBT_FORM_VIEWED, {
      onboarding_mode: true,
      onboarding_flow: "debts",
      has_existing_customers: customers.length > 0,
    });
  }, [customers.length]);

  function markStarted(mode = customerMode) {
    if (startedRef.current) return;
    startedRef.current = true;
    captureClientEvent(ANALYTICS_EVENTS.DEBT_FORM_STARTED, {
      onboarding_mode: true,
      onboarding_flow: "debts",
      customer_mode: mode.toLowerCase(),
    });
  }

  function changeMode(mode: CustomerMode) {
    setCustomerMode(mode);
    markStarted(mode);
    setMessage(null);
  }

  function submit() {
    setMessage(null);
    markStarted();
    if (!isPositiveDebtAmount(amount)) {
      setMessage("أدخل مبلغ الدين بشكل صحيح وأكبر من صفر.");
      return;
    }
    if (customerMode === "EXISTING" && !customerId) {
      setMessage("اختر العميل الذي تريد تسجيل الدين عليه.");
      return;
    }
    if (customerMode === "NEW" && !customerName.trim()) {
      setMessage("اسم العميل مطلوب.");
      return;
    }

    startTransition(async () => {
      let targetCustomerId = customerId;

      if (customerMode === "NEW") {
        const customerResult = await createDebtCustomerAction({
          name: customerName.trim(),
          phone: customerPhone.trim() || null,
        });
        if (!customerResult.success) {
          setMessage(customerResult.error);
          return;
        }
        targetCustomerId = customerResult.customer.id;
      }

      const result = await createDebtAction({
        customerId: targetCustomerId,
        amount: parseDebtAmount(amount),
        type: "DEBT",
        onboarding: true,
      });
      if (!result.success) {
        setMessage(result.error);
        return;
      }

      router.push(`/debts/${targetCustomerId}?onboarding=1`);
    });
  }

  return (
    <div className="mx-auto max-w-3xl" dir="rtl">
      <section className="overflow-hidden rounded-[28px] border border-sky-100 bg-white shadow-xl shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-cyan-50/70 px-5 py-5 dark:border-slate-800 dark:from-sky-950/25 dark:via-slate-950 dark:to-cyan-950/20 sm:px-7 sm:py-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-600/20">
              <BookOpenText className="h-6 w-6" />
            </span>
            <div>
              <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[9px] font-black text-sky-700 dark:border-sky-900 dark:bg-slate-950 dark:text-sky-300">أول قيمة من دفتر الديون</span>
              <h1 className="mt-2 text-xl font-black text-slate-950 dark:text-slate-50 sm:text-2xl">سجّل أول دين حقيقي</h1>
              <p className="mt-1.5 max-w-2xl text-[11px] font-semibold leading-6 text-slate-500 dark:text-slate-400">نحتاج العميل والمبلغ فقط. بعد الحفظ رح تشوف رصيده المستحق، ولما يدفع أول دفعة رح ينخفض الرصيد تلقائياً.</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-7">
          {message ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] font-bold leading-5 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/25 dark:text-rose-200">{message}</div> : null}

          <div>
            <div className="mb-2 text-xs font-black text-slate-700 dark:text-slate-300">على مين الدين؟</div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={customers.length === 0 || isPending} onClick={() => changeMode("EXISTING")} className={`rounded-2xl border p-3 text-right transition ${customerMode === "EXISTING" ? "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-200" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"} disabled:cursor-not-allowed disabled:opacity-40`}>
                <UsersRound className="mb-2 h-5 w-5" />
                <span className="block text-[11px] font-black">عميل موجود</span>
                <span className="mt-0.5 block text-[9px] font-semibold opacity-70">اختاره من قائمة العملاء</span>
              </button>
              <button type="button" disabled={isPending} onClick={() => changeMode("NEW")} className={`rounded-2xl border p-3 text-right transition ${customerMode === "NEW" ? "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-200" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"}`}>
                <UserPlus className="mb-2 h-5 w-5" />
                <span className="block text-[11px] font-black">عميل جديد</span>
                <span className="mt-0.5 block text-[9px] font-semibold opacity-70">أضفه مع الدين مباشرة</span>
              </button>
            </div>
          </div>

          {customerMode === "EXISTING" ? (
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black text-slate-700 dark:text-slate-300">العميل *</span>
              <select value={customerId} onChange={(event) => { setCustomerId(event.target.value); markStarted("EXISTING"); }} disabled={isPending} className={inputClass}>
                <option value="">اختر العميل</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` — ${customer.phone}` : ""}</option>)}
              </select>
            </label>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-black text-slate-700 dark:text-slate-300">اسم العميل *</span>
                <input value={customerName} onChange={(event) => { setCustomerName(event.target.value); markStarted("NEW"); }} disabled={isPending} className={inputClass} placeholder="مثال: أحمد محمد" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-black text-slate-700 dark:text-slate-300">رقم الهاتف</span>
                <input value={customerPhone} onChange={(event) => { setCustomerPhone(event.target.value); markStarted("NEW"); }} disabled={isPending} inputMode="tel" className={`${inputClass} font-numeric`} placeholder="اختياري" />
              </label>
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black text-slate-700 dark:text-slate-300">المبلغ المستحق *</span>
            <div className="relative">
              <input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => { setAmount(event.target.value); markStarted(); }} disabled={isPending} className={`${inputClass} pl-16 font-numeric text-base`} placeholder="0.00" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">{currency}</span>
            </div>
          </label>

          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-[10px] font-bold leading-5 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
            سجّل مبلغاً حقيقياً فقط. ما رح نطلب منك تعمل تحصيل تجريبي؛ لما تستلم دفعة فعلية من العميل بتسجلها بالخطوة التالية.
          </div>

          <Button type="button" disabled={isPending} onClick={submit} className="h-12 w-full rounded-xl bg-sky-600 text-xs font-black text-white shadow-md shadow-sky-600/15 hover:bg-sky-700">
            {isPending ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" />جاري إنشاء دفتر الدين...</> : <>تسجيل الدين ومشاهدة الرصيد<ArrowLeft className="mr-2 h-4 w-4" /></>}
          </Button>

          <div className="text-center">
            <Link href="/debts" className="text-[10px] font-black text-slate-400 underline-offset-4 hover:text-sky-700 hover:underline dark:text-slate-500 dark:hover:text-sky-300">فتح دفتر الديون الكامل بدلاً من الخطوات السريعة</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

const inputClass = "h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-xs font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100/70 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-700 dark:focus:bg-slate-950 dark:focus:ring-sky-950/60";

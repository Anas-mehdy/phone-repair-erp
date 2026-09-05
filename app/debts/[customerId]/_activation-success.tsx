"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, Banknote, Check, CheckCircle2, Circle, LayoutDashboard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureClientEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { debtActivationProgress, previewDebtPayment } from "@/lib/onboarding/debt-activation";
import { recordDebtPaymentAction } from "../actions";

export function DebtActivationSuccess({
  customerId,
  balance,
  currency,
  hasDebt,
  hasPayment,
}: {
  customerId: string;
  balance: number;
  currency: string;
  hasDebt: boolean;
  hasPayment: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [beforeBalance, setBeforeBalance] = useState<number | null>(null);
  const impactCapturedRef = useRef(false);
  const progress = debtActivationProgress({ hasDebt, hasPayment });
  const preview = previewDebtPayment(balance, amount);

  useEffect(() => {
    if (beforeBalance == null || balance >= beforeBalance || impactCapturedRef.current) return;
    impactCapturedRef.current = true;
    captureClientEvent(ANALYTICS_EVENTS.DEBT_BALANCE_IMPACT_VIEWED, {
      onboarding_mode: true,
      onboarding_flow: "debts",
      balance_reduced: true,
      payment_recorded: true,
    });
    setMessage("تم تسجيل التحصيل وانخفض الرصيد المستحق تلقائياً.");
  }, [balance, beforeBalance]);

  function recordCashPayment() {
    setMessage(null);
    const next = previewDebtPayment(balance, amount);
    if (!next.valid) {
      setMessage(next.error);
      return;
    }

    setBeforeBalance(balance);
    startTransition(async () => {
      const result = await recordDebtPaymentAction({
        customerId,
        amount: next.payment,
        moneyDestination: "DRAWER",
        onboarding: true,
      });
      if (!result.success) {
        setBeforeBalance(null);
        setMessage(result.error);
        return;
      }
      setAmount("");
      router.refresh();
    });
  }

  return (
    <section className="overflow-hidden rounded-[26px] border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50/40 shadow-lg shadow-sky-100/40 dark:border-sky-900/70 dark:from-sky-950/25 dark:via-slate-950 dark:to-emerald-950/15" dir="rtl">
      <div className="border-b border-sky-100 px-5 py-5 dark:border-sky-900/50 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20"><CheckCircle2 className="h-5 w-5" /></span>
            <div>
              <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300">أول دين صار مسجلاً على مسار</span>
              <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-slate-50">هلق شوف كيف بيتغيّر رصيد العميل</h2>
              <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500 dark:text-slate-400">الرصيد الموجود هون محسوب من حركات دفتر الدين نفسها، مو رقم منفصل منقدر ننساه أو نعدله بالغلط.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-white px-4 py-3 text-center shadow-sm dark:border-rose-900/70 dark:bg-slate-950">
            <div className="text-[9px] font-black text-slate-400">الرصيد المستحق الآن</div>
            <div className="mt-1 font-numeric text-xl font-black text-rose-700 dark:text-rose-300">{money(balance, currency)}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-xs font-black text-slate-800 dark:text-slate-200">تقدمك في دورة الدين الأساسية</div>
              <span className="rounded-full bg-sky-50 px-2.5 py-1 font-numeric text-[10px] font-black text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">{progress.completed} / {progress.total}</span>
            </div>
            <div className="space-y-2.5">
              <Step done={hasDebt} label="سجلت أول دين حقيقي" />
              <Step done={hasDebt} label="شفت الرصيد المستحق للعميل" />
              <Step done={hasPayment} label="سجلت أول تحصيل حقيقي" />
            </div>
          </div>

          {!hasPayment && balance > 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/45 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/20">
              <div className="flex items-start gap-3">
                <Banknote className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-black text-emerald-900 dark:text-emerald-200">لما يقبض العميل أول دفعة نقدية</h3>
                  <p className="mt-1 text-[10px] font-semibold leading-5 text-emerald-700 dark:text-emerald-300">سجل دفعة حقيقية فقط. هذا الاختصار يعتبر أن المال دخل الدرج النقدي؛ إذا استلمتها بمحفظة استخدم نموذج التحصيل الكامل تحت.</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input type="number" min="0.01" max={balance || undefined} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={isPending} className="h-11 rounded-xl border border-emerald-200 bg-white px-3 font-numeric text-xs font-black outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-emerald-900 dark:bg-slate-950 dark:text-white" placeholder={`مبلغ التحصيل — ${currency}`} />
                    <Button type="button" disabled={isPending} onClick={recordCashPayment} className="h-11 rounded-xl bg-emerald-600 px-4 text-[10px] font-black text-white hover:bg-emerald-700">
                      {isPending ? <><Loader2 className="ml-1.5 h-4 w-4 animate-spin" />جاري التسجيل...</> : "تسجيل التحصيل النقدي"}
                    </Button>
                  </div>
                  {amount && preview.valid ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-100 bg-white/70 px-3 py-2 text-[10px] font-bold text-slate-500 dark:border-emerald-900/50 dark:bg-slate-950/60 dark:text-slate-400">
                      <span>{money(balance, currency)}</span><ArrowLeft className="h-3.5 w-3.5 text-emerald-600" /><span className="font-black text-emerald-700 dark:text-emerald-300">{money(preview.remainingBalance, currency)}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {hasPayment ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[11px] font-black text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-200">✅ ممتاز — صار عندك دين وتحصيل، ومسار حسب الرصيد المتبقي من الحركات تلقائياً.</div>
          ) : null}

          {message ? <div role="status" className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-[10px] font-bold text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/25 dark:text-sky-200">{message}</div> : null}
        </div>

        <aside className="space-y-3">
          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 text-[10px] font-bold leading-5 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">إذا ما استلمت دفعة حقيقية لسه، لا تسجل حركة وهمية. فيك تكمل شغلك وترجع للتحصيل وقت الدفع.</div>
          <Button asChild className="h-11 w-full rounded-xl bg-slate-900 text-[10px] font-black text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">
            <Link href="/dashboard"><LayoutDashboard className="ml-1.5 h-4 w-4" />الانتقال للوحة التحكم</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 w-full rounded-xl text-[10px] font-black">
            <Link href={`/debts/${customerId}`}>فتح دفتر العميل الكامل</Link>
          </Button>
        </aside>
      </div>
    </section>
  );
}

function Step({ done, label }: { done: boolean; label: string }) {
  return <div className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[10px] font-black ${done ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-200" : "border-slate-200 bg-slate-50/60 text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400"}`}>{done ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white"><Check className="h-3 w-3" /></span> : <Circle className="h-5 w-5 text-slate-300" />}<span>{label}</span></div>;
}

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("ar", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

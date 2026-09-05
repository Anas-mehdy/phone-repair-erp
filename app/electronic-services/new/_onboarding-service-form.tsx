"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Banknote, Calculator, CreditCard, Zap } from "lucide-react";
import Link from "next/link";
import { captureClientEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { formatCurrency } from "@/lib/format";
import { canExecuteFirstElectronicService, electronicServiceProfit, providerBalanceAfterService } from "@/lib/onboarding/electronic-service-activation";
import { createElectronicServiceTransactionAction } from "../service-actions";

type Provider = { id: string; name: string; currentBalance: number; currencyCode: string };
type PaymentDestination = "DRAWER" | "OTHER";
const inputClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export function OnboardingElectronicServiceForm({ providers, defaultProviderId }: { providers: Provider[]; defaultProviderId?: string }) {
  const started = useRef(false);
  const [providerId, setProviderId] = useState(defaultProviderId && providers.some((provider) => provider.id === defaultProviderId) ? defaultProviderId : providers[0]?.id ?? "");
  const [serviceName, setServiceName] = useState("");
  const [providerCost, setProviderCost] = useState("");
  const [customerCharge, setCustomerCharge] = useState("");
  const [paymentDestination, setPaymentDestination] = useState<PaymentDestination>("DRAWER");
  const provider = providers.find((item) => item.id === providerId) ?? providers[0];
  const cost = Math.max(0, Number(providerCost) || 0);
  const charge = Math.max(0, Number(customerCharge) || 0);
  const canSubmit = Boolean(provider && serviceName.trim().length >= 2 && canExecuteFirstElectronicService(provider.currentBalance, cost));
  const after = useMemo(() => providerBalanceAfterService(provider?.currentBalance ?? 0, cost), [provider?.currentBalance, cost]);
  const profit = useMemo(() => electronicServiceProfit(cost, charge), [cost, charge]);

  useEffect(() => {
    captureClientEvent(ANALYTICS_EVENTS.ELECTRONIC_SERVICE_FORM_VIEWED, {
      onboarding_mode: true,
      onboarding_flow: "electronic_services",
      has_provider: providers.length > 0,
    });
  }, [providers.length]);

  function markStarted() {
    if (started.current) return;
    started.current = true;
    captureClientEvent(ANALYTICS_EVENTS.ELECTRONIC_SERVICE_FORM_STARTED, {
      onboarding_mode: true,
      onboarding_flow: "electronic_services",
      has_multiple_providers: providers.length > 1,
    });
  }

  if (!provider) return null;
  return (
    <div className="mx-auto max-w-3xl space-y-5" dir="rtl">
      <section className="rounded-[28px] border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-cyan-50/70 p-6 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-teal-950/20">
        <div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white"><Zap className="h-6 w-6" /></span><div><div className="text-[10px] font-black text-teal-700 dark:text-teal-300">الخطوة 2 من 2</div><h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-slate-50">نفّذ أول خدمة حقيقية</h1><p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">سجل خدمة نفذتها فعلاً. مسار سيخصم تكلفة التنفيذ من رصيد المزود ويحسب الفرق مع المبلغ على العميل تلقائياً.</p></div></div>
      </section>

      <form action={createElectronicServiceTransactionAction} onChange={markStarted} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <input type="hidden" name="onboarding" value="1" />
        <input type="hidden" name="mode" value="FREE" />
        <input type="hidden" name="category" value="أخرى" />
        <input type="hidden" name="faceValue" value={providerCost} />
        <input type="hidden" name="profitMode" value="AUTO_DIFFERENCE" />
        <input type="hidden" name="paymentDestination" value={paymentDestination} />
        <input type="hidden" name="walletId" value="" />
        <input type="hidden" name="customerId" value="" />
        <input type="hidden" name="customerPhone" value="" />
        <input type="hidden" name="reference" value="" />
        <input type="hidden" name="notes" value="" />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-[11px] font-black text-slate-700 dark:text-slate-300">المزود *</span><select name="providerId" value={providerId} onChange={(event) => setProviderId(event.target.value)} className={inputClass}>{providers.map((item) => <option key={item.id} value={item.id}>{item.name} — {formatCurrency(item.currentBalance, item.currencyCode)}</option>)}</select></label>
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-[11px] font-black text-slate-700 dark:text-slate-300">اسم الخدمة *</span><input name="serviceName" value={serviceName} onChange={(event) => setServiceName(event.target.value)} required minLength={2} maxLength={160} className={inputClass} placeholder="مثال: شحن رصيد / دفع فاتورة" /></label>
          <label className="block"><span className="mb-1.5 block text-[11px] font-black text-slate-700 dark:text-slate-300">تكلفة التنفيذ من المزود *</span><input name="providerCost" type="number" min="0.01" step="0.01" required value={providerCost} onChange={(event) => setProviderCost(event.target.value)} className={`${inputClass} font-numeric`} placeholder="مثال: 97" /></label>
          <label className="block"><span className="mb-1.5 block text-[11px] font-black text-slate-700 dark:text-slate-300">المبلغ على العميل *</span><input name="customerCharge" type="number" min="0" step="0.01" required value={customerCharge} onChange={(event) => setCustomerCharge(event.target.value)} className={`${inputClass} font-numeric`} placeholder="مثال: 100" /></label>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3"><Metric label="رصيد المزود الآن" value={formatCurrency(provider.currentBalance, provider.currencyCode)} /><Metric label="بعد تنفيذ الخدمة" value={formatCurrency(after, provider.currencyCode)} /><Metric label="الربح المتوقع" value={formatCurrency(profit, provider.currencyCode)} /></div>
        {cost > provider.currentBalance ? <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[10px] font-black text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">رصيد المزود لا يكفي لهذه التكلفة. استخدم تكلفة خدمة فعلية ضمن الرصيد الحالي أو أضف رصيداً للمزود أولاً.</div> : null}

        <div className="mt-5"><div className="mb-2 text-[11px] font-black text-slate-700 dark:text-slate-300">وين دخل مبلغ العميل؟</div><div className="grid grid-cols-2 gap-2"><Choice active={paymentDestination === "DRAWER"} icon={Banknote} label="نقدي" helper="يدخل الدرج" onClick={() => setPaymentDestination("DRAWER")} /><Choice active={paymentDestination === "OTHER"} icon={CreditCard} label="بدون تحديث رصيد" helper="سجل الخدمة فقط" onClick={() => setPaymentDestination("OTHER")} /></div></div>

        <button type="submit" disabled={!canSubmit} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-teal-600 to-cyan-600 text-xs font-black text-white shadow-lg shadow-teal-600/15 disabled:cursor-not-allowed disabled:opacity-40"><Calculator className="h-4 w-4" />تنفيذ أول خدمة</button>
      </form>

      <div className="text-center"><Link href={`/electronic-services/new?provider=${encodeURIComponent(provider.id)}`} className="text-[11px] font-black text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">استخدام نموذج الخدمات الكامل</Link></div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3 dark:border-slate-800 dark:bg-slate-900"><div className="text-[9px] font-black text-slate-400">{label}</div><div className="mt-1 font-numeric text-sm font-black text-slate-900 dark:text-slate-100">{value}</div></div>; }
function Choice({ active, icon: Icon, label, helper, onClick }: { active: boolean; icon: typeof Banknote; label: string; helper: string; onClick: () => void }) { return <button type="button" onClick={onClick} className={`rounded-xl border p-3 text-right transition ${active ? "border-teal-300 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-200" : "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900"}`}><div className="flex items-center gap-2"><Icon className="h-4 w-4" /><span className="text-[10px] font-black">{label}</span></div><div className="mt-1 text-[9px] font-semibold opacity-70">{helper}</div></button>; }

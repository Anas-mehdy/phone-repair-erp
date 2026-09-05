"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Banknote, Loader2, Sparkles, WalletCards } from "lucide-react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { captureClientEvent } from "@/lib/analytics/client";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import {
  canSubmitWalletQuickTransfer,
  walletBalanceAfter,
  type WalletQuickOperation,
} from "@/lib/onboarding/wallet-activation";
import { createTransferAction } from "./actions";

type WalletOption = { id: string; name: string; balance: number };

const operationOptions: Array<{
  value: WalletQuickOperation;
  label: string;
  helper: string;
  icon: typeof Banknote;
}> = [
  { value: "WALLET_TOPUP", label: "شحن المحفظة", helper: "أضف رصيداً للمحفظة", icon: Banknote },
  { value: "CUSTOMER_DEPOSIT", label: "إيداع للعميل", helper: "أرسل رصيداً من المحفظة", icon: ArrowDownLeft },
  { value: "CUSTOMER_WITHDRAWAL", label: "سحب من العميل", helper: "استلم رصيداً إلى المحفظة", icon: ArrowUpRight },
];

export function OnboardingTransferForm({ wallets, currency }: { wallets: WalletOption[]; currency: string }) {
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? "");
  const [operationType, setOperationType] = useState<WalletQuickOperation>("WALLET_TOPUP");
  const [amount, setAmount] = useState("");
  const startedRef = useRef(false);
  const wallet = wallets.find((item) => item.id === walletId) ?? wallets[0];
  const amountValue = Math.max(0, Number(amount) || 0);
  const afterBalance = useMemo(
    () => walletBalanceAfter({ balance: wallet?.balance ?? 0, amount: amountValue, operation: operationType }),
    [amountValue, operationType, wallet?.balance],
  );
  const canSubmit = Boolean(wallet) && canSubmitWalletQuickTransfer({ balance: wallet?.balance ?? 0, amount: amountValue, operation: operationType });
  const insufficientBalance = operationType === "CUSTOMER_DEPOSIT" && amountValue > (wallet?.balance ?? 0);

  useEffect(() => {
    captureClientEvent(ANALYTICS_EVENTS.TRANSFER_FORM_VIEWED, {
      onboarding_mode: true,
      onboarding_flow: "wallets_first_value",
      source: "transfers_onboarding",
      wallet_count: wallets.length,
    });
  }, [wallets.length]);

  function markStarted() {
    if (startedRef.current) return;
    startedRef.current = true;
    captureClientEvent(ANALYTICS_EVENTS.TRANSFER_FORM_STARTED, {
      onboarding_mode: true,
      onboarding_flow: "wallets_first_value",
      source: "transfers_onboarding",
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="overflow-hidden rounded-[26px] border border-emerald-200 bg-gradient-to-l from-emerald-50 via-white to-teal-50/70 shadow-[0_24px_80px_-54px_rgba(5,150,105,0.62)] dark:border-emerald-900/70 dark:from-emerald-950/25 dark:via-slate-950 dark:to-teal-950/20">
        <div className="flex items-start gap-3 border-b border-emerald-100 px-5 py-5 sm:px-6 dark:border-emerald-900/50">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
            <ArrowDownLeft className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-300">الخطوة 2 من 2</p>
            <h1 className="mt-0.5 text-[19px] font-black text-slate-950 dark:text-slate-50">سجّل أول حركة مالية</h1>
            <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500 dark:text-slate-400">اختر نوع الحركة والمبلغ فقط. بدون عمولات أو بيانات عميل حالياً — فيك تضيفهم لاحقاً من النموذج الكامل.</p>
          </div>
        </div>

        <form action={createTransferAction} className="space-y-5 px-5 py-5 sm:px-6">
          <input type="hidden" name="onboarding" value="1" />
          <input type="hidden" name="operationType" value={operationType} />
          <input type="hidden" name="commission" value="0" />
          <input type="hidden" name="commissionMode" value="NONE" />
          <input type="hidden" name="customerId" value="" />
          <input type="hidden" name="customerName" value="" />
          <input type="hidden" name="customerPhone" value="" />
          <input type="hidden" name="notes" value="" />

          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            {wallets.length > 1 ? (
              <label className="grid gap-1.5 text-[11px] font-black text-slate-700 dark:text-slate-300">
                <span>المحفظة *</span>
                <select name="walletId" required value={walletId} onChange={(event) => { markStarted(); setWalletId(event.target.value); }} className="erp-input">
                  {wallets.map((item) => <option key={item.id} value={item.id}>{item.name} — {formatCurrency(item.balance, currency)}</option>)}
                </select>
              </label>
            ) : (
              <input type="hidden" name="walletId" value={wallet?.id ?? ""} />
            )}

            <div>
              <p className="mb-2 text-[11px] font-black text-slate-700 dark:text-slate-300">نوع الحركة</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {operationOptions.map((option) => {
                  const Icon = option.icon;
                  const selected = operationType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => { markStarted(); setOperationType(option.value); }}
                      className={`rounded-xl border p-3 text-right transition ${selected ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-200" : "border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:bg-emerald-50/40 dark:border-slate-700 dark:bg-slate-900"}`}
                    >
                      <Icon className={`h-4 w-4 ${selected ? "text-emerald-600" : "text-slate-400"}`} />
                      <p className="mt-2 text-[10px] font-black">{option.label}</p>
                      <p className="mt-0.5 text-[8.5px] font-semibold opacity-70">{option.helper}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="grid gap-1.5 text-[11px] font-black text-slate-700 dark:text-slate-300">
              <span>المبلغ ({currency}) *</span>
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={(event) => { markStarted(); setAmount(event.target.value); }}
                className="erp-input font-numeric"
                placeholder="0.00"
                autoFocus
              />
            </label>

            {insufficientBalance ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-black text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">الرصيد الحالي لا يكفي لإيداع هذا المبلغ للعميل. قلّل المبلغ أو اختر «شحن المحفظة» أولاً.</div>
            ) : null}
          </div>

          {wallet ? (
            <div className="overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-l from-teal-50 via-white to-emerald-50/60 dark:border-teal-900/60 dark:from-teal-950/20 dark:via-slate-950 dark:to-emerald-950/20">
              <div className="flex items-center gap-2 border-b border-teal-100 px-4 py-3 dark:border-teal-900/50"><Sparkles className="h-4 w-4 text-teal-600" /><p className="text-[10px] font-black text-teal-800 dark:text-teal-200">شوف أثر الحركة قبل الحفظ</p></div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4 text-center">
                <div><p className="text-[9px] font-black text-slate-400">الرصيد الحالي</p><p className="mt-1 font-numeric text-base font-black text-slate-800 dark:text-slate-100">{formatCurrency(wallet.balance, currency)}</p></div>
                <ArrowDownLeft className={`h-5 w-5 ${operationType === "CUSTOMER_DEPOSIT" ? "rotate-45 text-rose-500" : "-rotate-45 text-emerald-600"}`} />
                <div><p className="text-[9px] font-black text-slate-400">بعد العملية</p><p className={`mt-1 font-numeric text-base font-black ${operationType === "CUSTOMER_DEPOSIT" ? "text-indigo-700 dark:text-indigo-300" : "text-emerald-700 dark:text-emerald-300"}`}>{formatCurrency(afterBalance, currency)}</p></div>
              </div>
            </div>
          ) : null}

          <TransferSubmit disabled={!canSubmit} />
          <Link href="/transfers" className="block text-center text-[10px] font-black text-slate-400 hover:text-teal-700">استخدام نموذج التحويلات الكامل بدلاً من ذلك</Link>
        </form>
      </section>
    </div>
  );
}

function TransferSubmit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} className="h-11 w-full rounded-xl bg-emerald-600 text-[11px] font-black text-white shadow-md shadow-emerald-600/15 hover:bg-emerald-500 disabled:opacity-50">
      {pending ? <><Loader2 className="ml-1.5 h-4 w-4 animate-spin" />جاري تسجيل الحركة...</> : <><WalletCards className="ml-1.5 h-4 w-4" />تسجيل أول حركة</>}
    </Button>
  );
}

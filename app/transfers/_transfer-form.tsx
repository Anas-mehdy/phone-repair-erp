"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createTransferAction } from "./actions";

type WalletOption = {
  id: string;
  name: string;
  balance: number;
  depositCommission: number;
  withdrawalCommission: number;
};

type CustomerOption = { id: string; name: string; phone: string | null };

type OperationType = "CUSTOMER_DEPOSIT" | "CUSTOMER_WITHDRAWAL" | "WALLET_TOPUP" | "WALLET_WITHDRAWAL";
type CommissionMode = "DEDUCTED" | "ADDED" | "NONE";

export function TransferForm({ wallets, customers, currency }: { wallets: WalletOption[]; customers: CustomerOption[]; currency: string }) {
  const [operationType, setOperationType] = useState<OperationType>("CUSTOMER_DEPOSIT");
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [commission, setCommission] = useState("");
  const [commissionMode, setCommissionMode] = useState<CommissionMode>("ADDED");
  const [isDeferred, setIsDeferred] = useState(false);
  const [customerId, setCustomerId] = useState("");

  const wallet = wallets.find((item) => item.id === walletId);
  const isCustomerOperation = operationType === "CUSTOMER_DEPOSIT" || operationType === "CUSTOMER_WITHDRAWAL";
  const amountValue = Math.max(0, Number(amount) || 0);
  const defaultRate = operationType === "CUSTOMER_DEPOSIT" ? wallet?.depositCommission ?? 0 : wallet?.withdrawalCommission ?? 0;
  const commissionValue = commissionMode === "NONE" || !isCustomerOperation
    ? 0
    : commission.trim() !== ""
      ? Math.max(0, Number(commission) || 0)
      : amountValue * defaultRate / 100;

  const summary = useMemo(() => {
    let walletEffect = amountValue;
    let customerNet = amountValue;
    let customerCharge = amountValue;

    if (operationType === "CUSTOMER_DEPOSIT") {
      if (commissionMode === "DEDUCTED") {
        walletEffect = Math.max(0, amountValue - commissionValue);
        customerNet = walletEffect;
      } else if (commissionMode === "ADDED") {
        customerCharge = amountValue + commissionValue;
      }
    } else if (operationType === "CUSTOMER_WITHDRAWAL") {
      if (commissionMode === "DEDUCTED") {
        customerNet = Math.max(0, amountValue - commissionValue);
      } else if (commissionMode === "ADDED") {
        walletEffect = amountValue + commissionValue;
        customerCharge = amountValue + commissionValue;
      }
    }

    return { walletEffect, customerNet, customerCharge };
  }, [amountValue, commissionValue, commissionMode, operationType]);

  function money(value: number) {
    try {
      return new Intl.NumberFormat("ar", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
    } catch {
      return value.toFixed(2);
    }
  }

  return (
    <form action={createTransferAction} className="space-y-4">
      <div>
        <Label>نوع العملية *</Label>
        <select name="operationType" required className={inputClass} value={operationType} onChange={(event) => {
          const value = event.target.value as OperationType;
          setOperationType(value);
          if (value !== "CUSTOMER_DEPOSIT") setIsDeferred(false);
          if (value === "WALLET_TOPUP" || value === "WALLET_WITHDRAWAL") setCommissionMode("NONE");
          else if (commissionMode === "NONE") setCommissionMode("ADDED");
        }}>
          <option value="CUSTOMER_DEPOSIT">إيداع للعميل</option>
          <option value="CUSTOMER_WITHDRAWAL">سحب للعميل</option>
          <option value="WALLET_TOPUP">شحن المحفظة</option>
          <option value="WALLET_WITHDRAWAL">سحب من المحفظة</option>
        </select>
      </div>

      <div>
        <Label>المحفظة *</Label>
        <select name="walletId" required className={inputClass} value={walletId} onChange={(event) => setWalletId(event.target.value)}>
          <option value="">اختر المحفظة</option>
          {wallets.map((item) => <option key={item.id} value={item.id}>{item.name} — {money(item.balance)}</option>)}
        </select>
      </div>

      <div><Label>المبلغ *</Label><input name="amount" type="number" min="0.01" step="0.01" required className={`${inputClass} font-numeric`} placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>

      {isCustomerOperation ? (
        <>
          <div><Label>العمولة</Label><input name="commission" type="number" min="0" step="0.01" className={`${inputClass} font-numeric`} placeholder={`اتركها فارغة لحساب ${defaultRate}% تلقائياً`} value={commission} onChange={(event) => setCommission(event.target.value)} disabled={commissionMode === "NONE"} /></div>
          <div>
            <Label>طريقة احتساب العمولة</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                ["ADDED", "مضافة فوق المبلغ"],
                ["DEDUCTED", "مخصومة من المبلغ"],
                ["NONE", "بدون عمولة"],
              ].map(([value, label]) => (
                <label key={value} className={`cursor-pointer rounded-xl border px-3 py-2 text-center text-[10px] font-black transition ${commissionMode === value ? "border-teal-400 bg-teal-50 text-teal-800" : "border-slate-200 bg-white text-slate-500"}`}>
                  <input type="radio" name="commissionMode" value={value} checked={commissionMode === value} onChange={() => setCommissionMode(value as CommissionMode)} className="sr-only" />{label}
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] font-bold text-slate-400">المخصومة تقلل صافي المبلغ للعميل، والمضافة تُحصّل فوق المبلغ الأساسي.</p>
          </div>
        </>
      ) : <input type="hidden" name="commissionMode" value="NONE" />}

      <div><Label>ربط بعميل موجود</Label><select name="customerId" className={inputClass} value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">بدون ربط</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` — ${customer.phone}` : ""}</option>)}</select></div>

      {operationType === "CUSTOMER_DEPOSIT" ? (
        <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${isDeferred ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
          <input type="checkbox" name="isDeferred" checked={isDeferred} onChange={(event) => setIsDeferred(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
          <span><span className="block text-xs font-black text-slate-700">آجل — على حساب عميل مسجل</span><span className="mt-1 block text-[10px] font-bold text-slate-400">يسجل المبلغ المستحق تلقائياً في دفتر ديون العميل. يجب اختيار عميل موجود.</span></span>
        </label>
      ) : null}

      {isDeferred && !customerId ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-black text-amber-800">اختر عميلاً مسجلاً حتى يمكن تسجيل العملية كدين.</div> : null}

      <div className="grid grid-cols-2 gap-3"><div><Label>اسم العميل</Label><input name="customerName" className={inputClass} placeholder="اختياري" /></div><div><Label>رقم الهاتف</Label><input name="customerPhone" className={`${inputClass} font-numeric`} placeholder="اختياري" /></div></div>
      <div><Label>ملاحظات</Label><textarea name="notes" className="min-h-20 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" placeholder="أي ملاحظة عن العملية" /></div>

      <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-3">
        <p className="mb-2 text-[10px] font-black text-teal-800">ملخص العملية قبل التسجيل</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-bold text-slate-600">
          <span>المبلغ الأساسي</span><span className="font-numeric text-left font-black text-slate-900">{money(amountValue)}</span>
          <span>العمولة</span><span className="font-numeric text-left font-black text-teal-700">{money(commissionValue)}</span>
          {isCustomerOperation ? <><span>صافي العميل</span><span className="font-numeric text-left font-black text-slate-900">{money(summary.customerNet)}</span><span>المطلوب من العميل</span><span className="font-numeric text-left font-black text-slate-900">{money(summary.customerCharge)}</span></> : null}
          <span>أثر المحفظة</span><span className="font-numeric text-left font-black text-slate-900">{operationType === "CUSTOMER_DEPOSIT" || operationType === "WALLET_WITHDRAWAL" ? "− " : "+ "}{money(summary.walletEffect)}</span>
          {isDeferred ? <><span>الدين المسجل</span><span className="font-numeric text-left font-black text-amber-700">{money(summary.customerCharge)}</span></> : null}
        </div>
      </div>

      <Button type="submit" disabled={isDeferred && !customerId} className="h-11 w-full rounded-xl font-black"><ArrowLeftRight className="ml-1.5 h-4 w-4" />تسجيل العملية</Button>
    </form>
  );
}

const inputClass = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100 disabled:text-slate-400";
function Label({ children }: { children: React.ReactNode }) { return <label className="mb-1.5 block text-[11px] font-black text-slate-600">{children}</label>; }

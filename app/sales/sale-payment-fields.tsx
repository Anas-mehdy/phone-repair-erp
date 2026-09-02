"use client";

import { Banknote, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";

export type SaleWalletOption = { id: string; name: string; balance: number };
type Destination = "DRAWER" | "WALLET";

export function SalePaymentFields({ total, wallets, currency }: { total: number; wallets: SaleWalletOption[]; currency: string }) {
  const [paymentDestination, setPaymentDestination] = useState<Destination>("DRAWER");
  const [walletId, setWalletId] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [changeDestination, setChangeDestination] = useState<Destination>("DRAWER");
  const [changeWalletId, setChangeWalletId] = useState("");
  const received = amountReceived.trim() === "" ? total : Math.max(0, Number(amountReceived) || 0);
  const change = useMemo(() => Math.max(0, received - total), [received, total]);

  return <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
    <div>
      <div className="mb-2 text-xs font-black text-slate-700">مكان استلام المبلغ</div>
      <div className="grid grid-cols-2 gap-2">
        <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs font-black transition ${paymentDestination === "DRAWER" ? "border-teal-300 bg-teal-50 text-teal-800" : "border-slate-200 text-slate-500"}`}>
          <input className="sr-only" type="radio" name="paymentDestination" value="DRAWER" checked={paymentDestination === "DRAWER"} onChange={() => setPaymentDestination("DRAWER")} />
          <Banknote className="h-4 w-4" /> الدرج النقدي
        </label>
        <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs font-black transition ${paymentDestination === "WALLET" ? "border-indigo-300 bg-indigo-50 text-indigo-800" : "border-slate-200 text-slate-500"}`}>
          <input className="sr-only" type="radio" name="paymentDestination" value="WALLET" checked={paymentDestination === "WALLET"} onChange={() => setPaymentDestination("WALLET")} />
          <WalletCards className="h-4 w-4" /> محفظة إلكترونية
        </label>
      </div>
      {paymentDestination === "WALLET" ? <select name="walletId" required value={walletId} onChange={(e) => setWalletId(e.target.value)} className="erp-input mt-2"><option value="">اختر المحفظة</option>{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name} — {formatCurrency(wallet.balance, currency)}</option>)}</select> : <input type="hidden" name="walletId" value="" />}
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1.5 text-xs font-black text-slate-700">المبلغ المستلم<input name="amountReceived" type="number" min={Math.max(0, total)} step="0.01" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} className="erp-input font-numeric" placeholder={total.toFixed(2)} /></label>
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"><div className="text-[10px] font-black text-slate-400">الباقي للعميل</div><div className={`mt-1 font-numeric text-lg font-black ${change > 0 ? "text-amber-700" : "text-slate-800"}`}>{formatCurrency(change, currency)}</div></div>
    </div>

    {change > 0 ? <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5">
      <div className="mb-2 text-xs font-black text-amber-900">مصدر إرجاع الباقي</div>
      <div className="grid grid-cols-2 gap-2">
        <label className={`cursor-pointer rounded-xl border p-2.5 text-center text-[11px] font-black ${changeDestination === "DRAWER" ? "border-amber-300 bg-white text-amber-800" : "border-amber-100 text-amber-600"}`}><input className="sr-only" type="radio" name="changeDestination" value="DRAWER" checked={changeDestination === "DRAWER"} onChange={() => setChangeDestination("DRAWER")} />الدرج النقدي</label>
        <label className={`cursor-pointer rounded-xl border p-2.5 text-center text-[11px] font-black ${changeDestination === "WALLET" ? "border-indigo-300 bg-white text-indigo-800" : "border-amber-100 text-amber-600"}`}><input className="sr-only" type="radio" name="changeDestination" value="WALLET" checked={changeDestination === "WALLET"} onChange={() => setChangeDestination("WALLET")} />محفظة إلكترونية</label>
      </div>
      {changeDestination === "WALLET" ? <select name="changeWalletId" required value={changeWalletId} onChange={(e) => setChangeWalletId(e.target.value)} className="erp-input mt-2"><option value="">اختر محفظة إرجاع الباقي</option>{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name} — {formatCurrency(wallet.balance, currency)}</option>)}</select> : <input type="hidden" name="changeWalletId" value="" />}
    </div> : <><input type="hidden" name="changeDestination" value="DRAWER" /><input type="hidden" name="changeWalletId" value="" /></>}
    <p className="text-[10px] font-semibold leading-5 text-slate-400">يُسجل البيع كإيراد مرة واحدة فقط. هذه الخيارات تحدد أين دخل المال فعليًا ومن أين خرج الباقي.</p>
  </div>;
}

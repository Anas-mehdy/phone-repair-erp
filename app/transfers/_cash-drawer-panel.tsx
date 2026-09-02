import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Banknote, CircleDollarSign, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import type { CashDrawerMovementRow } from "@/lib/services/cashDrawerService";
import { addCashDrawerMovementAction, setCashDrawerOpeningBalanceAction, transferCashDrawerWalletAction } from "./cash-actions";

type WalletOption = { id: string; name: string };
type DrawerSnapshot = {
  currentBalance: number;
  openingBalance: number;
  openingBalanceSetAt: Date | null;
  todayIn: number;
  todayOut: number;
  movements: CashDrawerMovementRow[];
};

const movementLabels: Record<string, string> = {
  OPENING_BALANCE: "رصيد افتتاحي",
  MANUAL_IN: "إضافة نقد",
  MANUAL_OUT: "سحب نقد",
  WALLET_TRANSFER_IN: "تحويل من محفظة",
  WALLET_TRANSFER_OUT: "تحويل إلى محفظة",
  SALE_CASH: "بيع نقدي",
  INVOICE_PAYMENT: "تحصيل فاتورة",
  INSTALLMENT_PAYMENT: "تحصيل قسط",
  INSTALLMENT_DOWN_PAYMENT: "دفعة أولى لأقساط",
  DEBT_PAYMENT: "تحصيل دين",
  CHANGE_RETURN: "باقي للعميل",
};

export function CashDrawerPanel({ drawer, wallets, currency }: { drawer: DrawerSnapshot; wallets: WalletOption[]; currency: string }) {
  return (
    <section className="overflow-hidden rounded-[22px] border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/40 shadow-[0_18px_55px_-36px_rgba(5,150,105,0.35)]">
      <div className="flex flex-col gap-3 border-b border-emerald-100 bg-gradient-to-l from-emerald-50 via-white to-teal-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/15"><Banknote className="h-5 w-5" /></span>
          <div><h2 className="text-sm font-black text-slate-900">الدرج النقدي</h2><p className="mt-1 text-[11px] font-semibold text-slate-500">الكاش الموجود فعلياً في المحل وحركة الدخول والخروج منه.</p></div>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white px-4 py-2 text-left"><div className="text-[10px] font-black text-emerald-600">الرصيد الحالي</div><div className="mt-1 font-numeric text-xl font-black text-slate-950">{formatCurrency(drawer.currentBalance, currency)}</div></div>
      </div>

      <div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-3">
        <Stat label="رصيد افتتاحي" value={drawer.openingBalance} currency={currency} tone="slate" />
        <Stat label="دخل اليوم" value={drawer.todayIn} currency={currency} tone="emerald" />
        <Stat label="خرج اليوم" value={drawer.todayOut} currency={currency} tone="rose" />
      </div>

      {!drawer.openingBalanceSetAt ? (
        <form action={setCashDrawerOpeningBalanceAction} className="grid gap-3 border-b border-amber-100 bg-amber-50/60 p-5 sm:grid-cols-[1fr_1.2fr_auto] sm:items-end">
          <label className="grid gap-1.5 text-xs font-black text-slate-700">الرصيد الافتتاحي<input name="amount" type="number" min="0" step="0.01" required className={inputClass} placeholder="مثال: 5000" /></label>
          <label className="grid gap-1.5 text-xs font-black text-slate-700">ملاحظة<input name="notes" className={inputClass} placeholder="مثال: رصيد المحل قبل استخدام مسار" /></label>
          <Button type="submit" className="h-11 rounded-xl bg-amber-600 px-5 text-xs font-black text-white hover:bg-amber-700">تثبيت الرصيد</Button>
        </form>
      ) : null}

      <div className="grid gap-5 p-5 xl:grid-cols-2">
        <form action={addCashDrawerMovementAction} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
          <h3 className="text-sm font-black text-slate-900">حركة نقدية يدوية</h3><p className="mt-1 text-[10px] font-semibold text-slate-400">لتمويل المالك، سحب نقد، أو أي تصحيح له سبب واضح.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-black text-slate-700">نوع الحركة<select name="direction" className={inputClass} defaultValue="IN"><option value="IN">إضافة للدرج</option><option value="OUT">سحب من الدرج</option></select></label>
            <label className="grid gap-1.5 text-xs font-black text-slate-700">المبلغ<input name="amount" type="number" min="0.01" step="0.01" required className={inputClass} /></label>
            <label className="grid gap-1.5 text-xs font-black text-slate-700 sm:col-span-2">السبب<input name="description" required className={inputClass} placeholder="مثال: تمويل إضافي من المالك" /></label>
          </div>
          <Button type="submit" className="mt-3 h-10 w-full rounded-xl bg-slate-800 text-xs font-black text-white hover:bg-slate-900">حفظ الحركة</Button>
        </form>

        <form action={transferCashDrawerWalletAction} className="rounded-2xl border border-indigo-100 bg-indigo-50/45 p-4">
          <h3 className="text-sm font-black text-slate-900">تحويل بين الدرج والمحفظة</h3><p className="mt-1 text-[10px] font-semibold text-slate-400">نقل أموال فقط؛ لا يُحسب كمبيع أو ربح أو مصروف.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-black text-slate-700">الاتجاه<select name="direction" className={inputClass} defaultValue="DRAWER_TO_WALLET"><option value="DRAWER_TO_WALLET">من الدرج إلى المحفظة</option><option value="WALLET_TO_DRAWER">من المحفظة إلى الدرج</option></select></label>
            <label className="grid gap-1.5 text-xs font-black text-slate-700">المحفظة<select name="walletId" required className={inputClass}><option value="">اختر المحفظة</option>{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select></label>
            <label className="grid gap-1.5 text-xs font-black text-slate-700 sm:col-span-2">المبلغ<input name="amount" type="number" min="0.01" step="0.01" required className={inputClass} /></label>
          </div>
          <Button type="submit" disabled={wallets.length === 0} className="mt-3 h-10 w-full rounded-xl bg-indigo-600 text-xs font-black text-white hover:bg-indigo-700"><ArrowLeftRight className="ml-1.5 h-4 w-4" />تنفيذ التحويل</Button>
        </form>
      </div>

      <div className="border-t border-slate-100">
        <div className="flex items-center justify-between px-5 py-4"><div><h3 className="text-sm font-black text-slate-900">آخر حركات الدرج</h3><p className="mt-1 text-[10px] font-semibold text-slate-400">كل إضافة أو سحب محفوظة كمصدر مستقل.</p></div><CircleDollarSign className="h-5 w-5 text-emerald-600" /></div>
        {drawer.movements.length === 0 ? <div className="px-5 pb-6 text-xs font-bold text-slate-400">لا توجد حركات بعد.</div> : <div className="overflow-x-auto"><table className="erp-table min-w-[720px]"><thead><tr><th>الحركة</th><th>البيان</th><th>المحفظة</th><th>المبلغ</th><th>التاريخ</th></tr></thead><tbody>{drawer.movements.map((movement) => <tr key={movement.id}><td><span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-black ${movement.direction === "IN" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-rose-100 bg-rose-50 text-rose-700"}`}>{movement.direction === "IN" ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}{movementLabels[movement.type] || movement.type}</span></td><td className="font-bold text-slate-700">{movement.description || "-"}</td><td>{movement.walletName || "-"}</td><td className={`font-numeric font-black ${movement.direction === "IN" ? "text-emerald-700" : "text-rose-700"}`}>{movement.direction === "IN" ? "+ " : "- "}{formatCurrency(Number(movement.amount), currency)}</td><td>{formatDate(movement.createdAt)}</td></tr>)}</tbody></table></div>}
      </div>
    </section>
  );
}

function Stat({ label, value, currency, tone }: { label: string; value: number; currency: string; tone: "slate" | "emerald" | "rose" }) {
  const cls = tone === "emerald" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : tone === "rose" ? "border-rose-100 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50 text-slate-700";
  return <div className={`rounded-xl border px-4 py-3 ${cls}`}><div className="text-[10px] font-black opacity-75">{label}</div><div className="mt-1 font-numeric text-lg font-black">{formatCurrency(value, currency)}</div></div>;
}

const inputClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-800 outline-none transition focus:border-teal-300 focus:ring-4 focus:ring-teal-100/70";

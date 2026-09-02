"use client";

import { useState } from "react";
import { Edit3, Gauge, Plus, Sparkles, WalletCards, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createWalletAction, updateWalletAction } from "./actions";

export type WalletPanelItem = {
  id: string;
  name: string;
  balance: number;
  monthlyLimit: number | null;
  monthlyUsed: number;
  depositCommission: number;
  withdrawalCommission: number;
};

type EditorState = { mode: "create" } | { mode: "edit"; wallet: WalletPanelItem } | null;

export function WalletsPanel({ wallets, currency }: { wallets: WalletPanelItem[]; currency: string }) {
  const [editor, setEditor] = useState<EditorState>(null);

  return (
    <section className="overflow-hidden rounded-[22px] border border-teal-100/80 bg-gradient-to-br from-white via-white to-teal-50/45 shadow-[0_18px_55px_-34px_rgba(13,148,136,0.45)]">
      <div className="flex flex-col gap-3 border-b border-teal-100/70 bg-gradient-to-l from-teal-50/90 via-white to-cyan-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md shadow-teal-600/15">
            <WalletCards className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-black text-slate-900">محافظ التحويل</h2>
            <p className="mt-1 text-[11px] font-semibold text-slate-500">الأرصدة، حدود الاستخدام، والعمولات الافتراضية لكل خدمة.</p>
          </div>
        </div>
        <Button type="button" onClick={() => setEditor({ mode: "create" })} className="h-10 rounded-xl bg-teal-600 px-4 text-xs font-black text-white shadow-md shadow-teal-600/15 hover:bg-teal-700">
          <Plus className="ml-1.5 h-4 w-4" /> إضافة محفظة
        </Button>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-2 2xl:grid-cols-3">
        {wallets.map((wallet, index) => {
          const percent = wallet.monthlyLimit && wallet.monthlyLimit > 0
            ? Math.min(100, Math.max(0, (wallet.monthlyUsed / wallet.monthlyLimit) * 100))
            : 0;
          const tone = index % 3 === 0
            ? "from-teal-50/90 to-white border-teal-100"
            : index % 3 === 1
              ? "from-cyan-50/80 to-white border-cyan-100"
              : "from-indigo-50/70 to-white border-indigo-100";

          return (
            <article key={wallet.id} className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${tone} p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md`}>
              <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-white/70 blur-2xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs font-black text-slate-800">{wallet.name}</p>
                    <span className="rounded-full border border-white/80 bg-white/70 px-2 py-0.5 text-[9px] font-black text-slate-400">محفظة نشطة</span>
                  </div>
                  <p className="mt-2 font-numeric text-[26px] font-black tracking-tight text-slate-950">{money(wallet.balance, currency)}</p>
                  <p className="mt-0.5 text-[10px] font-bold text-slate-400">الرصيد المتاح الآن</p>
                </div>
                <button type="button" onClick={() => setEditor({ mode: "edit", wallet })} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/90 bg-white/80 text-slate-500 shadow-sm transition hover:border-teal-200 hover:text-teal-700" aria-label={`تعديل ${wallet.name}`}>
                  <Edit3 className="h-4 w-4" />
                </button>
              </div>

              <div className="relative mt-4 rounded-xl border border-white/80 bg-white/65 p-3 backdrop-blur-sm">
                <div className="flex items-center justify-between text-[10px] font-black text-slate-500">
                  <span className="inline-flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5 text-teal-600" /> استخدام الشهر</span>
                  <span className="font-numeric text-slate-700">{wallet.monthlyLimit ? `${money(wallet.monthlyUsed, currency)} / ${money(wallet.monthlyLimit, currency)}` : "بدون حد"}</span>
                </div>
                {wallet.monthlyLimit ? (
                  <div className="mt-2.5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/70"><div className="h-full rounded-full bg-gradient-to-l from-teal-500 to-cyan-500" style={{ width: `${percent}%` }} /></div>
                    <p className="mt-1.5 text-[9px] font-bold text-slate-400">المتبقي {money(Math.max(0, wallet.monthlyLimit - wallet.monthlyUsed), currency)}</p>
                  </div>
                ) : null}
              </div>

              <div className="relative mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/75 px-3 py-2.5"><div className="text-[9px] font-black text-emerald-600">عمولة الإيداع</div><div className="mt-1 font-numeric text-sm font-black text-emerald-800">{wallet.depositCommission}%</div></div>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/75 px-3 py-2.5"><div className="text-[9px] font-black text-indigo-500">عمولة السحب</div><div className="mt-1 font-numeric text-sm font-black text-indigo-800">{wallet.withdrawalCommission}%</div></div>
              </div>
            </article>
          );
        })}

        {wallets.length === 0 ? (
          <button type="button" onClick={() => setEditor({ mode: "create" })} className="col-span-full flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-teal-200 bg-teal-50/30 p-8 text-center transition hover:bg-teal-50/60">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-sm"><Plus className="h-5 w-5" /></span>
            <span className="mt-3 text-xs font-black text-slate-700">أضف أول محفظة تحويل</span>
            <span className="mt-1 text-[10px] font-semibold text-slate-400">Vodafone Cash، InstaPay أو أي خدمة تستخدمها.</span>
          </button>
        ) : null}
      </div>

      {editor ? <WalletEditor editor={editor} onClose={() => setEditor(null)} /> : null}
    </section>
  );
}

function WalletEditor({ editor, onClose }: { editor: Exclude<EditorState, null>; onClose: () => void }) {
  const wallet = editor.mode === "edit" ? editor.wallet : null;
  const action = wallet ? updateWalletAction : createWalletAction;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[3px]" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <div className="w-full max-w-xl overflow-hidden rounded-[24px] border border-teal-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-teal-100 bg-gradient-to-l from-teal-50 via-white to-cyan-50 px-5 py-4">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white"><Sparkles className="h-4 w-4" /></span><div><h3 className="text-sm font-black text-slate-900">{wallet ? "إدارة المحفظة" : "إضافة محفظة جديدة"}</h3><p className="mt-0.5 text-[10px] font-semibold text-slate-500">{wallet ? "عدّل البيانات والعمولات والرصيد من مكان واحد." : "اضبط الرصيد والحدود والعمولات قبل بدء التحويلات."}</p></div></div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm hover:bg-slate-50"><X className="h-4 w-4" /></button>
        </div>
        <form action={action} className="grid gap-4 p-5 sm:grid-cols-2">
          {wallet ? <input type="hidden" name="walletId" value={wallet.id} /> : null}
          <div className="sm:col-span-2"><Label>اسم المحفظة *</Label><input name="name" required defaultValue={wallet?.name ?? ""} className={inputClass} placeholder="مثال: Vodafone Cash" /></div>
          <div><Label>{wallet ? "الرصيد الحالي" : "الرصيد الافتتاحي"}</Label><input name={wallet ? "balance" : "openingBalance"} type="number" min="0" step="0.01" required={Boolean(wallet)} defaultValue={wallet ? wallet.balance.toFixed(2) : ""} className={`${inputClass} font-numeric`} placeholder="0.00" /></div>
          <div><Label>الحد الشهري</Label><input name="monthlyLimit" type="number" min="0" step="0.01" defaultValue={wallet?.monthlyLimit ?? ""} className={`${inputClass} font-numeric`} placeholder="بدون حد" /></div>
          <div><Label>عمولة الإيداع %</Label><input name="defaultDepositCommission" type="number" min="0" step="0.01" defaultValue={wallet?.depositCommission ?? ""} className={`${inputClass} font-numeric`} placeholder="0" /></div>
          <div><Label>عمولة السحب %</Label><input name="defaultWithdrawalCommission" type="number" min="0" step="0.01" defaultValue={wallet?.withdrawalCommission ?? ""} className={`${inputClass} font-numeric`} placeholder="0" /></div>
          {wallet ? <div className="sm:col-span-2 rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5 text-[10px] font-bold leading-5 text-amber-700">تعديل الرصيد هنا هو تصحيح مباشر ولن ينشئ حركة جديدة في سجل التحويلات.</div> : null}
          <div className="sm:col-span-2 flex gap-2 border-t border-slate-100 pt-4"><Button type="button" variant="outline" onClick={onClose} className="h-10 flex-1 rounded-xl text-xs font-black">إلغاء</Button><Button type="submit" className="h-10 flex-[1.4] rounded-xl bg-teal-600 text-xs font-black shadow-md shadow-teal-600/15 hover:bg-teal-700">{wallet ? "حفظ التعديلات" : "إضافة المحفظة"}</Button></div>
        </form>
      </div>
    </div>
  );
}

const inputClass = "h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-xs font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-100/70";
function Label({ children }: { children: React.ReactNode }) { return <label className="mb-1.5 block text-[11px] font-black text-slate-600">{children}</label>; }
function money(value: number, currency: string) { try { return new Intl.NumberFormat("ar", { style: "currency", currency, maximumFractionDigits: 2 }).format(value); } catch { return `${new Intl.NumberFormat("ar").format(value)} ${currency}`; } }

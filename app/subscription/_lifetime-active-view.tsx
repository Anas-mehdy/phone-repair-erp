import { Check, Crown, Infinity, ShieldCheck, Sparkles } from "lucide-react";

export function LifetimeActiveView({ shopName, activatedAt, price, currencyCode }: { shopName: string; activatedAt: Date | null; price: number | null; currencyCode: string | null }) {
  const features = ["طلبات صيانة غير محدودة", "المبيعات ونقطة البيع", "الفواتير والدفعات والأقساط", "المستودع والمخزون", "دليل التوافقات", "التقارير والأرباح", "حتى 5 مستخدمين", "التحديثات المستمرة للخطة الشاملة"];
  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between"><div><span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700">اشتراك مسار</span><h1 className="mt-2 text-2xl font-black text-slate-950">اشتراكي</h1></div><div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700"><ShieldCheck className="h-4 w-4 text-emerald-600" />المتجر: {shopName}</div></div>

    <section className="overflow-hidden rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-lg shadow-amber-500/10">
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_320px] lg:items-center">
        <div><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-slate-950"><Crown className="h-6 w-6 fill-current" /></span><div><div className="flex items-center gap-2"><h2 className="text-xl font-black text-slate-950 sm:text-2xl">اشتراك مدى الحياة مفعل</h2><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">ACTIVE</span></div><p className="mt-1 text-xs font-semibold text-slate-600">لا يوجد تاريخ انتهاء ولا يحتاج هذا الاشتراك إلى تجديد دوري.</p></div></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">{features.map((feature)=><div key={feature} className="flex items-center gap-2 rounded-xl border border-amber-100 bg-white/80 p-3 text-xs font-bold text-slate-800"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-3.5 w-3.5" /></span>{feature}</div>)}</div>
        </div>
        <aside className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-white"><div className="flex items-center justify-center gap-2 text-amber-300"><Infinity className="h-5 w-5" /><span className="text-xs font-black">مدى الحياة</span></div><div className="mt-4 text-center">{price != null ? <><div className="font-numeric text-4xl font-black">{price.toLocaleString()}</div><div className="mt-1 text-xs font-bold text-slate-400">{currencyCode || ""} — دفعة واحدة</div></> : <div className="text-sm font-black">اشتراك دائم</div>}</div><div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-center text-[11px] font-bold text-slate-300"><Sparkles className="mx-auto mb-1 h-4 w-4 text-amber-300" />{activatedAt ? `مفعل منذ ${activatedAt.toLocaleDateString("ar-SA")}` : "اشتراك مدى الحياة فعال"}</div></aside>
      </div>
    </section>
  </div>;
}

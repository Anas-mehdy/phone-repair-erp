"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Handshake, KeyRound, Link2, PauseCircle, PlayCircle, UserPlus } from "lucide-react";
import {
  adminAssignShopPartnerAction,
  adminCreatePartnerAction,
  adminRemoveShopPartnerAction,
  adminSetPartnerStatusAction,
  adminUpsertPartnerPortalCredentialsAction,
} from "./partner-portal-actions";

export type AdminPartnerPortalRow = {
  id: string;
  code: string;
  name: string;
  type: "AGENT" | "DISTRIBUTOR";
  status: "ACTIVE" | "SUSPENDED";
  discountPercent: number;
  email: string | null;
  portalEmail: string | null;
  portalLastLoginAt: string | null;
  shopCount: number;
};

export type AdminPartnerShopRow = {
  id: string;
  name: string;
  countryCode: string;
  partnerId: string | null;
  partnerName: string | null;
};

export function AdminPartnerPortalManagement({
  partners,
  shops,
}: {
  partners: AdminPartnerPortalRow[];
  shops: AdminPartnerShopRow[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: (form: FormData) => Promise<{ success: boolean; error?: string }>, form: HTMLFormElement) {
    setMessage(null);
    const result = await action(new FormData(form));
    setMessage(result.success ? "تم حفظ التغييرات بنجاح." : result.error || "تعذر تنفيذ العملية.");
    if (result.success) router.refresh();
  }

  return (
    <section className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400"><Handshake className="h-5 w-5" /></div>
        <div>
          <h2 className="text-lg font-black text-white">إدارة الوكلاء وبوابة الموزعين</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">إنشاء الوكيل، بيانات دخوله، وربط العملاء به. التفعيل النهائي يبقى من Super Admin.</p>
        </div>
      </div>

      {message ? <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs font-bold text-cyan-200">{message}</div> : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <form onSubmit={(e) => { e.preventDefault(); void run(adminCreatePartnerAction, e.currentTarget); }} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center gap-2 font-black text-white"><UserPlus className="h-4 w-4 text-cyan-400" /> وكيل جديد</div>
          <input name="name" required placeholder="اسم الوكيل / الشركة" className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-xs text-white" />
          <div className="grid grid-cols-2 gap-2">
            <input name="code" required placeholder="كود الوكيل" dir="ltr" className="rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-xs text-white" />
            <select name="type" className="rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-xs text-white"><option value="AGENT">وكيل</option><option value="DISTRIBUTOR">موزع</option></select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input name="discountPercent" type="number" min="0" max="100" step="0.01" defaultValue="0" placeholder="الخصم %" className="rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-xs text-white" />
            <input name="countryCode" maxLength={2} placeholder="SA / EG" dir="ltr" className="rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-xs text-white" />
          </div>
          <input name="email" type="email" placeholder="بريد التواصل (اختياري)" dir="ltr" className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-xs text-white" />
          <button className="w-full rounded-lg bg-cyan-500 py-2.5 text-xs font-black text-slate-950">إنشاء الوكيل</button>
        </form>

        <form onSubmit={(e) => { e.preventDefault(); void run(adminUpsertPartnerPortalCredentialsAction, e.currentTarget); }} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center gap-2 font-black text-white"><KeyRound className="h-4 w-4 text-amber-400" /> بيانات دخول البوابة</div>
          <select name="partnerId" required className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-xs text-white">
            <option value="">اختر الوكيل</option>
            {partners.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
          </select>
          <input name="email" type="email" required placeholder="بريد الدخول" dir="ltr" className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-xs text-white" />
          <input name="password" type="password" minLength={8} required placeholder="كلمة مرور جديدة — 8 أحرف+" className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-xs text-white" />
          <p className="text-[10px] font-semibold leading-5 text-slate-500">إذا كان للوكيل حساب مسبقًا، حفظ هذه البيانات يغيّر البريد/كلمة المرور ويلغي جلساته القديمة تلقائيًا.</p>
          <button className="w-full rounded-lg bg-amber-400 py-2.5 text-xs font-black text-slate-950">حفظ بيانات الدخول</button>
        </form>

        <form onSubmit={(e) => { e.preventDefault(); void run(adminAssignShopPartnerAction, e.currentTarget); }} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center gap-2 font-black text-white"><Link2 className="h-4 w-4 text-teal-400" /> ربط متجر بوكيل</div>
          <select name="shopId" required className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-xs text-white">
            <option value="">اختر المتجر</option>
            {shops.filter((s) => !s.partnerId).map((s) => <option key={s.id} value={s.id}>{s.name} · {s.countryCode}</option>)}
          </select>
          <select name="partnerId" required className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-xs text-white">
            <option value="">اختر الوكيل</option>
            {partners.filter((p) => p.status === "ACTIVE").map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
          </select>
          <p className="text-[10px] font-semibold leading-5 text-amber-400">بعد الربط سيختفي السعر المباشر وصفحة اشتراك مسار عن العميل ويصبح تجديده عبر الوكيل.</p>
          <button className="w-full rounded-lg bg-teal-500 py-2.5 text-xs font-black text-slate-950">ربط المتجر</button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full min-w-[900px] text-right text-xs">
          <thead className="bg-slate-950 text-slate-400"><tr><th className="p-3">الوكيل</th><th className="p-3">النوع</th><th className="p-3">الخصم</th><th className="p-3">العملاء</th><th className="p-3">دخول البوابة</th><th className="p-3">الحالة</th><th className="p-3">إجراء</th></tr></thead>
          <tbody className="divide-y divide-slate-800">
            {partners.map((p) => (
              <tr key={p.id}>
                <td className="p-3"><div className="font-black text-white">{p.name}</div><div className="text-slate-500">{p.code}</div></td>
                <td className="p-3 text-slate-300">{p.type === "DISTRIBUTOR" ? "موزع" : "وكيل"}</td>
                <td className="p-3 font-black text-cyan-300">{p.discountPercent}%</td>
                <td className="p-3">{p.shopCount}</td>
                <td className="p-3">{p.portalEmail ? <div><div dir="ltr" className="text-slate-300">{p.portalEmail}</div><div className="text-[10px] text-slate-500">{p.portalLastLoginAt ? `آخر دخول ${new Date(p.portalLastLoginAt).toLocaleDateString("ar")}` : "لم يسجل الدخول بعد"}</div></div> : <span className="text-slate-600">لا يوجد حساب</span>}</td>
                <td className="p-3">{p.status === "ACTIVE" ? <span className="text-emerald-400">نشط</span> : <span className="text-amber-400">موقوف</span>}</td>
                <td className="p-3">
                  <form onSubmit={(e) => { e.preventDefault(); void run(adminSetPartnerStatusAction, e.currentTarget); }}>
                    <input type="hidden" name="partnerId" value={p.id} />
                    <input type="hidden" name="status" value={p.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"} />
                    <button className="flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-2 font-black text-slate-300">{p.status === "ACTIVE" ? <PauseCircle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}{p.status === "ACTIVE" ? "إيقاف" : "تفعيل"}</button>
                  </form>
                </td>
              </tr>
            ))}
            {partners.length === 0 ? <tr><td colSpan={7} className="p-6 text-center font-bold text-slate-600">لا يوجد وكلاء حتى الآن.</td></tr> : null}
          </tbody>
        </table>
      </div>

      {shops.some((s) => s.partnerId) ? (
        <div className="space-y-2">
          <div className="text-xs font-black text-slate-300">المتاجر المرتبطة حاليًا</div>
          <div className="flex flex-wrap gap-2">
            {shops.filter((s) => s.partnerId).map((s) => (
              <form key={s.id} onSubmit={(e) => { e.preventDefault(); void run(adminRemoveShopPartnerAction, e.currentTarget); }} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                <input type="hidden" name="shopId" value={s.id} />
                <span className="text-xs font-bold text-slate-300">{s.name} ← {s.partnerName}</span>
                <button className="text-[10px] font-black text-rose-400">فك الربط</button>
              </form>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

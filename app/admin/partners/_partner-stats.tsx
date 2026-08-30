import { BadgeCheck, Ban, Clock3, KeyRound, Send, Store, UsersRound, WalletCards } from "lucide-react";
import type { PartnerAdminStats } from "@/lib/services/partnerAdminStatsService";

function StatCard({ label, value, hint, icon: Icon }: { label: string; value: number | string; hint?: string; icon: typeof UsersRound }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-black text-white">{value}</div>
          <div className="mt-1 text-xs font-black text-slate-300">{label}</div>
          {hint ? <div className="mt-1 text-[10px] font-bold text-slate-500">{hint}</div> : null}
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-teal-300">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export function PartnerStats({ stats }: { stats: PartnerAdminStats }) {
  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="إجمالي الوكلاء" value={stats.totalPartners} hint={`${stats.activePartners} نشط · ${stats.suspendedPartners} موقوف`} icon={UsersRound} />
        <StatCard label="حسابات دخول البوابة" value={stats.portalAccounts} icon={KeyRound} />
        <StatCard label="العملاء المرتبطون" value={stats.managedShops} hint={`${stats.trialingShops} تجريبي · ${stats.activeShops} نشط · ${stats.expiredShops} منتهي`} icon={Store} />
        <StatCard label="طلبات بانتظار الموافقة" value={stats.pendingActivationRequests} icon={Clock3} />
        <StatCard label="طلبات تم تفعيلها" value={stats.approvedActivationRequests} icon={BadgeCheck} />
        <StatCard label="دعوات تسجيل معلقة" value={stats.pendingInvitations} icon={Send} />
        <StatCard label="دعوات تم استخدامها" value={stats.usedInvitations} icon={WalletCards} />
        <StatCard label="الوكلاء الموقوفون" value={stats.suspendedPartners} icon={Ban} />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="text-xs font-black text-slate-300">إجمالي المبالغ المعتمدة لمسار عبر الوكلاء</div>
        {stats.approvedAmountsByCurrency.length === 0 ? (
          <div className="mt-2 text-xs font-bold text-slate-500">لا توجد تفعيلات معتمدة حتى الآن.</div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {stats.approvedAmountsByCurrency.map((item) => (
              <span key={item.currencyCode} className="rounded-xl border border-teal-500/20 bg-teal-500/10 px-3 py-2 text-xs font-black text-teal-200">
                {item.amount.toFixed(2)} {item.currencyCode}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

import {
  ShieldCheck,
} from "lucide-react";
import { SubscriptionPlan } from "@prisma/client";
import { adminService } from "@/lib/services/adminService";
import { subscriptionAdminService } from "@/lib/services/subscriptionAdminService";
import { subscriptionOfferService } from "@/lib/services/subscriptionOfferService";
import { prisma } from "@/lib/prisma";
import { AdminOnlineUsers } from "./_admin-online-users";
import { AdminTabsView } from "./_admin-tabs-view";

export const dynamic = "force-dynamic";

export default async function SuperAdminDashboardPage() {
  const [stats, shops, subscriptions, rawPrices, offer] = await Promise.all([
    adminService.getPlatformStats(),
    adminService.listAllShops(),
    subscriptionAdminService.listSubscriptionsForAdmin(),
    prisma.subscriptionPrice.findMany({
      where: { plan: SubscriptionPlan.PROFESSIONAL },
      orderBy: [
        { countryCode: "asc" },
        { billingInterval: "asc" },
      ],
    }),
    subscriptionOfferService.getOfferSettings(),
  ]);

  const serializedPrices = rawPrices.map((p) => ({
    id: p.id,
    countryCode: p.countryCode,
    plan: p.plan,
    billingInterval: p.billingInterval,
    currencyCode: p.currencyCode,
    amount: Number(p.amount),
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">إحصائيات ولوحة تحكم النظام</h1>
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            مراقبة حية لأداء المنصة، إدارة اشتراكات المتاجر، وتعديل أسعار الاشتراكات وعرض المشتركين الأوائل
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-2xl text-xs font-bold text-slate-300">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>حالة النظام: متصل وتعمل جميع الخدمات بكفاءة</span>
        </div>
      </div>

      <AdminOnlineUsers
        initialOnlineCount={stats.onlineUsersCount}
        initialActiveShopsCount={stats.activeOnlineShopsCount}
      />

      <AdminTabsView
        stats={stats}
        shops={shops}
        subscriptions={subscriptions}
        prices={serializedPrices}
        offer={offer}
      />
    </div>
  );
}

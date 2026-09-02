import { ShieldCheck } from "lucide-react";
import { SubscriptionPlan } from "@prisma/client";
import { adminService } from "@/lib/services/adminService";
import { subscriptionAdminService } from "@/lib/services/subscriptionAdminService";
import { subscriptionOfferService } from "@/lib/services/subscriptionOfferService";
import { lifetimeSubscriptionService } from "@/lib/services/lifetimeSubscriptionService";
import { prisma } from "@/lib/prisma";
import { AdminOnlineUsers } from "./_admin-online-users";
import { AdminTabsView } from "./_admin-tabs-view";
import { AdminLifetimeActivation } from "./_admin-lifetime-activation";

export const dynamic = "force-dynamic";

export default async function SuperAdminDashboardPage() {
  const [stats, shops, subscriptions, rawPrices, offer, lifetimeRows] = await Promise.all([
    adminService.getPlatformStats(),
    adminService.listAllShops(),
    subscriptionAdminService.listSubscriptionsForAdmin(),
    prisma.subscriptionPrice.findMany({ where: { plan: SubscriptionPlan.PROFESSIONAL }, orderBy: [{ countryCode: "asc" }, { billingInterval: "asc" }] }),
    subscriptionOfferService.getOfferSettings(),
    lifetimeSubscriptionService.listLifetimeSubscriptions(),
  ]);

  const serializedPrices = rawPrices.map((p) => ({ id: p.id, countryCode: p.countryCode, plan: p.plan, billingInterval: p.billingInterval, currencyCode: p.currencyCode, amount: Number(p.amount) }));
  const activeLifetimeShopIds = new Set(lifetimeRows.filter((row) => row.isActive).map((row) => row.shopId));
  const subscriptionsForAdmin = subscriptions.map((sub) =>
    activeLifetimeShopIds.has(sub.shopId) && sub.status === "ACTIVE" && sub.billingInterval === null
      ? { ...sub, effectiveStatus: sub.status }
      : sub,
  );
  const lifetimeShops = subscriptions.map((sub) => ({ id: sub.shopId, name: sub.shop.name, countryCode: sub.shop.countryCode }));
  const serializedLifetime = lifetimeRows.map((row) => ({
    id: row.id, shopId: row.shopId, shopName: row.shopName, countryCode: row.countryCode,
    activatedAt: row.activatedAt.toISOString(), pricePaid: row.pricePaid == null ? null : Number(row.pricePaid),
    currencyCode: row.currencyCode, paymentMethod: row.paymentMethod, paymentReference: row.paymentReference, isActive: row.isActive,
  }));

  return <div className="space-y-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><h1 className="text-2xl font-black text-white">إحصائيات ولوحة تحكم النظام</h1><span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" /></div><p className="mt-1 text-xs text-slate-400">مراقبة المنصة، المتاجر، المستخدمين، الاشتراكات المباشرة، وإعدادات النظام.</p></div><div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-300"><ShieldCheck className="h-4 w-4 text-emerald-400" /><span>حالة النظام: متصل وتعمل جميع الخدمات بكفاءة</span></div></div>
    <AdminOnlineUsers initialOnlineCount={stats.onlineUsersCount} initialActiveShopsCount={stats.activeOnlineShopsCount} />
    <AdminLifetimeActivation shops={lifetimeShops} initialLifetime={serializedLifetime} />
    <AdminTabsView stats={stats} shops={shops} subscriptions={subscriptionsForAdmin} prices={serializedPrices} offer={offer} />
  </div>;
}

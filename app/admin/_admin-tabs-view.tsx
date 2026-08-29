"use client";

import { useState } from "react";
import {
  Store,
  Sparkles,
  TrendingUp,
  Wrench,
  Users,
  FileText,
  Truck,
  Activity,
  Globe2,
  Tag,
} from "lucide-react";
import { AdminShopTable, ShopRowData } from "./_admin-shop-table";
import {
  AdminSubscriptionManagement,
  SubscriptionItemData,
} from "./_admin-subscription-management";
import {
  AdminPricingManagement,
  SubscriptionPriceRecord,
} from "./_admin-pricing-management";
import { AdminOfferManagement } from "./_admin-offer-management";
import type { SubscriptionOfferData } from "@/lib/subscription/offer-pricing";


interface AdminTabsViewProps {
  stats: {
    totalShops: number;
    newShopsThisWeek: number;
    totalRepairOrders: number;
    totalCustomers: number;
    totalInvoices: number;
    totalSuppliers: number;
    totalUsers: number;
    currencyBreakdown: { currency: string; count: number }[];
    statusBreakdown: { status: string; count: number }[];
  };
  shops: ShopRowData[];
  subscriptions: SubscriptionItemData[];
  prices: SubscriptionPriceRecord[];
  offer: SubscriptionOfferData;
}

export function AdminTabsView({
  stats,
  shops,
  subscriptions,
  prices,
  offer,
}: AdminTabsViewProps) {
  const [activeTab, setActiveTab] = useState<
    "shops" | "subscriptions" | "pricing" | "offer"
  >("shops");

  return (
    <div className="space-y-6">
      {/* Navigation Tabs Header */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab("shops")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
            activeTab === "shops"
              ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
              : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
          }`}
        >
          <Store className="h-4 w-4" />
          <span>سجل المتاجر والإحصائيات</span>
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-numeric ${
              activeTab === "shops"
                ? "bg-teal-700 text-white"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {shops.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("subscriptions")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
            activeTab === "subscriptions"
              ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
              : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>إدارة الاشتراكات والتفعيل</span>
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-numeric ${
              activeTab === "subscriptions"
                ? "bg-teal-700 text-white"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {subscriptions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("pricing")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
            activeTab === "pricing"
              ? "bg-violet-600 text-white shadow-md shadow-violet-600/20"
              : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
          }`}
        >
          <Globe2 className="h-4 w-4" />
          <span>أسعار الاشتراكات حسب الدولة</span>
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-numeric ${
              activeTab === "pricing"
                ? "bg-violet-700 text-white"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {new Set(prices.map((p) => p.countryCode)).size} دولة
          </span>
        </button>

        <button
          onClick={() => setActiveTab("offer")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
            activeTab === "offer"
              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
              : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
          }`}
        >
          <Tag className="h-4 w-4" />
          <span>عرض المشتركين الأوائل</span>
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-numeric ${
              activeTab === "offer"
                ? "bg-amber-600 text-slate-950 font-black"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {offer.isActive ? `${offer.remainingEligible} متبقي` : "متوقف"}
          </span>
        </button>
      </div>

      {/* Tab 1: Overview & Shops */}
      {activeTab === "shops" && (
        <div className="space-y-8">
          {/* Global Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Total Shops */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 relative overflow-hidden shadow-lg group hover:border-violet-500/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-400">
                  إجمالي المتاجر
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                  <Store className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-white font-numeric tracking-tight">
                  {stats.totalShops}
                </span>
              </div>
              <div className="mt-2 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>+{stats.newShopsThisWeek} هذا الأسبوع</span>
              </div>
            </div>

            {/* Total Repair Orders */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 relative overflow-hidden shadow-lg group hover:border-blue-500/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-400">
                  تذاكر الصيانة
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <Wrench className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-white font-numeric tracking-tight">
                  {stats.totalRepairOrders}
                </span>
              </div>
              <div className="mt-2 text-[10px] font-bold text-slate-500">
                عبر كافة المتاجر
              </div>
            </div>

            {/* Total Customers */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 relative overflow-hidden shadow-lg group hover:border-emerald-500/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-400">
                  العملاء المسجلون
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-white font-numeric tracking-tight">
                  {stats.totalCustomers}
                </span>
              </div>
              <div className="mt-2 text-[10px] font-bold text-slate-500">
                سجل العملاء التراكمي
              </div>
            </div>

            {/* Total Invoices */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 relative overflow-hidden shadow-lg group hover:border-amber-500/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-400">
                  الفواتير الصادرة
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <FileText className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-white font-numeric tracking-tight">
                  {stats.totalInvoices}
                </span>
              </div>
              <div className="mt-2 text-[10px] font-bold text-slate-500">
                صيانة ومبيعات
              </div>
            </div>

            {/* Total Suppliers */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 relative overflow-hidden shadow-lg group hover:border-fuchsia-500/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-400">
                  الموردون
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-400">
                  <Truck className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-white font-numeric tracking-tight">
                  {stats.totalSuppliers}
                </span>
              </div>
              <div className="mt-2 text-[10px] font-bold text-slate-500">
                مورد وتاجر جملة
              </div>
            </div>

            {/* Total System Users */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 relative overflow-hidden shadow-lg group hover:border-cyan-500/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-400">
                  المستخدمون
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-white font-numeric tracking-tight">
                  {stats.totalUsers}
                </span>
              </div>
              <div className="mt-2 text-[10px] font-bold text-slate-500">
                مالك وفني وموظف
              </div>
            </div>
          </div>

          {/* Breakdown Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Breakdown */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-teal-400" />
                  <span>توزيع المتاجر حسب الحالة التشغيلية</span>
                </h3>
              </div>
              <div className="space-y-2.5">
                {stats.statusBreakdown.map((item) => (
                  <div
                    key={item.status}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          item.status === "ACTIVE"
                            ? "bg-emerald-500"
                            : item.status === "TRIALING"
                            ? "bg-amber-500"
                            : "bg-slate-500"
                        }`}
                      />
                      <span className="text-xs font-bold text-slate-300">
                        {item.status === "ACTIVE"
                          ? "اشتراك نشط"
                          : item.status === "TRIALING"
                          ? "فترة تجريبية"
                          : item.status === "GRACE_PERIOD"
                          ? "مهلة سماح"
                          : item.status === "EXPIRED"
                          ? "منتهي"
                          : item.status}
                      </span>
                    </div>
                    <span className="text-xs font-black text-white font-numeric">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Currency Breakdown */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span>توزيع العملات المستخدمة</span>
                </h3>
              </div>
              <div className="space-y-2.5">
                {stats.currencyBreakdown.map((item) => (
                  <div
                    key={item.currency}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80"
                  >
                    <span className="text-xs font-bold text-slate-300 font-numeric">
                      {item.currency}
                    </span>
                    <span className="text-xs font-black text-emerald-400 font-numeric">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Shops Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">سجل المتاجر المشتركة</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  متابعة تذاكر كل متجر، الوصول المباشر للواتساب، وإعادة تعيين كلمات المرور
                </p>
              </div>
            </div>

            <AdminShopTable initialShops={shops} />
          </div>
        </div>
      )}

      {/* Tab 2: Subscription Management */}
      {activeTab === "subscriptions" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-black text-white">
              إدارة اشتراكات المتاجر والتفعيل
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              تفعيل الاشتراكات السنوية ونصف السنوية، منح فترات السماح (Grace Period)، وتمديد الاشتراكات
            </p>
          </div>

          <AdminSubscriptionManagement initialSubscriptions={subscriptions} />
        </div>
      )}

      {/* Tab 3: Country Pricing Management */}
      {activeTab === "pricing" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-black text-white">
              كتالوج أسعار الاشتراكات حسب الدولة
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              إدارة وتعديل أسعار الخطة الشاملة (6 أشهر وسنة) بحسب الدولة والعملة المحلية
            </p>
          </div>

          <AdminPricingManagement initialPrices={prices} />
        </div>
      )}

      {/* Tab 4: Founders Offer Settings */}
      {activeTab === "offer" && (
        <div className="space-y-4">
          <AdminOfferManagement initialOffer={offer} />
        </div>
      )}
    </div>
  );
}

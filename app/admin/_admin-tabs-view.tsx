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
}

export function AdminTabsView({
  stats,
  shops,
  subscriptions,
  prices,
}: AdminTabsViewProps) {
  const [activeTab, setActiveTab] = useState<"shops" | "subscriptions" | "pricing">(
    "shops"
  );

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
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 relative overflow-hidden shadow-lg group hover:border-teal-500/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-400">
                  تذاكر الصيانة
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400">
                  <Wrench className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-white font-numeric tracking-tight">
                  {stats.totalRepairOrders}
                </span>
              </div>
              <div className="mt-2 text-[10px] font-bold text-slate-400">
                عبر كل الورش
              </div>
            </div>

            {/* Total Customers */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 relative overflow-hidden shadow-lg group hover:border-blue-500/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-400">
                  العملاء المسجلون
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-white font-numeric tracking-tight">
                  {stats.totalCustomers}
                </span>
              </div>
              <div className="mt-2 text-[10px] font-bold text-slate-400">
                قاعدة بيانات المنصة
              </div>
            </div>

            {/* Total Invoices */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 relative overflow-hidden shadow-lg group hover:border-amber-500/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-400">
                  الفواتير المنشأة
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
              <div className="mt-2 text-[10px] font-bold text-slate-400">
                صيانة ومبيعات
              </div>
            </div>

            {/* Total Suppliers */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 relative overflow-hidden shadow-lg group hover:border-indigo-500/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-400">
                  الموردون
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Truck className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-white font-numeric tracking-tight">
                  {stats.totalSuppliers}
                </span>
              </div>
              <div className="mt-2 text-[10px] font-bold text-slate-400">
                قطع الغيار
              </div>
            </div>

            {/* Total Users */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 relative overflow-hidden shadow-lg group hover:border-rose-500/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-400">
                  المستخدمون
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-white font-numeric tracking-tight">
                  {stats.totalUsers}
                </span>
              </div>
              <div className="mt-2 text-[10px] font-bold text-slate-400">
                ملاك وفنيين
              </div>
            </div>
          </div>

          {/* Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Globe2 className="h-4 w-4 text-violet-400" />
                  <h3 className="text-xs font-black text-white">
                    توزيع المتاجر حسب العملة / الدولة
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400">
                  {stats.currencyBreakdown.length} دول/عملات
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {stats.currencyBreakdown.map((item) => (
                  <div
                    key={item.currency}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-bold"
                  >
                    <span className="font-numeric text-violet-300">
                      {item.currency}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-violet-500/20 text-white font-numeric">
                      {item.count} متجر
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-teal-400" />
                  <h3 className="text-xs font-black text-white">
                    حالات تذاكر الصيانة المنشأة
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400">
                  إجمالي {stats.totalRepairOrders} تذكرة
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {stats.statusBreakdown.map((item) => (
                  <div
                    key={item.status}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-bold"
                  >
                    <span className="text-slate-300">{item.status}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-teal-500/20 text-teal-300 font-numeric">
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
              إدارة وتعديل أسعار الخطط الأساسية والاحترافية بحسب الدولة والعملة المحلية
            </p>
          </div>

          <AdminPricingManagement initialPrices={prices} />
        </div>
      )}
    </div>
  );
}

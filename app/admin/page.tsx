import {
  Store,
  Wrench,
  Users,
  FileText,
  Truck,
  TrendingUp,
  Globe2,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { adminService } from "@/lib/services/adminService";
import { AdminShopTable } from "./_admin-shop-table";

export const dynamic = "force-dynamic";

export default async function SuperAdminDashboardPage() {
  const [stats, shops] = await Promise.all([
    adminService.getPlatformStats(),
    adminService.listAllShops(),
  ]);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">إحصائيات النظام الشاملة</h1>
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            مراقبة حية لأداء المنصة، نمو المتاجر، تذاكر الصيانة، وقاعدة بيانات العملاء
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-2xl text-xs font-bold text-slate-300">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>حالة النظام: متصل وتعمل جميع الخدمات بكفاءة</span>
        </div>
      </div>

      {/* Global Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Shops */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 relative overflow-hidden shadow-lg group hover:border-violet-500/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400">إجمالي المتاجر</span>
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
            <span className="text-[11px] font-extrabold text-slate-400">تذاكر الصيانة</span>
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
            <span className="text-[11px] font-extrabold text-slate-400">العملاء المسجلون</span>
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
            <span className="text-[11px] font-extrabold text-slate-400">الفواتير المنشأة</span>
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
            <span className="text-[11px] font-extrabold text-slate-400">الموردون</span>
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
            <span className="text-[11px] font-extrabold text-slate-400">المستخدمون</span>
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
        {/* Currencies / Country distribution */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-violet-400" />
              <h3 className="text-xs font-black text-white">توزيع المتاجر حسب العملة / الدولة</h3>
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
                <span className="font-numeric text-violet-300">{item.currency}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-violet-500/20 text-white font-numeric">
                  {item.count} متجر
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tickets Status Breakdown */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-400" />
              <h3 className="text-xs font-black text-white">حالات تذاكر الصيانة المنشأة</h3>
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

      {/* Shops Management Section */}
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
  );
}

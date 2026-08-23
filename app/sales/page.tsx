import { SaleStatus } from "@prisma/client";
import { Eye, Plus, Search, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SaleStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { getCurrentShopContext } from "@/lib/current-shop";
import { isDatabaseConnectionError } from "@/lib/database-errors";
import { salesService } from "@/lib/services/salesService";
import {
  formatDate,
  formatMoney,
  inputClassName,
  saleStatusOptions,
  selectClassName,
} from "./_components";

export const dynamic = "force-dynamic";

type SalesPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
  }>;
};

function toStatus(value?: string) {
  if (!value || value === "ALL") {
    return "ALL";
  }

  return Object.values(SaleStatus).includes(value as SaleStatus)
    ? (value as SaleStatus)
    : "ALL";
}

export default async function SalesPage({ searchParams }: SalesPageProps) {
  const params = await searchParams;
  const search = params.search ?? "";
  const status = toStatus(params.status);
  let sales: Awaited<ReturnType<typeof salesService.listSales>>;

  try {
    const { shopId } = await getCurrentShopContext();
    sales = await salesService.listSales(shopId, {
      search,
      status,
    });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return <DatabaseUnavailable />;
    }

    throw error;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="المبيعات"
        description="سجل عمليات البيع السريعة وتابع الإيصالات المرتبطة بالمخزون"
        actions={
          <Button asChild className="font-semibold shadow-sm">
            <Link href="/sales/new">
              <Plus className="h-4 w-4 ml-1.5" aria-hidden="true" />
              عملية بيع جديدة
            </Link>
          </Button>
        }
      />

      {/* Summary Info Strip */}
      <div className="rounded-2xl border border-amber-200/50 bg-amber-50/15 p-4 text-xs font-semibold text-amber-900/90 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4.5 w-4.5 text-amber-600" aria-hidden="true" />
          <span>
            يوجد حالياً <span className="font-bold font-numeric text-sm text-amber-800">{sales.length}</span> إيصال مبيعات مسجل في النظام.
          </span>
        </div>
        <span className="text-[10px] font-bold text-amber-600 bg-amber-50/80 px-2 py-0.5 rounded-full border border-amber-200/40">
          نقاط البيع والمبيعات
        </span>
      </div>

      {/* Premium Filter Card */}
      <form className="erp-filter-card grid gap-5 sm:grid-cols-[1fr_220px_auto] items-end">
        <div className="grid gap-2 text-xs font-extrabold text-slate-700">
          <span>بحث عن إيصال</span>
          <div className="relative">
            <Search className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              className={`${inputClassName} pr-10`}
              name="search"
              placeholder="ابحث برقم الإيصال، اسم العميل، هاتف العميل..."
              defaultValue={search}
            />
          </div>
        </div>
        <div className="grid gap-2 text-xs font-extrabold text-slate-700">
          <span>تصفية بحسب الحالة</span>
          <select className={selectClassName} name="status" defaultValue={status}>
            <option value="ALL">كل عمليات البيع</option>
            {saleStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Button type="submit" className="w-full sm:w-auto font-bold shadow-sm h-11 px-6 rounded-xl">
            <Search className="h-4 w-4 ml-1.5" aria-hidden="true" />
            تطبيق الفلتر
          </Button>
        </div>
      </form>

      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
        {sales.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="لا توجد عمليات بيع بعد"
            description="ابدأ عملية بيع جديدة وسيتم خصم المخزون تلقائياً للبنود المرتبطة."
            actionHref="/sales/new"
            actionLabel="عملية بيع جديدة"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="erp-table min-w-[820px]">
              <thead>
                <tr>
                  <th className="text-slate-800">رقم الإيصال</th>
                  <th className="text-slate-800">العميل / هاتف العميل</th>
                  <th className="text-slate-800">الإجمالي النهائي</th>
                  <th className="text-slate-800">الحالة</th>
                  <th className="text-slate-800">تاريخ البيع</th>
                  <th className="text-center text-slate-800">عدد البنود</th>
                  <th className="w-28 text-slate-800 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="align-middle">
                    <td className="font-black font-numeric text-slate-900">{sale.receiptNumber ?? "-"}</td>
                    <td className="font-bold text-slate-900">
                      {sale.customer
                        ? `${sale.customer.name}${sale.customer.phone ? ` (${sale.customer.phone})` : ""}`
                        : "عميل نقدي / غير مسجل"}
                    </td>
                    <td className="font-black font-numeric text-slate-900">{formatMoney(sale.total)}</td>
                    <td>
                      <SaleStatusBadge status={sale.status} />
                    </td>
                    <td className="font-numeric text-slate-600 font-medium">{formatDate(sale.soldAt)}</td>
                    <td className="text-center font-numeric font-bold text-slate-800">{sale._count.items}</td>
                    <td className="text-center">
                      <Button asChild variant="outline" size="sm" className="font-bold shadow-xs border-slate-300 hover:bg-primary/10 hover:text-primary hover:border-primary/30 rounded-lg">
                        <Link href={`/sales/${sale.id}`}>
                          <Eye className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
                          عرض
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

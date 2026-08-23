import { Eye, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { getCurrentShopContext } from "@/lib/current-shop";
import { isDatabaseConnectionError } from "@/lib/database-errors";
import { formatDateTime } from "@/lib/format";
import { customerService } from "@/lib/services/customerService";

export const dynamic = "force-dynamic";

const inputClassName =
  "h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

type CustomersPageProps = {
  searchParams: Promise<{
    search?: string;
  }>;
};

export default async function CustomersPage({
  searchParams,
}: CustomersPageProps) {
  const params = await searchParams;
  const search = params.search ?? "";
  let customers: Awaited<ReturnType<typeof customerService.listCustomers>>;

  try {
    const { shopId } = await getCurrentShopContext();
    customers = await customerService.listCustomers(shopId, { search });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return <DatabaseUnavailable />;
    }

    throw error;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="العملاء"
        description="ملف سريع لكل عميل مع طلبات الصيانة والمبيعات والفواتير المرتبطة"
      />

      {/* Summary Info Strip */}
      <div className="rounded-2xl border border-indigo-200/50 bg-indigo-50/15 p-4 text-xs font-semibold text-indigo-900/90 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4.5 w-4.5 text-indigo-600" aria-hidden="true" />
          <span>
            يوجد حالياً <span className="font-bold font-numeric text-sm text-indigo-800">{customers.length}</span> عملاء مسجلين بنشاط في النظام.
          </span>
        </div>
        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-full border border-indigo-200/40">
          دليل العملاء
        </span>
      </div>

      {/* Premium Filter Card */}
      <form className="erp-filter-card grid gap-5 sm:grid-cols-[1fr_auto] items-end">
        <div className="grid gap-2 text-xs font-extrabold text-slate-500">
          <span>بحث عن عميل</span>
          <div className="relative">
            <Search className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              className={`${inputClassName} pr-10`}
              name="search"
              placeholder="ابحث باسم العميل، رقم الهاتف، الهاتف المنسق..."
              defaultValue={search}
            />
          </div>
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
        {customers.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-xs ring-1 ring-indigo-200">
              <UserPlus className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="mt-4 text-sm font-extrabold text-slate-900">لا يوجد عملاء بعد.</p>
            <p className="mt-2 text-xs text-slate-600 max-w-sm leading-relaxed font-medium">
              يتم إنشاء ملفات العملاء تلقائياً في النظام بمجرد تسجيل طلب صيانة جديد أو عملية بيع جديدة.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-2.5 sm:flex-row">
              <Button asChild className="font-bold shadow-xs rounded-xl px-5" size="sm">
                <Link href="/repair-orders/new">طلب صيانة جديد</Link>
              </Button>
              <Button asChild variant="outline" className="font-bold shadow-xs border-slate-300 rounded-xl px-5" size="sm">
                <Link href="/sales/new">عملية بيع POS</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="erp-table min-w-[920px]">
              <thead>
                <tr>
                  <th className="text-slate-800">الاسم الكامل</th>
                  <th className="text-slate-800">الهاتف</th>
                  <th className="text-slate-800">الهاتف المنسق</th>
                  <th className="text-center text-slate-800">طلبات الصيانة</th>
                  <th className="text-center text-slate-800">المبيعات</th>
                  <th className="text-center text-slate-800">الفواتير</th>
                  <th className="text-slate-800">آخر تحديث</th>
                  <th className="w-28 text-slate-800 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="align-middle">
                    <td className="font-black text-slate-900">{customer.name}</td>
                    <td className="font-numeric text-slate-700 font-medium">{customer.phone ?? "-"}</td>
                    <td className="font-numeric text-slate-700 font-medium">
                      {customer.phoneNormalized ?? "-"}
                    </td>
                    <td className="text-center font-black font-numeric text-teal-700">
                      {customer._count.repairOrders}
                    </td>
                    <td className="text-center font-black font-numeric text-amber-700">
                      {customer._count.sales}
                    </td>
                    <td className="text-center font-black font-numeric text-slate-800">
                      {customer._count.invoices}
                    </td>
                    <td className="font-numeric text-slate-600 font-medium">
                      {formatDateTime(customer.updatedAt)}
                    </td>
                    <td className="text-center">
                      <Button asChild variant="outline" size="sm" className="font-bold shadow-xs border-slate-300 hover:bg-primary/10 hover:text-primary hover:border-primary/30 rounded-lg">
                        <Link href={`/customers/${customer.id}`}>
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

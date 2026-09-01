import { Eye, Plus, ReceiptText, Search, Truck } from "lucide-react";
import Link from "next/link";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { getCurrentShopContext } from "@/lib/current-shop";
import { isDatabaseConnectionError } from "@/lib/database-errors";
import { formatDateTime } from "@/lib/format";
import { supplierService } from "@/lib/services/supplierService";
import { createSupplierAction } from "./actions";

export const dynamic = "force-dynamic";

const inputClassName =
  "h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

type SuppliersPageProps = {
  searchParams: Promise<{
    search?: string;
  }>;
};

export default async function SuppliersPage({
  searchParams,
}: SuppliersPageProps) {
  const params = await searchParams;
  const search = params.search ?? "";
  let suppliers: Awaited<ReturnType<typeof supplierService.listSuppliers>> = [];

  try {
    const { shopId } = await getCurrentShopContext();
    suppliers = await supplierService.listSuppliers(shopId, { search });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return <DatabaseUnavailable />;
    }

    throw error;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="الموردون وقطع الغيار"
        description="إدارة ومتابعة موردي قطع الغيار الخارجيين والأجهزة المرتبطة بهم"
        actions={
          <Button asChild variant="outline" className="font-bold">
            <Link href="/suppliers/invoices">
              <ReceiptText className="ml-1.5 h-4 w-4" />
              فواتير الموردين
            </Link>
          </Button>
        }
      />

      <div className="rounded-2xl border border-teal-200/50 bg-teal-50/15 p-4 text-xs font-semibold text-teal-900/90 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Truck className="h-4.5 w-4.5 text-teal-600" aria-hidden="true" />
          <span>
            يوجد حالياً <span className="font-bold font-numeric text-sm text-teal-800">{suppliers.length}</span> موردين مسجلين في النظام.
          </span>
        </div>
        <span className="text-[10px] font-bold text-teal-600 bg-teal-50/80 px-2 py-0.5 rounded-full border border-teal-200/40">
          سجل الموردين
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <form className="erp-filter-card grid gap-4 sm:grid-cols-[1fr_auto] items-end">
            <div className="grid gap-2 text-xs font-extrabold text-slate-700">
              <span>بحث عن مورد</span>
              <div className="relative">
                <Search className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  className={`${inputClassName} pr-10`}
                  name="search"
                  placeholder="ابحث باسم المورد، الهاتف، العنوان..."
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

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
            {suppliers.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 shadow-xs ring-1 ring-teal-200">
                  <Truck className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="mt-4 text-sm font-extrabold text-slate-900">لا يوجد موردون بعد.</p>
                <p className="mt-2 text-xs text-slate-600 max-w-sm leading-relaxed font-medium">
                  يمكنك إضافة مورد جديد من النموذج الجانبي أو تسجيله تلقائياً أثناء إنشاء أي طلب صيانة.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="erp-table min-w-[700px]">
                  <thead>
                    <tr>
                      <th className="text-slate-800">اسم المورد</th>
                      <th className="text-slate-800">رقم الهاتف</th>
                      <th className="text-slate-800">العنوان / الموقع</th>
                      <th className="text-center text-slate-800">أجهزة موردة</th>
                      <th className="text-slate-800">تاريخ الإضافة</th>
                      <th className="w-24 text-slate-800 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((supplier) => (
                      <tr key={supplier.id} className="align-middle">
                        <td className="font-black text-slate-900">{supplier.name}</td>
                        <td className="font-numeric text-slate-700 font-medium">{supplier.phone ?? "-"}</td>
                        <td className="text-slate-600 font-medium text-xs max-w-xs truncate">{supplier.address ?? "-"}</td>
                        <td className="text-center font-black font-numeric text-teal-700">
                          {supplier._count.repairOrders}
                        </td>
                        <td className="font-numeric text-slate-600 font-medium text-xs">
                          {formatDateTime(supplier.createdAt)}
                        </td>
                        <td className="text-center">
                          <Button asChild variant="outline" size="sm" className="font-bold shadow-xs border-slate-300 hover:bg-primary/10 hover:text-primary hover:border-primary/30 rounded-lg">
                            <Link href={`/suppliers/${supplier.id}`}>
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

        <div>
          <form action={createSupplierAction} className="erp-section space-y-4 sticky top-6">
            <div className="border-b border-slate-100/60 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Plus className="h-4 w-4 text-teal-600" />
                إضافة مورد جديد
              </h3>
              <p className="mt-1 text-xs text-slate-400 font-medium">
                سجّل بيانات المورد للوصول السريع له أثناء استلام وتعديل الأجهزة.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-extrabold text-slate-800 block mb-1.5">
                  اسم المورد / المحل <span className="text-rose-500">*</span>
                </label>
                <input
                  name="name"
                  required
                  placeholder="مثال: مؤسسة القمة لقطع الغيار"
                  className={`${inputClassName} w-full`}
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-800 block mb-1.5">
                  رقم الهاتف / واتساب
                </label>
                <input
                  name="phone"
                  inputMode="tel"
                  placeholder="05xxxxxxxx"
                  className={`${inputClassName} w-full font-numeric`}
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-800 block mb-1.5">
                  العنوان أو السوق
                </label>
                <input
                  name="address"
                  placeholder="مثال: العتبة - مول البستان - الدور الثاني"
                  className={`${inputClassName} w-full`}
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-800 block mb-1.5">
                  ملاحظات أو شروط الضمان
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="مثال: ضمان أسبوع على الشاشات ضد عيوب الصناعة..."
                  className="erp-textarea w-full text-xs"
                />
              </div>

              <Button type="submit" className="w-full font-bold shadow-md h-11 rounded-xl">
                <Plus className="h-4 w-4 ml-1.5" />
                حفظ المورد
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

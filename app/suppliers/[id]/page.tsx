import { ArrowRight, Eye, Phone, Save, Trash2, Truck, Wrench, Receipt } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { PageHeader } from "@/components/page-header";
import { RepairStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { getCurrentShopContext } from "@/lib/current-shop";
import { isDatabaseConnectionError } from "@/lib/database-errors";
import { formatCurrency, formatDate } from "@/lib/format";
import { supplierService } from "@/lib/services/supplierService";
import { updateSupplierAction, deleteSupplierAction } from "../actions";

export const dynamic = "force-dynamic";

const inputClassName =
  "h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

type SupplierDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SupplierDetailsPage({
  params,
}: SupplierDetailsPageProps) {
  const { id } = await params;
  let supplier: Awaited<ReturnType<typeof supplierService.getSupplierById>>;
  let currency = "SAR";

  try {
    const context = await getCurrentShopContext();
    currency = context.currency;
    supplier = await supplierService.getSupplierById(context.shopId, id);
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return <DatabaseUnavailable />;
    }

    throw error;
  }

  if (!supplier) {
    notFound();
  }

  const totalPartsCost = supplier.repairOrders.reduce((sum, ro) => {
    return sum + (Number(ro.partCost) || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.name}
        description="تفاصيل المورد وسجل قطع الغيار والأجهزة الموردة"
        actions={
          <Button asChild variant="outline">
            <Link href="/suppliers">
              <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden="true" />
              رجوع للموردين
            </Link>
          </Button>
        }
      />

      {/* Summary KPI Hero */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="erp-section flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-200">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">إجمالي الأجهزة الموردة</p>
            <p className="text-2xl font-black font-numeric text-slate-900 mt-0.5">
              {supplier.repairOrders.length}
            </p>
          </div>
        </div>

        <div className="erp-section flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">إجمالي تكلفة قطع الغيار</p>
            <p className="text-2xl font-black font-numeric text-slate-900 mt-0.5">
              {formatCurrency(totalPartsCost, currency)}
            </p>
          </div>
        </div>

        <div className="erp-section flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-200">
            <Phone className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">رقم الهاتف</p>
            <p className="text-sm font-black font-numeric text-slate-900 mt-0.5" dir="ltr">
              {supplier.phone || "غير مسجل"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Repair Orders List from this supplier */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100/60 p-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Wrench className="h-4 w-4 text-teal-600" />
                سجل الأجهزة وقطع الغيار الموردة
              </h3>
              <span className="text-xs font-bold font-numeric text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {supplier.repairOrders.length} تذكرة
              </span>
            </div>

            {supplier.repairOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">
                لم يتم تسجيل أي طلب صيانة مرتبط بهذا المورد بعد.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="erp-table min-w-[700px]">
                  <thead>
                    <tr>
                      <th className="text-slate-800">رقم التذكرة</th>
                      <th className="text-slate-800">العميل</th>
                      <th className="text-slate-800">الجهاز</th>
                      <th className="text-slate-800">القطعة المشتراة</th>
                      <th className="text-slate-800">تكلفة القطعة</th>
                      <th className="text-slate-800">الحالة</th>
                      <th className="text-slate-800">التاريخ</th>
                      <th className="w-20 text-slate-800 text-center">عرض</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplier.repairOrders.map((ro) => (
                      <tr key={ro.id} className="align-middle">
                        <td className="font-black font-numeric text-slate-900">{ro.ticketNumber}</td>
                        <td className="font-bold text-slate-900">{ro.customer?.name ?? "-"}</td>
                        <td className="font-semibold text-slate-800">
                          {[ro.deviceBrand, ro.deviceModel].filter(Boolean).join(" ") || "-"}
                        </td>
                        <td className="font-medium text-teal-900 text-xs">
                          {ro.partName || "-"}
                        </td>
                        <td className="font-numeric font-black text-slate-900">
                          {ro.partCost ? formatCurrency(ro.partCost, currency) : "-"}
                        </td>
                        <td>
                          <RepairStatusBadge status={ro.status} />
                        </td>
                        <td className="font-numeric text-slate-600 text-xs">
                          {formatDate(ro.createdAt)}
                        </td>
                        <td className="text-center">
                          <Button asChild variant="outline" size="sm" className="font-bold shadow-xs border-slate-300 rounded-lg">
                            <Link href={`/repair-orders/${ro.id}`}>
                              <Eye className="h-3.5 w-3.5 ml-1" />
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

        {/* Edit Supplier Form */}
        <div>
          <form action={updateSupplierAction} className="erp-section space-y-4">
            <input type="hidden" name="supplierId" value={supplier.id} />
            <div className="border-b border-slate-100/60 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">تعديل بيانات المورد</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-extrabold text-slate-800 block mb-1.5">
                  اسم المورد <span className="text-rose-500">*</span>
                </label>
                <input
                  name="name"
                  required
                  defaultValue={supplier.name}
                  className={`${inputClassName} w-full`}
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-800 block mb-1.5">
                  رقم الهاتف
                </label>
                <input
                  name="phone"
                  inputMode="tel"
                  defaultValue={supplier.phone ?? ""}
                  className={`${inputClassName} w-full font-numeric`}
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-800 block mb-1.5">
                  العنوان / الموقع
                </label>
                <input
                  name="address"
                  defaultValue={supplier.address ?? ""}
                  className={`${inputClassName} w-full`}
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-800 block mb-1.5">
                  ملاحظات
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={supplier.notes ?? ""}
                  className="erp-textarea w-full text-xs"
                />
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <SubmitButton className="w-full font-bold shadow-sm h-11 rounded-xl" loadingText="جاري الحفظ...">
                  <Save className="h-4 w-4 ml-1.5" />
                  حفظ التعديلات
                </SubmitButton>
              </div>
            </div>
          </form>

          {/* Delete Supplier Form */}
          <form action={deleteSupplierAction} className="mt-4">
            <input type="hidden" name="supplierId" value={supplier.id} />
            <Button
              type="submit"
              variant="outline"
              className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 font-bold text-xs h-10 rounded-xl"
            >
              <Trash2 className="h-3.5 w-3.5 ml-1.5" />
              حذف المورد
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

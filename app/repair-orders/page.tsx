import { RepairStatus } from "@prisma/client";
import { Eye, Pencil, Plus, Search, Sparkles, Truck, UserRoundCheck, Wrench } from "lucide-react";
import Link from "next/link";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RepairStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { getCurrentShopContext } from "@/lib/current-shop";
import { isDatabaseConnectionError } from "@/lib/database-errors";
import { repairOrderService } from "@/lib/services/repairOrderService";
import {
  formatDate,
  formatMoney,
  inputClassName,
  repairStatusOptions,
  selectClassName,
} from "./_components";
import { DeleteRepairOrderButton } from "./_delete-button";

export const dynamic = "force-dynamic";

type RepairOrdersPageProps = {
  searchParams: Promise<{
    status?: string;
    search?: string;
    assignment?: string;
  }>;
};

function toStatus(value?: string) {
  if (!value || value === "ALL") {
    return "ALL";
  }

  return Object.values(RepairStatus).includes(value as RepairStatus)
    ? (value as RepairStatus)
    : "ALL";
}

function toAssignment(value?: string): "ALL" | "MINE" | "UNASSIGNED" {
  return value === "MINE" || value === "UNASSIGNED" ? value : "ALL";
}

export default async function RepairOrdersPage({
  searchParams,
}: RepairOrdersPageProps) {
  const params = await searchParams;
  const status = toStatus(params.status);
  const search = params.search ?? "";
  const assignment = toAssignment(params.assignment);
  let repairOrders: Awaited<ReturnType<typeof repairOrderService.listRepairOrders>>;

  let currency = "SAR";
  let currentUserId: string | null = null;
  try {
    const context = await getCurrentShopContext();
    currency = context.currency;
    currentUserId = context.userId;
    repairOrders = await repairOrderService.listRepairOrders(context.shopId, {
      status,
      search,
      assignment,
      currentUserId: context.userId ?? undefined,
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
        title="طلبات الصيانة"
        description="تابع الأجهزة من لحظة الاستلام حتى التسليم"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant={assignment === "MINE" ? "default" : "outline"} className="font-bold shadow-sm">
              <Link href="/repair-orders?assignment=MINE">
                <UserRoundCheck className="h-4 w-4 ml-1.5" aria-hidden="true" />
                تذاكري
              </Link>
            </Button>
            <Button asChild className="font-semibold shadow-sm">
              <Link href="/repair-orders/new">
                <Plus className="h-4 w-4 ml-1.5" aria-hidden="true" />
                طلب صيانة جديد
              </Link>
            </Button>
          </div>
        }
      />

      {/* Summary Info Strip */}
      <div className="rounded-2xl border border-teal-200/50 bg-teal-50/15 p-4 text-xs font-semibold text-teal-900/90 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Wrench className="h-4.5 w-4.5 text-teal-600" />
          <span>
            يوجد حالياً <span className="font-bold font-numeric text-sm text-teal-800">{repairOrders.length}</span> تذكرة صيانة مسجلة تطابق التصفية الحالية.
          </span>
        </div>
        <span className="text-[10px] font-bold text-teal-600 bg-teal-50/80 px-2 py-0.5 rounded-full border border-teal-200/40">
          تحديث مباشر
        </span>
      </div>

      {/* Premium Filter Card */}
      <form className="erp-filter-card grid gap-5 sm:grid-cols-2 xl:grid-cols-[1fr_210px_210px_auto] items-end">
        <div className="grid gap-2 text-xs font-extrabold text-slate-700">
          <span>بحث نصي</span>
          <div className="relative">
            <Search className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              className={`${inputClassName} pr-10`}
              name="search"
              placeholder="ابحث برقم الطلب، اسم العميل، الهاتف، المورد، القطعة..."
              defaultValue={search}
            />
          </div>
        </div>
        <div className="grid gap-2 text-xs font-extrabold text-slate-700">
          <span>الفني المسؤول</span>
          <select className={selectClassName} name="assignment" defaultValue={assignment}>
            <option value="ALL">جميع التذاكر</option>
            <option value="MINE">تذاكري فقط</option>
            <option value="UNASSIGNED">غير مسندة</option>
          </select>
        </div>
        <div className="grid gap-2 text-xs font-extrabold text-slate-700">
          <span>تصفية بحسب الحالة</span>
          <select className={selectClassName} name="status" defaultValue={status}>
            <option value="ALL">كل طلبات الصيانة</option>
            {repairStatusOptions.map((option) => (
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
        {repairOrders.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title={assignment === "MINE" ? "لا توجد تذاكر مسندة إليك" : "لا توجد طلبات صيانة بعد"}
            description={
              assignment === "MINE"
                ? "عندما يسند المالك أو المدير تذكرة إليك ستظهر هنا مباشرة."
                : "ابدأ بإنشاء طلب صيانة جديد للعميل وسيظهر هنا مع حالته وتاريخه."
            }
            actionHref="/repair-orders/new"
            actionLabel="طلب صيانة جديد"
          />
        ) : (
          <div className="overflow-x-auto relative">
            <table className="erp-table min-w-[950px]">
              <thead>
                <tr>
                  <th className="whitespace-nowrap text-slate-800">رقم الطلب</th>
                  <th className="whitespace-nowrap text-slate-800">العميل</th>
                  <th className="whitespace-nowrap text-slate-800">الهاتف</th>
                  <th className="whitespace-nowrap text-slate-800">الجهاز</th>
                  <th className="max-w-[200px] text-slate-800">المشكلة</th>
                  <th className="whitespace-nowrap text-slate-800">الحالة</th>
                  <th className="whitespace-nowrap text-slate-800">التكلفة</th>
                  <th className="whitespace-nowrap text-slate-800">المنشئ</th>
                  <th className="whitespace-nowrap text-slate-800">الفني المسؤول</th>
                  <th className="whitespace-nowrap text-slate-800">تاريخ الإنشاء</th>
                  <th className="whitespace-nowrap text-slate-800">التسليم المتوقع</th>
                  <th className="sticky left-0 z-20 bg-slate-100/95 backdrop-blur-xs text-slate-800 text-center whitespace-nowrap px-3 shadow-[-6px_0_12px_rgba(0,0,0,0.06)]">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {repairOrders.map((repairOrder) => (
                  <tr key={repairOrder.id} className="align-middle group hover:bg-slate-50/90 transition">
                    <td className="font-black font-numeric text-slate-900 whitespace-nowrap">{repairOrder.ticketNumber}</td>
                    <td className="font-bold text-slate-900 whitespace-nowrap">{repairOrder.customer?.name ?? "-"}</td>
                    <td className="font-numeric text-slate-600 font-medium whitespace-nowrap">{repairOrder.customer?.phone ?? "-"}</td>
                    <td className="font-semibold text-slate-800">
                      <div className="whitespace-nowrap">
                        {[repairOrder.deviceBrand, repairOrder.deviceModel]
                          .filter(Boolean)
                          .join(" ") || "-"}
                      </div>
                      {(repairOrder.supplierName || repairOrder.supplier || repairOrder.partName) ? (
                        <div className="flex items-center gap-1 text-[10px] text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded-md w-fit mt-1 border border-teal-100 font-bold whitespace-nowrap">
                          <Truck className="h-3 w-3 text-teal-600" />
                          <span>{repairOrder.partName || "قطعة خارجية"} {repairOrder.supplier?.name ?? repairOrder.supplierName ? `(${repairOrder.supplier?.name ?? repairOrder.supplierName})` : ""}</span>
                        </div>
                      ) : null}
                    </td>
                    <td className="max-w-[200px] text-slate-600 font-medium">
                      <span className="line-clamp-2 leading-relaxed">
                        {repairOrder.reportedIssue}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">
                      <RepairStatusBadge status={repairOrder.status} />
                    </td>
                    <td className="font-black font-numeric text-slate-900 whitespace-nowrap">{formatMoney(repairOrder.estimatedTotal, currency)}</td>
                    <td className="whitespace-nowrap">
                      {repairOrder.createdByUser ? (
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 text-xs truncate max-w-[130px]">
                            {repairOrder.createdByUser.name}
                          </div>
                          <span className="inline-block text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/60">
                            {repairOrder.createdByUser.role === "OWNER"
                              ? "المالك"
                              : repairOrder.createdByUser.role === "ADMIN"
                              ? "مدير فرع"
                              : repairOrder.createdByUser.role === "TECHNICIAN"
                              ? "فني صيانة"
                              : "مشاهد"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium text-xs">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {repairOrder.assignedToUser ? (
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                            <UserRoundCheck className="h-3.5 w-3.5" />
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {repairOrder.assignedToUser.name}
                            </div>
                            {repairOrder.assignedToUserId === currentUserId && !repairOrder.assignmentSeenAt ? (
                              <span className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-black text-amber-800">
                                <Sparkles className="h-2.5 w-2.5" />
                                جديدة
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">
                          غير مسندة
                        </span>
                      )}
                    </td>
                    <td className="font-numeric text-slate-600 font-medium whitespace-nowrap">{formatDate(repairOrder.createdAt)}</td>
                    <td className="font-numeric text-slate-600 font-medium whitespace-nowrap">{formatDate(repairOrder.dueAt)}</td>
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 text-center whitespace-nowrap px-3 shadow-[-6px_0_12px_rgba(0,0,0,0.06)]">
                      <div className="flex items-center justify-center gap-1.5 shrink-0">
                        <Button asChild variant="outline" size="sm" className="h-8 px-2.5 font-bold shadow-xs border-slate-300 hover:bg-primary/10 hover:text-primary hover:border-primary/30 rounded-lg text-xs">
                          <Link href={`/repair-orders/${repairOrder.id}`}>
                            <Eye className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
                            عرض
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="h-8 px-2.5 font-bold shadow-xs border-slate-300 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 rounded-lg text-slate-700 text-xs">
                          <Link href={`/repair-orders/${repairOrder.id}/edit`} title="تعديل تذكرة الصيانة">
                            <Pencil className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
                            تعديل
                          </Link>
                        </Button>
                        <DeleteRepairOrderButton
                          repairOrderId={repairOrder.id}
                          ticketNumber={repairOrder.ticketNumber}
                          variant="icon"
                        />
                      </div>
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

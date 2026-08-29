import QRCode from "qrcode";
import { AlertTriangle, ArrowRight, Calculator, CheckCircle2, FileText, History, Pencil, Printer, QrCode, Tag, Truck, UserRoundCheck, Wrench } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { RepairStatusBadge, repairStatusLabels } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { getCurrentShopContext } from "@/lib/current-shop";
import { isDatabaseConnectionError } from "@/lib/database-errors";
import { repairOrderService } from "@/lib/services/repairOrderService";
import { supplierService } from "@/lib/services/supplierService";
import { inventoryService } from "@/lib/services/inventoryService";
import { createInvoiceFromRepairOrderAction } from "@/app/invoices/actions";
import {
  Field,
  formatDate,
  formatMoney,
  inputClassName,
  selectClassName,
  textareaClassName,
} from "../_components";
import { SupplierFields } from "../_supplier-fields";
import { WhatsAppMessageModal } from "../_whatsapp-modal";
import { StatusUpdateForm } from "../_status-form";
import { DeleteRepairOrderButton } from "../_delete-button";
import { CopyTrackingLinkButton } from "../_copy-tracking-button";
import {
  assignRepairOrderAction,
  updateRepairOrderDetailsAction,
} from "../actions";
import { AssignmentSeenMarker } from "../_assignment-seen-marker";

export const dynamic = "force-dynamic";

type RepairOrderDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    invoiceError?: string;
  }>;
};

function dateInputValue(value: Date | null) {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

export default async function RepairOrderDetailsPage({
  params,
  searchParams,
}: RepairOrderDetailsPageProps) {
  const { id } = await params;
  const query = await searchParams;
  let repairOrder: Awaited<ReturnType<typeof repairOrderService.getRepairOrderById>>;
  let suppliers: Awaited<ReturnType<typeof supplierService.listSuppliers>> = [];
  let inventoryItems: Awaited<ReturnType<typeof inventoryService.listInventoryItems>> = [];
  let technicians: Awaited<ReturnType<typeof repairOrderService.listAssignableTechnicians>> = [];

  let shopId = "";
  let currency = "SAR";
  let shopName = "";
  let currentUserId: string | null = null;
  let canAssign = false;
  try {
    const context = await getCurrentShopContext();
    shopId = context.shopId;
    currency = context.currency;
    shopName = context.shopName;
    currentUserId = context.userId;
    canAssign = context.permissions.includes("repairs:assign");
    [repairOrder, suppliers, inventoryItems, technicians] = await Promise.all([
      repairOrderService.getRepairOrderById(context.shopId, id),
      supplierService.listSuppliers(context.shopId),
      inventoryService.listInventoryItems(context.shopId),
      canAssign
        ? repairOrderService.listAssignableTechnicians(context.shopId)
        : Promise.resolve([]),
    ]);
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return <DatabaseUnavailable />;
    }

    throw error;
  }

  if (!repairOrder) {
    notFound();
  }

  const isNewAssignmentForCurrentUser =
    repairOrder.assignedToUserId === currentUserId && !repairOrder.assignmentSeenAt;

  const serializedInventory = inventoryItems.map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    quantity: item.quantity,
    unitPrice: item.unitPrice.toString(),
    unitCost: item.unitCost ? item.unitCost.toString() : null,
  }));

  const repairPrice = Number(repairOrder.finalTotal ?? repairOrder.estimatedTotal ?? 0);
  const partCostNum = Number(repairOrder.partCost ?? 0);
  const netProfit = repairOrder.deductPartCost ? Math.max(0, repairPrice - partCostNum) : repairPrice;

  const existingInvoice = repairOrder.invoices[0];
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const trackingUrl = `${protocol}://${host}/track/${repairOrder.id}`;

  const qrCodeDataUrl = await QRCode.toDataURL(trackingUrl, {
    margin: 1,
    width: 140,
    errorCorrectionLevel: "L",
  });

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      {isNewAssignmentForCurrentUser ? (
        <AssignmentSeenMarker repairOrderId={repairOrder.id} />
      ) : null}
      {/* Top summary hero card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm shadow-slate-200/50 min-w-0 max-w-full overflow-hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-teal-800 text-white shadow-md shadow-primary/20">
              <Wrench className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] sm:text-xs font-extrabold text-slate-500 uppercase tracking-wider">تفاصيل تذكرة الصيانة</span>
                <span className="text-[10px] sm:text-[11px] font-bold text-teal-800 bg-teal-50 px-2 sm:px-2.5 py-0.5 rounded-full border border-teal-200">تذكرة نشطة</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-numeric mt-1 truncate">
                {repairOrder.ticketNumber}
              </h2>
              <p className="text-xs font-medium text-slate-600 mt-1 truncate">
                جهاز العميل: <span className="font-bold text-slate-900">{[repairOrder.deviceBrand, repairOrder.deviceModel].filter(Boolean).join(" ") || "-"}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2 sm:pt-0">
            <Button asChild variant="outline" className="font-bold shadow-xs border-teal-300 hover:bg-teal-50 text-teal-800 rounded-xl px-4 h-10 text-xs flex-1 sm:flex-initial">
              <Link href={`/repair-orders/${repairOrder.id}/edit`}>
                <Pencil className="h-3.5 w-3.5 ml-1.5" aria-hidden="true" />
                تعديل بيانات التذكرة
              </Link>
            </Button>
            <Button asChild variant="outline" className="font-bold shadow-xs border-slate-300 hover:bg-slate-50 rounded-xl px-4 h-10 text-xs flex-1 sm:flex-initial">
              <Link href="/repair-orders">
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" aria-hidden="true" />
                رجوع للقائمة
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {query.invoiceError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
          {query.invoiceError}
        </div>
      ) : null}

      {/* 2-column layout */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] min-w-0 max-w-full">
        {/* Main Column */}
        <div className="space-y-6 min-w-0 max-w-full">
          {/* General Information Card */}
          <div className="erp-section">
            <div className="border-b border-slate-100/60 pb-3 mb-5 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-slate-800 text-sm">المعلومات العامة</h3>
              <RepairStatusBadge status={repairOrder.status} />
            </div>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <Info label="اسم العميل" value={repairOrder.customer?.name ?? "-"} />
              <Info label="رقم الهاتف" value={<span className="font-numeric">{repairOrder.customer?.phone ?? "-"}</span>} />
              <Info
                label="جهاز الصيانة"
                value={[repairOrder.deviceBrand, repairOrder.deviceModel].filter(Boolean).join(" ") || "-"}
              />
              <Info label="الرقم التسلسلي" value={<span className="font-numeric">{repairOrder.deviceSerial ?? "-"}</span>} />
              <Info label="سعر الصيانة المتوقع" value={<span className="font-numeric">{formatMoney(repairOrder.estimatedTotal, currency)}</span>} />
              <Info label="سعر الصيانة النهائي" value={<span className="font-numeric">{formatMoney(repairOrder.finalTotal, currency)}</span>} />
              <Info label="الفني المسؤول" value={repairOrder.assignedToUser?.name ?? "غير مسندة"} />
              <Info
                label="أنشئت بواسطة"
                value={
                  repairOrder.createdByUser ? (
                    <span className="font-bold text-slate-800">
                      {repairOrder.createdByUser.name}{" "}
                      <span className="text-[11px] font-medium text-teal-700">
                        ({repairOrder.createdByUser.role === "OWNER" ? "المالك" : repairOrder.createdByUser.role === "ADMIN" ? "مدير فرع" : repairOrder.createdByUser.role === "TECHNICIAN" ? "فني صيانة" : "مشاهد"})
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium">سجل سابق (المالك)</span>
                  )
                }
              />
              <Info
                label="آخر تعديل بواسطة"
                value={
                  repairOrder.updatedByUser ? (
                    <span className="font-bold text-slate-800">
                      {repairOrder.updatedByUser.name}{" "}
                      <span className="text-[11px] font-medium text-teal-700">
                        ({repairOrder.updatedByUser.role === "OWNER" ? "المالك" : repairOrder.updatedByUser.role === "ADMIN" ? "مدير فرع" : repairOrder.updatedByUser.role === "TECHNICIAN" ? "فني صيانة" : "مشاهد"})
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium">-</span>
                  )
                }
              />
              <Info label="تاريخ الاستلام" value={<span className="font-numeric">{formatDate(repairOrder.createdAt)}</span>} />
              <Info label="التسليم المتوقع" value={<span className="font-numeric">{formatDate(repairOrder.dueAt)}</span>} />
              <Info label="تاريخ الانتهاء" value={<span className="font-numeric">{formatDate(repairOrder.completedAt)}</span>} />
              <Info label="تاريخ التسليم الفعلي" value={<span className="font-numeric">{formatDate(repairOrder.deliveredAt)}</span>} />
            </div>

            {/* Supplier & Parts info box (Workshop only) */}
            {(repairOrder.items.length > 0 || repairOrder.supplierName || repairOrder.supplier || repairOrder.partName || repairOrder.partCost) ? (
              <div className="mt-6 border-t border-slate-100/60 pt-5">
                <div className="rounded-2xl border border-teal-200/80 bg-teal-50/40 p-3.5 sm:p-4 space-y-4 min-w-0 max-w-full overflow-hidden">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
                      <Truck className="h-4 w-4 text-teal-700 shrink-0" />
                      <span>بيانات قطع الغيار والموردين (خاص بالورشة)</span>
                    </div>
                    {repairPrice > 0 && partCostNum > 0 ? (
                      <div className="flex items-center gap-2 bg-teal-900 text-white px-3 py-1 rounded-xl text-xs font-bold">
                        <Calculator className="h-3.5 w-3.5 text-teal-300 shrink-0" />
                        <span>صافي ربح الصيانة:</span>
                        <span className="font-numeric font-black text-teal-200">{formatMoney(netProfit, currency)}</span>
                      </div>
                    ) : null}
                  </div>

                  {repairOrder.items.length > 0 ? (
                    <div className="space-y-2">
                      <div className="overflow-x-auto -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
                        <table className="w-full text-right text-xs min-w-[480px]">
                          <thead>
                            <tr className="border-b border-teal-200/60 text-slate-500 font-bold">
                              <th className="py-2 px-3">القطعة</th>
                              <th className="py-2 px-3">المصدر / المورد</th>
                              <th className="py-2 px-3 text-center">الكمية</th>
                              <th className="py-2 px-3 font-numeric">سعر التكلفة</th>
                              <th className="py-2 px-3 font-numeric">إجمالي التكلفة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-teal-100/60">
                            {repairOrder.items.map((item) => {
                              const lineCost = Number(item.unitCost || 0) * item.quantity;
                              return (
                                <tr key={item.id} className="text-slate-800 font-medium">
                                  <td className="py-2.5 px-3 font-bold">
                                    {item.partName}
                                    {item.notes ? (
                                      <span className="block text-[11px] font-normal text-slate-500">{item.notes}</span>
                                    ) : null}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {item.inventoryItem ? (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-teal-100 px-2 py-0.5 text-[11px] font-bold text-teal-800">
                                        مخزون داخلي
                                      </span>
                                    ) : (
                                      <span className="text-slate-600">
                                        {item.supplier?.name ?? item.supplierName ?? "مورد خارجي"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-numeric font-bold">{item.quantity}</td>
                                  <td className="py-2.5 px-3 font-numeric">{formatMoney(item.unitCost, currency)}</td>
                                  <td className="py-2.5 px-3 font-numeric font-bold text-teal-950">
                                    {formatMoney(lineCost, currency)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Info label="المورد" value={repairOrder.supplier?.name ?? repairOrder.supplierName ?? "-"} />
                      <Info label="القطعة المشتراة" value={repairOrder.partName ?? "-"} />
                      <Info label="تكلفة شراء القطعة" value={<span className="font-numeric">{formatMoney(repairOrder.partCost, currency)}</span>} />
                      <Info
                        label="حالة خصم التكلفة"
                        value={
                          repairOrder.deductPartCost ? (
                            <span className="text-xs font-bold text-teal-700">مخصومة من الأرباح</span>
                          ) : (
                            <span className="text-xs font-bold text-slate-500">غير مخصومة</span>
                          )
                        }
                      />
                    </div>
                  )}

                  {repairOrder.supplierNotes ? (
                    <div className="text-xs font-medium text-slate-600 bg-white/80 p-2.5 rounded-xl border border-teal-100">
                      <span className="font-bold text-slate-800 ml-1">ملاحظات الضمان والمورد:</span>
                      {repairOrder.supplierNotes}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 border-t border-slate-100/60 pt-5">
              <Info label="المشكلة المبلغ عنها" value={<p className="leading-relaxed text-slate-600 text-xs font-medium">{repairOrder.reportedIssue}</p>} />
              <Info label="التشخيص الفني" value={<p className="leading-relaxed text-slate-600 text-xs font-medium">{repairOrder.diagnosis ?? "-"}</p>} />
              <Info label="ملاحظات الحل والإصلاح" value={<p className="leading-relaxed text-slate-600 text-xs font-medium">{repairOrder.resolutionNotes ?? "-"}</p>} />
            </div>
          </div>

          {/* Form modifications */}
          <div className="grid gap-6 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)] min-w-0 max-w-full">
            {/* Status Update Card */}
            <StatusUpdateForm repairOrderId={repairOrder.id} currentStatus={repairOrder.status} />

            {/* Edit details form */}
            <form action={updateRepairOrderDetailsAction} className="erp-section space-y-6">
              <input type="hidden" name="repairOrderId" value={repairOrder.id} />
              <div className="border-b border-slate-100/60 pb-3 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm">تعديل بيانات طلب الصيانة</h3>
                <Button asChild variant="outline" size="sm" className="font-bold border-teal-300 hover:bg-teal-50 text-teal-800 text-xs rounded-lg">
                  <Link href={`/repair-orders/${repairOrder.id}/edit`}>
                    <Pencil className="h-3 w-3 ml-1" />
                    صفحة التعديل الشاملة
                  </Link>
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="اسم العميل">
                  <input className={inputClassName} name="customerName" defaultValue={repairOrder.customer?.name ?? ""} />
                </Field>
                <Field label="رقم الهاتف">
                  <input className={`${inputClassName} font-numeric`} name="customerPhone" defaultValue={repairOrder.customer?.phone ?? ""} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="ملاحظات العميل">
                    <input className={inputClassName} name="customerNotes" defaultValue={repairOrder.customer?.notes ?? ""} placeholder="ملاحظات العميل..." />
                  </Field>
                </div>
                <Field label="الشركة المصنعة">
                  <input className={inputClassName} name="deviceBrand" defaultValue={repairOrder.deviceBrand ?? ""} />
                </Field>
                <Field label="الموديل">
                  <input className={inputClassName} name="deviceModel" defaultValue={repairOrder.deviceModel ?? ""} />
                </Field>
                <Field label="الرقم التسلسلي (SN)">
                  <input className={`${inputClassName} font-numeric`} name="deviceSerial" defaultValue={repairOrder.deviceSerial ?? ""} />
                </Field>
                <Field label="التكلفة التقديرية للعميل">
                  <input className={`${inputClassName} font-numeric`} name="estimatedTotal" defaultValue={repairOrder.estimatedTotal?.toString() ?? ""} inputMode="decimal" />
                </Field>
                <Field label="التكلفة النهائية للعميل">
                  <input className={`${inputClassName} font-numeric`} name="finalTotal" defaultValue={repairOrder.finalTotal?.toString() ?? ""} inputMode="decimal" />
                </Field>
                <Field label="تاريخ التسليم المتوقع">
                  <input className={`${inputClassName} font-numeric`} name="dueAt" type="date" defaultValue={dateInputValue(repairOrder.dueAt)} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="المشكلة المبلغ عنها">
                    <textarea className={textareaClassName} name="reportedIssue" required defaultValue={repairOrder.reportedIssue} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="التشخيص الفني">
                    <textarea className={textareaClassName} name="diagnosis" defaultValue={repairOrder.diagnosis ?? ""} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="ملاحظات الحل والإصلاح">
                    <textarea className={textareaClassName} name="resolutionNotes" defaultValue={repairOrder.resolutionNotes ?? ""} />
                  </Field>
                </div>
              </div>

              {/* Supplier & Parts in Edit Mode */}
              <SupplierFields
                suppliers={suppliers}
                inventoryItems={serializedInventory}
                currency={currency}
                defaultSupplierName={repairOrder.supplier?.name ?? repairOrder.supplierName ?? ""}
                defaultPartName={repairOrder.partName ?? ""}
                defaultPartCost={repairOrder.partCost?.toString() ?? ""}
                defaultDeductPartCost={repairOrder.deductPartCost}
                defaultSupplierNotes={repairOrder.supplierNotes ?? ""}
                initialItems={repairOrder.items.map((item) => ({
                  id: item.id,
                  inventoryItemId: item.inventoryItemId,
                  supplierId: item.supplierId,
                  supplierName: item.supplier?.name ?? item.supplierName,
                  partName: item.partName,
                  quantity: item.quantity,
                  unitCost: item.unitCost ? item.unitCost.toString() : "0",
                  unitPrice: item.unitPrice ? item.unitPrice.toString() : "0",
                  notes: item.notes,
                }))}
                readOnly={repairOrder.status === "CANCELLED"}
              />

              <div className="flex justify-end">
                <SubmitButton className="font-bold shadow-sm px-6 rounded-xl h-11" loadingText="جاري الحفظ...">
                  حفظ البيانات المحدثة
                </SubmitButton>
              </div>
            </form>
          </div>

          {/* Timeline tracking */}
          <div className="erp-section">
            <div className="border-b border-slate-100/60 pb-3 mb-4">
              <h3 className="font-bold text-slate-800 text-sm">سجل تتبع حركة الصيانة</h3>
            </div>
            {repairOrder.statusHistory.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium py-4 text-center">
                لا توجد حركات مسجلة في سجل طلب الصيانة بعد.
              </p>
            ) : (
              <ol className="relative border-r border-slate-200 space-y-6 mr-3 mt-6">
                {repairOrder.statusHistory.map((history) => (
                  <li key={history.id} className="relative pr-6">
                    <span className="absolute right-[-5px] top-1.5 flex h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary/5" />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                        <span className="text-slate-400 font-medium">من:</span>
                        {history.fromStatus ? (
                          <RepairStatusBadge status={history.fromStatus} />
                        ) : (
                          <span className="text-slate-400 font-medium">بداية الطلب</span>
                        )}
                        <span className="text-slate-400 font-medium">إلى:</span>
                        <RepairStatusBadge status={history.toStatus} />
                      </div>
                      <span className="font-numeric text-[10px] font-semibold text-slate-400">
                        {formatDate(history.createdAt)}
                      </span>
                    </div>
                    {history.note ? (
                      <p className="mt-2 text-xs text-slate-500 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100/50 max-w-2xl font-medium">
                        {history.note}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Side Panel Column */}
        <div className="space-y-6">
          <div className="erp-section">
            <div className="flex items-center gap-3 border-b border-slate-100/60 pb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                <UserRoundCheck className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-xs font-black text-slate-900">الفني المسؤول</h3>
                <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                  {repairOrder.assignedToUser?.name ?? "لم تُسند التذكرة بعد"}
                </p>
              </div>
            </div>

            {repairOrder.assignedToUser ? (
              <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3 text-[11px] font-semibold text-violet-900">
                {repairOrder.assignmentSeenAt
                  ? "فتح الفني هذه التذكرة وأصبحت ضمن مهامه."
                  : "التذكرة جديدة ولم يفتحها الفني بعد."}
              </div>
            ) : null}

            {canAssign ? (
              <form action={assignRepairOrderAction} className="mt-4 space-y-3">
                <input type="hidden" name="repairOrderId" value={repairOrder.id} />
                <label className="grid gap-2 text-xs font-extrabold text-slate-700">
                  اختيار أو تغيير الفني
                  <select
                    className={selectClassName}
                    name="assignedToUserId"
                    defaultValue={repairOrder.assignedToUserId ?? ""}
                  >
                    <option value="">غير مسندة</option>
                    {technicians.map((technician) => (
                      <option key={technician.id} value={technician.id}>
                        {technician.name}
                      </option>
                    ))}
                  </select>
                </label>
                <SubmitButton className="w-full rounded-xl font-bold" loadingText="جاري الإسناد...">
                  حفظ الإسناد
                </SubmitButton>
              </form>
            ) : null}

            {repairOrder.assignmentHistory.length > 0 ? (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-black text-slate-700">
                  <History className="h-3.5 w-3.5 text-slate-400" />
                  آخر عمليات الإسناد
                </div>
                <div className="space-y-2">
                  {repairOrder.assignmentHistory.slice(0, 4).map((event) => (
                    <div key={event.id} className="rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] leading-relaxed text-slate-600">
                      <span className="font-black text-slate-800">
                        {event.toUser?.name ?? "إلغاء الإسناد"}
                      </span>
                      {event.changedByUser ? (
                        <span> بواسطة {event.changedByUser.name}</span>
                      ) : null}
                      <span className="mt-0.5 block font-numeric text-slate-400">
                        {formatDate(event.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* QR Code and Actions Box */}
          <div className="erp-section text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/5 text-primary ring-1 ring-primary/10 shadow-sm shadow-primary/5">
              <QrCode className="h-5.5 w-5.5" aria-hidden="true" />
            </div>
            <h3 className="mt-3 text-xs font-black text-slate-800 uppercase tracking-wider">رمز تذكرة الصيانة QR</h3>
            <div className="relative mx-auto mt-4 h-44 w-44 rounded-2xl border border-slate-200/50 bg-white p-3 shadow-inner">
              <Image
                src={qrCodeDataUrl}
                alt={`QR ${repairOrder.ticketNumber}`}
                width={160}
                height={160}
                unoptimized
                className="mx-auto h-full w-full rounded-xl"
              />
            </div>
            <p className="mt-3.5 font-numeric text-xs font-extrabold text-slate-400 tracking-wide">{repairOrder.ticketNumber}</p>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <CopyTrackingLinkButton trackingUrl={trackingUrl} />
            </div>
          </div>

          {/* Business Actions Container */}
          <div className="erp-section space-y-4">
            <div className="border-b border-slate-100/60 pb-3">
              <h4 className="text-xs font-extrabold text-slate-800">إجراءات صيانة سريعة</h4>
            </div>

            {/* Accounting Notice Alert */}
            {!existingInvoice ? (
              <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 p-3 text-xs leading-relaxed text-amber-900 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
                  <div className="space-y-1">
                    <p className="font-black text-amber-950 text-xs">تنبيه مالي:</p>
                    <p className="font-medium text-amber-900 text-[11px] leading-normal">
                      تسجيل التذكرة لا يضيف قيمتها تلقائياً للإيرادات — اضغط على <strong className="font-bold underline decoration-amber-400">&quot;إنشاء فاتورة صيانة&quot;</strong> لاحتسابها في المبيعات والتقارير المالية وضمان الجهاز.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-2.5 text-xs text-emerald-900 shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  <p className="font-bold text-emerald-950 text-[11px]">
                    تمت فوترة هذه التذكرة برقم ({existingInvoice.invoiceNumber})
                  </p>
                </div>
              </div>
            )}

            {/* WhatsApp Updates Box */}
            <div className="space-y-2.5">
              <WhatsAppMessageModal
                shopId={shopId}
                customerName={repairOrder.customer?.name}
                customerPhone={repairOrder.customer?.phone}
                deviceBrand={repairOrder.deviceBrand}
                deviceModel={repairOrder.deviceModel}
                ticketNumber={repairOrder.ticketNumber}
                statusLabel={repairStatusLabels[repairOrder.status] || repairOrder.status}
                totalAmount={(repairOrder.finalTotal ?? repairOrder.estimatedTotal)?.toString() ?? null}
                shopName={shopName}
                currency={currency}
                trackingUrl={trackingUrl}
              />

              {/* Invoice Integration Box */}
              {existingInvoice ? (
                <Button asChild className="w-full font-bold shadow-sm rounded-xl py-5 text-xs justify-center hover:bg-blue-50 hover:text-blue-700 border-slate-200" variant="outline">
                  <Link href={`/invoices/${existingInvoice.id}`}>
                    <FileText className="h-4.5 w-4.5 ml-2 text-blue-600 shrink-0" aria-hidden="true" />
                    عرض الفاتورة الحالية
                  </Link>
                </Button>
              ) : (
                <form action={createInvoiceFromRepairOrderAction} className="w-full">
                  <input type="hidden" name="repairOrderId" value={repairOrder.id} />
                  <SubmitButton
                    variant="outline"
                    className="w-full font-bold shadow-sm rounded-xl py-5 text-xs justify-center hover:bg-teal-50 hover:text-teal-700 border-slate-200"
                    loadingText="جاري إنشاء فاتورة الصيانة وتحويلك..."
                    icon={<FileText className="h-4.5 w-4.5 ml-2 text-teal-600 shrink-0" aria-hidden="true" />}
                  >
                    إنشاء فاتورة صيانة
                  </SubmitButton>
                </form>
              )}

              <Button asChild variant="outline" className="w-full font-bold shadow-sm rounded-xl py-5 text-xs justify-center hover:bg-slate-50 hover:text-slate-900 border-slate-200">
                <Link href={`/repair-orders/${repairOrder.id}/print`} target="_blank">
                  <Printer className="h-4.5 w-4.5 ml-2 text-slate-700 shrink-0" aria-hidden="true" />
                  طباعة إيصال استلام الصيانة
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full font-bold shadow-sm rounded-xl py-5 text-xs justify-center hover:bg-teal-50 hover:text-teal-900 hover:border-teal-300 border-slate-200 bg-teal-50/30 text-teal-950 transition">
                <Link href={`/repair-orders/${repairOrder.id}/sticker`} target="_blank">
                  <Tag className="h-4.5 w-4.5 ml-2 text-teal-600 shrink-0" aria-hidden="true" />
                  طباعة ستيكر الهاتف (50×30 مم)
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full font-bold shadow-sm rounded-xl py-5 text-xs justify-center hover:bg-teal-50 hover:text-teal-900 hover:border-teal-300 border-slate-200 text-slate-800 transition">
                <Link href={`/repair-orders/${repairOrder.id}/edit`}>
                  <Pencil className="h-4.5 w-4.5 ml-2 text-teal-600 shrink-0" aria-hidden="true" />
                  تعديل بيانات التذكرة بالكامل
                </Link>
              </Button>

              <div className="pt-2 border-t border-slate-100">
                <DeleteRepairOrderButton
                  repairOrderId={repairOrder.id}
                  ticketNumber={repairOrder.ticketNumber}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 sm:p-4 transition duration-200 hover:bg-white hover:border-primary/40 hover:shadow-xs min-w-0 max-w-full overflow-hidden">
      <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider truncate">{label}</p>
      <div className="mt-1.5 text-sm font-extrabold text-slate-900 leading-normal break-words">{value}</div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Save, Loader2, User, Smartphone, Wrench, DollarSign, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RepairStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { updateRepairOrderDetailsAction } from "../../actions";
import {
  Field,
  inputClassName,
  selectClassName,
  textareaClassName,
  repairStatusOptions,
} from "../../_components";
import { SupplierFields, type SupplierOption, type InventoryItemOption } from "../../_supplier-fields";

interface EditRepairOrderFormProps {
  repairOrder: {
    id: string;
    ticketNumber: string;
    status: RepairStatus;
    deviceBrand: string | null;
    deviceModel: string | null;
    deviceSerial: string | null;
    reportedIssue: string;
    diagnosis: string | null;
    resolutionNotes: string | null;
    estimatedTotal: unknown;
    finalTotal: unknown;
    dueAt: Date | string | null;
    supplierName: string | null;
    partName: string | null;
    partCost: unknown;
    deductPartCost: boolean;
    supplierNotes: string | null;
    customer: {
      name: string;
      phone: string | null;
      notes: string | null;
    } | null;
    supplier: {
      id: string;
      name: string;
    } | null;
    items: Array<{
      id: string;
      inventoryItemId: string | null;
      supplierId: string | null;
      supplierName: string | null;
      partName: string;
      quantity: number;
      unitCost: unknown;
      unitPrice: unknown;
      notes: string | null;
      supplier?: { name: string } | null;
    }>;
  };
  suppliers: SupplierOption[];
  inventoryItems?: InventoryItemOption[];
  currency: string;
}

function formatDateForInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export function EditRepairOrderForm({
  repairOrder,
  suppliers,
  inventoryItems = [],
  currency,
}: EditRepairOrderFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        await updateRepairOrderDetailsAction(formData);
        setIsSuccess(true);
        router.push(`/repair-orders/${repairOrder.id}`);
        router.refresh();
      } catch (err: unknown) {
        if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) {
          setIsSuccess(true);
          router.push(`/repair-orders/${repairOrder.id}`);
          router.refresh();
          return;
        }
        setError(err instanceof Error ? err.message : "حدث خطأ أثناء حفظ التعديلات");
      }
    });
  }

  const initialItems = repairOrder.items.map((item) => ({
    id: item.id,
    inventoryItemId: item.inventoryItemId,
    supplierId: item.supplierId,
    supplierName: item.supplier?.name ?? item.supplierName,
    partName: item.partName,
    quantity: item.quantity,
    unitCost: item.unitCost ? String(item.unitCost) : "0",
    unitPrice: item.unitPrice ? String(item.unitPrice) : "0",
    notes: item.notes,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="repairOrderId" value={repairOrder.id} />

      {error && (
        <div className="flex items-center gap-2.5 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold animate-in fade-in duration-200">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isSuccess && (
        <div className="flex items-center gap-2.5 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>تم حفظ التعديلات بنجاح، جاري تحويلك لصفحة التذكرة...</span>
        </div>
      )}

      {/* Customer Information */}
      <section className="erp-section">
        <div className="flex items-center gap-2 border-b border-slate-100/60 pb-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
            <User className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">بيانات العميل</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              تعديل الاسم أو رقم الهاتف وملاحظات التواصل مع العميل.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم العميل">
            <input
              className={inputClassName}
              name="customerName"
              required
              disabled={isPending}
              defaultValue={repairOrder.customer?.name ?? ""}
              placeholder="اسم العميل"
            />
          </Field>
          <Field label="رقم الهاتف">
            <input
              className={`${inputClassName} font-numeric`}
              name="customerPhone"
              required
              disabled={isPending}
              inputMode="tel"
              defaultValue={repairOrder.customer?.phone ?? ""}
              placeholder="05xxxxxxxx"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="ملاحظات العميل">
              <textarea
                className={textareaClassName}
                name="customerNotes"
                disabled={isPending}
                defaultValue={repairOrder.customer?.notes ?? ""}
                placeholder="أية ملاحظات أو تفاصيل إضافية عن العميل..."
              />
            </Field>
          </div>
        </div>
      </section>

      {/* Device & Ticket Details */}
      <section className="erp-section">
        <div className="flex items-center gap-2 border-b border-slate-100/60 pb-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/5 text-primary">
            <Smartphone className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">بيانات الجهاز وحالة الطلب</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              بيانات ومواصفات الجهاز المسلم للصيانة وتحديث الحالة العامة للطلب.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="حالة التذكرة الحالية">
            <select
              className={selectClassName}
              name="status"
              disabled={isPending}
              defaultValue={repairOrder.status}
            >
              {repairStatusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="الشركة المصنعة">
            <input
              className={inputClassName}
              name="deviceBrand"
              disabled={isPending}
              defaultValue={repairOrder.deviceBrand ?? ""}
              placeholder="مثال: Apple, Samsung, Huawei"
            />
          </Field>
          <Field label="موديل الجهاز">
            <input
              className={inputClassName}
              name="deviceModel"
              disabled={isPending}
              defaultValue={repairOrder.deviceModel ?? ""}
              placeholder="مثال: iPhone 15 Pro Max"
            />
          </Field>
          <Field label="الرقم التسلسلي (SN / IMEI)">
            <input
              className={`${inputClassName} font-numeric`}
              name="deviceSerial"
              disabled={isPending}
              defaultValue={repairOrder.deviceSerial ?? ""}
              placeholder="الرقم التسلسلي للجهاز..."
            />
          </Field>
        </div>
      </section>

      {/* Financials & Delivery Date */}
      <section className="erp-section">
        <div className="flex items-center gap-2 border-b border-slate-100/60 pb-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <DollarSign className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">البيانات المالية وموعد التسليم</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              تحديد التكلفة التقديرية أو النهائية وتاريخ التسليم المتوقع للعميل.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="السعر التقديري للصيانة">
            <input
              className={`${inputClassName} font-numeric`}
              name="estimatedTotal"
              disabled={isPending}
              inputMode="decimal"
              defaultValue={repairOrder.estimatedTotal ? String(repairOrder.estimatedTotal) : ""}
              placeholder="0.00"
            />
          </Field>
          <Field label="السعر النهائي للصيانة">
            <input
              className={`${inputClassName} font-numeric`}
              name="finalTotal"
              disabled={isPending}
              inputMode="decimal"
              defaultValue={repairOrder.finalTotal ? String(repairOrder.finalTotal) : ""}
              placeholder="0.00"
            />
          </Field>
          <Field label="تاريخ التسليم المتوقع">
            <input
              className={`${inputClassName} font-numeric`}
              name="dueAt"
              disabled={isPending}
              type="date"
              defaultValue={formatDateForInput(repairOrder.dueAt)}
            />
          </Field>
        </div>
      </section>

      {/* Issue & Technical Diagnosis */}
      <section className="erp-section">
        <div className="flex items-center gap-2 border-b border-slate-100/60 pb-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
            <Wrench className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">تفاصيل المشكلة والتشخيص الفني</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              شرح تفاصيل العطل والتشخيص الفني وملاحظات الإصلاح داخل الورشة.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="المشكلة المبلغ عنها">
              <textarea
                className={textareaClassName}
                name="reportedIssue"
                required
                disabled={isPending}
                defaultValue={repairOrder.reportedIssue}
                placeholder="وصف المشكلة كما تم إبلاغها من العميل..."
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="التشخيص الفني">
              <textarea
                className={textareaClassName}
                name="diagnosis"
                disabled={isPending}
                defaultValue={repairOrder.diagnosis ?? ""}
                placeholder="التشخيص الفني بعد فحص الجهاز في الورشة..."
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="ملاحظات الحل والإصلاح (داخلية)">
              <textarea
                className={textareaClassName}
                name="resolutionNotes"
                disabled={isPending}
                defaultValue={repairOrder.resolutionNotes ?? ""}
                placeholder="ملاحظات خطوات الإصلاح والقطع المستبدلة..."
              />
            </Field>
          </div>
        </div>
      </section>

      {/* Supplier & Parts Section */}
      <SupplierFields
        suppliers={suppliers}
        inventoryItems={inventoryItems}
        currency={currency}
        defaultSupplierName={repairOrder.supplier?.name ?? repairOrder.supplierName ?? ""}
        defaultPartName={repairOrder.partName ?? ""}
        defaultPartCost={repairOrder.partCost ? String(repairOrder.partCost) : ""}
        defaultDeductPartCost={repairOrder.deductPartCost}
        defaultSupplierNotes={repairOrder.supplierNotes ?? ""}
        initialItems={initialItems}
      />

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <Button
          asChild
          variant="outline"
          type="button"
          disabled={isPending}
          className="rounded-xl h-12 px-5 font-bold border-slate-300 hover:bg-slate-50 justify-center"
        >
          <Link href={`/repair-orders/${repairOrder.id}`}>
            <ArrowRight className="h-4 w-4 ml-1.5" />
            إلغاء والعودة
          </Link>
        </Button>

        <Button
          type="submit"
          disabled={isPending}
          className="h-12 px-8 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-900/15 flex items-center justify-center gap-2 sm:min-w-[180px]"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>جاري حفظ التعديلات...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4 ml-1.5" />
              <span>حفظ تعديلات التذكرة</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

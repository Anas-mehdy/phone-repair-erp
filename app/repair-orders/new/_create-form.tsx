"use client";

import { useTransition } from "react";
import { ArrowRight, Save, Loader2, User, Smartphone, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createRepairOrderAction } from "../actions";
import { Field, inputClassName, textareaClassName } from "../_components";
import { SupplierFields, type SupplierOption, type InventoryItemOption } from "../_supplier-fields";

export function CreateRepairOrderForm({
  suppliers,
  inventoryItems = [],
  currency,
  technicians = [],
}: {
  suppliers: SupplierOption[];
  inventoryItems?: InventoryItemOption[];
  currency: string;
  technicians?: Array<{ id: string; name: string; email: string }>;
}) {
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      await createRepairOrderAction(formData);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Info Card */}
      <section className="erp-section">
        <div className="flex items-center gap-2 border-b border-slate-100/60 pb-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
            <User className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">بيانات العميل</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              سيتم البحث عن العميل تلقائياً أو إنشاؤه في حالة عدم وجوده مسبقاً.
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
              placeholder="مثال: محمد أحمد"
            />
          </Field>
          <Field label="رقم الهاتف">
            <input
              className={`${inputClassName} font-numeric`}
              name="customerPhone"
              required
              disabled={isPending}
              inputMode="tel"
              placeholder="05xxxxxxxx"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="ملاحظات العميل">
              <textarea
                className={textareaClassName}
                name="customerNotes"
                disabled={isPending}
                placeholder="أية تفاصيل خاصة بالعميل..."
              />
            </Field>
          </div>
        </div>
      </section>

      {/* Device and Problem Card */}
      <section className="erp-section">
        <div className="flex items-center gap-2 border-b border-slate-100/60 pb-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/5 text-primary">
            <Smartphone className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">بيانات الجهاز والصيانة</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              وصف تفاصيل الجهاز والمشكلة لتسهيل التتبع والتشخيص داخل الورشة.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الشركة المصنعة">
            <input
              className={inputClassName}
              name="deviceBrand"
              disabled={isPending}
              placeholder="مثال: Apple, Samsung"
            />
          </Field>
          <Field label="الموديل">
            <input
              className={inputClassName}
              name="deviceModel"
              disabled={isPending}
              placeholder="مثال: iPhone 15 Pro"
            />
          </Field>
          <Field label="الرقم التسلسلي (SN / IMEI)">
            <input
              className={`${inputClassName} font-numeric`}
              name="deviceSerial"
              disabled={isPending}
              placeholder="أدخل الرقم التسلسلي لجهاز العميل..."
            />
          </Field>
          <Field label="سعر الصيانة المتوقع للعميل (تقديري)">
            <input
              className={`${inputClassName} font-numeric`}
              name="estimatedTotal"
              disabled={isPending}
              inputMode="decimal"
              placeholder="0.00"
            />
          </Field>
          <Field label="تاريخ التسليم المتوقع">
            <input
              className={`${inputClassName} font-numeric`}
              name="dueAt"
              disabled={isPending}
              type="date"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="المشكلة المبلغ عنها">
              <textarea
                className={textareaClassName}
                name="reportedIssue"
                required
                disabled={isPending}
                placeholder="مثال: الشاشة مكسورة، الجهاز لا يشحن..."
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="ملاحظات داخلية للفنيين">
              <textarea
                className={textareaClassName}
                name="notes"
                disabled={isPending}
                placeholder="ملاحظات تظهر للفنيين فقط ولا تظهر للعميل..."
              />
            </Field>
          </div>
        </div>
      </section>

      {technicians.length > 0 ? (
        <section className="erp-section">
          <div className="flex items-center gap-2 border-b border-slate-100/60 pb-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <UserRoundCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">الفني المسؤول</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                يمكنك إسناد التذكرة الآن أو تركها غير مسندة واختيار الفني لاحقاً.
              </p>
            </div>
          </div>
          <Field label="إسناد التذكرة إلى">
            <select
              className={inputClassName}
              name="assignedToUserId"
              disabled={isPending}
              defaultValue=""
            >
              <option value="">غير مسندة حالياً</option>
              {technicians.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.name}
                </option>
              ))}
            </select>
          </Field>
        </section>
      ) : null}

      {/* Supplier & Parts Section */}
      <SupplierFields
        suppliers={suppliers}
        inventoryItems={inventoryItems}
        currency={currency}
      />

      {/* Submit Button Action */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          asChild
          variant="outline"
          type="button"
          disabled={isPending}
          className="rounded-xl h-12 px-5 font-bold border-slate-300"
        >
          <Link href="/repair-orders">
            <ArrowRight className="h-4 w-4 ml-1.5" />
            إلغاء والعودة
          </Link>
        </Button>

        <Button
          type="submit"
          disabled={isPending}
          className="h-12 px-8 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-900/15 flex items-center justify-center gap-2 min-w-[180px]"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>جاري حفظ وإنشاء الطلب...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4 ml-1.5" />
              <span>حفظ طلب الصيانة</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

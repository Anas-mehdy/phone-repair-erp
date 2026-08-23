import { ArrowRight, Save } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { createRepairOrderAction } from "../actions";
import { Field, inputClassName, textareaClassName } from "../_components";

export default function NewRepairOrderPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="طلب صيانة جديد"
        description="أدخل بيانات العميل والجهاز لإنشاء طلب صيانة بحالة قيد الانتظار"
        actions={
          <Button asChild variant="outline">
            <Link href="/repair-orders">
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              رجوع
            </Link>
          </Button>
        }
      />

      <form action={createRepairOrderAction} className="space-y-6">
        <section className="erp-section">
          <div className="border-b border-slate-100/60 pb-3 mb-4">
            <h3 className="font-bold text-slate-800 text-sm">بيانات العميل</h3>
            <p className="mt-1 text-xs text-slate-400 font-medium">
              سيتم البحث عن العميل تلقائياً أو إنشاؤه في حالة عدم وجوده.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="اسم العميل">
              <input className={inputClassName} name="customerName" required placeholder="مثال: محمد أحمد" />
            </Field>
            <Field label="رقم الهاتف">
              <input
                className={`${inputClassName} font-numeric`}
                name="customerPhone"
                required
                inputMode="tel"
                placeholder="05xxxxxxxx"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="ملاحظات العميل">
                <textarea className={textareaClassName} name="customerNotes" placeholder="أية تفاصيل خاصة بالعميل..." />
              </Field>
            </div>
          </div>
        </section>

        <section className="erp-section">
          <div className="border-b border-slate-100/60 pb-3 mb-4">
            <h3 className="font-bold text-slate-800 text-sm">بيانات الجهاز والصيانة</h3>
            <p className="mt-1 text-xs text-slate-400 font-medium">
              وصف تفاصيل الجهاز والمشكلة لتسهيل التتبع والتشخيص داخل الورشة.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الشركة المصنعة">
              <input className={inputClassName} name="deviceBrand" placeholder="مثال: Apple, Samsung" />
            </Field>
            <Field label="الموديل">
              <input className={inputClassName} name="deviceModel" placeholder="مثال: iPhone 15 Pro" />
            </Field>
            <Field label="الرقم التسلسلي (SN / IMEI)">
              <input className={`${inputClassName} font-numeric`} name="deviceSerial" placeholder="أدخل الرقم التسلسلي لجهاز العميل..." />
            </Field>
            <Field label="التكلفة المتوقعة (تقديرية)">
              <input
                className={`${inputClassName} font-numeric`}
                name="estimatedTotal"
                inputMode="decimal"
                placeholder="0.00"
              />
            </Field>
            <Field label="تاريخ التسليم المتوقع">
              <input className={`${inputClassName} font-numeric`} name="dueAt" type="date" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="المشكلة المبلغ عنها">
                <textarea
                  className={textareaClassName}
                  name="reportedIssue"
                  required
                  placeholder="مثال: الشاشة مكسورة، الجهاز لا يشحن..."
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="ملاحظات داخلية للفنيين">
                <textarea className={textareaClassName} name="notes" placeholder="ملاحظات تظهر للفنيين فقط ولا تظهر للعميل..." />
              </Field>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Button type="submit" size="lg" className="font-semibold shadow-md px-6">
            <Save className="h-4.5 w-4.5 ml-1.5" aria-hidden="true" />
            حفظ طلب الصيانة
          </Button>
        </div>
      </form>

    </div>
  );
}

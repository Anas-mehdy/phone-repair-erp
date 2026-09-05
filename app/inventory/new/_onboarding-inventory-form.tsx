import Link from "next/link";
import { ArrowLeft, Boxes, PackagePlus, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createInventoryItemAction } from "../actions";
import { Field, inputClassName } from "../_components";

export function OnboardingInventoryItemForm({ currency }: { currency: string }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="overflow-hidden rounded-[26px] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-teal-50/60 shadow-[0_24px_80px_-54px_rgba(217,119,6,0.5)] dark:border-amber-900/70 dark:from-amber-950/25 dark:via-slate-950 dark:to-teal-950/20">
        <div className="flex items-start gap-3 border-b border-amber-100 px-5 py-5 sm:px-6 dark:border-amber-900/50">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20"><Boxes className="h-5 w-5" /></span>
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white/80 px-2.5 py-1 text-[9px] font-black text-amber-700 dark:border-amber-900 dark:bg-slate-900 dark:text-amber-300"><Sparkles className="h-3 w-3" />أول قيمة من المخزون</div>
            <h1 className="mt-2 text-xl font-black text-slate-950 dark:text-slate-50 sm:text-2xl">أضف أول صنف فعلي على الرف</h1>
            <p className="mt-1.5 max-w-2xl text-[11px] font-semibold leading-6 text-slate-500 dark:text-slate-400">بدنا أربع معلومات فقط. بعد الحفظ رح تشوف كيف مسار سجّل الرصيد الافتتاحي كحركة مخزون حقيقية تلقائياً.</p>
          </div>
        </div>

        <form action={createInventoryItemAction} className="p-5 sm:p-6">
          <input type="hidden" name="onboarding" value="1" />
          <input type="hidden" name="reorderLevel" value="0" />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="اسم الصنف *">
                <input className={inputClassName} name="name" required autoFocus placeholder="مثال: شاشة iPhone 11 أو شاحن Type-C" />
              </Field>
            </div>

            <Field label="الكمية الموجودة الآن *" helper="حتى نسجل أول حركة مخزون فعلية">
              <input className={`${inputClassName} font-numeric`} name="quantity" type="number" min="1" step="1" required defaultValue="1" inputMode="numeric" />
            </Field>

            <Field label={`تكلفة الوحدة (${currency})`} helper="اختياري — يفيد بحساب الربح لاحقاً">
              <input className={`${inputClassName} font-numeric`} name="unitCost" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" />
            </Field>

            <div className="sm:col-span-2">
              <Field label={`سعر البيع (${currency})`} helper="يمكن تعديله لاحقاً؛ ضع 0 إذا لم تحدده بعد">
                <input className={`${inputClassName} font-numeric`} name="unitPrice" type="number" min="0" step="0.01" required defaultValue="0" inputMode="decimal" />
              </Field>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-teal-100 bg-teal-50/60 px-4 py-3 dark:border-teal-900/60 dark:bg-teal-950/20">
            <PackagePlus className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-300" />
            <p className="text-[10px] font-semibold leading-5 text-teal-900/80 dark:text-teal-200/80">الكمية اللي تدخلها هون ما بتنحفظ كرقم فقط؛ مسار ينشئ إلها حركة <b>رصيد افتتاحي</b> حتى يبقى تاريخ المخزون قابل للتتبع.</p>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/inventory/new?onboarding=1&full=1" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-[10px] font-black text-slate-500 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><ArrowLeft className="h-3.5 w-3.5" />أحتاج كل تفاصيل الصنف الآن</Link>
            <Button type="submit" className="h-11 rounded-xl bg-amber-500 px-6 text-xs font-black text-white shadow-md shadow-amber-500/20 hover:bg-amber-600"><Save className="ml-1.5 h-4 w-4" />حفظ أول صنف</Button>
          </div>
        </form>
      </section>
    </div>
  );
}

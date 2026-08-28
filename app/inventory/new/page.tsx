import { ArrowRight, Save } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { createInventoryItemAction } from "../actions";
import { Field, inputClassName, textareaClassName } from "../_components";
import { CompatibilityGroupPicker } from "../_compatibility-group-picker";
import { getCompatibilityGroupSelection } from "@/lib/services/compatibility/compatibility-directory.service";
import { datasetKeyForSourceCategory } from "@/lib/services/compatibility/compatibility-datasets";

export default async function NewInventoryItemPage({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string; name?: string; category?: string; error?: string }>;
}) {
  const params = await searchParams;
  const group = params.groupId ? await getCompatibilityGroupSelection(params.groupId) : null;
  const initialSelection = group ? {
    groupId: group.id,
    brandSection: group.brandSection,
    deviceName: group.members[0]?.rawModelName || "مجموعة توافق",
    compatibleDevices: group.members.map((member) => ({ id: member.id, name: member.rawModelName })),
    dataset: datasetKeyForSourceCategory(group.batch.categoryName),
  } : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="إضافة قطعة جديدة"
        description="أدخل بيانات القطعة. إذا كانت الكمية الافتتاحية أكبر من صفر سيتم إنشاء حركة مخزون تلقائياً"
        actions={
          <Button asChild variant="outline">
            <Link href="/inventory">
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              رجوع
            </Link>
          </Button>
        }
      />

      {params.error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {params.error}
        </div>
      ) : null}

      <form action={createInventoryItemAction} className="erp-section">
        <div className="border-b border-slate-100/60 pb-3 mb-5">
          <h3 className="font-bold text-slate-800 text-sm">بيانات قطعة الغيار / المنتج</h3>
          <p className="mt-1 text-xs text-slate-400 font-medium">
            أدخل مواصفات المنتج والأسعار والكمية الافتتاحية المتاحة حالياً.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم القطعة">
            <input className={inputClassName} name="name" required placeholder="مثال: شاشة آيفون 11 برو الأصلية" defaultValue={params.name || ""} />
          </Field>
          <Field label="التصنيف">
            <input className={inputClassName} name="category" placeholder="مثال: شاشات، بطاريات، إكسسوارات" defaultValue={params.category || ""} />
          </Field>
          <Field label="SKU / رمز المنتج" helper="كود تتبع فريد للمنتج">
            <input className={`${inputClassName} font-numeric`} name="sku" placeholder="مثال: SCR-IPH11P-ORG" />
          </Field>
          <Field label="تكلفة الشراء (لكل وحدة)">
            <input
              className={`${inputClassName} font-numeric`}
              name="unitCost"
              inputMode="decimal"
              min="0"
              step="0.01"
              type="number"
              placeholder="0.00"
            />
          </Field>
          <Field label="سعر البيع (للعميل)">
            <input
              className={`${inputClassName} font-numeric`}
              name="unitPrice"
              inputMode="decimal"
              min="0"
              required
              step="0.01"
              type="number"
              placeholder="0.00"
            />
          </Field>
          <Field label="الكمية الافتتاحية">
            <input
              className={`${inputClassName} font-numeric`}
              name="quantity"
              defaultValue="0"
              min="0"
              step="1"
              type="number"
            />
          </Field>
          <Field label="حد إعادة الطلب (تنبيه نقص المخزون)">
            <input
              className={`${inputClassName} font-numeric`}
              name="reorderLevel"
              defaultValue="0"
              min="0"
              step="1"
              type="number"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="الوصف والتفاصيل">
              <textarea className={textareaClassName} name="description" placeholder="اكتب أية تفاصيل إضافية حول المنتج ومواصفاته..." />
            </Field>
          </div>
        </div>
        <div className="mt-6">
          <CompatibilityGroupPicker initialSelection={initialSelection} />
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="submit" size="lg" className="font-semibold shadow-md px-6">
            <Save className="h-4.5 w-4.5 ml-1.5" aria-hidden="true" />
            حفظ القطعة بالمخزون
          </Button>
        </div>
      </form>

    </div>
  );
}

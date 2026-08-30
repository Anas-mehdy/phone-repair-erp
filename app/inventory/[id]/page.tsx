import { ArrowRight, Save } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { InventoryMovementTypeBadge, PlainBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { getCurrentShopContext } from "@/lib/current-shop";
import { isDatabaseConnectionError } from "@/lib/database-errors";
import { inventoryService } from "@/lib/services/inventoryService";
import { inventoryCategoryService } from "@/lib/services/inventoryCategoryService";
import { datasetKeyForSourceCategory } from "@/lib/services/compatibility/compatibility-datasets";
import { Field, formatDate, formatMoney, inputClassName, isLowStock, textareaClassName } from "../_components";
import { CompatibilityGroupPicker } from "../_compatibility-group-picker";
import { InventoryCategoryField } from "../_category-field";
import { addStockAction, adjustStockAction, updateInventoryItemDetailsAction } from "../actions";

export const dynamic = "force-dynamic";

type InventoryItemDetailsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function InventoryItemDetailsPage({ params, searchParams }: InventoryItemDetailsPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  let item: Awaited<ReturnType<typeof inventoryService.getInventoryItemById>>;
  let movements: Awaited<ReturnType<typeof inventoryService.getInventoryMovements>>;
  let categories: Awaited<ReturnType<typeof inventoryCategoryService.listInventoryCategories>> = [];
  let currency = "SAR";

  try {
    const context = await getCurrentShopContext();
    currency = context.currency;
    [item, movements, categories] = await Promise.all([
      inventoryService.getInventoryItemById(context.shopId, id),
      inventoryService.getInventoryMovements(context.shopId, id),
      inventoryCategoryService.listInventoryCategories(context.shopId),
    ]);
  } catch (error) {
    if (isDatabaseConnectionError(error)) return <DatabaseUnavailable />;
    throw error;
  }

  if (!item) notFound();

  const lowStock = isLowStock(item.quantity, item.reorderLevel);
  const linkedGroup = item.compatibilityGroupLinks[0]?.candidateGroup;
  const initialCompatibilitySelection = linkedGroup ? {
    groupId: linkedGroup.id,
    brandSection: linkedGroup.brandSection,
    deviceName: linkedGroup.members[0]?.rawModelName || "مجموعة توافق",
    compatibleDevices: linkedGroup.members.map((member) => ({ id: member.id, name: member.rawModelName })),
    dataset: datasetKeyForSourceCategory(linkedGroup.batch.categoryName),
  } : null;

  return (
    <div className="space-y-6">
      {query.error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{query.error}</div> : null}

      <div className="rounded-3xl border border-slate-200/50 bg-white/95 p-6 shadow-sm shadow-slate-100/40">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-900 text-white shadow-md shadow-primary/10">
              <span className="text-xl font-bold font-numeric">📦</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">تفاصيل صنف المستودع</span>
                <PlainBadge tone={lowStock ? "red" : "green"} label={lowStock ? "مخزون منخفض" : "متوفر بالرف"} />
              </div>
              <h2 className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-800">{item.name}</h2>
              <p className="mt-1 text-xs font-medium text-slate-400">رمز الـ SKU: <span className="font-numeric font-semibold text-slate-700">{item.sku ?? "-"}</span></p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button asChild variant="outline" className="h-11 rounded-xl border-slate-200 px-5 font-bold shadow-sm hover:bg-slate-50">
              <Link href="/inventory"><ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />رجوع للقائمة</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="erp-section">
            <div className="mb-5 border-b border-slate-100/60 pb-3"><h3 className="text-sm font-bold text-slate-800">تفاصيل قطعة المخزون الحالية</h3></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Info label="التصنيف" value={item.category ?? "غير مصنف"} />
              <Info label="SKU / رمز التتبع" value={<span className="font-numeric">{item.sku ?? "-"}</span>} />
              <Info label="الكمية المتاحة" value={<span className={cn("font-numeric font-bold", lowStock ? "animate-pulse text-rose-600" : "text-slate-800")}>{item.quantity}</span>} />
              <Info label="حد إعادة الطلب" value={<span className="font-numeric">{item.reorderLevel}</span>} />
              <Info label="تكلفة الشراء" value={<span className="font-numeric">{formatMoney(item.unitCost, currency)}</span>} />
              <Info label="سعر البيع للعميل" value={<span className="font-numeric">{formatMoney(item.unitPrice, currency)}</span>} />
              <Info label="آخر تحديث" value={<span className="font-numeric">{formatDate(item.updatedAt)}</span>} />
              <Info label="حالة المخزون" value={<PlainBadge tone={lowStock ? "red" : "green"} label={lowStock ? "مخزون منخفض" : "طبيعي"} />} />
              <Info label="دليل التوافق" value={linkedGroup ? <span className="text-violet-700">مرتبط مع {linkedGroup.members.map((member) => member.rawModelName).join("، ")}</span> : <span className="text-slate-400">غير مرتبط</span>} />
            </div>
            {item.description ? <div className="mt-5 border-t border-slate-100/60 pt-4"><Info label="الوصف والتفاصيل" value={<p className="text-xs font-medium leading-relaxed text-slate-600">{item.description}</p>} /></div> : null}
          </div>

          <form id="edit-inventory" action={updateInventoryItemDetailsAction} className="erp-section scroll-mt-6">
            <input type="hidden" name="inventoryItemId" value={item.id} />
            <div className="mb-4 border-b border-slate-100/60 pb-3">
              <h3 className="text-sm font-bold text-slate-800">تعديل مواصفات وبيانات القطعة</h3>
              <p className="mt-1 text-[10px] font-medium text-slate-400">اختر تصنيفاً محفوظاً أو أضف تصنيفاً جديداً ليصبح متاحاً مستقبلاً.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="اسم القطعة"><input className={inputClassName} name="name" required defaultValue={item.name} /></Field>
              <Field label="التصنيف"><InventoryCategoryField categories={categories} defaultCategoryId={item.categoryId} /></Field>
              <Field label="SKU / رمز التتبع"><input className={`${inputClassName} font-numeric`} name="sku" defaultValue={item.sku ?? ""} /></Field>
              <Field label="تكلفة الشراء"><input className={`${inputClassName} font-numeric`} name="unitCost" defaultValue={item.unitCost?.toString() ?? ""} inputMode="decimal" min="0" step="0.01" type="number" /></Field>
              <Field label="سعر البيع"><input className={`${inputClassName} font-numeric`} name="unitPrice" defaultValue={item.unitPrice.toString()} inputMode="decimal" min="0" required step="0.01" type="number" /></Field>
              <Field label="حد إعادة الطلب"><input className={`${inputClassName} font-numeric`} name="reorderLevel" defaultValue={String(item.reorderLevel)} min="0" step="1" type="number" /></Field>
              <div className="sm:col-span-2"><Field label="الوصف والتفاصيل"><textarea className={textareaClassName} name="description" defaultValue={item.description ?? ""} /></Field></div>
            </div>
            <div className="mt-6"><CompatibilityGroupPicker initialSelection={initialCompatibilitySelection} /></div>
            <div className="mt-6 flex justify-end"><Button type="submit" className="h-11 rounded-xl px-6 font-bold shadow-sm"><Save className="ml-1.5 h-4.5 w-4.5" />حفظ بيانات القطعة المحدثة</Button></div>
          </form>

          <div className="erp-section">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100/60 pb-3">
              <h3 className="text-sm font-bold text-slate-800">حركات المخزون والعمليات السابقة</h3>
              <span className="font-numeric text-[10px] font-bold text-slate-400">{movements.length} حركة مخزنة</span>
            </div>
            {movements.length === 0 ? (
              <p className="py-6 text-center text-xs font-medium text-slate-400">لا توجد أية حركات مخزون مسجلة لهذه القطعة بعد.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200/50">
                <div className="overflow-x-auto">
                  <table className="erp-table min-w-[720px]">
                    <thead><tr><th>النوع</th><th className="text-center">التغير</th><th className="text-center">الكمية بعد الحركة</th><th>التكلفة الفعلية</th><th>الملاحظة</th><th>التاريخ</th></tr></thead>
                    <tbody>{movements.map((movement) => (
                      <tr key={movement.id} className="align-middle">
                        <td><InventoryMovementTypeBadge type={movement.type} /></td>
                        <td className="text-center font-numeric font-bold text-slate-700">{movement.quantityChange > 0 ? `+${movement.quantityChange}` : movement.quantityChange}</td>
                        <td className="text-center font-numeric font-medium text-slate-500">{movement.quantityAfter ?? "-"}</td>
                        <td className="font-numeric font-medium text-slate-700">{formatMoney(movement.unitCostSnapshot, currency)}</td>
                        <td className="text-xs font-medium text-slate-500">{movement.note ?? "-"}</td>
                        <td className="font-numeric font-medium text-slate-500">{formatDate(movement.createdAt)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {lowStock ? (
            <div className="rounded-3xl border border-rose-200/60 bg-gradient-to-br from-rose-50/40 via-white to-rose-50/20 p-5 shadow-sm">
              <span className="text-xl">⚠️</span>
              <h4 className="mt-2 text-xs font-black text-rose-800">تنبيه: مخزون منخفض بالرف</h4>
              <p className="mt-1 text-[10px] font-medium leading-relaxed text-rose-600">الكمية الحالية بالرف المتاحة ({item.quantity}) أقل من حد إعادة الطلب الموصى به ({item.reorderLevel}). يرجى إضافة حركات توريد لتلبية احتياجات الصيانة والمبيعات.</p>
            </div>
          ) : null}

          <form action={addStockAction} className="erp-section">
            <input type="hidden" name="inventoryItemId" value={item.id} />
            <div className="mb-4 border-b border-slate-100/60 pb-3"><h3 className="text-sm font-bold text-slate-800">توريد وإدخال كمية للمخزون</h3></div>
            <div className="grid gap-4">
              <Field label="الكمية المضافة"><input className={`${inputClassName} font-numeric`} name="quantity" min="1" required step="1" type="number" placeholder="عدد الوحدات المضافة..." /></Field>
              <Field label="ملاحظة التوريد"><textarea className={textareaClassName} name="note" placeholder="مثال: فاتورة توريد رقم 123..." /></Field>
              <Button type="submit" className="h-11 w-full rounded-xl font-bold shadow-sm"><Save className="ml-1.5 h-4 w-4" />حفظ حركة التوريد</Button>
            </div>
          </form>

          <form action={adjustStockAction} className="erp-section">
            <input type="hidden" name="inventoryItemId" value={item.id} />
            <div className="mb-4 border-b border-slate-100/60 pb-3"><h3 className="text-sm font-bold text-slate-800">تسوية كميات المخزون (فردي)</h3></div>
            <div className="grid gap-4">
              <Field label="الكمية الفعلية الجديدة بالرف"><input className={`${inputClassName} font-numeric`} name="newQuantity" min="0" required step="1" type="number" placeholder="أدخل الجرد الفعلي..." /></Field>
              <Field label="سبب التسوية والجرد"><textarea className={textareaClassName} name="note" placeholder="مثال: جرد دوري، معالجة تالف..." /></Field>
              <Button type="submit" variant="secondary" className="h-11 w-full rounded-xl border-slate-200 font-bold shadow-sm"><Save className="ml-1.5 h-4 w-4" />تأكيد وحفظ الجرد</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100/50 bg-slate-50/20 p-4 transition duration-200 hover:bg-slate-50/40">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-1.5 text-sm font-bold leading-normal text-slate-700">{value}</div>
    </div>
  );
}

import { Eye, FolderOpen, PackagePlus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PlainBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { getAuthContext } from "@/lib/auth/context";
import { isDatabaseConnectionError } from "@/lib/database-errors";
import { inventoryService } from "@/lib/services/inventoryService";
import { inventoryCategoryService } from "@/lib/services/inventoryCategoryService";
import { deleteInventoryItemAction } from "./actions";
import { formatDate, formatMoney, inputClassName, isLowStock } from "./_components";

export const dynamic = "force-dynamic";

type InventoryPageProps = {
  searchParams: Promise<{
    search?: string;
    lowStockOnly?: string;
    categoryId?: string;
    uncategorized?: string;
    error?: string;
    deleted?: string;
  }>;
};

function inventoryHref(input: { categoryId?: string; uncategorized?: boolean }) {
  const params = new URLSearchParams();
  if (input.categoryId) params.set("categoryId", input.categoryId);
  if (input.uncategorized) params.set("uncategorized", "1");
  const query = params.toString();
  return query ? `/inventory?${query}` : "/inventory";
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const params = await searchParams;
  const search = params.search ?? "";
  const lowStockOnly = params.lowStockOnly === "on";
  const uncategorizedOnly = params.uncategorized === "1";
  const categoryId = uncategorizedOnly ? undefined : params.categoryId;

  let items: Awaited<ReturnType<typeof inventoryService.listInventoryItems>>;
  let overview: Awaited<ReturnType<typeof inventoryCategoryService.getInventoryCategoryOverview>>;
  let canManage = false;
  let currency = "SAR";

  try {
    const context = await getAuthContext();
    currency = context.shop.currency;
    canManage = context.permissions.includes("inventory:manage");
    [items, overview] = await Promise.all([
      inventoryService.listInventoryItems(context.shop.id, {
        search,
        lowStockOnly,
        categoryId,
        uncategorizedOnly,
      }),
      inventoryCategoryService.getInventoryCategoryOverview(context.shop.id),
    ]);
  } catch (error) {
    if (isDatabaseConnectionError(error)) return <DatabaseUnavailable />;
    throw error;
  }

  const selectedCategory = categoryId
    ? overview.categories.find((category) => category.id === categoryId)
    : null;
  const selectedLabel = uncategorizedOnly
    ? "غير مصنف"
    : selectedCategory?.name ?? "كل المنتجات";

  return (
    <div className="space-y-6">
      <PageHeader
        title="المخزون"
        description="تصفح المستودع حسب التصنيف وراقب القطع والكميات والتنبيهات"
        actions={
          <Button asChild className="font-semibold shadow-sm">
            <Link href={categoryId ? `/inventory/new?categoryId=${categoryId}` : "/inventory/new"}>
              <Plus className="ml-1.5 h-4 w-4" aria-hidden="true" />
              إضافة قطعة جديدة
            </Link>
          </Button>
        }
      />

      {params.deleted && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">تم حذف قطعة المخزون بنجاح مع الاحتفاظ بحركاتها السابقة.</div>}
      {params.error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{params.error}</div>}

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-indigo-200/50 bg-indigo-50/15 p-4 text-xs font-semibold text-indigo-900/90">
        <div className="flex items-center gap-2">
          <PackagePlus className="h-4.5 w-4.5 text-indigo-600" aria-hidden="true" />
          <span>
            يوجد حالياً <span className="font-numeric text-sm font-black text-indigo-800">{overview.totalCount}</span> قطعة وصنف مسجل بالمستودع.
          </span>
        </div>
        <span className="rounded-full border border-indigo-200/40 bg-indigo-50/80 px-2 py-0.5 text-[10px] font-bold text-indigo-600">المخزن والمستودع</span>
      </div>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-base font-black text-slate-900">تصنيفات المخزون</h2>
            </div>
            <p className="mt-1 text-xs font-medium text-slate-400">اختر تصنيفاً لعرض المنتجات التابعة له فقط.</p>
          </div>
          <div className="text-xs font-bold text-slate-500">المحدد الآن: <span className="text-primary">{selectedLabel}</span></div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <CategoryCard href="/inventory" name="كل المنتجات" count={overview.totalCount} active={!categoryId && !uncategorizedOnly} />
          {overview.categories.map((category) => (
            <CategoryCard
              key={category.id}
              href={inventoryHref({ categoryId: category.id })}
              name={category.name}
              count={category.itemCount}
              active={category.id === categoryId}
            />
          ))}
          {overview.uncategorizedCount > 0 && (
            <CategoryCard
              href={inventoryHref({ uncategorized: true })}
              name="غير مصنف"
              count={overview.uncategorizedCount}
              active={uncategorizedOnly}
            />
          )}
        </div>
      </section>

      <form className="erp-filter-card grid items-end gap-5 sm:grid-cols-[1fr_auto_auto]">
        {categoryId && <input type="hidden" name="categoryId" value={categoryId} />}
        {uncategorizedOnly && <input type="hidden" name="uncategorized" value="1" />}
        <div className="grid gap-2 text-xs font-extrabold text-slate-500">
          <span>بحث داخل {selectedLabel}</span>
          <div className="relative">
            <Search className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input className={`${inputClassName} pr-10`} name="search" placeholder="اسم القطعة، رمز الـ SKU..." defaultValue={search} />
          </div>
        </div>
        <div className="flex h-11 items-center gap-2 pb-3.5">
          <input className="h-4.5 w-4.5 cursor-pointer rounded border-slate-350 accent-primary" id="lowStockOnly" name="lowStockOnly" type="checkbox" defaultChecked={lowStockOnly} />
          <label htmlFor="lowStockOnly" className="cursor-pointer text-xs font-black text-slate-600">عرض القطع منخفضة الكمية فقط</label>
        </div>
        <Button type="submit" className="h-11 w-full rounded-xl px-6 font-bold shadow-sm sm:w-auto">
          <Search className="ml-1.5 h-4 w-4" aria-hidden="true" />
          تطبيق الفلتر
        </Button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-black text-slate-800">منتجات: {selectedLabel}</h3>
            <p className="mt-0.5 text-[10px] font-medium text-slate-400">يظهر الجدول المنتجات المطابقة للتصنيف والفلاتر الحالية.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-600">{items.length} نتيجة معروضة</span>
        </div>

        {items.length === 0 ? (
          <EmptyState icon={PackagePlus} title="لا توجد منتجات ضمن هذا العرض" description="جرّب تصنيفاً آخر أو أضف أول قطعة لهذا التصنيف." actionHref={categoryId ? `/inventory/new?categoryId=${categoryId}` : "/inventory/new"} actionLabel="إضافة قطعة جديدة" />
        ) : (
          <div className="overflow-x-auto">
            <table className="erp-table min-w-[920px]">
              <thead><tr><th>الاسم</th><th>التصنيف</th><th>SKU</th><th className="text-center">الكمية</th><th className="text-center">حد الطلب</th><th>تكلفة الشراء</th><th>سعر البيع</th><th>الحالة</th><th>آخر تحديث</th><th className="w-64 text-center">الإجراءات</th></tr></thead>
              <tbody>
                {items.map((item) => {
                  const lowStock = isLowStock(item.quantity, item.reorderLevel);
                  return (
                    <tr key={item.id} className={cn("align-middle", lowStock ? "bg-rose-50/40 hover:bg-rose-50/60" : "")}>
                      <td className="font-black text-slate-900">
                        {item.name}
                        {item._count.compatibilityGroupLinks > 0 && <div className="mt-1 inline-flex rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[9px] font-black text-violet-700">مرتبط بالتوافقات</div>}
                      </td>
                      <td className="font-semibold text-slate-600">{item.category ?? "غير مصنف"}</td>
                      <td className="font-numeric font-medium text-slate-600">{item.sku ?? "-"}</td>
                      <td className={cn("text-center font-numeric text-base font-black", lowStock ? "text-rose-700" : "text-slate-900")}>{item.quantity}</td>
                      <td className="text-center font-numeric font-bold text-slate-600">{item.reorderLevel}</td>
                      <td className="font-numeric font-medium text-slate-700">{formatMoney(item.unitCost, currency)}</td>
                      <td className="font-numeric font-black text-slate-900">{formatMoney(item.unitPrice, currency)}</td>
                      <td><PlainBadge tone={lowStock ? "red" : "green"} label={lowStock ? "مخزون منخفض" : "متوفر"} /></td>
                      <td className="font-numeric font-medium text-slate-600">{formatDate(item.updatedAt)}</td>
                      <td><div className="flex items-center justify-center gap-1.5">
                        <Button asChild variant="outline" size="sm" title="عرض" className="rounded-lg border-slate-300 font-bold shadow-xs hover:border-primary/30 hover:bg-primary/10 hover:text-primary"><Link href={`/inventory/${item.id}`}><Eye className="h-3.5 w-3.5" /></Link></Button>
                        {canManage && <Button asChild variant="outline" size="sm" className="font-bold text-indigo-700"><Link href={`/inventory/${item.id}#edit-inventory`}><Pencil className="ml-1 h-3.5 w-3.5" />تعديل</Link></Button>}
                        {canManage && <form action={deleteInventoryItemAction}><input type="hidden" name="inventoryItemId" value={item.id} /><ConfirmSubmitButton type="submit" variant="outline" size="sm" className="border-rose-200 font-bold text-rose-700 hover:bg-rose-50" message={`هل تريد حذف ${item.name} من المخزون؟ ستبقى حركاته القديمة محفوظة.`}><Trash2 className="ml-1 h-3.5 w-3.5" />حذف</ConfirmSubmitButton></form>}
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryCard({ href, name, count, active }: { href: string; name: string; count: number; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-28 flex-col justify-between rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        active ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/10" : "border-slate-200 bg-slate-50/30 hover:border-primary/30 hover:bg-white",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", active ? "bg-primary text-white" : "bg-white text-slate-500 shadow-sm group-hover:text-primary")}>
          <FolderOpen className="h-5 w-5" aria-hidden="true" />
        </div>
        {active && <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-black text-white">محدد</span>}
      </div>
      <div className="mt-4">
        <div className="truncate text-sm font-black text-slate-900">{name}</div>
        <div className="mt-1 font-numeric text-xs font-bold text-slate-400">{count} منتج</div>
      </div>
    </Link>
  );
}

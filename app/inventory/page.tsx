import { Eye, PackagePlus, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { deleteInventoryItemAction } from "./actions";
import {
  formatDate,
  formatMoney,
  inputClassName,
  isLowStock,
} from "./_components";

export const dynamic = "force-dynamic";

type InventoryPageProps = {
  searchParams: Promise<{
    search?: string;
    lowStockOnly?: string;
    error?: string;
    deleted?: string;
  }>;
};

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const params = await searchParams;
  const search = params.search ?? "";
  const lowStockOnly = params.lowStockOnly === "on";
  let items: Awaited<ReturnType<typeof inventoryService.listInventoryItems>>;
  let canManage = false;

  let currency = "SAR";
  try {
    const context = await getAuthContext();
    currency = context.shop.currency;
    canManage = context.permissions.includes("inventory:manage");
    items = await inventoryService.listInventoryItems(context.shop.id, {
      search,
      lowStockOnly,
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
        title="المخزون"
        description="راقب القطع والكميات والتنبيهات"
        actions={
          <Button asChild className="font-semibold shadow-sm">
            <Link href="/inventory/new">
              <Plus className="h-4 w-4 ml-1.5" aria-hidden="true" />
              إضافة قطعة جديدة
            </Link>
          </Button>
        }
      />

      {params.deleted && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">تم حذف قطعة المخزون بنجاح مع الاحتفاظ بحركاتها السابقة.</div>}
      {params.error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{params.error}</div>}

      {/* Summary Info Strip */}
      <div className="rounded-2xl border border-indigo-200/50 bg-indigo-50/15 p-4 text-xs font-semibold text-indigo-900/90 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <PackagePlus className="h-4.5 w-4.5 text-indigo-600" aria-hidden="true" />
          <span>
            يوجد حالياً <span className="font-bold font-numeric text-sm text-indigo-800">{items.length}</span> قطع غيار وأصناف مسجلة بالمستودع.
          </span>
        </div>
        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-full border border-indigo-200/40">
          المخزن والمستودع
        </span>
      </div>

      {/* Premium Filter Card */}
      <form className="erp-filter-card grid gap-5 sm:grid-cols-[1fr_auto_auto] items-end">
        <div className="grid gap-2 text-xs font-extrabold text-slate-500">
          <span>بحث عن صنف</span>
          <div className="relative">
            <Search className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              className={`${inputClassName} pr-10`}
              name="search"
              placeholder="اسم القطعة، رمز الـ SKU، القسم..."
              defaultValue={search}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 pb-3.5 h-11">
          <input
            className="h-4.5 w-4.5 accent-primary rounded border-slate-350 cursor-pointer"
            id="lowStockOnly"
            name="lowStockOnly"
            type="checkbox"
            defaultChecked={lowStockOnly}
          />
          <label htmlFor="lowStockOnly" className="text-xs font-black text-slate-600 cursor-pointer">
            عرض القطع منخفضة الكمية فقط
          </label>
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
        {items.length === 0 ? (
          <EmptyState
            icon={PackagePlus}
            title="لا توجد قطع مخزون بعد"
            description="أضف أول قطعة وابدأ بتسجيل حركات المخزون بشكل منظم."
            actionHref="/inventory/new"
            actionLabel="إضافة قطعة جديدة"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="erp-table min-w-[920px]">
              <thead>
                <tr>
                  <th className="text-slate-800">الاسم</th>
                  <th className="text-slate-800">التصنيف</th>
                  <th className="text-slate-800">SKU</th>
                  <th className="text-center text-slate-800">الكمية</th>
                  <th className="text-center text-slate-800">حد الطلب</th>
                  <th className="text-slate-800">تكلفة الشراء</th>
                  <th className="text-slate-800">سعر البيع</th>
                  <th className="text-slate-800">الحالة</th>
                  <th className="text-slate-800">آخر تحديث</th>
                  <th className="w-64 text-slate-800 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const lowStock = isLowStock(item.quantity, item.reorderLevel);

                  return (
                    <tr key={item.id} className={cn("align-middle", lowStock ? "bg-rose-50/40 hover:bg-rose-50/60" : "")}>
                      <td className="font-black text-slate-900">
                        {item.name}
                        {item._count.compatibilityGroupLinks > 0 && (
                          <div className="mt-1 inline-flex rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[9px] font-black text-violet-700">
                            مرتبط بالتوافقات
                          </div>
                        )}
                      </td>
                      <td className="font-semibold text-slate-600">{item.category ?? "-"}</td>
                      <td className="font-numeric text-slate-600 font-medium">{item.sku ?? "-"}</td>
                      <td className={cn("text-center font-black font-numeric text-base", lowStock ? "text-rose-700" : "text-slate-900")}>
                        {item.quantity}
                      </td>
                      <td className="text-center font-numeric text-slate-600 font-bold">{item.reorderLevel}</td>
                      <td className="font-numeric text-slate-700 font-medium">{formatMoney(item.unitCost, currency)}</td>
                      <td className="font-black font-numeric text-slate-900">{formatMoney(item.unitPrice, currency)}</td>
                      <td>
                        <PlainBadge
                          tone={lowStock ? "red" : "green"}
                          label={lowStock ? "مخزون منخفض" : "متوفر"}
                        />
                      </td>
                      <td className="font-numeric text-slate-600 font-medium">{formatDate(item.updatedAt)}</td>
                      <td><div className="flex items-center justify-center gap-1.5">
                        <Button asChild variant="outline" size="sm" title="عرض" className="font-bold shadow-xs border-slate-300 hover:bg-primary/10 hover:text-primary hover:border-primary/30 rounded-lg">
                          <Link href={`/inventory/${item.id}`}>
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        </Button>
                        {canManage && <Button asChild variant="outline" size="sm" className="font-bold text-indigo-700"><Link href={`/inventory/${item.id}#edit-inventory`}><Pencil className="ml-1 h-3.5 w-3.5" />تعديل</Link></Button>}
                        {canManage && <form action={deleteInventoryItemAction}><input type="hidden" name="inventoryItemId" value={item.id} /><ConfirmSubmitButton type="submit" variant="outline" size="sm" className="font-bold border-rose-200 text-rose-700 hover:bg-rose-50" message={`هل تريد حذف ${item.name} من المخزون؟ ستبقى حركاته القديمة محفوظة.`}><Trash2 className="ml-1 h-3.5 w-3.5" />حذف</ConfirmSubmitButton></form>}
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

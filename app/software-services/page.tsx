import Link from "next/link";
import { Code2, Plus, Smartphone, Trash2, WalletCards } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentShopContext } from "@/lib/current-shop";
import { formatCurrency, formatDate } from "@/lib/format";
import { softwareServiceService } from "@/lib/services/softwareServiceService";
import { dayUtcBoundsForTimeZone, isWithinUtcBounds } from "@/lib/timezone";
import { cancelSoftwareServiceSaleAction, createSoftwareServiceCatalogAction } from "./actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ catalogSaved?: string; catalogError?: string; cancelled?: string; cancelError?: string }>;
};

export default async function SoftwareServicesPage({ searchParams }: Props) {
  const query = await searchParams;
  const context = await getCurrentShopContext();
  const [sales, catalog] = await Promise.all([
    softwareServiceService.listSales(context.shopId),
    softwareServiceService.listCatalog(context.shopId),
  ]);
  const currency = context.currency || "SAR";
  const todayBounds = dayUtcBoundsForTimeZone(new Date(), context.timeZone);
  const todayTotal = sales
    .filter((sale) => isWithinUtcBounds(sale.soldAt, todayBounds))
    .reduce((sum, sale) => sum + Number(sale.invoiceTotal), 0);
  const waitingDevices = sales.filter((sale) => sale.deviceKept && !sale.deliveredAt).length;

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          eyebrow="خدمات غير مخزنية"
          title="خدمات السوفتوير"
          description="بيع خدمات التفليش والتحديث وFRP وغيرها، مع فاتورة موحدة وتكلفة اختيارية وربح محسوب."
        />
        <Button asChild className="h-11 rounded-xl font-black">
          <Link href="/software-services/new"><Plus className="ml-1.5 h-4 w-4" />بيع خدمة جديدة</Link>
        </Button>
      </div>

      {query.catalogSaved ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">تم حفظ الخدمة في الكتالوج.</div> : null}
      {query.cancelled ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">تم إلغاء خدمة السوفتوير وعكس أثرها المالي وإزالتها من التقارير.</div> : null}
      {query.catalogError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">{query.catalogError}</div> : null}
      {query.cancelError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">{query.cancelError}</div> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="erp-card p-5">
          <div className="flex items-center justify-between"><span className="text-xs font-black text-slate-600">مبيعات السوفتوير اليوم</span><Code2 className="h-5 w-5 text-violet-600" /></div>
          <p className="mt-3 font-numeric text-2xl font-black text-slate-900">{formatCurrency(todayTotal, currency)}</p>
        </div>
        <div className="erp-card p-5">
          <div className="flex items-center justify-between"><span className="text-xs font-black text-slate-600">إجمالي العمليات</span><WalletCards className="h-5 w-5 text-teal-600" /></div>
          <p className="mt-3 font-numeric text-2xl font-black text-slate-900">{sales.length}</p>
        </div>
        <div className="erp-card p-5">
          <div className="flex items-center justify-between"><span className="text-xs font-black text-slate-600">أجهزة بانتظار التسليم</span><Smartphone className="h-5 w-5 text-amber-600" /></div>
          <p className="mt-3 font-numeric text-2xl font-black text-slate-900">{waitingDevices}</p>
        </div>
      </section>

      <section className="erp-section">
        <div className="mb-4 border-b border-slate-100 pb-3">
          <h2 className="text-sm font-black text-slate-900">كتالوج الخدمات</h2>
          <p className="mt-1 text-[11px] font-medium text-slate-500">احفظ الخدمات المتكررة مع سعر وتكلفة افتراضيين اختياريين لتسريع التسجيل.</p>
        </div>
        <form action={createSoftwareServiceCatalogAction} className="grid gap-3 sm:grid-cols-[1fr_180px_180px_auto]">
          <input className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-bold" name="name" required placeholder="اسم الخدمة" />
          <input className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-bold font-numeric" name="defaultPrice" min="0" step="0.01" type="number" placeholder="سعر افتراضي" />
          <input className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-bold font-numeric" name="defaultCost" min="0" step="0.01" type="number" placeholder="تكلفة اختيارية" />
          <Button className="h-10 rounded-xl text-xs font-black" type="submit">حفظ</Button>
        </form>
        {catalog.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {catalog.map((item) => (
              <span key={item.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700">
                {item.name}{item.defaultPrice != null ? ` · ${formatCurrency(item.defaultPrice, currency)}` : ""}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="erp-section">
        <div className="mb-4 border-b border-slate-100 pb-3"><h2 className="text-sm font-black text-slate-900">آخر خدمات السوفتوير</h2></div>
        {sales.length === 0 ? (
          <div className="py-10 text-center text-xs font-bold text-slate-400">لا توجد خدمات مسجلة بعد.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/70">
            <table className="erp-table min-w-[1020px]">
              <thead><tr><th>الخدمة</th><th>العميل</th><th>الجهاز</th><th>سعر الفاتورة</th><th>التكلفة</th><th>المتبقي</th><th>العهدة</th><th>التاريخ</th><th>إجراء</th></tr></thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td><Link className="font-black text-primary hover:underline" href={`/software-services/${sale.id}`}>{sale.serviceName}</Link></td>
                    <td className="font-bold text-slate-700">{sale.customerName ?? "عميل نقدي"}</td>
                    <td className="text-xs font-medium text-slate-600">{[sale.deviceBrand, sale.deviceModel].filter(Boolean).join(" ") || "-"}</td>
                    <td className="font-numeric font-black">{formatCurrency(sale.invoiceTotal, currency)}</td>
                    <td className="font-numeric text-slate-600">{formatCurrency(Number(sale.serviceCost ?? 0), currency)}</td>
                    <td className="font-numeric font-bold text-amber-700">{formatCurrency(sale.invoiceBalanceDue, currency)}</td>
                    <td className="text-xs font-bold">{sale.deviceKept ? (sale.deliveredAt ? "تم التسليم" : "بالمحل") : "-"}</td>
                    <td className="font-numeric text-xs text-slate-500">{formatDate(sale.soldAt, context.timeZone)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Button asChild size="sm" variant="outline" className="rounded-lg text-xs font-bold"><Link href={`/software-services/${sale.id}`}>فتح</Link></Button>
                        <form action={cancelSoftwareServiceSaleAction}>
                          <input type="hidden" name="id" value={sale.id} />
                          <ConfirmSubmitButton className="h-9 rounded-lg border border-rose-200 bg-white px-3 text-xs font-black text-rose-700 hover:bg-rose-50" message={`إلغاء خدمة ${sale.serviceName}؟ سيتم إلغاء الفاتورة المرتبطة وعكس أي دفعات مسجلة وإزالة الخدمة من التقارير.`}>
                            <Trash2 className="ml-1 h-3.5 w-3.5" />إلغاء
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

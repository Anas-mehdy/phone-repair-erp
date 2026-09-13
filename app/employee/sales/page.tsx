import { Eye, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/context";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { salesEmployeeService } from "@/lib/services/salesEmployeeService";
import { timeZoneForCountry } from "@/lib/timezone";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string; status?: string }> };
export default async function EmployeeSalesPage({ searchParams }: Props) {
  const auth = await requirePermission("sales:read_own");
  const params = await searchParams;
  const status = ["COMPLETED", "CANCELLED", "REFUNDED"].includes(params.status ?? "") ? params.status as "COMPLETED" | "CANCELLED" | "REFUNDED" : undefined;
  const sales = await salesEmployeeService.listOwnSales(auth.shop.id, auth.user.id, params.q, status);
  const currency = auth.shop.currency || "SAR";
  const timeZone = timeZoneForCountry(auth.shop.countryCode);

  return <div className="space-y-6">
    <PageHeader eyebrow="موظف المبيعات" title="مبيعاتي" description="يعرض فقط العمليات التي قمت أنت بتسجيلها." actions={<Button asChild className="rounded-xl font-black"><Link href="/employee/pos"><Plus className="ml-1 h-4 w-4" />مبيعة جديدة</Link></Button>} />
    <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end dark:border-slate-800 dark:bg-slate-950">
      <label className="grid gap-1.5 text-xs font-bold">بحث<input className="erp-input" name="q" defaultValue={params.q ?? ""} placeholder="رقم الإيصال أو اسم العميل" /></label>
      <label className="grid gap-1.5 text-xs font-bold">الحالة<select name="status" defaultValue={params.status ?? ""} className="erp-input"><option value="">الكل</option><option value="COMPLETED">مكتملة</option><option value="CANCELLED">ملغاة</option><option value="REFUNDED">مرتجعة</option></select></label>
      <Button type="submit" variant="outline" className="h-11 rounded-xl font-black">بحث</Button>
    </form>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      {sales.length === 0 ? <div className="p-12 text-center"><ShoppingCart className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-black text-slate-500">لا توجد مبيعات مطابقة.</p></div> : <div className="overflow-x-auto"><table className="erp-table min-w-[880px]"><thead><tr><th>الإيصال</th><th>العميل</th><th>البنود</th><th>الإجمالي</th><th>الحالة</th><th>التاريخ</th><th></th></tr></thead><tbody>{sales.map((sale) => <tr key={sale.id}><td className="font-numeric font-black">{sale.receiptNumber || "—"}</td><td className="font-bold">{sale.customer?.name || "عميل نقدي"}</td><td>{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</td><td className="font-numeric font-black">{formatCurrency(Number(sale.total), currency)}</td><td><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${sale.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{sale.status === "COMPLETED" ? "مكتملة" : sale.status === "CANCELLED" ? "ملغاة" : "مرتجعة"}</span></td><td className="text-xs font-bold text-slate-500">{formatDateTime(sale.soldAt, timeZone)}</td><td><Button asChild variant="outline" size="sm" className="rounded-lg"><Link href={`/employee/sales/${sale.id}`}><Eye className="ml-1 h-3.5 w-3.5" />تفاصيل</Link></Button></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}

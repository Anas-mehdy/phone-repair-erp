import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth/context";
import { formatCurrency, formatDate } from "@/lib/format";
import { salesEmployeePurchaseService } from "@/lib/services/salesEmployeePurchaseService";
import { timeZoneForCountry } from "@/lib/timezone";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EmployeeReceivingDetailsPage({ params }: Props) {
  const auth = await requirePermission("purchases:read_own");
  const { id } = await params;
  const purchase = await salesEmployeePurchaseService.getOwnPurchase(auth.shop.id, auth.user.id, id);
  if (!purchase) notFound();
  const timeZone = timeZoneForCountry(auth.shop.countryCode);

  return <div className="space-y-6">
    <PageHeader eyebrow="موظف المبيعات • استلاماتي" title={purchase.supplierInvoiceNumber ? `فاتورة ${purchase.supplierInvoiceNumber}` : "تفاصيل استلام البضاعة"} description="تفاصيل الاستلام الذي قمت أنت بإضافته فقط." />
    <section className="grid gap-4 sm:grid-cols-3"><Card label="المورد" value={purchase.supplierName || "مورد غير مسجل"} /><Card label="تاريخ الفاتورة" value={formatDate(purchase.invoiceDate, timeZone)} /><Card label="الإجمالي" value={formatCurrency(Number(purchase.total), purchase.currency)} /></section>
    <section className="erp-section"><div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800"><h2 className="text-sm font-black">الأصناف</h2></div><div className="overflow-x-auto"><table className="erp-table min-w-[680px]"><thead><tr><th>الصنف</th><th>الكمية</th><th>تكلفة الشراء</th><th>الإجمالي</th></tr></thead><tbody>{purchase.items.map((item) => <tr key={item.id}><td className="font-black">{item.name}</td><td className="font-numeric">{item.quantity}</td><td className="font-numeric">{formatCurrency(Number(item.unitCost), purchase.currency)}</td><td className="font-numeric font-black">{formatCurrency(Number(item.lineTotal), purchase.currency)}</td></tr>)}</tbody></table></div></section>
    {purchase.notes ? <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">ملاحظة: {purchase.notes}</div> : null}
  </div>;
}

function Card({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>; }

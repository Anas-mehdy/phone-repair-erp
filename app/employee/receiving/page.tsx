import { Eye, PackageCheck } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/context";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { salesEmployeePurchaseService } from "@/lib/services/salesEmployeePurchaseService";
import { localDateString, timeZoneForCountry } from "@/lib/timezone";
import { EmployeeReceivingForm } from "../_employee-receiving-form";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ received?: string }> };

export default async function EmployeeReceivingPage({ searchParams }: Props) {
  const auth = await requirePermission("purchases:create");
  const query = await searchParams;
  const [inventory, suppliers, purchases] = await Promise.all([
    prisma.inventoryItem.findMany({ where: { shopId: auth.shop.id, deletedAt: null }, select: { id: true, name: true, sku: true, barcode: true, quantity: true }, orderBy: { name: "asc" }, take: 1500 }),
    prisma.supplier.findMany({ where: { shopId: auth.shop.id, deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 }),
    salesEmployeePurchaseService.listOwnPurchases(auth.shop.id, auth.user.id, 100),
  ]);
  const timeZone = timeZoneForCountry(auth.shop.countryCode);
  const currency = auth.shop.currency || "SAR";

  return <div className="space-y-6">
    <PageHeader eyebrow="موظف المبيعات" title="استلام بضاعة" description="أضف البضاعة للمخزون من فاتورة شراء مبسطة، بدون الوصول لإدارة المخزون أو الحسابات المالية." />
    {query.received === "1" ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-black text-emerald-800">تم اعتماد الاستلام وإضافة الكميات للمخزون بنجاح.</div> : null}
    <EmployeeReceivingForm inventory={inventory} suppliers={suppliers} defaultDate={localDateString(new Date(), timeZone)} />

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-100 p-4 dark:border-slate-800"><h2 className="text-sm font-black">استلاماتي السابقة</h2><p className="mt-1 text-[10px] font-bold text-slate-400">يظهر فقط ما قمت أنت بإضافته.</p></div>
      {purchases.length === 0 ? <div className="p-10 text-center"><PackageCheck className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-xs font-bold text-slate-400">لا توجد استلامات مسجلة باسمك بعد.</p></div> : <div className="overflow-x-auto"><table className="erp-table min-w-[820px]"><thead><tr><th>المورد</th><th>رقم الفاتورة</th><th>التاريخ</th><th>البنود</th><th>الوحدات</th><th>الإجمالي</th><th></th></tr></thead><tbody>{purchases.map((purchase) => <tr key={purchase.id}><td className="font-black">{purchase.supplierName || "مورد غير مسجل"}</td><td className="font-numeric">{purchase.supplierInvoiceNumber || "—"}</td><td>{formatDate(purchase.invoiceDate, timeZone)}</td><td className="font-numeric">{purchase.itemCount}</td><td className="font-numeric">{purchase.unitCount}</td><td className="font-numeric font-black">{formatCurrency(Number(purchase.total), purchase.currency || currency)}</td><td><Button asChild variant="outline" size="sm"><Link href={`/employee/receiving/${purchase.id}`}><Eye className="ml-1 h-3.5 w-3.5" />تفاصيل</Link></Button></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}

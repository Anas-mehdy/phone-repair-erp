import { Ban, Clock3, History, PencilLine, ShoppingCart, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth/context";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { salesEmployeeService } from "@/lib/services/salesEmployeeService";
import { dayUtcBoundsForTimeZone, timeZoneForCountry } from "@/lib/timezone";
import { cancelSalesEmployeeSaleAction } from "../../actions";
import { EmployeeSaleEditForm } from "./_edit-form";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string; cancelled?: string }>;
};

export default async function EmployeeSaleDetailsPage({ params, searchParams }: Props) {
  const auth = await requirePermission("sales:read_own");
  const { id } = await params;
  const query = await searchParams;
  const sale = await salesEmployeeService.getOwnSale(auth.shop.id, auth.user.id, id);
  if (!sale) notFound();

  const audit = await salesEmployeeService.getSaleAudit(auth.shop.id, sale.id);
  const currency = auth.shop.currency || "SAR";
  const timeZone = timeZoneForCountry(auth.shop.countryCode);
  const today = dayUtcBoundsForTimeZone(new Date(), timeZone);
  const sameBusinessDay = sale.soldAt >= today.start && sale.soldAt < today.end;
  const editable = sale.status === "COMPLETED" && sameBusinessDay && sale.invoices.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="موظف المبيعات • مبيعاتي" title={sale.receiptNumber || "تفاصيل المبيعة"} description="يمكنك الوصول إلى مبيعاتك أنت فقط. التعديل والإلغاء مقيدان بيوم العمل نفسه." />

      {(query.created || query.updated || query.cancelled) ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-black text-emerald-800">{query.created ? "تم تسجيل المبيعة باسمك بنجاح." : query.updated ? "تم حفظ تعديل الكميات وتسجيل الحركة في السجل." : "تم إلغاء المبيعة وإرجاع الكميات للمخزون."}</div> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard icon={ShoppingCart} label="الإجمالي" value={formatCurrency(Number(sale.total), currency)} />
        <InfoCard icon={UserRound} label="العميل" value={sale.customer?.name || "عميل نقدي"} />
        <InfoCard icon={Clock3} label="تاريخ البيع" value={formatDateTime(sale.soldAt, timeZone)} />
        <InfoCard icon={History} label="سجلها" value={audit.creator?.name || auth.user.name} />
      </section>

      <section className="erp-section">
        <div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800"><h2 className="text-sm font-black">بنود المبيعة</h2></div>
        <div className="overflow-x-auto"><table className="erp-table min-w-[680px]"><thead><tr><th>الصنف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>{sale.items.map((item) => <tr key={item.id}><td className="font-black">{item.description}</td><td className="font-numeric font-bold">{item.quantity}</td><td className="font-numeric">{formatCurrency(Number(item.unitPriceSnapshot), currency)}</td><td className="font-numeric font-black">{formatCurrency(Number(item.lineTotal), currency)}</td></tr>)}</tbody></table></div>
      </section>

      {editable ? (
        <section className="erp-section space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800"><PencilLine className="h-4 w-4 text-primary" /><div><h2 className="text-sm font-black">تعديل مبيعتي</h2><p className="mt-1 text-[10px] font-bold text-slate-400">مسموح بتعديل الكميات فقط. الأسعار والخصومات لا يمكن تغييرها.</p></div></div>
          <EmployeeSaleEditForm saleId={sale.id} currency={currency} items={sale.items.map((item) => ({ id: item.id, description: item.description, quantity: item.quantity, unitPrice: Number(item.unitPriceSnapshot) }))} />
          <form action={cancelSalesEmployeeSaleAction} className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <input type="hidden" name="saleId" value={sale.id} />
            <ConfirmSubmitButton type="submit" variant="destructive" className="rounded-xl font-black" message="سيتم إلغاء المبيعة وإرجاع الكميات للمخزون. هل تريد المتابعة؟"><Ban className="ml-1.5 h-4 w-4" />إلغاء مبيعتي</ConfirmSubmitButton>
          </form>
        </section>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">هذه المبيعة للعرض فقط الآن. التعديل والإلغاء متاحان فقط في يوم البيع نفسه، طالما لم تُصدر لها فاتورة محاسبية ولم تُلغَ.</div>
      )}

      <section className="erp-section">
        <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800"><History className="h-4 w-4 text-slate-500" /><h2 className="text-sm font-black">سجل الحركة</h2></div>
        <div className="space-y-2">
          <div className="rounded-xl border border-slate-100 p-3 text-xs font-bold dark:border-slate-800"><span className="text-slate-400">إنشاء المبيعة: </span>{audit.creator?.name || auth.user.name} • {formatDateTime(sale.soldAt, timeZone)}</div>
          {audit.events.map((event) => <div key={event.id} className="rounded-xl border border-slate-100 p-3 text-xs font-bold dark:border-slate-800"><span className="text-slate-400">{event.action === "UPDATED" ? "تعديل الكميات" : "إلغاء المبيعة"}: </span>{event.actorName || "المستخدم"} • {formatDateTime(event.createdAt, timeZone)}</div>)}
        </div>
      </section>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: typeof ShoppingCart; label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"><Icon className="h-4 w-4 text-primary" /><p className="mt-3 text-[10px] font-bold text-slate-400">{label}</p><p className="mt-1 text-sm font-black text-slate-900 dark:text-slate-100">{value}</p></div>;
}

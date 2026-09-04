import { SaleStatus } from "@prisma/client";
import { ArrowRight, Ban, FileText, MessageCircle, Printer, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import {
  InventoryMovementTypeBadge,
  SaleStatusBadge,
} from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { getCurrentShopContext } from "@/lib/current-shop";
import { isDatabaseConnectionError } from "@/lib/database-errors";
import { salesService } from "@/lib/services/salesService";
import { whatsappService } from "@/lib/services/whatsappService";
import { createInvoiceFromSaleAction } from "@/app/invoices/actions";
import {
  formatDate,
  formatMoney,
} from "../_components";
import { cancelSaleAction } from "../actions";

export const dynamic = "force-dynamic";

type SaleDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    invoiceError?: string;
  }>;
};

export default async function SaleDetailsPage({
  params,
  searchParams,
}: SaleDetailsPageProps) {
  const { id } = await params;
  const query = await searchParams;
  let sale: Awaited<ReturnType<typeof salesService.getSaleById>>;

  let currency = "SAR";
  let shopName = "";
  let timeZone = "UTC";
  try {
    const context = await getCurrentShopContext();
    currency = context.currency;
    shopName = context.shopName;
    timeZone = context.timeZone;
    sale = await salesService.getSaleById(context.shopId, id);
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return <DatabaseUnavailable />;
    }

    throw error;
  }

  if (!sale) {
    notFound();
  }

  const whatsappShare = whatsappService.buildSaleReceiptShareLinkFromData(sale, shopName, currency);
  const existingInvoice = sale.invoices[0];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200/50 bg-white/95 p-6 shadow-sm shadow-slate-100/40">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-amber-900 text-white shadow-md shadow-primary/10">
              <ShoppingCart className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">تفاصيل إيصال المبيعات</span>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/50">عملية بيع سريعة</span>
              </div>
              <h2 className="text-2xl font-black text-slate-800 font-numeric mt-1 flex items-center gap-2">{sale.receiptNumber}</h2>
              <p className="text-xs font-medium text-slate-400 mt-1">
                العميل المرتبط: <span className="font-semibold text-slate-700">{sale.customer ? sale.customer.name : "عميل نقدي"}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button asChild variant="outline" className="font-bold shadow-sm border-slate-200 hover:bg-slate-50 rounded-xl px-5 h-11">
              <Link href={`/sales/${sale.id}/print`} target="_blank">
                <Printer className="h-4 w-4 ml-1.5 text-slate-700" aria-hidden="true" />
                طباعة الإيصال
              </Link>
            </Button>
            <Button asChild variant="outline" className="font-bold shadow-sm border-slate-200 hover:bg-slate-50 rounded-xl px-5 h-11">
              <Link href="/sales">
                <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden="true" />
                رجوع للقائمة
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {query.invoiceError ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-xs font-bold text-rose-600">{query.invoiceError}</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="erp-section">
            <div className="border-b border-slate-100/60 pb-3 mb-5 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">الملخص المالي العام</h3>
              <SaleStatusBadge status={sale.status} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Info label="العميل" value={sale.customer ? sale.customer.name : "عميل نقدي"} />
              <Info label="رقم الهاتف" value={<span className="font-numeric">{sale.customer?.phone ?? "-"}</span>} />
              <Info label="حالة العملية" value={<SaleStatusBadge status={sale.status} />} />
              <Info label="تاريخ البيع" value={<span className="font-numeric">{formatDate(sale.soldAt, timeZone)}</span>} />
              <Info label="الإجمالي قبل الخصم" value={<span className="font-numeric">{formatMoney(sale.subtotal, currency)}</span>} />
              <Info label="الخصم الإجمالي" value={<span className="font-numeric text-rose-600">{Number(sale.discountTotal) > 0 ? formatMoney(-Number(sale.discountTotal), currency) : formatMoney(0, currency)}</span>} />
              <Info label="الضريبة المضافة" value={<span className="font-numeric">{formatMoney(sale.taxTotal, currency)}</span>} />
              <Info label="الإجمالي النهائي" value={<span className="font-numeric text-primary font-bold">{formatMoney(sale.total, currency)}</span>} />
            </div>
          </div>

          <div className="erp-section">
            <div className="border-b border-slate-100/60 pb-3 mb-4"><h3 className="font-bold text-slate-800 text-sm">بنود الفاتورة / المبيعات</h3></div>
            <div className="overflow-hidden rounded-xl border border-slate-200/50">
              <div className="overflow-x-auto">
                <table className="erp-table min-w-[760px]">
                  <thead><tr><th className="text-slate-700">البند / الوصف</th><th className="text-slate-700">قطعة المخزون المرتبطة</th><th className="text-center text-slate-700">الكمية المباعة</th><th className="text-slate-700">سعر الوحدة</th><th className="text-slate-700">قيمة الخصم</th><th className="text-slate-700">الإجمالي الصافي</th></tr></thead>
                  <tbody>
                    {sale.items.map((item) => (
                      <tr key={item.id} className="align-middle">
                        <td className="font-bold text-slate-800">{item.description}</td>
                        <td className="font-semibold text-slate-500">{item.inventoryItem?.name ?? "خدمة خارجية"}</td>
                        <td className="text-center font-extrabold font-numeric text-slate-755">{item.quantity}</td>
                        <td className="font-numeric text-slate-700 font-medium">{formatMoney(item.unitPriceSnapshot, currency)}</td>
                        <td className="font-numeric text-rose-500 font-medium">{Number(item.discountTotal) > 0 ? formatMoney(-Number(item.discountTotal), currency) : formatMoney(0, currency)}</td>
                        <td className="font-extrabold font-numeric text-slate-800">{formatMoney(item.lineTotal, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="erp-section">
            <div className="border-b border-slate-100/60 pb-3 mb-4"><h3 className="font-bold text-slate-800 text-sm">حركات المخزون المرتبطة</h3></div>
            {sale.inventoryMovements.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium py-6 text-center">لا توجد أية حركات مخزون مسجلة لهذه العملية.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200/50">
                <div className="overflow-x-auto">
                  <table className="erp-table min-w-[680px]">
                    <thead><tr><th className="text-slate-700">القطعة</th><th className="text-slate-700">النوع</th><th className="text-center text-slate-700">التغير</th><th className="text-center text-slate-700">الكمية بعد الحركة</th><th className="text-slate-700">الملاحظة</th><th className="text-slate-700">التاريخ</th></tr></thead>
                    <tbody>
                      {sale.inventoryMovements.map((movement) => (
                        <tr key={movement.id} className="align-middle">
                          <td className="font-bold text-slate-800">{movement.inventoryItem?.name ?? "-"}</td>
                          <td><InventoryMovementTypeBadge type={movement.type} /></td>
                          <td className="text-center font-bold font-numeric text-rose-600">{movement.quantityChange}</td>
                          <td className="text-center font-numeric text-slate-500 font-medium">{movement.quantityAfter ?? "-"}</td>
                          <td className="text-slate-500 text-xs font-medium">{movement.note ?? "-"}</td>
                          <td className="font-numeric text-slate-500 font-medium">{formatDate(movement.createdAt, timeZone)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="erp-section space-y-4">
            <div className="border-b border-slate-100/60 pb-3"><h3 className="font-bold text-slate-800 text-sm font-numeric">إجراءات المبيعات</h3></div>
            <div className="grid gap-3">
              <Button asChild variant="outline" className="w-full font-bold shadow-sm border-slate-200 hover:bg-slate-50 rounded-xl h-11 text-xs justify-center">
                <Link href={`/sales/${sale.id}/print`} target="_blank"><Printer className="h-4 w-4 ml-1.5 shrink-0 text-slate-700" aria-hidden="true" />طباعة الإيصال (حراري 80mm)</Link>
              </Button>
              {whatsappShare.ok ? (
                <Button asChild variant="outline" className="w-full font-bold shadow-sm border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl h-11 text-xs justify-center">
                  <a href={whatsappShare.url} target="_blank" rel="noreferrer"><MessageCircle className="h-4.5 w-4.5 ml-2 text-emerald-600 shrink-0" aria-hidden="true" />إرسال الإيصال عبر واتساب</a>
                </Button>
              ) : (
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 text-[10px] text-slate-400 font-bold leading-normal text-right">⚠️ {whatsappShare.message}</div>
              )}
              {existingInvoice ? (
                <Button asChild variant="outline" className="w-full font-bold shadow-sm border-slate-200 hover:bg-blue-50 hover:text-blue-700 rounded-xl h-11 text-xs justify-center">
                  <Link href={`/invoices/${existingInvoice.id}`}><FileText className="h-4.5 w-4.5 ml-2 text-blue-600 shrink-0" aria-hidden="true" />عرض الفاتورة المسجلة</Link>
                </Button>
              ) : (
                <form action={createInvoiceFromSaleAction} className="w-full">
                  <input type="hidden" name="saleId" value={sale.id} />
                  <SubmitButton type="submit" variant="outline" className="w-full font-bold shadow-sm border-slate-200 hover:bg-teal-50 hover:text-teal-700 rounded-xl h-11 text-xs justify-center" loadingText="جاري إنشاء الفاتورة الضريبية وتحويلك..." icon={<FileText className="h-4.5 w-4.5 ml-2 text-primary shrink-0" aria-hidden="true" />}>إنشاء فاتورة ضريبية</SubmitButton>
                </form>
              )}
              {sale.status === SaleStatus.COMPLETED ? (
                <form action={cancelSaleAction}>
                  <input type="hidden" name="saleId" value={sale.id} />
                  <ConfirmSubmitButton type="submit" variant="destructive" className="w-full font-bold shadow-sm rounded-xl h-11 text-xs justify-center" message="هل تريد إلغاء عملية البيع وإرجاع الكميات للمخزون؟"><Ban className="h-4 w-4 ml-1.5 shrink-0" aria-hidden="true" />إلغاء عملية البيع بالكامل</ConfirmSubmitButton>
                </form>
              ) : (
                <Button type="button" variant="outline" className="w-full border-rose-100 bg-rose-50/10 text-rose-600 font-bold rounded-xl h-11 text-xs justify-center cursor-not-allowed" disabled><Ban className="h-4 w-4 ml-1.5 shrink-0" aria-hidden="true" />تم إلغاء عملية البيع</Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100/50 bg-slate-50/20 p-4 transition duration-200 hover:bg-slate-50/40">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <div className="mt-1.5 text-sm font-bold text-slate-700 leading-normal">{value}</div>
    </div>
  );
}

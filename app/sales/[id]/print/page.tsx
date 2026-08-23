import QRCode from "qrcode";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getCurrentShopContext } from "@/lib/current-shop";
import { salesService } from "@/lib/services/salesService";
import { shopService } from "@/lib/services/shopService";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { PrintActions } from "@/components/print-actions";

export const dynamic = "force-dynamic";

type SalePrintPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SalePrintPage({ params }: SalePrintPageProps) {
  const { id } = await params;
  const { shopId } = await getCurrentShopContext();

  const [sale, shop] = await Promise.all([
    salesService.getSaleById(shopId, id),
    shopService.getShopById(shopId),
  ]);

  if (!sale || !shop) {
    notFound();
  }

  const qrValue = sale.receiptNumber || sale.id;
  const qrCodeDataUrl = await QRCode.toDataURL(qrValue, {
    margin: 0,
    width: 130,
  });

  const currency = shop.currency || "SAR";

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 flex justify-center selection:bg-none">
      {/* Floating Action Bar */}
      <PrintActions backUrl={`/sales/${sale.id}`} />

      {/* 80mm Thermal Receipt Container */}
      <div className="w-[80mm] max-w-full bg-white p-5 shadow-2xl rounded-xl border border-slate-300 text-slate-900 font-sans print:shadow-none print:border-0 print:p-2 print:m-0 print:w-full">
        {/* Header Shop Info */}
        <div className="text-center border-b-2 border-dashed border-slate-900 pb-3">
          <h1 className="text-base font-black tracking-tight text-slate-950 uppercase">
            {shop.name}
          </h1>
          {shop.phone && (
            <p className="text-[11px] font-bold text-slate-800 mt-0.5" dir="ltr">
              {shop.phone}
            </p>
          )}
          {shop.address && (
            <p className="text-[10px] font-medium text-slate-700 mt-0.5">
              {shop.address}
            </p>
          )}
          {shop.taxNumber && (
            <p className="text-[10px] font-bold text-slate-700 mt-0.5">
              الرقم الضريبي: <span className="font-numeric">{shop.taxNumber}</span>
            </p>
          )}
        </div>

        {/* Receipt Title */}
        <div className="text-center py-2 border-b border-slate-300">
          <span className="text-[11px] font-black tracking-wider text-slate-900 bg-slate-100 px-3 py-0.5 rounded border border-slate-300 inline-block">
            إيصال مبيعات POS
          </span>
          <div className="text-lg font-black text-slate-950 font-numeric mt-1 tracking-tight">
            {sale.receiptNumber ?? "إيصال نقدي"}
          </div>
          <div className="text-[10px] text-slate-600 font-numeric mt-0.5">
            تاريخ العملية: {formatDateTime(sale.soldAt)}
          </div>
        </div>

        {/* Customer Information */}
        <div className="py-2 border-b border-slate-300 text-xs space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="text-[10px] font-bold text-slate-600">العميل:</span>
            <span className="font-extrabold text-slate-900">
              {sale.customer?.name ?? "عميل نقدي"}
            </span>
          </div>
        </div>

        {/* Items Table */}
        <div className="py-2.5 border-b border-slate-300 text-xs">
          <div className="flex justify-between font-black text-[10px] text-slate-700 pb-1 border-b border-slate-200 mb-1.5">
            <span>البند / الصنف</span>
            <span>الكمية × السعر</span>
            <span>الإجمالي</span>
          </div>

          <div className="space-y-1.5">
            {sale.items.map((item) => (
              <div key={item.id} className="text-[11px]">
                <div className="font-extrabold text-slate-950">{item.description}</div>
                <div className="flex justify-between text-slate-600 font-numeric text-[10.5px]">
                  <span>{item.quantity} × {formatCurrency(item.unitPriceSnapshot, currency)}</span>
                  <span className="font-bold text-slate-900">{formatCurrency(item.lineTotal, currency)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Totals */}
        <div className="py-2.5 border-b-2 border-dashed border-slate-900 text-xs space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="text-slate-600 font-bold">المجموع الفرعي:</span>
            <span className="font-extrabold text-slate-900 font-numeric">
              {formatCurrency(sale.subtotal, currency)}
            </span>
          </div>

          {Number(sale.discountTotal) > 0 && (
            <div className="flex justify-between items-baseline text-rose-600 font-bold">
              <span>الخصم:</span>
              <span className="font-numeric">
                -{formatCurrency(sale.discountTotal, currency)}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center text-sm font-black bg-slate-100 p-2 rounded border border-slate-200 mt-1">
            <span>الإجمالي المدفوع:</span>
            <span className="font-numeric text-base text-emerald-800">
              {formatCurrency(sale.total, currency)}
            </span>
          </div>
        </div>

        {/* QR Code */}
        <div className="py-3 text-center border-b border-slate-300">
          <div className="inline-block p-1 bg-white border border-slate-300 rounded-lg">
            <Image
              src={qrCodeDataUrl}
              alt={`QR ${sale.receiptNumber ?? sale.id}`}
              width={100}
              height={100}
              unoptimized
              className="mx-auto"
            />
          </div>
          <p className="text-[9px] font-bold text-slate-500 mt-1">
            شكراً لزيارتكم! نأمل رؤيتكم مجدداً
          </p>
        </div>

        {/* Footer greeting */}
        <div className="mt-3 pt-2 text-center text-[9px] font-bold text-slate-500">
          {shop.name} • يسعدنا دائماً خدمتكم
        </div>
      </div>
    </div>
  );
}

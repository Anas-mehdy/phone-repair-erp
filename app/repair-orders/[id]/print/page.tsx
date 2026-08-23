import QRCode from "qrcode";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getCurrentShopContext } from "@/lib/current-shop";
import { repairOrderService } from "@/lib/services/repairOrderService";
import { shopService } from "@/lib/services/shopService";
import { headers } from "next/headers";
import { formatCurrency, formatDateTime, formatDate } from "@/lib/format";
import { PrintActions } from "@/components/print-actions";

export const dynamic = "force-dynamic";

type PrintPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RepairOrderPrintPage({ params }: PrintPageProps) {
  const { id } = await params;
  const { shopId } = await getCurrentShopContext();

  const [repairOrder, shop] = await Promise.all([
    repairOrderService.getRepairOrderById(shopId, id),
    shopService.getShopById(shopId),
  ]);

  if (!repairOrder || !shop) {
    notFound();
  }

  // Construct full live tracking URL for mobile camera scan
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const trackingUrl = `${protocol}://${host}/track/${repairOrder.id}`;

  const qrCodeDataUrl = await QRCode.toDataURL(trackingUrl, {
    margin: 0,
    width: 140,
  });

  const currency = shop.currency || "SAR";

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 flex justify-center selection:bg-none">
      {/* Floating Action Bar */}
      <PrintActions backUrl={`/repair-orders/${repairOrder.id}`} />

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
            إيصال استلام جهاز صيانة
          </span>
          <div className="text-lg font-black text-slate-950 font-numeric mt-1 tracking-tight">
            {repairOrder.ticketNumber}
          </div>
          <div className="text-[10px] text-slate-600 font-numeric mt-0.5">
            تاريخ الاستلام: {formatDateTime(repairOrder.createdAt)}
          </div>
        </div>

        {/* Customer Information */}
        <div className="py-2 border-b border-slate-300 text-xs space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="text-[10px] font-bold text-slate-600">العميل:</span>
            <span className="font-extrabold text-slate-900">
              {repairOrder.customer?.name ?? "عميل نقدي"}
            </span>
          </div>
          {repairOrder.customer?.phone && (
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-bold text-slate-600">رقم الهاتف:</span>
              <span className="font-bold text-slate-900 font-numeric" dir="ltr">
                {repairOrder.customer.phone}
              </span>
            </div>
          )}
        </div>

        {/* Device & Issue Specifications */}
        <div className="py-2.5 border-b border-slate-300 text-xs space-y-1.5">
          <div className="flex justify-between items-baseline">
            <span className="text-[10px] font-bold text-slate-600">نوع الجهاز:</span>
            <span className="font-black text-slate-950">
              {[repairOrder.deviceBrand, repairOrder.deviceModel].filter(Boolean).join(" ") || "غير محدد"}
            </span>
          </div>

          {repairOrder.deviceSerial && (
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-bold text-slate-600">الرقم التسلسلي / IMEI:</span>
              <span className="font-bold text-slate-800 font-numeric text-[10px]">
                {repairOrder.deviceSerial}
              </span>
            </div>
          )}

          <div className="pt-1">
            <span className="text-[10px] font-bold text-slate-600 block mb-0.5">العطل المبلغ عنه:</span>
            <p className="text-[11px] font-extrabold text-slate-900 bg-slate-50 p-2 rounded border border-slate-200 leading-snug">
              {repairOrder.reportedIssue}
            </p>
          </div>

          {repairOrder.diagnosis && (
            <div className="pt-1">
              <span className="text-[10px] font-bold text-slate-600 block mb-0.5">التشخيص الأولي:</span>
              <p className="text-[10px] font-medium text-slate-800 leading-snug">
                {repairOrder.diagnosis}
              </p>
            </div>
          )}
        </div>

        {/* Cost & Due Date */}
        <div className="py-2.5 border-b-2 border-dashed border-slate-900 text-xs space-y-1.5">
          {repairOrder.estimatedTotal !== null && (
            <div className="flex justify-between items-center text-sm font-black bg-slate-100 p-2 rounded">
              <span>التكلفة التقديرية:</span>
              <span className="font-numeric text-base">
                {formatCurrency(repairOrder.estimatedTotal, currency)}
              </span>
            </div>
          )}

          {repairOrder.dueAt && (
            <div className="flex justify-between items-baseline text-[11px]">
              <span className="font-bold text-slate-600">الموعد المتوقع للتسليم:</span>
              <span className="font-extrabold text-slate-900 font-numeric">
                {formatDate(repairOrder.dueAt)}
              </span>
            </div>
          )}
        </div>

        {/* QR Code for Customer Tracking */}
        <div className="py-3 text-center border-b border-slate-300">
          <div className="inline-block p-1 bg-white border border-slate-300 rounded-lg">
            <Image
              src={qrCodeDataUrl}
              alt={`QR ${repairOrder.ticketNumber}`}
              width={120}
              height={120}
              unoptimized
              className="mx-auto"
            />
          </div>
          <p className="text-[9px] font-bold text-slate-500 mt-1">
            امسح الرمز بكاميرا جوالك لتتبع حالة جهازك
          </p>
        </div>

        {/* Terms & Warranty Policy */}
        <div className="py-2.5 border-b border-slate-300">
          <span className="text-[9px] font-black text-slate-800 uppercase block mb-1">
            الشروط والأحكام:
          </span>
          <p className="text-[8.5px] leading-tight text-slate-600 text-justify font-medium">
            {shop.terms || "الضمان يشمل القطع المستبدلة فقط لمدة 30 يوماً. المحل غير مسؤول عن الأجهزة المتروكة لأكثر من 60 يوماً بعد إشعار العميل بالجاهزية."}
          </p>
        </div>

        {/* Signatures */}
        <div className="pt-3 grid grid-cols-2 gap-4 text-center text-[9px] font-bold text-slate-700">
          <div>
            <span className="block mb-6">توقيع العميل:</span>
            <div className="border-t border-slate-400 mx-2" />
          </div>
          <div>
            <span className="block mb-6">توقيع المستلم:</span>
            <div className="border-t border-slate-400 mx-2" />
          </div>
        </div>

        {/* Footer greeting */}
        <div className="mt-4 pt-2 text-center text-[9px] font-bold text-slate-500 border-t border-dotted border-slate-300">
          شكراً لثقتكم واختياركم {shop.name}!
        </div>
      </div>
    </div>
  );
}

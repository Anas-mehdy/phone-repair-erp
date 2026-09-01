import { notFound } from "next/navigation";
import { PrintActions } from "@/components/print-actions";
import { getCurrentShopContext } from "@/lib/current-shop";
import { formatDate } from "@/lib/format";
import { softwareServiceService } from "@/lib/services/softwareServiceService";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function SoftwareServiceStickerPage({ params }: Props) {
  const { id } = await params;
  const context = await getCurrentShopContext();
  const sale = await softwareServiceService.getSaleById(context.shopId, id);
  if (!sale || !sale.deviceKept) notFound();

  return (
    <main className="min-h-screen bg-white p-8 text-slate-950 print:p-0">
      <PrintActions backUrl={`/software-services/${sale.id}`} />
      <section className="mx-auto mt-16 w-[76mm] rounded-xl border-2 border-slate-900 p-4 print:mt-0">
        <div className="border-b border-slate-900 pb-2 text-center">
          <p className="text-lg font-black">{context.shopName}</p>
          <p className="mt-1 text-[10px] font-bold">خدمة سوفتوير — جهاز داخل المحل</p>
        </div>
        <div className="mt-3 space-y-2 text-xs">
          <Row label="العميل" value={sale.customerName ?? "عميل نقدي"} />
          <Row label="الهاتف" value={sale.customerPhone ?? "-"} />
          <Row label="الخدمة" value={sale.serviceName} />
          <Row label="الجهاز" value={[sale.deviceBrand, sale.deviceModel].filter(Boolean).join(" ") || "-"} />
          <Row label="IMEI / Serial" value={sale.deviceSerial ?? "-"} />
          <Row label="الفاتورة" value={sale.invoiceNumber} />
          <Row label="التاريخ" value={formatDate(sale.soldAt)} />
        </div>
        <p className="mt-4 border-t border-dashed border-slate-400 pt-2 text-center text-[9px] font-bold text-slate-600">هذا الملصق لتعريف الجهاز فقط، ولا يمثل حالة تنفيذ للخدمة.</p>
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3"><span className="font-black">{label}</span><span className="max-w-[48mm] text-left font-bold break-words">{value}</span></div>;
}

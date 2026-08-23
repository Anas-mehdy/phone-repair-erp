import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Smartphone,
  CheckCircle2,
  Clock,
  MessageCircle,
  Phone,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { RepairStatus } from "@prisma/client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type TrackPageProps = {
  params: Promise<{
    ticketNumber: string;
  }>;
  searchParams?: Promise<{
    s?: string;
    shop?: string;
    phone?: string;
  }>;
};

const statusDetails: Record<
  RepairStatus,
  { label: string; description: string; step: number; colorClass: string; bgClass: string; borderClass: string }
> = {
  PENDING: {
    label: "قيد الانتظار والاستلام",
    description: "تم تسجيل جهازك بنجاح وبانتظار بدء الفحص الفني من قبل المختص.",
    step: 1,
    colorClass: "text-amber-400",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/30",
  },
  DIAGNOSING: {
    label: "قيد الفحص والتشخيص",
    description: "يقوم الفني حالياً بفحص الجهاز وتحديد العطل وقطع الغيار المطلوبة.",
    step: 2,
    colorClass: "text-indigo-400",
    bgClass: "bg-indigo-500/10",
    borderClass: "border-indigo-500/30",
  },
  WAITING_PARTS: {
    label: "بانتظار وصول قطع الغيار",
    description: "تم فحص الجهاز وتحديد القطعة وبانتظار توريدها للبدء بالتركيب فوراً.",
    step: 3,
    colorClass: "text-orange-400",
    bgClass: "bg-orange-500/10",
    borderClass: "border-orange-500/30",
  },
  REPAIRING: {
    label: "قيد الصيانة والإصلاح",
    description: "جاري صيانة واستبدال القطع وفحص أداء الجهاز بدقة.",
    step: 3,
    colorClass: "text-teal-400",
    bgClass: "bg-teal-500/10",
    borderClass: "border-teal-500/30",
  },
  DONE: {
    label: "مكتمل وجاهز للاستلام 🎉",
    description: "تمت صيانة جهازك بنجاح وبكفاءة، وهو جاهز للاستلام في المحل الآن!",
    step: 4,
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-500/15",
    borderClass: "border-emerald-500/40",
  },
  DELIVERED: {
    label: "تم تسليم الجهاز بنجاح",
    description: "تم استلام الجهاز من قبل العميل. شكراً لثقتكم واختياركم لنا!",
    step: 5,
    colorClass: "text-sky-400",
    bgClass: "bg-sky-500/10",
    borderClass: "border-sky-500/30",
  },
  CANCELLED: {
    label: "طلب صيانة ملغي",
    description: "تم إلغاء عملية الصيانة بناءً على طلب العميل أو تعذر الإصلاح.",
    step: 0,
    colorClass: "text-rose-400",
    bgClass: "bg-rose-500/10",
    borderClass: "border-rose-500/30",
  },
};

const steps = [
  { num: 1, label: "الاستلام" },
  { num: 2, label: "الفحص" },
  { num: 3, label: "الصيانة" },
  { num: 4, label: "جاهز" },
  { num: 5, label: "التسليم" },
];

export default async function TrackTicketPage({ params, searchParams }: TrackPageProps) {
  const { ticketNumber } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const shopId = resolvedSearchParams.s || resolvedSearchParams.shop;
  const phone = resolvedSearchParams.phone?.trim();
  const decodedParam = decodeURIComponent(ticketNumber).trim();

  // Check if parameter is a unique UUID (direct QR scan)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedParam);

  const repairOrder = await prisma.repairOrder.findFirst({
    where: {
      deletedAt: null,
      ...(isUuid
        ? { id: decodedParam }
        : {
            ticketNumber: {
              equals: decodedParam,
              mode: "insensitive",
            },
            ...(shopId ? { shopId } : {}),
            ...(phone
              ? {
                  customer: {
                    OR: [
                      { phone: { contains: phone } },
                      { phoneNormalized: { contains: phone } },
                    ],
                  },
                }
              : {}),
          }),
    },
    include: {
      shop: true,
      customer: true,
      statusHistory: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!repairOrder) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8 overflow-x-hidden">
        <div className="w-full max-w-sm text-center space-y-5 bg-slate-900/90 p-6 rounded-3xl border border-slate-800 shadow-2xl">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Search className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-black text-white">لم يتم العثور على التذكرة</h2>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            تأكد من صحة رقم التذكرة المدخل: <span className="font-numeric font-bold text-teal-400 block mt-1">{decodedParam}</span>
          </p>
          <Button asChild className="w-full bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 rounded-xl h-11">
            <Link href="/track">بحث برقم تذكرة آخر</Link>
          </Button>
        </div>
      </div>
    );
  }

  const shop = repairOrder.shop;
  const currentStatus = statusDetails[repairOrder.status] || statusDetails.PENDING;
  const currency = shop.currency || "SAR";

  // Find the latest status note entered by technician
  const latestStatusNote = repairOrder.statusHistory.find(
    (h) => h.note && h.note.trim().length > 0
  )?.note;

  const whatsappPhone = shop.phone?.replace(/[^\d]/g, "") || "";
  const whatsappUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
        `مرحباً، أستفسر عن حالة تذكرة الصيانة رقم: ${repairOrder.ticketNumber} الخاصة بجهاز ${[
          repairOrder.deviceBrand,
          repairOrder.deviceModel,
        ]
          .filter(Boolean)
          .join(" ")}`
      )}`
    : null;

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 py-4 px-3 sm:px-4 flex flex-col items-center justify-start overflow-x-hidden">
      <div className="w-full max-w-md space-y-4">
        {/* Shop Header Bar */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-4 text-center shadow-lg">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 mb-2">
            <Smartphone className="h-5 w-5" />
          </div>
          <h1 className="text-base font-black text-white tracking-tight">{shop.name}</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">تتبع حالة صيانة الأجهزة المباشر</p>

          {(shop.phone || shop.address) && (
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-3 text-[11px] font-bold text-slate-400">
              {shop.phone && (
                <span className="flex items-center gap-1" dir="ltr">
                  <Phone className="h-3 w-3 text-teal-400" />
                  {shop.phone}
                </span>
              )}
              {shop.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-teal-400" />
                  {shop.address}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Current Status Cockpit */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-4 sm:p-5 shadow-xl space-y-4">
          {/* Header row: Ticket # & Status */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <span className="text-[9px] font-extrabold text-slate-400 uppercase block">رقم التذكرة</span>
              <span className="text-xl font-black text-teal-400 font-numeric tracking-tight">{repairOrder.ticketNumber}</span>
            </div>
            <div className="text-left">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black border ${currentStatus.colorClass} ${currentStatus.bgClass} ${currentStatus.borderClass}`}>
                <Sparkles className="h-3 w-3" />
                {currentStatus.label}
              </span>
            </div>
          </div>

          {/* Status Explanation Card */}
          <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800/80">
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {currentStatus.description}
            </p>
          </div>

          {/* Technician Live Note Alert Card (If note is entered) */}
          {latestStatusNote && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-1.5 text-right shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-400">
                <MessageCircle className="h-4 w-4 shrink-0 text-amber-400" />
                <span>ملاحظة وتحديث من الفني المشرف:</span>
              </div>
              <p className="text-xs text-amber-100 font-bold leading-relaxed pr-5 whitespace-pre-wrap">
                {latestStatusNote}
              </p>
            </div>
          )}

          {/* Progress Timeline Tracker */}
          <div className="pt-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2.5">
              مراحل إنجاز جهازك:
            </span>
            <div className="grid grid-cols-5 gap-1">
              {steps.map((step) => {
                const isPassed = currentStatus.step >= step.num;
                const isCurrent = currentStatus.step === step.num;

                return (
                  <div
                    key={step.num}
                    className={`rounded-xl py-2 px-1 text-center border transition-all ${
                      isCurrent
                        ? "border-teal-500 bg-teal-500/20 text-teal-300 font-black shadow-sm shadow-teal-500/20"
                        : isPassed
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold"
                        : "border-slate-800/80 bg-slate-950/40 text-slate-500 font-medium"
                    }`}
                  >
                    <div className="flex items-center justify-center text-[10px] mb-0.5">
                      {isPassed ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                    </div>
                    <span className="text-[9.5px] block leading-tight">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Device & Ticket Details Grid */}
          <div className="grid grid-cols-1 gap-2 pt-1">
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-400">الجهاز:</span>
              <span className="text-xs font-black text-white">
                {[repairOrder.deviceBrand, repairOrder.deviceModel].filter(Boolean).join(" ") || "غير محدد"}
              </span>
            </div>

            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-400">تاريخ الاستلام:</span>
              <span className="text-xs font-bold text-white font-numeric">
                {formatDateTime(repairOrder.createdAt)}
              </span>
            </div>

            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-400">العطل المسجل:</span>
              <span className="text-xs font-extrabold text-teal-300">
                {repairOrder.reportedIssue}
              </span>
            </div>

            {repairOrder.diagnosis && (
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex justify-between items-start gap-3">
                <span className="text-[11px] font-bold text-slate-400 shrink-0">التشخيص الفني:</span>
                <span className="text-xs font-semibold text-slate-200 text-left">
                  {repairOrder.diagnosis}
                </span>
              </div>
            )}

            {repairOrder.resolutionNotes && (
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex justify-between items-start gap-3">
                <span className="text-[11px] font-bold text-slate-400 shrink-0">ملاحظات الإصلاح:</span>
                <span className="text-xs font-semibold text-slate-200 text-left">
                  {repairOrder.resolutionNotes}
                </span>
              </div>
            )}

            {repairOrder.estimatedTotal !== null && (
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-400">التكلفة التقديرية:</span>
                <span className="text-sm font-black text-teal-400 font-numeric">
                  {formatCurrency(repairOrder.estimatedTotal, currency)}
                </span>
              </div>
            )}

            {repairOrder.finalTotal !== null && (
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-400">التكلفة النهائية:</span>
                <span className="text-sm font-black text-emerald-400 font-numeric">
                  {formatCurrency(repairOrder.finalTotal, currency)}
                </span>
              </div>
            )}
          </div>

          {/* Previous Updates History Log (if more than 1 note exists) */}
          {repairOrder.statusHistory.filter((h) => h.note && h.note.trim()).length > 1 && (
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                سجل التحديثات والملاحظات السابقة:
              </span>
              <div className="space-y-1.5">
                {repairOrder.statusHistory
                  .filter((h) => h.note && h.note.trim())
                  .slice(1)
                  .map((h) => (
                    <div key={h.id} className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60 text-xs text-right">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                        <span className="font-bold text-teal-400">{statusDetails[h.toStatus]?.label ?? h.toStatus}</span>
                        <span className="font-numeric">{formatDateTime(h.createdAt)}</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed font-medium">{h.note}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Direct WhatsApp Contact Button */}
          {whatsappUrl && (
            <div className="pt-2">
              <Button asChild className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 border-0">
                <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  مراسلة المحل عبر واتساب للاستفسار
                </a>
              </Button>
            </div>
          )}
        </div>

        {/* Warranty Policy */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-center">
          <p className="text-[10px] text-slate-400 leading-normal font-medium flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-400 shrink-0" />
            {shop.terms || "الضمان يشمل القطع المستبدلة فقط لمدة 30 يوماً. شكراً لثقتكم بنا."}
          </p>
        </div>
      </div>
    </div>
  );
}

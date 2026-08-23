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
};

const statusDetails: Record<
  RepairStatus,
  { label: string; description: string; step: number; color: string }
> = {
  PENDING: {
    label: "قيد الانتظار والاستلام",
    description: "تم تسجيل جهازك بنجاح وبانتظار بدء الفحص الفني.",
    step: 1,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  DIAGNOSING: {
    label: "قيد الفحص والتشخيص",
    description: "يقوم الفني حالياً بفحص الجهاز وتحديد العطل وقطع الغيار المطلوبة.",
    step: 2,
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
  },
  WAITING_PARTS: {
    label: "بانتظار وصول قطع الغيار",
    description: "تم فحص الجهاز وتحديد القطعة وبانتظار توريدها للبدء بالتركيب.",
    step: 3,
    color: "text-orange-600 bg-orange-50 border-orange-200",
  },
  REPAIRING: {
    label: "قيد الصيانة والإصلاح",
    description: "جاري صيانة واستبدال القطع وفحص الجهاز بدقة.",
    step: 3,
    color: "text-teal-600 bg-teal-50 border-teal-200",
  },
  DONE: {
    label: "مكتمل وجاهز للاستلام 🎉",
    description: "تمت صيانة جهازك بنجاح وهو جاهز للاستلام في المحل الآن!",
    step: 4,
    color: "text-emerald-700 bg-emerald-50 border-emerald-300",
  },
  DELIVERED: {
    label: "تم تسليم الجهاز للعميل",
    description: "تم استلام الجهاز بنجاح. شكراً لثقتكم بنا!",
    step: 5,
    color: "text-sky-700 bg-sky-50 border-sky-200",
  },
  CANCELLED: {
    label: "طلب صيانة ملغي",
    description: "تم إلغاء عملية الصيانة بناءً على طلب العميل أو تعذر الإصلاح.",
    step: 0,
    color: "text-rose-600 bg-rose-50 border-rose-200",
  },
};

const steps = [
  { num: 1, label: "استلام الجهاز" },
  { num: 2, label: "الفحص والتشخيص" },
  { num: 3, label: "الإصلاح والصيانة" },
  { num: 4, label: "جاهز للاستلام" },
  { num: 5, label: "تم التسليم" },
];

export default async function TrackTicketPage({ params }: TrackPageProps) {
  const { ticketNumber } = await params;
  const decodedTicket = decodeURIComponent(ticketNumber).trim();

  const repairOrder = await prisma.repairOrder.findFirst({
    where: {
      ticketNumber: {
        equals: decodedTicket,
        mode: "insensitive",
      },
      deletedAt: null,
    },
    include: {
      shop: true,
      customer: true,
      statusHistory: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!repairOrder) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12">
        <div className="max-w-md w-full text-center space-y-6 bg-slate-900/80 p-8 rounded-3xl border border-slate-800 backdrop-blur-xl">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Search className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-black text-white">لم يتم العثور على التذكرة</h2>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            تأكد من صحة رقم التذكرة المدخل: <span className="font-numeric font-bold text-white block mt-1">{decodedTicket}</span>
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
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 selection:bg-teal-500 selection:text-white">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-1/3 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto space-y-6 relative z-10">
        {/* Shop Card Header */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl p-6 text-center shadow-xl">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 mb-3">
            <Smartphone className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-black text-white">{shop.name}</h1>
          <p className="text-xs text-slate-400 mt-1">نظام تتبع حالة صيانة الأجهزة المباشر</p>

          <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-400">
            {shop.phone && (
              <span className="flex items-center gap-1.5" dir="ltr">
                <Phone className="h-3.5 w-3.5 text-teal-400" />
                {shop.phone}
              </span>
            )}
            {shop.address && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-teal-400" />
                {shop.address}
              </span>
            )}
          </div>
        </div>

        {/* Current Status Cockpit */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-5">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">رقم التذكرة</span>
              <span className="text-2xl font-black text-teal-400 font-numeric tracking-tight">{repairOrder.ticketNumber}</span>
            </div>
            <div className="self-start sm:self-auto">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border ${currentStatus.color}`}>
                <Sparkles className="h-3.5 w-3.5" />
                {currentStatus.label}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80">
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
              {currentStatus.description}
            </p>
          </div>

          {/* Progress Timeline Tracker */}
          <div className="pt-2">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-4">مراحل إنجاز الجهاز:</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {steps.map((step) => {
                const isPassed = currentStatus.step >= step.num;
                const isCurrent = currentStatus.step === step.num;

                return (
                  <div
                    key={step.num}
                    className={`rounded-2xl p-3 text-center border transition ${
                      isCurrent
                        ? "border-teal-500 bg-teal-500/10 text-teal-300 font-black shadow-md shadow-teal-500/10"
                        : isPassed
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400 font-bold"
                        : "border-slate-800 bg-slate-950/40 text-slate-500 font-medium"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 text-[11px] mb-1">
                      {isPassed ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Clock className="h-3.5 w-3.5" />}
                      <span className="font-numeric">#{step.num}</span>
                    </div>
                    <span className="text-[11px] block leading-tight">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Device & Ticket Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block">الجهاز:</span>
              <span className="text-sm font-extrabold text-white mt-1 block">
                {[repairOrder.deviceBrand, repairOrder.deviceModel].filter(Boolean).join(" ") || "غير محدد"}
              </span>
            </div>

            <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block">تاريخ الاستلام:</span>
              <span className="text-sm font-extrabold text-white mt-1 block font-numeric">
                {formatDateTime(repairOrder.createdAt)}
              </span>
            </div>

            <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block">العطل المسجل:</span>
              <span className="text-xs font-bold text-slate-200 mt-1 block">
                {repairOrder.reportedIssue}
              </span>
            </div>

            {repairOrder.estimatedTotal !== null && (
              <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 block">التكلفة التقديرية:</span>
                <span className="text-sm font-black text-teal-400 mt-1 block font-numeric">
                  {formatCurrency(repairOrder.estimatedTotal, currency)}
                </span>
              </div>
            )}
          </div>

          {/* Direct WhatsApp Contact Button */}
          {whatsappUrl && (
            <div className="pt-2">
              <Button asChild className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 border-0">
                <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2">
                  <MessageCircle className="h-4.5 w-4.5" />
                  مراسلة المحل مباشرة عبر واتساب للاستفسار
                </a>
              </Button>
            </div>
          )}
        </div>

        {/* Warranty Notice */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center">
          <p className="text-[10.5px] text-slate-400 leading-relaxed font-medium flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-teal-400 shrink-0" />
            {shop.terms || "الضمان يشمل القطع المستبدلة فقط لمدة 30 يوماً. شكراً لثقتكم بنا."}
          </p>
        </div>
      </div>
    </div>
  );
}

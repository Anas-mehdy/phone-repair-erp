"use client";

import { useState } from "react";
import {
  MessageCircle,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  X,
  KeyRound,
  AlertCircle,
  Clock,
  RefreshCw,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizePhoneForWhatsApp } from "@/lib/services/whatsappService";

export type WhatsAppModalProps = {
  customerName?: string | null;
  customerPhone?: string | null;
  deviceBrand?: string | null;
  deviceModel?: string | null;
  ticketNumber: string;
  statusLabel: string;
  totalAmount?: string | number | null;
  shopName: string;
  currency?: string;
  trackingUrl: string;
};

type TemplateId = "ready" | "passcode" | "price_approval" | "delay" | "status_update" | "custom";

export function WhatsAppMessageModal({
  customerName = "العميل",
  customerPhone,
  deviceBrand,
  deviceModel,
  ticketNumber,
  statusLabel,
  totalAmount,
  shopName,
  currency = "SAR",
  trackingUrl,
}: WhatsAppModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("ready");
  const [phoneOverride, setPhoneOverride] = useState(customerPhone || "");

  const device = [deviceBrand, deviceModel].filter(Boolean).join(" ") || "الجهاز";
  const formattedAmount = totalAmount ? `${totalAmount} ${currency}` : `غير محدد`;
  const name = customerName || "عميلنا العزيز";

  const templates: Record<TemplateId, { title: string; icon: React.ComponentType<{ className?: string }>; text: string }> = {
    ready: {
      title: "🎉 جاهز للاستلام",
      icon: Sparkles,
      text: `مرحباً ${name}،
يسرنا إبلاغك بأن جهازك (${device}) أصبح جاهزاً للاستلام الآن لدى ${shopName} 🎉

📋 رقم التذكرة: ${ticketNumber}
💰 المبلغ المطلوب: ${formattedAmount}
🔗 تتبع حالة جهازك: ${trackingUrl}

يرجى إحضار إيصال الاستلام عند الحضور. شكراً لثقتكم بنا!`,
    },
    passcode: {
      title: "🔑 طلب رمز القفل",
      icon: KeyRound,
      text: `مرحباً ${name}،
بخصوص صيانة جهازك (${device}) لدى ${shopName}:

تم الانتهاء من تركيب القطع، ونرجو تزويدنا برمز قفل الشاشة (الرمز السري أو النمط) لنتمكن من فحص واختبار وظائف الجهاز والكاميرا والصوت واللمس بدقة قبل تسليمه لك.

📋 رقم التذكرة: ${ticketNumber}
شكراً لتعاونكم معنا!`,
    },
    price_approval: {
      title: "⚠️ موافقة على التكلفة",
      icon: AlertCircle,
      text: `مرحباً ${name}،
بخصوص جهازك (${device}) رقم التذكرة ${ticketNumber} لدى ${shopName}:

بعد الفحص الفني، تبيّن وجود عطل يحتاج إلى صيانة وتغيير قطع، والتكلفة الإجمالية التقديرية هي: ${formattedAmount}.

نرجو منكم تأكيد الموافقة على المتابعة في عملية الصيانة. بانتظار ردكم الكريم!`,
    },
    delay: {
      title: "⏳ إشعار بتأخر القطع",
      icon: Clock,
      text: `مرحباً ${name}،
نعتذر منك بخصوص تأخر صيانة جهازك (${device})، القطعة المطلوبة قيد التوريد والشحن من المورد الخارجي.

سيتم إبلاغك فور وصول القطعة والبدء بتركيبها مباشرة.
📋 رقم التذكرة: ${ticketNumber}
🔗 رابط التتبع المباشر: ${trackingUrl}

شكراً لصبركم وتفهمكم!`,
    },
    status_update: {
      title: "🔄 تحديث الحالة الحالي",
      icon: RefreshCw,
      text: `مرحباً ${name}،
تحديث بخصوص جهازك لدى ${shopName}:

📋 رقم الطلب: ${ticketNumber}
📱 الجهاز: ${device}
⚙️ الحالة الحالية: ${statusLabel}
🔗 رابط التتبع المباشر: ${trackingUrl}

شكراً لتعاملكم معنا.`,
    },
    custom: {
      title: "✍️ رسالة حرة مخصصة",
      icon: Edit3,
      text: `مرحباً ${name}،

بخصوص جهازك (${device}) رقم التذكرة ${ticketNumber}:


مع تحيات ${shopName}`,
    },
  };

  const [message, setMessage] = useState(templates.ready.text);

  function handleSelectTemplate(id: TemplateId) {
    setSelectedTemplate(id);
    setMessage(templates[id].text);
  }

  function insertVariable(val: string) {
    setMessage((prev) => prev + ` ${val} `);
  }

  const normalizedPhone = normalizePhoneForWhatsApp(phoneOverride, currency);
  const whatsappUrl = normalizedPhone
    ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`
    : null;

  function handleCopy() {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full font-bold shadow-sm rounded-xl py-5 text-xs justify-center hover:bg-emerald-50 hover:text-emerald-700 border-slate-200"
        variant="outline"
      >
        <MessageCircle className="h-4.5 w-4.5 ml-2 text-emerald-600 shrink-0" aria-hidden="true" />
        مراسلة العميل عبر واتساب
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-transparent">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    مراسلة العميل عبر واتساب
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    اختر قالباً جاهزاً أو عدّل النص بحرية قبل الإرسال
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Phone target confirmation */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span>المرسل إليه:</span>
                  <span className="text-slate-900 font-black">{name}</span>
                  <span className="text-[11px] text-slate-500">({device})</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    value={phoneOverride}
                    onChange={(e) => setPhoneOverride(e.target.value)}
                    placeholder="رقم الواتساب..."
                    className="h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-numeric font-bold text-slate-900 w-36 text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Template Buttons Grid */}
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-2">
                  القوالب الجاهزة المخصصة لورش الصيانة:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(templates) as TemplateId[]).map((id) => {
                    const t = templates[id];
                    const active = selectedTemplate === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleSelectTemplate(id)}
                        className={`flex items-center gap-1.5 p-2.5 rounded-xl text-xs font-bold transition text-right border ${
                          active
                            ? "bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs ring-1 ring-emerald-400/30"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <t.icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-emerald-600" : "text-slate-400"}`} />
                        <span className="truncate">{t.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-extrabold text-slate-700">
                    محتوى الرسالة (قابل للتعديل بحرية):
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">
                    {message.length} حرف
                  </span>
                </div>
                <textarea
                  rows={7}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="erp-textarea w-full text-xs font-medium leading-relaxed resize-none p-3.5 rounded-2xl border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20"
                  placeholder="اكتب نص الرسالة هنا..."
                />
              </div>

              {/* Quick variables insertion */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                  إدراج بيانات سريعة:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => insertVariable(name)}
                    className="text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition"
                  >
                    + اسم العميل
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariable(device)}
                    className="text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition"
                  >
                    + الجهاز
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariable(ticketNumber)}
                    className="text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition"
                  >
                    + رقم التذكرة
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariable(formattedAmount)}
                    className="text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition"
                  >
                    + المبلغ
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariable(trackingUrl)}
                    className="text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition"
                  >
                    + رابط التتبع
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCopy}
                className="w-full sm:w-auto font-bold text-xs h-11 px-4 rounded-xl border-slate-300"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 ml-1.5 text-emerald-600" />
                    تم نسخ النص!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 ml-1.5" />
                    نسخ الرسالة
                  </>
                )}
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  className="font-bold text-xs h-11 px-4 rounded-xl text-slate-500"
                >
                  إلغاء
                </Button>

                {whatsappUrl ? (
                  <Button asChild className="flex-1 sm:flex-none font-bold text-xs h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 border-0">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      فتح في واتساب الآن
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                ) : (
                  <Button disabled className="flex-1 sm:flex-none font-bold text-xs h-11 px-6 rounded-xl opacity-60">
                    أدخل رقم هاتف صحيح
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

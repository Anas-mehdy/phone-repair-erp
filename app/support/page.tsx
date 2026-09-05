"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MessageCircle,
  Phone,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Bug,
  KeyRound,
  Printer,
  HelpCircle,
  Clock,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  BookOpenText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

const SUPPORT_PHONE = "+905350215375";
const SUPPORT_PHONE_FORMATTED = "+90 535 021 53 75";

const QUICK_TOPICS = [
  {
    title: "💡 اقتراح أو طلب ميزة جديدة",
    desc: "لديك فكرة لتحسين تجربة عملك؟ نحن نصغي لك ونطورها فوراً",
    message: "مرحباً، أود اقتراح ميزة جديدة لتطوير نظام إدارة الصيانة:",
    icon: Sparkles,
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  {
    title: "🐞 الإبلاغ عن مشكلة أو خطأ",
    desc: "واجهت مشكلة في صفحة أو أثناء الحفظ؟ فريقنا سيصلحها بأسرع وقت",
    message: "مرحباً، أواجه مشكلة فنية في النظام وأحتاج لمساعدتكم:",
    icon: Bug,
    color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  },
  {
    title: "🖨️ إعداد الطابعات الحرارية والستيكرات",
    desc: "مساعدة في ضبط مقاسات إيصالات الـ POS وستيكر 50×30 مم",
    message: "مرحباً، أحتاج مساعدة في ضبط إعدادات الطباعة الحرارية للستيكرات أو الفواتير:",
    icon: Printer,
    color: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  },
  {
    title: "🔑 المساعدة في تسجيل الدخول وكلمة المرور",
    desc: "فقدت كلمة المرور أو تحتاج لتعديل البريد المسجل للمتجر",
    message: "مرحباً، أحتاج مساعدة بخصوص حساب متجري وتسجيل الدخول:",
    icon: KeyRound,
    color: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  },
];

const FAQS = [
  {
    q: "كيف أطبع ستيكر الباركود على طابعة الملصقات الحرارية (50×30 مم)؟",
    a: "من صفحة تفاصيل أي تذكرة صيانة، اضغط على زر «طباعة ستيكر الهاتف (50×30 مم)». في نافذة الطباعة اختر حجم الورق 50×30mm أو اضبط الهوامش على None لطباعة باركود و QR مثالي يُلصق على ظهر هاتف العميل.",
  },
  {
    q: "كيف يتم حساب صافي ربح الصيانة مع قطع الغيار والموردين؟",
    a: "عند إنشاء أو تعديل تذكرة صيانة، يمكنك تحديد اسم المورد وتكلفة شراء القطعة مع تفعيل خيار «خصم تكلفة القطعة من صافي الربح». سيقوم النظام تلقائياً بطرح سعر القطعة من إجمالي الصيانة وعرض صافي الربح الخاص بمركزك.",
  },
  {
    q: "هل يمكن للعميل تتبع جهازه عبر الواتساب والـ QR دون معرفة بيانات المورد؟",
    a: "نعم تماماً! بيانات المورد، سعر شراء القطعة، وملاحظات الشراء خاصة تماماً بورشة الصيانة ولا تظهر أبداً في إيصال العميل المطبوع، أو الستيكر، أو صفحة التتبع الإلكترونية.",
  },
  {
    q: "كيف أغير العملة الرسمية أو النسبة الضريبية أو اسم المركز؟",
    a: "يمكنك الذهاب إلى «إعدادات المتجر» من القائمة الجانبية وتعديل العملة، الهاتف، شروط الفواتير، ونسبة الضريبة وحفظ التعديلات لتنعكس فوراً على كافة الفواتير والإيصالات.",
  },
];

export default function SupportPage() {
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function handleCopyPhone() {
    navigator.clipboard.writeText(SUPPORT_PHONE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function getWhatsAppUrl(customText?: string) {
    const defaultMsg = "مرحباً، أتواصل معك بخصوص نظام مسار:";
    const text = customText || defaultMsg;
    return `https://wa.me/905350215375?text=${encodeURIComponent(text)}`;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PageHeader
        title="مركز الدعم الفني والمساعدة المباشرة"
        description="نحن هنا لمساعدتك في كل خطوة لتشغيل وإدارة مركز الصيانة الخاص بك بأعلى كفاءة."
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-teal-200 bg-teal-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm"><BookOpenText className="h-5 w-5" /></span><div><h2 className="text-xs font-black text-slate-900">جرّب مركز المساعدة أولاً إذا سؤالك عن طريقة الاستخدام</h2><p className="mt-1 text-[11px] font-semibold leading-5 text-slate-600">شروحات قصيرة حسب الصيانة والمبيعات والمخزون والمحافظ والديون والخدمات الإلكترونية.</p></div></div>
        <Link href="/help" className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 px-4 text-xs font-black text-white hover:bg-teal-700">فتح مركز المساعدة</Link>
      </div>

      {/* Main WhatsApp Support Hero Card */}
      <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-800 text-xs font-black border border-emerald-500/30">
              <span className="flex h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>دعم فني مباشر عبر واتساب 24/7</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
              تواصل مباشرة مع فريق التطوير والدعم الفني
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-xl leading-relaxed">
              إذا كان لديك أي استفسار، مشكلة تقنية، أو ترغب في تخصيص ميزة خاصة بمتجرك، يسعدنا التحدث معك مباشرة والرد الفوري عبر الواتساب.
            </p>

            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs">
                <Phone className="h-4 w-4 text-emerald-600" />
                <span className="font-numeric font-bold text-slate-900 text-sm" dir="ltr">
                  {SUPPORT_PHONE_FORMATTED}
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleCopyPhone}
                className="font-bold text-xs h-10 px-3 rounded-xl border-slate-300 bg-white hover:bg-slate-50"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 ml-1.5 text-emerald-600" />
                    تم نسخ الرقم
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 ml-1.5" />
                    نسخ الرقم
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 shrink-0">
            <Button
              asChild
              className="h-14 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-lg shadow-emerald-600/25 transition duration-200 border-0"
            >
              <a href={getWhatsAppUrl()} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2.5">
                <MessageCircle className="h-5 w-5" />
                <span>محادثة واتساب فورية الآن</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-bold">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>استجابة سريعة ومباشرة من المطور</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Topic Triggers */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-black text-slate-900">
            اختر موضوع المحادثة للتواصل السريع:
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            اضغط على أي موضوع لفتح رسالة مجهزة ومخصصة على الواتساب بنقرة واحدة
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {QUICK_TOPICS.map((topic, index) => (
            <a
              key={index}
              href={getWhatsAppUrl(topic.message)}
              target="_blank"
              rel="noreferrer"
              className="group p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-500/5 transition duration-200 flex items-start gap-4"
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${topic.color} group-hover:scale-105 transition-transform`}>
                <topic.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-black text-slate-900 group-hover:text-emerald-700 transition">
                    {topic.title}
                  </h4>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-emerald-600 transition shrink-0" />
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                  {topic.desc}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* FAQs Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4.5 w-4.5 text-primary" />
          <h3 className="text-sm font-black text-slate-900">
            الأسئلة الشائعة والتعليمات السريعة
          </h3>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full p-4 text-right flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                >
                  <span className="text-xs font-black text-slate-800">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-600 font-medium leading-relaxed border-t border-slate-100 bg-slate-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Support Working Hours Footer */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600 font-bold">
          <Clock className="h-4 w-4 text-emerald-600" />
          <span>أوقات الدعم المباشر: طوال أيام الأسبوع من الساعة 9:00 صباحاً حتى 11:00 مساءً بتوقيت مكة</span>
        </div>
        <a
          href={getWhatsAppUrl()}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-black text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
        >
          <span>تواصل عبر الواتساب</span>
          <ArrowRight className="h-3.5 w-3.5 rotate-180" />
        </a>
      </div>
    </div>
  );
}

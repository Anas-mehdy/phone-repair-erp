"use client";

import { useState } from "react";
import {
  Cpu,
  Flame,
  Search,
  Sparkles,
  Layers,
  Zap,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  MessageCircle,
  ShieldAlert,
  Battery,
  Tv,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

interface CompatibilitySample {
  category: "screens" | "batteries" | "ports" | "ics";
  partName: string;
  originalModel: string;
  compatibleModels: string[];
  notes: string;
  matchScore: number;
}

const SAMPLES: CompatibilitySample[] = [
  {
    category: "screens",
    partName: "شاشة AMOLED كاملة مع اللمس والإطار",
    originalModel: "Xiaomi Redmi Note 10 4G",
    compatibleModels: ["Xiaomi Redmi Note 10S", "Poco M5s"],
    notes: "تطابق كامل بنسبة 100% لنفس موصل الشاشة وموقع البصمة الجانبية ومستشعر التقارب.",
    matchScore: 100,
  },
  {
    category: "screens",
    partName: "شاشة LCD In-Cell مع الفريم",
    originalModel: "Samsung Galaxy A12 (A125F)",
    compatibleModels: ["Samsung Galaxy A02s", "Samsung Galaxy M12", "Samsung Galaxy M02s"],
    notes: "مطابقة تماماً بدون أي تعديل برمجي أو قص للإطار البلاستيكي.",
    matchScore: 100,
  },
  {
    category: "batteries",
    partName: "بطارية BN5A سعة 5000mAh",
    originalModel: "Xiaomi Poco M4 Pro 5G",
    compatibleModels: ["Redmi Note 11 5G (China)", "Redmi Note 11S 5G"],
    notes: "نفس الفولت ومخطط فلكس البطارية وأبعاد حجرة الجهاز.",
    matchScore: 98,
  },
  {
    category: "ports",
    partName: "فلكس قاعدة شحن USB-C مع المايك",
    originalModel: "Infinix Hot 11 Play",
    compatibleModels: ["Infinix Smart 6 Plus", "Tecno Spark 8C"],
    notes: "متطابق مع دعم الشحن السريع ونقل البيانات بدون فقدان إشارة الشبكة.",
    matchScore: 95,
  },
  {
    category: "ics",
    partName: "آيسي شحن وإدارة طاقة PMIC (PM6150 / PM6150L)",
    originalModel: "Redmi Note 9 Pro",
    compatibleModels: ["Samsung Galaxy A52 4G", "Realme 6 Pro", "Poco X3 NFC"],
    notes: "نفس BGA Pinout والترددات ومسارات الشحن السريع Qualcomm Quick Charge.",
    matchScore: 100,
  },
];

const CATEGORIES = [
  { id: "all", label: "جميع القطع", icon: Layers },
  { id: "screens", label: "الشاشات واللمس", icon: Tv },
  { id: "batteries", label: "البطاريات والـ BMS", icon: Battery },
  { id: "ports", label: "منافذ وقواعد الشحن", icon: Zap },
  { id: "ics", label: "آيسيات ودوائر الطاقة", icon: Radio },
];

export default function CompatibilityPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSamples = SAMPLES.filter((item) => {
    const matchesCat = activeCategory === "all" || item.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      item.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.originalModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.compatibleModels.some((m) => m.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  function getWhatsAppSuggestionUrl() {
    const msg = "مرحباً، أود اقتراح إضافة بدائل وتوافقات جديدة لموديل هاتف في مصلح OS:";
    return `https://wa.me/905350215375?text=${encodeURIComponent(msg)}`;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <PageHeader
        title="دليل توافقات قطع الغيار والهواتف"
        description="محرك التوافقات والبدائل المشتركة بين موديلات الهواتف الذكية لمساعدة الفنيين في استغلال المخزون وتوفير تكاليف الشراء."
      />

      {/* Hero Coming Soon Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-slate-900/[0.02] p-6 sm:p-8 shadow-sm">
        <div className="absolute -top-12 -left-12 h-44 w-44 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-700 dark:text-orange-400 text-xs font-black border border-orange-500/30 shadow-2xs">
              <Flame className="h-4 w-4 text-orange-600 animate-pulse fill-orange-500" />
              <span>ميزة قادمة قريباً في التحديث القادم 🔥</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              أضخم قاعدة بيانات عربية لتوافقات قطع الصيانة بين أجهزة الهواتف
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              ستتمكن قريباً من معرفة أي شاشة، بطارية، فلكس شحن أو آيسي يتطابق مع موديلات أخرى في ورشتك بضغطة زر واحدة، لتخدم عملاءك فورياً حتى لو لم تتوفر القطعة باسم الجهاز الأصلي!
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-bold text-slate-500">
              <span className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                تطابق الشاشات وفلاتات الفريم
              </span>
              <span className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                بدائل بطاريات Apple و Samsung و Xiaomi
              </span>
              <span className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                مخططات ومنافذ الشحن المشتركة
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <Button
              asChild
              className="h-12 px-6 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs shadow-md shadow-orange-600/20 border-0"
            >
              <a href={getWhatsAppSuggestionUrl()} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span>اقترح توافقات تريدها أولاً</span>
              </a>
            </Button>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-bold text-center">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>جاري تدقيق وتجميع البيانات الفنية</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Search & Preview Section */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-orange-600" />
              <span>معاينة تفاعلية لنموذج عمل التوافقات (Live Preview)</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              جرب البحث عن الموديل أو نوع القطعة لرؤية البدائل المتاحة فورياً
            </p>
          </div>
        </div>

        {/* Search Bar & Filter Pills */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن موديل هاتف أو قطعة (مثال: Redmi Note 10, A12, بطارية...)"
              className="w-full rounded-2xl border border-slate-200 bg-white pr-10 pl-4 py-3 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/10 shadow-xs"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {filteredSamples.map((sample, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:border-orange-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200/80 px-2.5 py-0.5 text-[10px] font-black">
                    <Flame className="h-3 w-3 text-orange-500 fill-orange-500" />
                    تطابق بنسبة {sample.matchScore}%
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    نموذج تجريبي
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-black text-slate-900 leading-snug">
                    {sample.partName}
                  </h4>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-500">الجهاز المطلوب:</span>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-800 border border-slate-200">
                      {sample.originalModel}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>البدائل المتوافقة كلياً:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sample.compatibleModels.map((m, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-lg bg-white px-2.5 py-1 text-xs font-black text-slate-800 border border-slate-200 shadow-2xs"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {sample.notes}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold text-[11px]">
                  سيتم ربطها تلقائياً مع فحص مخزون ورشتك
                </span>
                <span className="font-black text-orange-600 flex items-center gap-1">
                  قريباً
                  <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredSamples.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
            <Smartphone className="h-10 w-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">لم يتم العثور على نتائج للبحث</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              يمكنك كتابة اسم الموديل بطريقة أخرى أو اقتراح إضافته لقاعدة البيانات
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

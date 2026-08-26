"use client";

import { useState } from "react";
import {
  Laptop,
  Flame,
  Search,
  Sparkles,
  Zap,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  MessageCircle,
  Cpu,
  Layers,
  FileCode,
  Smartphone,
  Globe,
  Lock,
  Database,
  Terminal,
  Percent,
  Clock,
  Send,
  HelpCircle,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

interface DigitalProduct {
  id: string;
  name: string;
  category: "schematics" | "unlockers" | "imei" | "credits" | "firmware";
  price: string;
  originalPrice: string;
  discount: string;
  badge?: string;
  deliveryTime: string;
  validity: string;
  rating: string;
  description: string;
  features: string[];
}

const CATEGORIES = [
  { id: "all", label: "جميع المنتجات الرقمية", icon: Layers },
  { id: "schematics", label: "برامج المخططات والمسارات", icon: Cpu },
  { id: "unlockers", label: "أدوات السوفت وير والـ FRP", icon: KeyRound },
  { id: "imei", label: "سيرفرات فحص الـ IMEI و GSX", icon: Smartphone },
  { id: "credits", label: "كريدت السيرفرات والبوكسات", icon: Zap },
  { id: "firmware", label: "قواعد الفلاشات والدامبات VIP", icon: Database },
];

const DIGITAL_PRODUCTS: DigitalProduct[] = [
  {
    id: "dig-1",
    name: "تفعيل برنامج بورنيو للمخططات والمسارات (Borneo Schematics) - اشتراك سنوي رسمي",
    category: "schematics",
    price: "$44.00",
    originalPrice: "$65.00",
    discount: "خصم 32%",
    badge: "الأكثر طلباً للفنيين 🔥",
    deliveryTime: "تسليم كود فوري خلال 5 دقائق",
    validity: "سنة كاملة (حساب رسمي لجهازين)",
    rating: "5.0 (420 تقييم)",
    description: "أشمل مكتبة مخططات هاردوير ومسارات فولت وإشارات الشحن والشبكة والصوت لجميع أجهزة iPhone, Samsung, Xiaomi, Huawei.",
    features: [
      "مخططات تفاعلية Hardware Solutions بنقرة واحدة",
      "مسارات المقاومات وقيم الممانعات Diode Mode",
      "تحديثات يومية لأحدث أجهزة 2026",
    ],
  },
  {
    id: "dig-2",
    name: "تفعيل أداة UnlockTool الرقمية الاحترافية (3 شهور / 6 شهور / سنة)",
    category: "unlockers",
    price: "$49.00",
    originalPrice: "$70.00",
    discount: "خصم 30%",
    badge: "الأداة الأولى للسوفت وير ⚡",
    deliveryTime: "تفعيل تلقائي على حسابك",
    validity: "3 شهور / قابلة للتجديد",
    rating: "4.9 (380 تقييم)",
    description: "أقوى أداة لتخطي حسابات Google FRP، وتخطي Mi Account، وفك حماية Knox، وتفليش أجهزة MTK و Qualcomm بضغطة زر.",
    features: [
      "تخطي FRP لجميع موديلات سامسونج وإصدارات أندرويد",
      "فك بوت لودر وإصلاح أجهزة Xiaomi بدون انتظار",
      "دعم وضع EDL و TestPoint و BROM",
    ],
  },
  {
    id: "dig-3",
    name: "خدمة فحص Apple GSX الكامل عبر الـ IMEI / السيريال (تقرير مفصل شامل)",
    category: "imei",
    price: "$2.20",
    originalPrice: "$4.00",
    discount: "خصم 45%",
    badge: "فحص فوري أونلاين 🍏",
    deliveryTime: "تقرير فوري خلال 1 - 3 دقائق",
    validity: "لكل جهاز مفحوص",
    rating: "4.9 (510 تقييم)",
    description: "تقرير كامل ومباشر من سيرفرات آبل الرسمية يوضح حالة الآيكلاود (Clean/Lost)، القفل على الشبكة، بلد الشراء، وتاريخ التفعيل والضمان.",
    features: [
      "حالة قفل iCloud و Find My iPhone (ON/OFF)",
      "حالة قفل الشبكة SIM Lock (مفتوح رسمي أو مغلق)",
      "تاريخ الشراء الأصلي وحالة استبدال القطع",
    ],
  },
  {
    id: "dig-4",
    name: "اشتراك برنامج المخططات XinZhiZao (XZZ) الاحترافي مع مسارات البوردات",
    category: "schematics",
    price: "$38.00",
    originalPrice: "$55.00",
    discount: "خصم 31%",
    badge: "مفضل لفنيي الآيفون والماك",
    deliveryTime: "تسليم فوري",
    validity: "اشتراك سنة كاملة",
    rating: "4.8 (190 تقييم)",
    description: "مخططات بوردات فيكتور عالية الدقة متخصصة في أجهزة Apple iPhone, iPad, MacBook و Android مع قيم الممانعات الدقيقة.",
    features: [
      "مخططات Bitmap لطبقات البورد الداخلية (Layer Diagrams)",
      "مقارنة النقاط المشتركة والمسارات المعزولة",
      "دعم إصلاحات معالجات A-Series و M-Series",
    ],
  },
  {
    id: "dig-5",
    name: "تفعيل سنوي أداة Chimera Tool PRO (Samsung / All Brands)",
    category: "unlockers",
    price: "$109.00",
    originalPrice: "$139.00",
    discount: "خصم 22%",
    badge: "العملاق الأوروبي",
    deliveryTime: "تفعيل فوري على اليوزر",
    validity: "سنة كاملة",
    rating: "4.9 (145 تقييم)",
    description: "الأداة الرائدة عالمياً لإصلاح السيريال والشبكة (Patch Certificate / Repair IMEI) وتخطي الحمايات المعقدة لأجهزة سامسونج وهواوي.",
    features: [
      "إصلاح شبكة وسيريال سامسونج بنقرة واحدة",
      "فك شفرات الهواتف الدولية المقفلة على شبكات أمريكا وأوروبا",
      "قراءة وحفظ ملفات الدامب و EFS",
    ],
  },
  {
    id: "dig-6",
    name: "باقات رصيد كريدت لسيرفرات السوفت وير (SamFW / Octoplus / Cheetah Credits)",
    category: "credits",
    price: "$12.00",
    originalPrice: "$18.00",
    discount: "خصم 33%",
    badge: "شحن سيرفر مباشر",
    deliveryTime: "شحن رصيد فوري",
    validity: "رصيد دائم بدون انتهاء",
    rating: "5.0 (260 تقييم)",
    description: "شحن رصيد كريدت لجميع سيرفرات تخطي الـ FRP وفك قفل الشبكات والعمليات السريعة بأقل عمولة تحويل.",
    features: [
      "شحن فوري بالاسم أو اليوزر بدون عمولات خفية",
      "استهلاك الرصيد حسب العمليات المطلوبة فقط",
      "دعم سيرفرات SamFW, Hydra, AMT, Griffin",
    ],
  },
  {
    id: "dig-7",
    name: "فحص Blacklist / Clean IMEI العالمي (كشف البلاغات وقفل الشركات)",
    category: "imei",
    price: "$1.50",
    originalPrice: "$3.00",
    discount: "خصم 50%",
    badge: "فحص أمان الصيانة",
    deliveryTime: "فوري (ثواني)",
    validity: "لكل سيريال",
    rating: "4.8 (340 تقييم)",
    description: "تأكد قبل استلام أي جهاز أو شرائه من عدم وجود بلاغات سرقة أو حظر شبكة دولي (GSMA Blacklist Database).",
    features: [
      "فحص قاعدة بيانات GSMA العالمية للمسروقات",
      "كشف مديونيات الشركات وحظر الشبكة",
      "تقرير PDF رسمي يمكن إرفاقه لعميلك",
    ],
  },
  {
    id: "dig-8",
    name: "عضوية VIP بقواعد بيانات الفلاشات والدامبات والمخططات الحصرية (EasyFirmware / Halabtech)",
    category: "firmware",
    price: "$48.00",
    originalPrice: "$70.00",
    discount: "خصم 31%",
    badge: "تحميل فلاشات بسرعة فائقة",
    deliveryTime: "تفعيل فوري",
    validity: "اشتراك سنة كاملة",
    rating: "4.9 (110 تقييم)",
    description: "وصول غير محدود لملفات الفلاشات الرسمية، فلاشات الكومبينيشن، ملفات روت وإصلاح الموت المفاجئ والدامبات النادرة.",
    features: [
      "سيرفرات تحميل مباشرة بأقصى سرعة إنترنت",
      "ملفات EMMC / UFS Dump مخصصة لبوكسات البرمجة",
      "فلاشات معالجات MTK, Qualcomm, SPD, Exynos النادرة",
    ],
  },
];

export default function OnlineStorePage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [imeiTest, setImeiTest] = useState("");
  const [imeiChecking, setImeiChecking] = useState(false);
  const [imeiResult, setImeiResult] = useState<any>(null);

  const filteredProducts = DIGITAL_PRODUCTS.filter((p) => {
    const matchesCat = activeCategory === "all" || p.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.features.some((f) => f.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  function handleSimulateImeiCheck() {
    if (!imeiTest || imeiTest.length < 8) return;
    setImeiChecking(true);
    setImeiResult(null);
    setTimeout(() => {
      setImeiChecking(false);
      setImeiResult({
        imei: imeiTest,
        model: "iPhone 14 Pro Max (A2894)",
        icloud: "OFF (Clean)",
        simLock: "Unlocked (مفتوح رسمي)",
        blacklist: "Clean (لا يوجد بلاغ سرقة)",
        warranty: "Active (ساري الضمان)",
      });
    }, 900);
  }

  function getWhatsAppOrderUrl(productName?: string) {
    const defaultMsg = "مرحباً، أود طلب وتفعيل برنامج / أداة رقمية للصيانة من مصلح OS بأرخص سعر:";
    const text = productName
      ? `مرحباً، أود طلب وتفعيل الأداة الرقمية التالية: ${productName}`
      : defaultMsg;
    return `https://wa.me/905350215375?text=${encodeURIComponent(text)}`;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <PageHeader
        title="متجر الأدوات والبرمجيات الرقمية للصيانة (Digital Tools)"
        description="المنصة المتكاملة لتفعيل برامج المخططات، أدوات السوفت وير، فحص الـ IMEI والـ GSX، وكريدت السيرفرات بأرخص أسعار الموزع والتسليم الفوري."
      />

      {/* Hero Coming Soon Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-slate-900/[0.02] p-6 sm:p-8 shadow-sm">
        <div className="absolute -top-12 -left-12 h-44 w-44 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-700 dark:text-orange-400 text-xs font-black border border-orange-500/30 shadow-2xs">
              <Flame className="h-4 w-4 text-orange-600 animate-pulse fill-orange-500" />
              <span>متجر التفعيلات والبرمجيات الرقمية قادم قريباً 🔥</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              تفعيلات برامج الصيانة وسيرفرات فحص الـ IMEI بأرخص سعر للموزعين وتسليم فوري
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              وفّر تكاليف الاشتراك المرتفعة مع اشتراكات Borneo و UnlockTool و Chimera الرسمية وفحوصات Apple GSX الفورية، مع تسليم آلي للأكواد والتفعيلات على مدار الساعة.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-bold text-slate-500">
              <span className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <Clock className="h-3.5 w-3.5 text-teal-600" />
                تسليم وتفعيل فوري 24/7
              </span>
              <span className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <Percent className="h-3.5 w-3.5 text-orange-600" />
                أسعار جملة وتخفيضات بالدولار ($)
              </span>
              <span className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                تفعيلات رسمية ومضمونة 100%
              </span>
            </div>

            {/* Demo Notice Alert */}
            <div className="mt-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2.5 flex items-center gap-2 text-xs font-bold text-amber-800">
              <HelpCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>تنبيه: جميع المنتجات والأسعار المعروضة حالياً هي نماذج تجريبية (Demo) للمعاينة فقط وليست حقيقية حتى موعد الإطلاق الرسمي.</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <Button
              asChild
              className="h-12 px-6 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs shadow-md shadow-orange-600/20 border-0"
            >
              <a href={getWhatsAppOrderUrl()} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span>طلب تفعيل أو استفسار عبر واتساب</span>
              </a>
            </Button>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-bold text-center">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>جاري ربط الـ APIs للتسليم التلقائي</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive IMEI Live Check Simulation Widget */}
      <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-b from-slate-900 to-slate-950 text-white p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 via-orange-500 to-emerald-500" />

        <div className="max-w-3xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-orange-400">
            <Terminal className="h-4 w-4" />
            <span>معاينة حية لمحرك فحص الـ IMEI وسيرفرات GSX التلقائية (Live Sandbox)</span>
          </div>

          <h3 className="text-base sm:text-lg font-black text-white">
            جرب فحص أي رقم IMEI أو سيريال جهاز آيفون / أندرويد
          </h3>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <input
              type="text"
              value={imeiTest}
              onChange={(e) => setImeiTest(e.target.value)}
              placeholder="أدخل رقم الـ IMEI أو السيريال (15 رقماً)..."
              dir="ltr"
              className="flex-1 rounded-xl bg-slate-800/90 border border-slate-700 px-4 py-3 text-xs font-mono font-bold text-white placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            <Button
              type="button"
              onClick={handleSimulateImeiCheck}
              disabled={imeiChecking || !imeiTest}
              className="h-11 px-6 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs border-0 shadow-md shadow-orange-600/20"
            >
              {imeiChecking ? (
                <>
                  <Sparkles className="h-4 w-4 ml-1.5 animate-spin" />
                  جاري الاستعلام من السيرفر...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 ml-1.5" />
                  فحص فوري للـ IMEI
                </>
              )}
            </Button>
          </div>

          {imeiResult && (
            <div className="mt-4 rounded-2xl bg-slate-800/80 border border-slate-700 p-4 space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  نتيجة الاستعلام من سيرفر Apple GSX الرسمي
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-numeric">
                  IMEI: {imeiResult.imei}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px] mb-1">الموديل:</span>
                  <span className="font-bold text-white">{imeiResult.model}</span>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px] mb-1">حالة الآيكلاود (FMI):</span>
                  <span className="font-bold text-emerald-400">{imeiResult.icloud}</span>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px] mb-1">حالة الشبكة (SIM Lock):</span>
                  <span className="font-bold text-sky-400">{imeiResult.simLock}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Digital Products Catalog */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Laptop className="h-4 w-4 text-orange-600" />
                <span>كتالوج البرمجيات والتفعيلات المعتمدة للفنيين ومراكز الصيانة</span>
              </h3>
              <span className="rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 text-[10px] font-black">
                بيانات تجريبية (Demo)
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              تصفح التفعيلات والبرامج بأسعار الدولار ($) - نماذج استعراضية تمهيداً للإطلاق
            </p>
          </div>
        </div>

        {/* Search & Categories */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن برنامج أو أداة (مثال: Borneo, UnlockTool, GSX, Chimera, FRP...)"
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

        {/* Products Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:border-orange-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3.5">
                {/* Badges & Discount */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {product.badge ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 text-[10px] font-black">
                      <Flame className="h-3 w-3 text-orange-500 fill-orange-500" />
                      {product.badge}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400">تفعيل رقمي</span>
                  )}
                  <span className="inline-flex items-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-black">
                    {product.discount}
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                    {product.name}
                  </h4>
                  <p className="mt-1.5 text-xs text-slate-500 leading-relaxed font-medium line-clamp-2">
                    {product.description}
                  </p>
                </div>

                {/* Features Pill List */}
                <div className="space-y-1.5 pt-1">
                  {product.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-1.5 text-[11px] text-slate-600 font-bold">
                      <CheckCircle2 className="h-3 w-3 text-teal-600 shrink-0" />
                      <span className="truncate">{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Delivery & Validity Box */}
                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-600">
                  <span className="flex items-center gap-1 text-teal-700">
                    <Clock className="h-3 w-3" />
                    {product.deliveryTime}
                  </span>
                  <span className="text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    {product.validity}
                  </span>
                </div>

                {/* Price Box */}
                <div className="rounded-2xl bg-slate-50/80 p-3 border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-black text-slate-900 font-numeric">
                        {product.price}
                      </span>
                      <span className="text-xs font-bold text-slate-400 line-through font-numeric">
                        {product.originalPrice}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 block mt-0.5">
                      تفعيل رسمي موثق
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/60 font-numeric">
                    ⭐ {product.rating}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="w-full h-10 rounded-xl border-orange-200 hover:bg-orange-50 text-orange-700 font-black text-xs justify-center"
                >
                  <a href={getWhatsAppOrderUrl(product.name)} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4 ml-1.5 text-emerald-600" />
                    <span>طلب التفعيل / الكود فورياً</span>
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
            <Terminal className="h-10 w-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">لم يتم العثور على أداة أو برنامج مطابق</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              يمكنك كتابة اسم السيرفر أو البرنامج بطريقة أخرى أو طلب تفعيله المباشر عبر خدمة الدعم
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

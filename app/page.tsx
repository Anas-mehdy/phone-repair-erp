import Link from "next/link";
import {
  Smartphone,
  Wrench,
  MessageSquareCode,
  ShoppingCart,
  Boxes,
  FileText,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Printer,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-teal-500 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* Glow Effects */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[600px] -left-40 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-primary text-slate-950 shadow-lg shadow-teal-500/20">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white block">مصلح OS</span>
              <span className="text-[9px] font-bold text-teal-400 uppercase tracking-wider">Cloud ERP for Phone Repair</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-300">
            <a href="#features" className="hover:text-teal-400 transition">المميزات</a>
            <a href="#how-it-works" className="hover:text-teal-400 transition">كيف يعمل</a>
            <a href="#thermal-print" className="hover:text-teal-400 transition">الطباعة والـ QR</a>
            <a href="#faq" className="hover:text-teal-400 transition">الأسئلة الشائعة</a>
          </nav>

          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-900 text-xs font-bold h-10 px-4 rounded-xl">
              <Link href="/login">تسجيل الدخول</Link>
            </Button>
            <Button asChild className="bg-gradient-to-r from-teal-400 to-primary text-slate-950 hover:from-teal-300 hover:to-teal-500 text-xs font-black h-10 px-5 rounded-xl shadow-lg shadow-teal-500/20 border-0">
              <Link href="/register">
                ابدأ تجربتك المجانية
                <ArrowLeft className="h-4 w-4 mr-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 lg:pt-24 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-black text-teal-300 backdrop-blur-md mb-8">
            <Sparkles className="h-4 w-4 text-teal-400" />
            <span>نظام الجيل القادم لإدارة ورش ومحلات صيانة الهواتف</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.2] sm:leading-[1.15]">
            تحكم كامل في مركز الصيانة،{" "}
            <span className="bg-gradient-to-l from-teal-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
              من استلام الجهاز وحتى الفاتورة
            </span>
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-sm sm:text-base text-slate-400 leading-relaxed font-medium">
            تتبع تذاكر الصيانة، أصدر إيصالات الاستلام الحرارية مع رمز QR، راسل عملاءك تلقائياً عبر واتساب، وأدر مبيعاتك ومخزون قطع الغيار من أي جهاز وبكل دقة.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button asChild className="h-13 px-8 rounded-2xl bg-gradient-to-r from-teal-400 via-teal-500 to-primary text-slate-950 hover:from-teal-300 hover:to-teal-400 font-black text-sm shadow-xl shadow-teal-500/25 border-0">
              <Link href="/register" className="flex items-center gap-2">
                أنشئ متجرك مجاناً وابدأ الآن
                <ArrowLeft className="h-4.5 w-4.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-13 px-6 rounded-2xl border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-white font-bold text-sm">
              <Link href="/login">
                الدخول للنظام
              </Link>
            </Button>
          </div>

          {/* Interactive Preview Dashboard Mockup */}
          <div className="mt-16 sm:mt-20 max-w-5xl mx-auto rounded-3xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 shadow-2xl backdrop-blur-xl relative">
            <div className="absolute -top-4 right-8 bg-teal-500 text-slate-950 text-[11px] font-black px-3.5 py-1 rounded-full shadow-md flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              معاينة حية للنظام
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-right">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <span className="text-[11px] font-bold text-slate-400 block">طلبات صيانة قيد العمل</span>
                <span className="text-2xl font-black text-teal-400 font-numeric mt-1 block">14 جهاز</span>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <span className="text-[11px] font-bold text-slate-400 block">أجهزة جاهزة للتسليم</span>
                <span className="text-2xl font-black text-emerald-400 font-numeric mt-1 block">6 أجهزة</span>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <span className="text-[11px] font-bold text-slate-400 block">مبيعات اليوم</span>
                <span className="text-2xl font-black text-amber-400 font-numeric mt-1 block">2,450 ر.س</span>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <span className="text-[11px] font-bold text-slate-400 block">تنبيهات قطع الغيار</span>
                <span className="text-2xl font-black text-rose-400 font-numeric mt-1 block">2 صنف</span>
              </div>
            </div>

            {/* Mock repair ticket preview row */}
            <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-right">
              <div className="flex items-center gap-3.5 w-full sm:w-auto">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white font-numeric">#TK-1082</span>
                    <span className="text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                      مكتمل وجاهز للتسليم
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">iPhone 14 Pro Max • استبدال شاشة أصلية + بطارية</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <MessageSquareCode className="h-4 w-4 text-emerald-400" />
                  تم الإشعار بالواتساب
                </span>
                <span className="text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <QrCode className="h-4 w-4 text-cyan-400" />
                  QR تتبع متاح
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 border-t border-slate-900 bg-slate-950/40 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-black text-teal-400 uppercase tracking-wider">مميزات صممت خصيصاً لمجال الصيانة</span>
            <h2 className="mt-3 text-2xl sm:text-4xl font-black text-white">كل ما يحتاجه محلك في منصة واحدة ذكية</h2>
            <p className="mt-3 text-xs sm:text-sm text-slate-400">
              تخلص من الدفاتر الورقية وجداول الإكسل المعقدة، وادمج عمليات الاستقبال، الفحص، الفنيين، والمبيعات بسلاسة.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-7 hover:border-teal-500/30 transition duration-300 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 group-hover:scale-110 transition duration-300">
                <Wrench className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-base font-black text-white">دورة حياة تذكرة الصيانة</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed font-medium">
                تتبع حالة الجهاز خطوة بخطوة من (استلام، فحص، قيد الإصلاح، انتظار قطع، منجز، مسلم) مع سجل زمني غير قابل للتعديل.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-7 hover:border-emerald-500/30 transition duration-300 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition duration-300">
                <MessageSquareCode className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-base font-black text-white">إشعارات واتساب بنقرة واحدة</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed font-medium">
                أرسل رسائل مخصصة باللغة العربية تحتوي على تفاصيل التذكرة، التكلفة المقدرة، وجاهزية الجهاز للاستلام مباشرة لرقم العميل.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-7 hover:border-cyan-500/30 transition duration-300 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition duration-300">
                <Printer className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-base font-black text-white">إيصالات حرارية ورمز تتبع QR</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed font-medium">
                طباعة إيصال استلام حراري فوري (80mm / 58mm) يحتوي على رمز QR يتيح للعميل مسحه بكاميرا هاتفه لمتابعة حالة جهازه.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-7 hover:border-amber-500/30 transition duration-300 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition duration-300">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-base font-black text-white">نقطة بيع سريعة (POS)</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed font-medium">
                بيع الإكسسوارات والقطع وخدمات الصيانة السريعة مع خصم تلقائي فوري من المخزون وإمكانية إلغاء العملية واسترجاع الكمية.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-7 hover:border-rose-500/30 transition duration-300 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-110 transition duration-300">
                <Boxes className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-base font-black text-white">مخزون ذكي وتنبيه النواقص</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed font-medium">
                تتبع كميات الشاشات والبطاريات والقطع، وحساب تكلفة الشراء وسعر البيع، مع تنبيه فوري عندما تصل القطعة لحد إعادة الطلب.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-7 hover:border-indigo-500/30 transition duration-300 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition duration-300">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-base font-black text-white">فواتير وسداد دفعات وعربون</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed font-medium">
                إصدار فواتير ضريبية، قبول سداد جزئي (عربون استلام) ثم تحصيل المتبقي عند التسليم مع تتبع الحسابات غير المحصلة.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 border-t border-slate-900 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-black text-teal-400 uppercase tracking-wider">خطوات بسيطة وسريعة</span>
          <h2 className="mt-3 text-2xl sm:text-4xl font-black text-white">كيف تبدأ استخدام مصلح OS؟</h2>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8 text-right">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-7 relative">
              <span className="text-4xl font-black text-teal-500/30 font-numeric block mb-3">01</span>
              <h3 className="text-base font-black text-white">سجّل متجرك في دقيقة</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                أدخل اسم محلك وعملتك المفضلة ورقم هاتفك وسيتم تجهيز قاعدة بياناتك المستقلة فوراً.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-7 relative">
              <span className="text-4xl font-black text-teal-500/30 font-numeric block mb-3">02</span>
              <h3 className="text-base font-black text-white">استقبل الأجهزة واطبع التذكرة</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                سجل بيانات العميل، نوع الهاتف، والعطل. اطبع وصل الاستلام الحراري وأرسل إشعار واتساب بنقرة واحدة.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-7 relative">
              <span className="text-4xl font-black text-teal-500/30 font-numeric block mb-3">03</span>
              <h3 className="text-base font-black text-white">سلّم وحصّل وراقب أرباحك</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                عند إتمام الصيانة، أصدر الفاتورة وحصّل المبلغ وتابع نمو أرباح متجرك في لوحة المؤشرات اليومية.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Multi-tenant banner */}
      <section className="py-16 border-t border-slate-900 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 mb-6">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">بيانات متجرك معزولة ومحمية 100%</h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            كل متجر يملك معرفه المستقل `ShopId`، سجلات عملائك، تذاكر الصيانة، المخزون، والمبيعات مشفرة ومحفوظة بأعلى معايير الأمان السحابي.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-teal-400" />
              تشفير كلمات المرور والبيانات
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-teal-400" />
              نسخ احتياطي يومي تلقائي
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-teal-400" />
              دعم فني وتحديثات مستمرة
            </span>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 border-t border-slate-900 bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-black text-teal-400 uppercase tracking-wider">الإجابات على استفساراتك</span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-black text-white">الأسئلة الشائعة</h2>
          </div>

          <div className="space-y-4 text-right">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
              <h3 className="text-sm font-bold text-white">هل يدعم النظام طابعات الفواتير الحرارية (Receipt Printers)؟</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed font-medium">
                نعم، تم تصميم تذاكر الاستلام وفواتير البيع لتتوافق تماماً مع طابعات الإيصالات الحرارية قياس 80mm و 58mm (مثل Xprinter و Epson وغيرها) بضغطة زر.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
              <h3 className="text-sm font-bold text-white">هل يمكنني تغيير عملة النظام لتناسب بلدي؟</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed font-medium">
                نعم بكل تأكيد! يدعم النظام جميع العملات العربية والعالمية (الريال السعودي، الدرهم، الدينار، الجنيه المصري، الدولار وغيرها)، ويمكنك اختيار العملة عند التسجيل وتعديلها من الإعدادات في أي وقت.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
              <h3 className="text-sm font-bold text-white">هل أحتاج إلى شراء أجهزة خاصة لتشغيل النظام؟</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed font-medium">
                لا، النظام سحابي ويعمل مباشرة من أي متصفح على أجهزة الكمبيوتر، اللابتوب، الأجهزة اللوحية (Tablets)، والهواتف الذكية دون الحاجة لتثبيت أي برامج معقدة.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="py-20 border-t border-slate-900 bg-gradient-to-br from-teal-950/60 via-slate-950 to-slate-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white">جاهز لنقل مركز الصيانة إلى المستوى التالي؟</h2>
          <p className="mt-4 text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            سجل الآن وابدأ تجربة إدارة تذاكر الصيانة والمبيعات والمخزون في أقل من دقيقة.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild className="h-13 px-8 rounded-2xl bg-gradient-to-r from-teal-400 to-primary text-slate-950 hover:from-teal-300 hover:to-teal-500 font-black text-sm shadow-xl shadow-teal-500/25 border-0">
              <Link href="/register" className="flex items-center gap-2">
                سجّل متجرك مجاناً الآن
                <ArrowLeft className="h-4.5 w-4.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-teal-400" />
            <span className="font-bold text-slate-400">مصلح OS - جميع الحقوق محفوظة {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6 font-medium">
            <Link href="/login" className="hover:text-teal-400 transition">تسجيل الدخول</Link>
            <Link href="/register" className="hover:text-teal-400 transition">تسجيل متجر جديد</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

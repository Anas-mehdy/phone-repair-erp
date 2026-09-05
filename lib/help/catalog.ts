export type HelpCategory =
  | "GETTING_STARTED"
  | "REPAIRS"
  | "SALES"
  | "INVENTORY"
  | "WALLETS"
  | "DEBTS"
  | "ELECTRONIC_SERVICES"
  | "ACCOUNT";

export type HelpArticle = {
  slug: string;
  category: HelpCategory;
  title: string;
  summary: string;
  keywords: string[];
  contextRoutes: string[];
  estimatedMinutes: number;
  steps: string[];
  tips?: string[];
  cta?: { href: string; label: string };
};

export const HELP_CATEGORY_LABELS: Record<HelpCategory, string> = {
  GETTING_STARTED: "البدء مع مسار",
  REPAIRS: "الصيانة",
  SALES: "المبيعات",
  INVENTORY: "المخزون والتوافقات",
  WALLETS: "المحافظ والتحويلات",
  DEBTS: "الديون والتحصيلات",
  ELECTRONIC_SERVICES: "الخدمات الإلكترونية",
  ACCOUNT: "الحساب والاشتراك",
};

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: "start-first-real-operation",
    category: "GETTING_STARTED",
    title: "كيف تبدأ بأول عملية حقيقية بدون إعداد طويل؟",
    summary: "ابدأ من القسم الذي يمثل شغلك اليومي وسجل عملية حقيقية واحدة؛ الإعدادات المتقدمة يمكن تأجيلها.",
    keywords: ["بداية", "اول عملية", "onboarding", "تجربة", "سريع"],
    contextRoutes: ["/dashboard", "/onboarding"],
    estimatedMinutes: 2,
    steps: [
      "اختر القسم الأساسي الذي تستخدمه فعلياً في متجرك.",
      "سجل أول عملية حقيقية من الـ Quick Flow بدل ملء كل الإعدادات.",
      "ارجع لمسار في يوم عمل آخر وسجل شغلك الحقيقي حتى يكتمل هدف التفعيل.",
    ],
    tips: ["لا تسجل بيانات تجريبية أو عمليات وهمية فقط لإكمال التفعيل."],
    cta: { href: "/dashboard", label: "العودة للوحة التحكم" },
  },
  {
    slug: "repair-create-first-ticket",
    category: "REPAIRS",
    title: "تسجيل أول جهاز صيانة بأقل بيانات",
    summary: "يكفي اسم العميل والهاتف والجهاز والمشكلة كبداية، ويمكن إضافة التفاصيل المتقدمة لاحقاً.",
    keywords: ["صيانة", "جهاز", "تذكرة", "طلب صيانة", "عميل"],
    contextRoutes: ["/repair-orders", "/repair-orders/new", "/point-of-sale"],
    estimatedMinutes: 2,
    steps: [
      "افتح «طلب صيانة جديد».",
      "أدخل بيانات العميل الأساسية والجهاز والمشكلة التي ذكرها العميل.",
      "احفظ الطلب، ثم افتح تفاصيله لتغيير الحالة أو الطباعة أو التتبع.",
    ],
    tips: ["استخدم النموذج الكامل فقط إذا كنت تحتاج IMEI أو الفني أو المورد أو تكلفة القطعة الآن."],
    cta: { href: "/repair-orders/new", label: "طلب صيانة جديد" },
  },
  {
    slug: "repair-customer-tracking",
    category: "REPAIRS",
    title: "كيف يتابع العميل حالة جهازه بدون الاتصال بك؟",
    summary: "كل تذكرة صيانة تملك رابط تتبع يمكن إرساله للعميل أو فتحه من QR المطبوع.",
    keywords: ["تتبع", "qr", "واتساب", "حالة الجهاز", "العميل"],
    contextRoutes: ["/repair-orders"],
    estimatedMinutes: 2,
    steps: [
      "افتح تفاصيل تذكرة الصيانة.",
      "انسخ رابط تتبع العميل أو اطبع الإيصال/الستيكر الذي يحتوي QR.",
      "عند تغيير حالة التذكرة داخل مسار تظهر الحالة الجديدة للعميل في صفحة التتبع.",
    ],
    tips: ["بيانات المورد وتكلفة شراء القطعة والملاحظات الداخلية لا يفترض أن تظهر في صفحة تتبع العميل."],
  },
  {
    slug: "repair-status-workflow",
    category: "REPAIRS",
    title: "متى أغيّر حالة جهاز الصيانة؟",
    summary: "استخدم الحالات لتعكس المرحلة الحقيقية للجهاز من الاستلام حتى التسليم، وليس لمجرد ترتيب القائمة.",
    keywords: ["حالة", "تشخيص", "قيد الاصلاح", "جاهز", "تسليم"],
    contextRoutes: ["/repair-orders"],
    estimatedMinutes: 2,
    steps: [
      "ابدأ بالحالة المناسبة عند استلام الجهاز.",
      "حدّث الحالة عندما ينتقل الجهاز فعلياً للتشخيص أو الإصلاح أو انتظار القطعة.",
      "استخدم «تم» عند اكتمال العمل، ثم «تم التسليم» فقط عند استلام العميل للجهاز.",
    ],
  },
  {
    slug: "repair-print-receipt-sticker",
    category: "REPAIRS",
    title: "طباعة إيصال الصيانة وستيكر 50×30",
    summary: "يمكن طباعة إيصال للعميل وستيكر صغير للجهاز من صفحة تفاصيل التذكرة.",
    keywords: ["طباعة", "ستيكر", "50x30", "باركود", "ايصال"],
    contextRoutes: ["/repair-orders"],
    estimatedMinutes: 2,
    steps: [
      "افتح تفاصيل تذكرة الصيانة المطلوبة.",
      "اختر طباعة الإيصال أو ستيكر الهاتف حسب احتياجك.",
      "في نافذة الطباعة اختر مقاس الورق الصحيح وألغِ الهوامش إذا كانت الطابعة تحتاج ذلك.",
    ],
    tips: ["لستيكر الهاتف استخدم ورق 50×30 مم عند توفره في تعريف الطابعة."],
  },
  {
    slug: "sales-first-sale",
    category: "SALES",
    title: "تنفيذ أول عملية بيع بسرعة",
    summary: "يمكن البيع من المخزون أو كتابة بند يدوي، ولا تحتاج إنشاء عميل لعملية البيع النقدية السريعة.",
    keywords: ["بيع", "pos", "كاش", "ايصال", "قطعة"],
    contextRoutes: ["/sales", "/sales/new", "/point-of-sale"],
    estimatedMinutes: 2,
    steps: [
      "افتح نقطة البيع أو عملية بيع جديدة.",
      "اختر قطعة من المخزون أو أدخل بنداً يدوياً مع الكمية والسعر.",
      "أكمل البيع ثم افتح الإيصال للتأكد من التفاصيل.",
    ],
    tips: ["إذا كان البند مرتبطاً بصنف مخزون، يمكن لمسار تسجيل أثر البيع على الكمية تلقائياً."],
    cta: { href: "/point-of-sale?tab=sale", label: "فتح نقطة البيع" },
  },
  {
    slug: "inventory-opening-balance",
    category: "INVENTORY",
    title: "إضافة أول صنف ورصيد افتتاحي صحيح",
    summary: "أدخل الكمية الموجودة فعلياً الآن؛ مسار يسجلها كحركة مخزون افتتاحية بدل رقم بلا تاريخ.",
    keywords: ["مخزون", "رصيد افتتاحي", "كمية", "stock in", "صنف"],
    contextRoutes: ["/inventory", "/inventory/new"],
    estimatedMinutes: 2,
    steps: [
      "أضف اسم الصنف والكمية الفعلية الموجودة عندك.",
      "أدخل تكلفة الشراء وسعر البيع إذا كانت متوفرة.",
      "بعد الحفظ افتح الصنف وشاهد حركة الرصيد الافتتاحي في سجل الحركات.",
    ],
    tips: ["لا تضع كمية تجريبية؛ الرصيد الافتتاحي يدخل في تقارير وحركات المخزون."],
    cta: { href: "/inventory/new", label: "إضافة صنف" },
  },
  {
    slug: "inventory-compatibility-link",
    category: "INVENTORY",
    title: "ربط قطعة المخزون بالتوافقات",
    summary: "اربط القطعة بمجموعة توافق حتى تعرف الأجهزة البديلة التي يمكن استخدام نفس القطعة معها.",
    keywords: ["توافق", "بدائل", "شاشة", "بطارية", "قطعة", "موديل"],
    contextRoutes: ["/inventory", "/compatibility"],
    estimatedMinutes: 3,
    steps: [
      "افتح الصنف من المخزون.",
      "اختر أو ابحث عن مجموعة التوافق المناسبة للقطعة.",
      "احفظ الربط ثم استخدم دليل التوافقات لمعرفة الأجهزة المتوافقة.",
    ],
    tips: ["راجع الموديل والنسخة بدقة قبل اعتماد توافق قطعة حساسة."],
    cta: { href: "/compatibility", label: "فتح دليل التوافقات" },
  },
  {
    slug: "wallet-balance-direction",
    category: "WALLETS",
    title: "ليش زاد أو نقص رصيد المحفظة بعد العملية؟",
    summary: "اتجاه الرصيد يعتمد على نوع الحركة: شحن وسحب من العميل يزيدان الرصيد، والإيداع للعميل ينقصه.",
    keywords: ["محفظة", "رصيد", "تحويل", "ايداع", "سحب", "شحن"],
    contextRoutes: ["/transfers"],
    estimatedMinutes: 2,
    steps: [
      "حدد المحفظة التي تمت عليها الحركة.",
      "اختر نوع العملية الحقيقي، وليس النوع الذي يعطي الرصيد الذي تتوقعه.",
      "راجع «الرصيد بعد العملية» ثم احفظ الحركة.",
    ],
    tips: ["إيداع مبلغ للعميل يعني خروج قيمة من رصيد محفظتك، لذلك ينقص الرصيد."],
    cta: { href: "/transfers", label: "فتح المحافظ والتحويلات" },
  },
  {
    slug: "wallet-insufficient-balance",
    category: "WALLETS",
    title: "ماذا أفعل إذا ظهر أن رصيد المحفظة غير كافٍ؟",
    summary: "لا يمكن تنفيذ حركة خارجة أكبر من الرصيد الحقيقي المسجل للمحفظة.",
    keywords: ["رصيد غير كافي", "محفظة", "رفض", "ايداع"],
    contextRoutes: ["/transfers"],
    estimatedMinutes: 2,
    steps: [
      "راجع الرصيد الحالي للمحفظة في لوحة المحافظ.",
      "إذا استلمت رصيداً جديداً من مزود المحفظة، سجل حركة شحن حقيقية أولاً.",
      "أعد تنفيذ العملية بالمبلغ الفعلي بعد تحديث الرصيد.",
    ],
  },
  {
    slug: "debts-record-and-collect",
    category: "DEBTS",
    title: "تسجيل دين ثم تحصيل دفعة بشكل صحيح",
    summary: "سجل الدين عند نشوء المبلغ المستحق، وسجل التحصيل فقط عندما تستلم دفعة حقيقية من العميل.",
    keywords: ["دين", "تحصيل", "دفعة", "رصيد العميل", "ذمم"],
    contextRoutes: ["/debts", "/installments"],
    estimatedMinutes: 3,
    steps: [
      "اختر العميل وسجل مبلغ الدين الحقيقي.",
      "افتح دفتر العميل وشاهد الرصيد المستحق.",
      "عند استلام دفعة فعلية، سجل التحصيل ليُخفض الرصيد تلقائياً.",
    ],
    tips: ["لا تسجل تحصيلاً وهمياً للتجربة؛ الحركة تؤثر على رصيد العميل والتقارير."],
    cta: { href: "/debts", label: "فتح دفتر الديون" },
  },
  {
    slug: "electronic-provider-first-service",
    category: "ELECTRONIC_SERVICES",
    title: "إعداد مزود خدمة وتنفيذ أول خدمة",
    summary: "أدخل رصيد المزود الحقيقي، ثم نفذ خدمة فعلية حتى يسجل مسار تكلفة المزود والربح وأثر الرصيد.",
    keywords: ["خدمات الكترونية", "مزود", "رصيد المزود", "شحن", "ربح"],
    contextRoutes: ["/electronic-services"],
    estimatedMinutes: 3,
    steps: [
      "أنشئ المزود وأدخل الرصيد الفعلي الموجود في حسابه.",
      "ابدأ خدمة جديدة وحدد تكلفة التنفيذ والمبلغ على العميل.",
      "بعد الحفظ راجع الخصم من رصيد المزود والربح المسجل للعملية.",
    ],
    tips: ["إنشاء المزود وحده إعداد فقط؛ أول خدمة فعلية هي التي تختبر دورة العمل كاملة."],
    cta: { href: "/electronic-services", label: "فتح الخدمات الإلكترونية" },
  },
  {
    slug: "account-trial-and-data",
    category: "ACCOUNT",
    title: "ماذا يحدث عند انتهاء الفترة التجريبية؟",
    summary: "بيانات المتجر تبقى محفوظة، بينما صلاحية إنشاء عمليات جديدة تعتمد على حالة الاشتراك.",
    keywords: ["اشتراك", "تجربة", "انتهاء", "بيانات", "خطة"],
    contextRoutes: ["/subscription", "/dashboard"],
    estimatedMinutes: 2,
    steps: [
      "افتح صفحة الاشتراك لمعرفة الوقت المتبقي وحالة الخطة.",
      "اختر مدة الاشتراك المناسبة عندما تصبح جاهزاً للمتابعة.",
      "إذا انتهت الفترة، تظل سجلات متجرك محفوظة ويمكنك استعادتها عند تفعيل الاشتراك.",
    ],
    cta: { href: "/subscription", label: "فتح الاشتراك" },
  },
  {
    slug: "account-password-reset",
    category: "ACCOUNT",
    title: "نسيت كلمة المرور أو لا تستطيع تسجيل الدخول",
    summary: "استخدم استعادة كلمة المرور من شاشة الدخول قبل التواصل مع الدعم.",
    keywords: ["كلمة المرور", "دخول", "نسيت", "بريد", "reset"],
    contextRoutes: ["/account/security", "/support"],
    estimatedMinutes: 2,
    steps: [
      "من شاشة تسجيل الدخول اختر «نسيت كلمة المرور».",
      "أدخل البريد المسجل وافتح رسالة الاستعادة.",
      "استخدم الرابط خلال مدة صلاحيته وحدد كلمة مرور جديدة.",
    ],
    tips: ["إذا لم تصل الرسالة، راجع البريد غير المرغوب فيه وتأكد أنك تستخدم البريد المسجل فعلاً."],
  },
];

function normalizeArabic(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function helpContextKeyForPath(pathname: string): HelpCategory {
  if (pathname.startsWith("/repair-orders")) return "REPAIRS";
  if (pathname.startsWith("/sales") || pathname.startsWith("/point-of-sale")) return "SALES";
  if (pathname.startsWith("/inventory") || pathname.startsWith("/compatibility") || pathname.startsWith("/suppliers")) return "INVENTORY";
  if (pathname.startsWith("/transfers") || pathname.startsWith("/cash-drawer")) return "WALLETS";
  if (pathname.startsWith("/debts") || pathname.startsWith("/installments")) return "DEBTS";
  if (pathname.startsWith("/electronic-services")) return "ELECTRONIC_SERVICES";
  if (pathname.startsWith("/subscription") || pathname.startsWith("/account") || pathname.startsWith("/settings")) return "ACCOUNT";
  return "GETTING_STARTED";
}

export function getHelpArticle(slug: string) {
  return HELP_ARTICLES.find((article) => article.slug === slug) ?? null;
}

export function getContextualHelpArticles(pathname: string, limit = 3) {
  const category = helpContextKeyForPath(pathname);
  return HELP_ARTICLES
    .map((article, index) => {
      const routeScore = article.contextRoutes.reduce((score, route) => {
        if (pathname === route) return Math.max(score, 30);
        if (pathname.startsWith(`${route}/`) || pathname.startsWith(`${route}?`) || pathname.startsWith(route)) return Math.max(score, 20);
        return score;
      }, 0);
      const categoryScore = article.category === category ? 10 : 0;
      return { article, score: routeScore + categoryScore, index };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(1, limit))
    .map((row) => row.article);
}

export function searchHelpArticles(query: string, category?: HelpCategory | null) {
  const normalizedQuery = normalizeArabic(query);
  const tokens = normalizedQuery.split(" ").filter((token) => token.length >= 2);
  return HELP_ARTICLES
    .filter((article) => !category || article.category === category)
    .map((article, index) => {
      if (!tokens.length) return { article, score: 0, index };
      const title = normalizeArabic(article.title);
      const summary = normalizeArabic(article.summary);
      const keywords = normalizeArabic(article.keywords.join(" "));
      const steps = normalizeArabic(article.steps.join(" "));
      const score = tokens.reduce((sum, token) => {
        if (title.includes(token)) sum += 8;
        if (keywords.includes(token)) sum += 5;
        if (summary.includes(token)) sum += 3;
        if (steps.includes(token)) sum += 1;
        return sum;
      }, 0);
      return { article, score, index };
    })
    .filter((row) => !tokens.length || row.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((row) => row.article);
}

export type ChangelogType = "FEATURE" | "IMPROVEMENT" | "FIX";
export type ChangelogPriority = "LOW" | "MEDIUM" | "HIGH";

export interface ChangelogEntry {
  id: string;
  version: string;
  date: string;
  type: ChangelogType;
  priority: ChangelogPriority;
  title: string;
  description: string;
  iconName?: "Sparkles" | "Wrench" | "ShoppingCart" | "Boxes" | "Receipt" | "QrCode" | "Zap" | "ShieldCheck" | "Users" | "UserPlus";
  actionLabel?: string;
  actionHref?: string;
}

export const CHANGELOG_STORAGE_KEYS = {
  SEEN_IDS: "phone_repair_seen_changelog_ids",
  DISMISSED_SPOTLIGHTS: "phone_repair_dismissed_spotlight_ids",
} as const;

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    id: "feat-team-employee-management-v1-3",
    version: "v1.3.0",
    date: "2026-08-26",
    type: "FEATURE",
    priority: "HIGH",
    title: "إضافة وإدارة موظفي وفنيي المتجر وتحديد الصلاحيات",
    description: "إمكانية دعوة وإضافة الموظفين والفنيين تحت حساب المتجر الحالي، وتعيين أدوارهم وصلاحياتهم (مدير، فني صيانة، موظف استقبال، محاسب) مع متابعة الدعوات وإدارة المقاعد.",
    iconName: "Users",
    actionLabel: "إدارة فريق العمل والموظفين",
    actionHref: "/settings#team",
  },
  {
    id: "feat-pos-quick-sales-v1-2",
    version: "v1.2.0",
    date: "2026-08-25",
    type: "FEATURE",
    priority: "HIGH",
    title: "نظام نقاط البيع السريع (POS) للإكسسوارات والقطع",
    description: "إمكانية إتمام عمليات البيع المباشر لملحقات الهواتف والشواحن وقطع الغيار فورياً مع إصدار إيصالات دفع حرارية وضبط فوري للمخزون.",
    iconName: "ShoppingCart",
    actionLabel: "تجربة نقطة البيع (POS)",
    actionHref: "/sales/new",
  },
  {
    id: "feat-repair-delivery-tracking-v1-2",
    version: "v1.2.0",
    date: "2026-08-24",
    type: "FEATURE",
    priority: "HIGH",
    title: "مؤشرات الجاهزية للتسليم ومتابعة تذاكر الصيانة",
    description: "تنبيهات فورية للأجهزة المكتملة في الورشة والمجهزة للتسليم لتسريع التواصل مع العملاء وتحصيل الفواتير المتبقية.",
    iconName: "Wrench",
    actionLabel: "عرض طلبات الصيانة",
    actionHref: "/repair-orders",
  },
  {
    id: "imp-inventory-low-stock-v1-1",
    version: "v1.1.5",
    date: "2026-08-20",
    type: "IMPROVEMENT",
    priority: "MEDIUM",
    title: "تنبيهات انخفاض المخزون وحد إعادة الطلب",
    description: "نظام ذكي يراقب مستويات الشاشات والبطاريات في المستودع ويُبرز القطع التي شارفت على النفاد في لوحة التحكم.",
    iconName: "Boxes",
    actionLabel: "فحص نواقص المستودع",
    actionHref: "/inventory?lowStockOnly=true",
  },
  {
    id: "fix-invoice-pdf-printing-v1-1",
    version: "v1.1.2",
    date: "2026-08-15",
    type: "FIX",
    priority: "LOW",
    title: "تحسين تخطيط طباعة الفواتير والإيصالات الحرارية",
    description: "معالجة محاذاة أرقام الضريبة وبيانات المتجر على طابعات الإيصالات 80mm و A4 بدقة عالية.",
    iconName: "Receipt",
    actionLabel: "سجل الفواتير",
    actionHref: "/invoices",
  },
];

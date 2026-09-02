"use client";

import {
  ArrowLeftRight,
  Banknote,
  BookOpenText,
  Boxes,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronLeft,
  CirclePlay,
  Code2,
  Cpu,
  Crown,
  Headphones,
  Laptop,
  LayoutDashboard,
  MoreHorizontal,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  UserRound,
  WalletCards,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type NavGuard = "settings" | "reports" | "subscription" | "debts";
type NavTone = "teal" | "cyan" | "indigo" | "amber" | "sky" | "emerald" | "slate";
type NavLeaf = { href: string; label: string; icon: LucideIcon; description?: string; guard?: NavGuard; badge?: string };
type NavSection = { key: string; label: string; icon: LucideIcon; tone: NavTone; href?: string; children?: NavLeaf[] };
type NavPermissions = { canSettings: boolean; canReports: boolean; canManageSubscription: boolean; canManageDebts: boolean };

const tones: Record<NavTone, { active: string; icon: string; border: string }> = {
  teal: { active: "bg-teal-50 text-teal-800", icon: "bg-teal-50 text-teal-700", border: "border-teal-100" },
  cyan: { active: "bg-cyan-50 text-cyan-800", icon: "bg-cyan-50 text-cyan-700", border: "border-cyan-100" },
  indigo: { active: "bg-indigo-50 text-indigo-800", icon: "bg-indigo-50 text-indigo-700", border: "border-indigo-100" },
  amber: { active: "bg-amber-50 text-amber-900", icon: "bg-amber-50 text-amber-700", border: "border-amber-100" },
  sky: { active: "bg-sky-50 text-sky-800", icon: "bg-sky-50 text-sky-700", border: "border-sky-100" },
  emerald: { active: "bg-emerald-50 text-emerald-800", icon: "bg-emerald-50 text-emerald-700", border: "border-emerald-100" },
  slate: { active: "bg-slate-100 text-slate-900", icon: "bg-slate-100 text-slate-700", border: "border-slate-200" },
};

export const navSections: NavSection[] = [
  { key: "home", label: "الرئيسية", icon: LayoutDashboard, tone: "teal", href: "/dashboard" },
  { key: "repair", label: "الصيانة", icon: Wrench, tone: "cyan", href: "/repair-orders" },
  {
    key: "sales", label: "المبيعات", icon: ShoppingCart, tone: "indigo", children: [
      { href: "/sales", label: "المبيعات والـ POS", icon: ShoppingCart, description: "بيع القطع والخدمات وإدارة نقطة البيع" },
      { href: "/software-services", label: "خدمات السوفتوير", icon: Code2, description: "الخدمات الرقمية والفواتير المرتبطة بها" },
      { href: "/online-store", label: "المتجر الإلكتروني", icon: Laptop, description: "الخدمات والمنتجات الإلكترونية", badge: "قريباً" },
    ],
  },
  {
    key: "inventory", label: "المخزون", icon: Boxes, tone: "amber", children: [
      { href: "/inventory", label: "المستودع", icon: Boxes, description: "القطع والكميات والحركات والتوالف" },
      { href: "/compatibility", label: "التوافقات", icon: Cpu, description: "دليل توافق القطع والأجهزة" },
      { href: "/suppliers", label: "الموردون", icon: Truck, description: "الموردون والمشتريات وقطع الغيار" },
    ],
  },
  { key: "customers", label: "العملاء", icon: UserRound, tone: "sky", href: "/customers" },
  {
    key: "finance", label: "المالية", icon: WalletCards, tone: "emerald", children: [
      { href: "/invoices", label: "الفواتير", icon: Receipt, description: "الفواتير والتحصيلات وحالات الدفع" },
      { href: "/installments", label: "الأقساط", icon: WalletCards, description: "خطط الأقساط والدفعات المجدولة" },
      { href: "/debts", label: "دفتر الديون", icon: BookOpenText, description: "أرصدة العملاء والتحصيلات", guard: "debts" },
      { href: "/cash-drawer", label: "الدرج النقدي", icon: Banknote, description: "رصيد الكاش وحركات الدخول والخروج" },
      { href: "/transfers", label: "المحافظ والتحويلات", icon: ArrowLeftRight, description: "المحافظ الإلكترونية وحركة التحويلات" },
      { href: "/reports", label: "التقارير والأرباح", icon: ChartNoAxesCombined, description: "ملخص الأداء المالي والسيولة", guard: "reports" },
    ],
  },
  {
    key: "admin", label: "الإدارة", icon: Settings, tone: "slate", children: [
      { href: "/settings", label: "إعدادات المتجر", icon: Settings, description: "بيانات المتجر والتفضيلات", guard: "settings" },
      { href: "/subscription", label: "الاشتراك", icon: Crown, description: "الخطة والمدة وبيانات الاشتراك", guard: "subscription" },
      { href: "/account/security", label: "أمان الحساب", icon: ShieldCheck, description: "كلمة المرور وإعدادات الأمان", guard: "settings" },
      { href: "/tutorial", label: "شرح مسار", icon: CirclePlay, description: "فيديوهات وأساسيات الاستخدام" },
      { href: "/support", label: "الدعم الفني", icon: Headphones, description: "المساعدة والتواصل عبر واتساب" },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
function canShow(item: NavLeaf, p: NavPermissions) {
  if (item.guard === "settings") return p.canSettings;
  if (item.guard === "reports") return p.canReports;
  if (item.guard === "subscription") return p.canManageSubscription;
  if (item.guard === "debts") return p.canManageDebts;
  return true;
}
function visibleChildren(section: NavSection, p: NavPermissions) { return (section.children ?? []).filter((item) => canShow(item, p)); }
function sectionActive(section: NavSection, pathname: string, p: NavPermissions) {
  return section.href ? isActivePath(pathname, section.href) : visibleChildren(section, p).some((item) => isActivePath(pathname, item.href));
}

export function navigationLabelForPath(pathname: string) {
  for (const section of navSections) {
    if (section.href && isActivePath(pathname, section.href)) return section.label;
    const child = section.children?.find((item) => isActivePath(pathname, item.href));
    if (child) return child.label;
  }
  return "مسار";
}

export function AppNav({ onNavigate, canSettings = false, canReports = false, canManageSubscription = false, canManageDebts = false, compact = false }: {
  onNavigate?: () => void; compact?: boolean; canSettings?: boolean; canReports?: boolean; canManageSubscription?: boolean; canManageDebts?: boolean;
}) {
  const pathname = usePathname();
  const p = { canSettings, canReports, canManageSubscription, canManageDebts };
  const activeParent = navSections.find((s) => s.children && sectionActive(s, pathname, p));
  const [expanded, setExpanded] = useState<string | null>(activeParent?.key ?? null);
  const [pinned, setPinned] = useState<string | null>(null);

  useEffect(() => {
    const next = navSections.find((s) => s.children && sectionActive(s, pathname, p));
    if (next) setExpanded(next.key);
    setPinned(null);
  }, [pathname, canSettings, canReports, canManageSubscription, canManageDebts]);

  return <nav aria-label="التنقل الرئيسي" className={cn("mt-4", compact ? "space-y-1.5" : "space-y-2")}>
    {navSections.map((section) => {
      const children = visibleChildren(section, p);
      if (!section.href && !children.length) return null;
      const active = sectionActive(section, pathname, p);
      const palette = tones[section.tone];
      const Icon = section.icon;

      if (compact && section.href) return <Link key={section.key} href={section.href} onClick={onNavigate} title={section.label} aria-current={active ? "page" : undefined} className={cn("group relative mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-transparent transition", active ? `${palette.active} ${palette.border} shadow-sm` : "text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-900")}><Icon className="h-[19px] w-[19px]" />{active && <span className="absolute -right-2 top-1/2 h-5 w-1 -translate-y-1/2 rounded-l-full bg-teal-500" />}</Link>;

      if (compact) {
        const isPinned = pinned === section.key;
        return <div key={section.key} className="group relative mx-auto w-11">
          <button type="button" title={section.label} aria-expanded={isPinned} onClick={() => setPinned((v) => v === section.key ? null : section.key)} className={cn("relative flex h-11 w-11 items-center justify-center rounded-2xl border border-transparent transition", active ? `${palette.active} ${palette.border} shadow-sm` : "text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-900")}><Icon className="h-[19px] w-[19px]" /><ChevronLeft className="absolute -left-1.5 h-3 w-3 rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200" />{active && <span className="absolute -right-2 top-1/2 h-5 w-1 -translate-y-1/2 rounded-l-full bg-teal-500" />}</button>
          <div className={cn("absolute right-full top-0 z-[70] mr-3 w-[280px] rounded-2xl border bg-white p-2.5 shadow-[0_24px_70px_-25px_rgba(15,23,42,0.35)]", palette.border, isPinned ? "block" : "hidden group-hover:block group-focus-within:block")}>
            <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5"><span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", palette.icon)}><Icon className="h-4 w-4" /></span><div><p className="text-[13px] font-black text-slate-900">{section.label}</p><p className="text-[11px] font-semibold text-slate-400">اختر الوجهة المطلوبة</p></div></div>
            <div className="space-y-1">{children.map((item) => <ChildLink key={item.href} item={item} active={isActivePath(pathname, item.href)} tone={section.tone} flyout onNavigate={() => { setPinned(null); onNavigate?.(); }} />)}</div>
          </div>
        </div>;
      }

      if (section.href) return <Link key={section.key} href={section.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn("group relative flex min-h-11 items-center gap-3 rounded-2xl border px-3 py-2.5 text-[14px] font-extrabold transition", active ? `${palette.active} ${palette.border} shadow-sm` : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900")}><span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", active ? palette.icon : "bg-slate-50 text-slate-500")}><Icon className="h-4 w-4" /></span><span>{section.label}</span>{active && <span className="absolute inset-y-2 right-0 w-1 rounded-l-full bg-teal-500" />}</Link>;

      const open = expanded === section.key;
      return <div key={section.key} className="space-y-1">
        <button type="button" aria-expanded={open} onClick={() => setExpanded((v) => v === section.key ? null : section.key)} className={cn("group relative flex min-h-11 w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-right text-[14px] font-extrabold transition", active ? `${palette.active} ${palette.border} shadow-sm` : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900")}><span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", active ? palette.icon : "bg-slate-50 text-slate-500")}><Icon className="h-4 w-4" /></span><span className="flex-1">{section.label}</span><ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")} />{active && <span className="absolute inset-y-2 right-0 w-1 rounded-l-full bg-teal-500" />}</button>
        {open && <div className="mr-5 space-y-1 border-r border-slate-200/80 py-1 pr-3">{children.map((item) => <ChildLink key={item.href} item={item} active={isActivePath(pathname, item.href)} tone={section.tone} onNavigate={onNavigate} />)}</div>}
      </div>;
    })}
  </nav>;
}

function ChildLink({ item, active, tone, onNavigate, flyout = false }: { item: NavLeaf; active: boolean; tone: NavTone; onNavigate?: () => void; flyout?: boolean }) {
  const Icon = item.icon; const palette = tones[tone];
  return <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn("group flex items-center gap-2.5 rounded-xl border border-transparent transition", flyout ? "px-3 py-2.5" : "px-2.5 py-2", active ? `${palette.active} ${palette.border}` : "text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900")}><span className={cn("flex shrink-0 items-center justify-center rounded-lg", flyout ? "h-8 w-8" : "h-7 w-7", active ? palette.icon : "bg-white text-slate-400 ring-1 ring-slate-200/80")}><Icon className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className={cn("flex items-center gap-2 font-bold", flyout ? "text-[13px]" : "text-[12px]")}><span className="truncate">{item.label}</span>{item.badge && <span className="rounded-full border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[9px] font-black text-orange-600">{item.badge}</span>}</span>{flyout && item.description && <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-400">{item.description}</span>}</span></Link>;
}

type MobileSheet = "sales" | "inventory" | "more" | null;
export function MobileBottomNav({ canSettings = false, canReports = false, canManageSubscription = false, canManageDebts = false }: { canSettings?: boolean; canReports?: boolean; canManageSubscription?: boolean; canManageDebts?: boolean }) {
  const pathname = usePathname(); const p = { canSettings, canReports, canManageSubscription, canManageDebts }; const [sheet, setSheet] = useState<MobileSheet>(null);
  const activeKey = navSections.find((s) => sectionActive(s, pathname, p))?.key;
  useEffect(() => { setSheet(null); }, [pathname]);
  useEffect(() => { if (!sheet) return; const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = previous; }; }, [sheet]);
  const byKey = (key: string) => navSections.find((s) => s.key === key)!;
  const moreActive = ["customers", "finance", "admin"].includes(activeKey ?? "");
  return <>
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/90 bg-white/95 shadow-[0_-12px_35px_-25px_rgba(15,23,42,0.35)] backdrop-blur-xl lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}><div className="grid h-[68px] grid-cols-5 px-1.5"><MobileDirectTab section={byKey("home")} active={activeKey === "home"} /><MobileDirectTab section={byKey("repair")} active={activeKey === "repair"} /><MobileSheetTab section={byKey("sales")} active={activeKey === "sales"} onClick={() => setSheet("sales")} /><MobileSheetTab section={byKey("inventory")} active={activeKey === "inventory"} onClick={() => setSheet("inventory")} /><button type="button" onClick={() => setSheet("more")} className={cn("relative flex flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black", moreActive ? "text-teal-700" : "text-slate-500")}><span className={cn("flex h-8 w-9 items-center justify-center rounded-xl", moreActive && "bg-teal-50")}><MoreHorizontal className="h-5 w-5" /></span><span>المزيد</span>{moreActive && <span className="absolute bottom-1 h-1 w-5 rounded-full bg-teal-500" />}</button></div></div>
    {sheet && <><button type="button" aria-label="إغلاق القائمة" onClick={() => setSheet(null)} className="fixed inset-0 z-[60] bg-slate-950/45 backdrop-blur-[2px] lg:hidden" /><section className="fixed inset-x-0 bottom-0 z-[70] max-h-[78vh] overflow-hidden rounded-t-[28px] border-t border-slate-200 bg-white shadow-2xl lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}><div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-slate-200" /><div className="flex items-center justify-between border-b border-slate-100 px-5 pb-4 pt-3"><div><p className="text-[15px] font-black text-slate-900">{sheet === "sales" ? "المبيعات" : sheet === "inventory" ? "المخزون" : "المزيد"}</p><p className="text-[11px] font-semibold text-slate-400">{sheet === "more" ? "الوصول السريع لبقية أقسام مسار" : "اختر الصفحة التي تريد فتحها"}</p></div><button type="button" onClick={() => setSheet(null)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500"><X className="h-4 w-4" /></button></div><div className="max-h-[calc(78vh-92px)] overflow-y-auto px-4 py-4">{sheet === "sales" && <MobileGroup title="المبيعات" section={byKey("sales")} pathname={pathname} p={p} close={() => setSheet(null)} />}{sheet === "inventory" && <MobileGroup title="المخزون" section={byKey("inventory")} pathname={pathname} p={p} close={() => setSheet(null)} />}{sheet === "more" && <div className="space-y-5"><MobileDirectCard section={byKey("customers")} active={activeKey === "customers"} close={() => setSheet(null)} /><MobileGroup title="المالية" section={byKey("finance")} pathname={pathname} p={p} close={() => setSheet(null)} /><MobileGroup title="الإدارة والمساعدة" section={byKey("admin")} pathname={pathname} p={p} close={() => setSheet(null)} /></div>}</div></section></>}
  </>;
}

function MobileDirectTab({ section, active }: { section: NavSection; active: boolean }) { const Icon = section.icon; return <Link href={section.href!} className={cn("relative flex flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black", active ? "text-teal-700" : "text-slate-500")}><span className={cn("flex h-8 w-9 items-center justify-center rounded-xl", active && "bg-teal-50")}><Icon className="h-[18px] w-[18px]" /></span><span>{section.label}</span>{active && <span className="absolute bottom-1 h-1 w-5 rounded-full bg-teal-500" />}</Link>; }
function MobileSheetTab({ section, active, onClick }: { section: NavSection; active: boolean; onClick: () => void }) { const Icon = section.icon; return <button type="button" onClick={onClick} className={cn("relative flex flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black", active ? "text-teal-700" : "text-slate-500")}><span className={cn("flex h-8 w-9 items-center justify-center rounded-xl", active && "bg-teal-50")}><Icon className="h-[18px] w-[18px]" /></span><span>{section.label}</span>{active && <span className="absolute bottom-1 h-1 w-5 rounded-full bg-teal-500" />}</button>; }
function MobileGroup({ title, section, pathname, p, close }: { title: string; section: NavSection; pathname: string; p: NavPermissions; close: () => void }) { const children = visibleChildren(section, p); const palette = tones[section.tone]; return <div><h3 className="mb-2.5 px-1 text-[12px] font-black text-slate-500">{title}</h3><div className="grid gap-2 sm:grid-cols-2">{children.map((item) => { const Icon = item.icon; const active = isActivePath(pathname, item.href); return <Link key={item.href} href={item.href} onClick={close} className={cn("flex min-h-[62px] items-center gap-3 rounded-2xl border p-3", active ? `${palette.active} ${palette.border}` : "border-slate-200 bg-white text-slate-700")}><span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", active ? palette.icon : "bg-slate-50 text-slate-500")}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-[13px] font-black"><span className="truncate">{item.label}</span>{item.badge && <span className="rounded-full border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[9px] text-orange-600">{item.badge}</span>}</span>{item.description && <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-400">{item.description}</span>}</span></Link>; })}</div></div>; }
function MobileDirectCard({ section, active, close }: { section: NavSection; active: boolean; close: () => void }) { const Icon = section.icon; const palette = tones[section.tone]; return <Link href={section.href!} onClick={close} className={cn("flex min-h-[62px] items-center gap-3 rounded-2xl border p-3", active ? `${palette.active} ${palette.border}` : "border-slate-200 bg-white text-slate-700")}><span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", active ? palette.icon : "bg-slate-50 text-slate-500")}><Icon className="h-4 w-4" /></span><div><p className="text-[13px] font-black">{section.label}</p><p className="text-[10px] font-semibold text-slate-400">إدارة بيانات العملاء وسجلهم</p></div></Link>; }

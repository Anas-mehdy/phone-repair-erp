"use client";

import {
  Boxes,
  Code2,
  Cpu,
  Headphones,
  Laptop,
  LayoutDashboard,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  UserRound,
  Wrench,
  WalletCards,
  ChartNoAxesCombined,
  ShieldCheck,
  Crown,
  BookOpenText,
  CirclePlay,
  type LucideIcon,
} from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    className?: string;
  };
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    title: "العمليات الأساسية",
    items: [
      { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
      { href: "/repair-orders", label: "طلبات الصيانة", icon: Wrench },
      { href: "/sales", label: "المبيعات والـ POS", icon: ShoppingCart },
      {
        href: "/software-services",
        label: "خدمات السوفتوير",
        icon: Code2,
        badge: {
          text: "جديد",
          className: "border-violet-500/30 bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-sm shadow-violet-500/20",
        },
      },
      {
        href: "/online-store",
        label: "المتجر الإلكتروني",
        icon: Laptop,
        badge: {
          text: "قريباً 🔥",
          className: "bg-orange-500/10 text-orange-600 border-orange-500/20 font-bold",
        },
      },
    ],
  },
  {
    title: "إدارة الأعمال",
    items: [
      { href: "/customers", label: "إدارة العملاء", icon: UserRound },
      { href: "/suppliers", label: "الموردون وقطع الغيار", icon: Truck },
      {
        href: "/inventory",
        label: "المستودع والمخزون",
        icon: Boxes,
        badge: {
          text: "جديد",
          className: "border-fuchsia-500/30 bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow-sm shadow-fuchsia-500/20",
        },
      },
      {
        href: "/compatibility",
        label: "التوافقات والمخزون",
        icon: Cpu,
        badge: {
          text: "جديد",
          className: "border-fuchsia-500/30 bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow-sm shadow-fuchsia-500/20",
        },
      },
      { href: "/invoices", label: "الفواتير والمالية", icon: Receipt },
      {
        href: "/installments",
        label: "الدفعات والأقساط",
        icon: WalletCards,
        badge: {
          text: "جديد",
          className: "border-fuchsia-500/30 bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow-sm shadow-fuchsia-500/20",
        },
      },
      {
        href: "/debts",
        label: "دفتر الديون",
        icon: BookOpenText,
        badge: {
          text: "جديد",
          className: "border-sky-500/30 bg-gradient-to-r from-sky-500 to-cyan-600 text-white shadow-sm shadow-sky-500/20",
        },
      },
      {
        href: "/reports",
        label: "التقارير والأرباح",
        icon: ChartNoAxesCombined,
        badge: {
          text: "جديد",
          className: "border-emerald-500/30 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/20",
        },
      },
    ],
  },
  {
    title: "المساعدة والتهيئة",
    items: [
      { href: "/tutorial", label: "فيديو شرح مسار", icon: CirclePlay },
      { href: "/account/security", label: "أمان الحساب", icon: ShieldCheck },
      { href: "/subscription", label: "اشتراكي", icon: Crown },
      { href: "/settings", label: "إعدادات المتجر", icon: Settings },
      { href: "/support", label: "الدعم الفني والواتساب", icon: Headphones },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({
  onNavigate,
  canSettings = false,
  canReports = false,
  canManageSubscription = false,
  canManageDebts = false,
  compact = false,
}: {
  onNavigate?: () => void;
  compact?: boolean;
  canSettings?: boolean;
  canReports?: boolean;
  canManageSubscription?: boolean;
  canManageDebts?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("mt-2", compact ? "space-y-3" : "space-y-5")}>
      {navGroups.map((group, groupIdx) => {
        const visibleItems = group.items.filter((item) => {
          if (item.href === "/account/security") return canSettings;
          if (item.href === "/settings") return canSettings;
          if (item.href === "/reports") return canReports;
          if (item.href === "/subscription") return canManageSubscription;
          if (item.href === "/debts") return canManageDebts;
          return true;
        });

        if (visibleItems.length === 0) return null;

        return (
          <div key={group.title} className="space-y-1">
            {compact ? (
              groupIdx > 0 ? <div className="my-2 border-t border-slate-200/60 mx-1" /> : null
            ) : (
              <h3 className="px-3 text-[10px] font-black tracking-wider text-slate-400 uppercase">{group.title}</h3>
            )}
            <div className="space-y-1">
              {visibleItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={compact ? (item.badge ? `${item.label} (${item.badge.text})` : item.label) : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center rounded-xl text-xs font-bold transition-all duration-200",
                      compact ? "justify-center p-2.5 hover:bg-slate-100/80" : "gap-3 px-3.5 py-2.5 hover:bg-slate-100/80 hover:text-slate-900",
                      active ? "bg-primary/10 text-primary font-black shadow-xs" : "text-slate-600"
                    )}
                  >
                    {active ? (
                      <span className={cn("absolute bg-primary", compact ? "inset-y-1.5 right-0.5 w-1 rounded-full" : "inset-y-2 right-0 w-1.5 rounded-l-md")} />
                    ) : null}
                    <div className="relative shrink-0">
                      <item.icon
                        className={cn(
                          "transition-transform duration-200 group-hover:scale-110",
                          compact ? "h-5 w-5" : "h-4 w-4",
                          active ? "text-primary stroke-[2.5]" : "text-slate-500"
                        )}
                        aria-hidden="true"
                      />
                      {compact && item.badge && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                        </span>
                      )}
                    </div>
                    {!compact && (
                      <div className="flex flex-1 items-center justify-between gap-1.5 overflow-hidden">
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black leading-tight tracking-tight", item.badge.className || "bg-orange-500/10 text-orange-600 border-orange-500/20")}>
                            {item.badge.text}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

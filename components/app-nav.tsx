"use client";

import {
  Boxes,
  Headphones,
  LayoutDashboard,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  UserRound,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const navGroups = [
  {
    title: "العمليات الأساسية",
    items: [
      { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
      { href: "/repair-orders", label: "طلبات الصيانة", icon: Wrench },
      { href: "/sales", label: "المبيعات والـ POS", icon: ShoppingCart },
    ],
  },
  {
    title: "إدارة الأعمال",
    items: [
      { href: "/customers", label: "إدارة العملاء", icon: UserRound },
      { href: "/suppliers", label: "الموردون وقطع الغيار", icon: Truck },
      { href: "/inventory", label: "المستودع والمخزون", icon: Boxes },
      { href: "/invoices", label: "الفواتير والمالية", icon: Receipt },
    ],
  },
  {
    title: "المساعدة والتهيئة",
    items: [
      { href: "/settings", label: "إعدادات المتجر", icon: Settings },
      { href: "/support", label: "الدعم الفني والواتساب", icon: Headphones },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({
  onNavigate,
  canSettings = false,
  compact = false,
}: {
  onNavigate?: () => void;
  compact?: boolean;
  canSettings?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("mt-2", compact ? "space-y-3" : "space-y-5")}>
      {navGroups.map((group, groupIdx) => {
        // Filter out Settings navigation item if user lacks shop:settings permission (non-OWNER)
        const visibleItems = group.items.filter(
          (item) => item.href !== "/settings" || canSettings
        );

        if (visibleItems.length === 0) return null;

        return (
          <div key={group.title} className="space-y-1">
            {compact ? (
              groupIdx > 0 ? (
                <div className="my-2 border-t border-slate-200/60 mx-1" />
              ) : null
            ) : (
              <h3 className="px-3 text-[10px] font-black tracking-wider text-slate-400 uppercase">
                {group.title}
              </h3>
            )}
            <div className="space-y-1">
              {visibleItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={compact ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center rounded-xl text-xs font-bold transition-all duration-200",
                      compact
                        ? "justify-center p-2.5 hover:bg-slate-100/80"
                        : "gap-3 px-3.5 py-2.5 hover:bg-slate-100/80 hover:text-slate-900",
                      active
                        ? "bg-primary/10 text-primary font-black shadow-xs"
                        : "text-slate-600"
                    )}
                  >
                    {active ? (
                      <span
                        className={cn(
                          "absolute bg-primary",
                          compact
                            ? "inset-y-1.5 right-0.5 w-1 rounded-full"
                            : "inset-y-2 right-0 w-1.5 rounded-l-md"
                        )}
                      />
                    ) : null}
                    <item.icon
                      className={cn(
                        "transition-transform duration-200 group-hover:scale-110 shrink-0",
                        compact ? "h-5 w-5" : "h-4 w-4",
                        active ? "text-primary stroke-[2.5]" : "text-slate-500"
                      )}
                      aria-hidden="true"
                    />
                    {!compact && <span className="truncate">{item.label}</span>}
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

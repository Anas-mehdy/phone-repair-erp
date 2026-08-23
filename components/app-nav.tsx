"use client";

import {
  Boxes,
  LayoutDashboard,
  Receipt,
  Settings,
  ShoppingCart,
  UserRound,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navGroups = [
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
      { href: "/inventory", label: "المستودع والمخزون", icon: Boxes },
      { href: "/invoices", label: "الفواتير والمالية", icon: Receipt },
    ],
  },
  {
    title: "تهيئة النظام",
    items: [
      { href: "/settings", label: "إعدادات المتجر", icon: Settings },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();

  if (compact) {
    const flatItems = navGroups.flatMap((group) => group.items);
    return (
      <nav className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {flatItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all duration-300",
                active
                  ? "border-primary/20 bg-primary/5 text-primary"
                  : "border-slate-100 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-300",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-slate-50 text-slate-500 group-hover:bg-white"
                )}
              >
                <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="mt-6 space-y-5">
      {navGroups.map((group) => (
        <div key={group.title} className="space-y-1">
          <h3 className="px-4 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
            {group.title}
          </h3>
          <div className="space-y-1">
            {group.items.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200",
                    active
                      ? "bg-primary/10 text-primary font-extrabold shadow-xs"
                      : "text-slate-700 hover:bg-slate-100/70 hover:text-slate-900"
                  )}
                >
                  {active ? (
                    <span className="absolute inset-y-2 right-0 w-1.5 rounded-l-md bg-primary" />
                  ) : null}
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                        : "bg-white border border-slate-200 text-slate-600 group-hover:border-slate-300 group-hover:text-slate-900 group-hover:shadow-xs"
                    )}
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

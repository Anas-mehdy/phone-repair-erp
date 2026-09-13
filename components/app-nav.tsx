"use client";

import type { ComponentProps } from "react";
import { PackageCheck, ReceiptText, ShoppingCart, WalletCards } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccessProfile } from "@/components/access-profile-context";

import {
  AppNav as BaseAppNav,
  MobileBottomNav as BaseMobileBottomNav,
  navSections as baseNavSections,
  navigationLabelForPath as baseNavigationLabelForPath,
} from "./app-nav-base";

const finance = baseNavSections.find((section) => section.key === "finance");
if (finance?.children) {
  for (const item of finance.children) {
    if (item.href === "/cash-drawer" || item.href === "/transfers") item.guard = "reports";
  }

  if (!finance.children.some((item) => item.href === "/expenses")) {
    const reportsIndex = finance.children.findIndex((item) => item.href === "/reports");
    const insertAt = reportsIndex >= 0 ? reportsIndex : finance.children.length;
    finance.children.splice(insertAt, 0, {
      href: "/expenses",
      label: "المصروفات",
      icon: ReceiptText,
      description: "سجل المصروفات ومصادر السحب وتأثيرها على الربح",
      guard: "reports",
    });
  }
}

const employeeItems = [
  { href: "/employee/pos", label: "نقطة البيع", icon: ShoppingCart },
  { href: "/employee/sales", label: "مبيعاتي", icon: WalletCards },
  { href: "/employee/receiving", label: "استلام بضاعة", icon: PackageCheck },
  { href: "/employee/expenses", label: "مصروفاتي", icon: ReceiptText },
] as const;

function active(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const navSections = baseNavSections;
export function navigationLabelForPath(pathname: string) {
  if (pathname.startsWith("/employee")) return employeeItems.find((item) => active(pathname, item.href))?.label ?? "موظف المبيعات";
  return baseNavigationLabelForPath(pathname);
}

export function AppNav(props: ComponentProps<typeof BaseAppNav>) {
  const pathname = usePathname();
  const { isSalesEmployee } = useAccessProfile();
  if (!isSalesEmployee && !pathname.startsWith("/employee")) return <BaseAppNav {...props} />;
  return (
    <nav aria-label="تنقل موظف المبيعات" className="mt-4 space-y-2">
      {!props.compact ? <div className="px-2 pb-2 text-[10px] font-black text-slate-400">مساحة موظف المبيعات</div> : null}
      {employeeItems.map((item) => {
        const Icon = item.icon;
        const selected = active(pathname, item.href);
        return <Link key={item.href} href={item.href} onClick={props.onNavigate} title={item.label} className={`flex items-center rounded-xl border font-black transition ${props.compact ? "h-11 justify-center px-2" : "gap-3 px-3 py-2.5 text-xs"} ${selected ? "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-200" : "border-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"}`}><Icon className="h-4.5 w-4.5 shrink-0" />{!props.compact ? <span>{item.label}</span> : null}</Link>;
      })}
    </nav>
  );
}

export function MobileBottomNav(props: ComponentProps<typeof BaseMobileBottomNav>) {
  const pathname = usePathname();
  const { isSalesEmployee } = useAccessProfile();
  if (!isSalesEmployee && !pathname.startsWith("/employee")) return <BaseMobileBottomNav {...props} />;
  return <nav aria-label="تنقل موظف المبيعات للجوال" className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-slate-200 bg-white/95 px-1 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 backdrop-blur-xl lg:hidden dark:border-slate-800 dark:bg-slate-950/95">{employeeItems.map((item) => { const Icon = item.icon; const selected = active(pathname, item.href); return <Link key={item.href} href={item.href} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-black ${selected ? "text-teal-700 dark:text-teal-300" : "text-slate-400"}`}><Icon className="h-5 w-5" /><span>{item.label}</span></Link>; })}</nav>;
}

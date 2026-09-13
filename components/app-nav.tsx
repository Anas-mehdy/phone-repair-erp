"use client";

import { ReceiptText } from "lucide-react";

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

export const navSections = baseNavSections;
export const navigationLabelForPath = baseNavigationLabelForPath;
export const AppNav = BaseAppNav;
export const MobileBottomNav = BaseMobileBottomNav;

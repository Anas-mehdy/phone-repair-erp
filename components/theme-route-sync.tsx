"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { shouldForceLightTheme, THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme";

function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function ThemeRouteSync() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const preference = readThemePreference();
    const forceLight = shouldForceLightTheme(pathname);
    const dark = !forceLight && preference === "dark";
    const root = document.documentElement;

    root.classList.toggle("dark", dark);
    root.dataset.theme = forceLight ? "light" : preference;
    root.style.colorScheme = dark ? "dark" : "light";
  }, [pathname]);

  return null;
}

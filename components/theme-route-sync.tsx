"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { shouldForceLightTheme, THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme";

function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  } catch {
    return "system";
  }
}

export function ThemeRouteSync() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const preference = readThemePreference();
    const forceLight = shouldForceLightTheme(pathname);
    const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
    const dark = !forceLight && (preference === "dark" || (preference === "system" && systemDark));
    const root = document.documentElement;

    root.classList.toggle("dark", dark);
    root.dataset.theme = forceLight ? "light" : preference;
    root.style.colorScheme = dark ? "dark" : "light";
  }, [pathname]);

  return null;
}

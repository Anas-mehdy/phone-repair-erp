"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme";

const options: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: "light", label: "فاتح", icon: Sun },
  { value: "dark", label: "داكن", icon: Moon },
  { value: "system", label: "النظام", icon: Monitor },
];

function resolveStoredTheme(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" || value === "system" ? value : "system";
  } catch {
    return "system";
  }
}

function applyTheme(preference: ThemePreference) {
  const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  const dark = preference === "dark" || (preference === "system" && systemDark);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.dataset.theme = preference;
  root.style.colorScheme = dark ? "dark" : "light";
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = resolveStoredTheme();
    setTheme(stored);
    applyTheme(stored);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Keep the theme active for this session even if storage is unavailable.
    }

    if (theme !== "system") return;
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;
    const handleChange = () => applyTheme("system");
    media.addEventListener?.("change", handleChange);
    return () => media.removeEventListener?.("change", handleChange);
  }, [mounted, theme]);

  const activeOption = useMemo(() => options.find((option) => option.value === theme) ?? options[2], [theme]);
  const ActiveIcon = activeOption.icon;

  if (!mounted) {
    return compact ? <span className="block h-9 w-9" aria-hidden /> : <span className="block h-10 w-full" aria-hidden />;
  }

  if (compact) {
    const nextTheme: ThemePreference = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    return (
      <button
        type="button"
        onClick={() => setTheme(nextTheme)}
        title={`المظهر: ${activeOption.label} — اضغط للتبديل`}
        aria-label={`المظهر الحالي ${activeOption.label}. تبديل المظهر`}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-500 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-300 dark:hover:border-teal-800 dark:hover:bg-teal-950/50 dark:hover:text-teal-300"
      >
        <ActiveIcon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="rounded-[14px] border border-slate-200/80 bg-white/75 p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/75" aria-label="اختيار مظهر مسار">
      <div className="grid grid-cols-3 gap-1">
        {options.map((option) => {
          const Icon = option.icon;
          const active = option.value === theme;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              aria-pressed={active}
              className={cn(
                "flex min-h-8 items-center justify-center gap-1 rounded-[10px] px-2 text-[10px] font-black transition",
                active
                  ? "bg-teal-600 text-white shadow-sm dark:bg-teal-500 dark:text-slate-950"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

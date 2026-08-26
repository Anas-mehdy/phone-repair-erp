"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  Wrench,
  ShoppingCart,
  Boxes,
  Receipt,
  QrCode,
  Zap,
  ShieldCheck,
  Layers,
  Users,
  UserPlus,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from "lucide-react";
import {
  CHANGELOG_ENTRIES,
  type ChangelogType,
} from "@/lib/changelog-data";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Wrench,
  ShoppingCart,
  Boxes,
  Receipt,
  QrCode,
  Zap,
  ShieldCheck,
  Layers,
  Users,
  UserPlus,
};

function getTypeMeta(type: ChangelogType) {
  switch (type) {
    case "FEATURE":
      return {
        label: "ميزة جديدة 🚀",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        iconBg: "bg-emerald-500/10 text-emerald-700",
      };
    case "IMPROVEMENT":
      return {
        label: "تحسين ⚡",
        badgeClass: "bg-sky-50 text-sky-700 border-sky-200/80",
        iconBg: "bg-sky-500/10 text-sky-700",
      };
    case "FIX":
      return {
        label: "إصلاح 🛠️",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200/80",
        iconBg: "bg-amber-500/10 text-amber-700",
      };
    default:
      return {
        label: "تحديث",
        badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
        iconBg: "bg-slate-500/10 text-slate-700",
      };
  }
}

export function DashboardUpdatesSection() {
  const [selectedType, setSelectedType] = useState<"ALL" | ChangelogType>("ALL");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredEntries = useMemo(() => {
    if (selectedType === "ALL") return CHANGELOG_ENTRIES;
    return CHANGELOG_ENTRIES.filter((e) => e.type === selectedType);
  }, [selectedType]);

  const counts = useMemo(() => {
    return {
      ALL: CHANGELOG_ENTRIES.length,
      FEATURE: CHANGELOG_ENTRIES.filter((e) => e.type === "FEATURE").length,
      IMPROVEMENT: CHANGELOG_ENTRIES.filter((e) => e.type === "IMPROVEMENT").length,
      FIX: CHANGELOG_ENTRIES.filter((e) => e.type === "FIX").length,
    };
  }, []);

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white via-slate-50/40 to-slate-50/80 p-5 sm:p-6 shadow-sm shadow-slate-100 transition-all">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 text-white shadow-md shadow-teal-700/15">
            <Sparkles className="h-5.5 w-5.5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                نشرة التحديثات والميزات الجديدة
              </h3>
              <span className="rounded-full bg-teal-100/80 border border-teal-200 px-2 py-0.5 text-[10px] font-black text-teal-800 font-numeric">
                v1.3.0
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 font-medium">
              تابع آخر الإضافات والتحسينات المباشرة لتطوير أعمال وإدارة الصيانة والمبيعات
            </p>
          </div>
        </div>

        {/* Action / Toggle Collapse */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-2xs transition cursor-pointer"
          >
            <span>{isCollapsed ? "عرض التحديثات" : "طي القسم"}</span>
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Filter Pills */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedType("ALL")}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer",
                selectedType === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100"
              )}
            >
              الكل ({counts.ALL})
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("FEATURE")}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer",
                selectedType === "FEATURE"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-white text-emerald-800 border border-emerald-200/80 hover:bg-emerald-50"
              )}
            >
              ميزات جديدة ({counts.FEATURE}) 🚀
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("IMPROVEMENT")}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer",
                selectedType === "IMPROVEMENT"
                  ? "bg-sky-700 text-white shadow-xs"
                  : "bg-white text-sky-800 border border-sky-200/80 hover:bg-sky-50"
              )}
            >
              تحسينات ({counts.IMPROVEMENT}) ⚡
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("FIX")}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer",
                selectedType === "FIX"
                  ? "bg-amber-700 text-white shadow-xs"
                  : "bg-white text-amber-800 border border-amber-200/80 hover:bg-amber-50"
              )}
            >
              إصلاحات ({counts.FIX}) 🛠️
            </button>
          </div>

          {/* Cards Grid */}
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredEntries.map((entry) => {
              const meta = getTypeMeta(entry.type);
              const EntryIcon = (entry.iconName && ICON_MAP[entry.iconName]) || Sparkles;

              return (
                <div
                  key={entry.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-teal-300 hover:shadow-md"
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Badge, Version, Date */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-bold",
                          meta.badgeClass
                        )}
                      >
                        {meta.label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold font-numeric text-slate-600">
                          {entry.version}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 font-numeric">
                          {entry.date}
                        </span>
                      </div>
                    </div>

                    {/* Title and Icon */}
                    <div className="flex items-start gap-3 pt-1">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105",
                          meta.iconBg
                        )}
                      >
                        <EntryIcon className="h-4.5 w-4.5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {entry.title}
                      </h4>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 leading-relaxed font-normal px-0.5">
                      {entry.description}
                    </p>
                  </div>

                  {/* Deep Link Action CTA */}
                  {entry.actionHref && entry.actionLabel && (
                    <div className="mt-5 pt-3.5 border-t border-slate-100 flex justify-end">
                      <Link
                        href={entry.actionHref}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-900 group-hover:text-teal-800 transition"
                      >
                        <span>{entry.actionLabel}</span>
                        <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-1" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

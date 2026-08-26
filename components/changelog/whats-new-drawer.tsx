"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  X,
  CheckCheck,
  Wrench,
  ShoppingCart,
  Boxes,
  Receipt,
  QrCode,
  Zap,
  ShieldCheck,
  Layers,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import {
  CHANGELOG_ENTRIES,
  CHANGELOG_STORAGE_KEYS,
  type ChangelogEntry,
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
};

function getTypeBadge(type: ChangelogType) {
  switch (type) {
    case "FEATURE":
      return {
        label: "ميزة جديدة 🚀",
        className: "bg-emerald-100/80 text-emerald-800 border-emerald-200",
      };
    case "IMPROVEMENT":
      return {
        label: "تحسين ⚡",
        className: "bg-sky-100/80 text-sky-800 border-sky-200",
      };
    case "FIX":
      return {
        label: "إصلاح 🛠️",
        className: "bg-amber-100/80 text-amber-800 border-amber-200",
      };
    default:
      return {
        label: "تحديث",
        className: "bg-slate-100 text-slate-800 border-slate-200",
      };
  }
}

interface WhatsNewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onStateChange?: () => void;
}

export function WhatsNewDrawer({ isOpen, onClose, onStateChange }: WhatsNewDrawerProps) {
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  // Load seen IDs from localStorage
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(CHANGELOG_STORAGE_KEYS.SEEN_IDS);
      if (stored) {
        setSeenIds(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, [isOpen]);

  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const markAllAsRead = () => {
    const allIds = CHANGELOG_ENTRIES.map((entry) => entry.id);
    setSeenIds(allIds);
    try {
      localStorage.setItem(CHANGELOG_STORAGE_KEYS.SEEN_IDS, JSON.stringify(allIds));
      window.dispatchEvent(new Event("changelog-updated"));
      onStateChange?.();
    } catch {
      // ignore
    }
  };

  const markSingleAsRead = (id: string) => {
    if (!seenIds.includes(id)) {
      const next = [...seenIds, id];
      setSeenIds(next);
      try {
        localStorage.setItem(CHANGELOG_STORAGE_KEYS.SEEN_IDS, JSON.stringify(next));
        window.dispatchEvent(new Event("changelog-updated"));
        onStateChange?.();
      } catch {
        // ignore
      }
    }
  };

  const unreadCount = mounted
    ? CHANGELOG_ENTRIES.filter((e) => !seenIds.includes(e.id)).length
    : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel (RTL: slide in from left) */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-full max-w-md bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col border-r border-slate-200",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="ما الجديد في النظام"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-teal-800 text-white shadow-sm shadow-teal-700/20">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">سجل الميزات والتحديثات</h2>
              <p className="text-xs text-slate-500 font-medium">تعرف على آخر إضافات وتطويرات مصلح OS</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            aria-label="إغلاق النافذة"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sub-header / Status & Action */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-100/60 border-b border-slate-200/60 text-xs font-semibold">
          <span className="text-slate-600 font-numeric">
            {unreadCount > 0 ? (
              <span className="text-teal-700 font-bold">
                لديك {unreadCount} تحديث جديد
              </span>
            ) : (
              <span className="text-slate-500">تم الاطلاع على جميع التحديثات</span>
            )}
          </span>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100/80 px-2.5 py-1 rounded-lg border border-teal-200 transition cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>تحديد الكل كمقروء</span>
            </button>
          )}
        </div>

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {CHANGELOG_ENTRIES.map((entry) => {
            const isUnread = mounted && !seenIds.includes(entry.id);
            const badge = getTypeBadge(entry.type);
            const EntryIcon = (entry.iconName && ICON_MAP[entry.iconName]) || Sparkles;

            return (
              <article
                key={entry.id}
                onClick={() => markSingleAsRead(entry.id)}
                className={cn(
                  "relative rounded-2xl border p-4 transition-all duration-200",
                  isUnread
                    ? "bg-teal-50/30 border-teal-200/80 shadow-xs"
                    : "bg-white border-slate-200/70 hover:border-slate-300"
                )}
              >
                {/* Header: Type Badge, Version, Date */}
                <div className="flex items-center justify-between gap-2 flex-wrap pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold",
                        badge.className
                      )}
                    >
                      {badge.label}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold font-numeric text-slate-600">
                      {entry.version}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-600 font-numeric">
                      {entry.date}
                    </span>
                    {isUnread && (
                      <span
                        title="تحديث جديد"
                        className="h-2 w-2 rounded-full bg-teal-600 shrink-0"
                      />
                    )}
                  </div>
                </div>

                {/* Title & Description */}
                <div className="mt-3 flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-teal-700">
                    <EntryIcon className="h-4.5 w-4.5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-slate-900 leading-snug">
                      {entry.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      {entry.description}
                    </p>
                  </div>
                </div>

                {/* Deep Link Action CTA */}
                {entry.actionHref && entry.actionLabel && (
                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex justify-end">
                    <Link
                      href={entry.actionHref}
                      onClick={() => {
                        markSingleAsRead(entry.id);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl border border-teal-200/80 transition shadow-2xs"
                    >
                      <span>{entry.actionLabel}</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </>
  );
}

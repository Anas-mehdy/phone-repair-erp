"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  X,
  ArrowLeft,
  Wrench,
  ShoppingCart,
  Boxes,
  Receipt,
  QrCode,
  Zap,
  ShieldCheck,
  Layers,
  type LucideIcon,
} from "lucide-react";
import {
  CHANGELOG_ENTRIES,
  CHANGELOG_STORAGE_KEYS,
  type ChangelogEntry,
} from "@/lib/changelog-data";
import { WhatsNewDrawer } from "@/components/changelog/whats-new-drawer";

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

export function FeatureSpotlight() {
  const [activeEntry, setActiveEntry] = useState<ChangelogEntry | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const evaluateSpotlight = () => {
    try {
      const dismissedRaw = localStorage.getItem(CHANGELOG_STORAGE_KEYS.DISMISSED_SPOTLIGHTS);
      const dismissedIds: string[] = dismissedRaw ? JSON.parse(dismissedRaw) : [];

      // Find the latest HIGH priority entry that has not been dismissed
      const highPriorityEntries = CHANGELOG_ENTRIES.filter(
        (e) => e.priority === "HIGH" && !dismissedIds.includes(e.id)
      );

      setActiveEntry(highPriorityEntries.length > 0 ? highPriorityEntries[0] : null);
    } catch {
      setActiveEntry(null);
    }
  };

  useEffect(() => {
    setMounted(true);
    evaluateSpotlight();

    const handleUpdate = () => evaluateSpotlight();
    window.addEventListener("changelog-updated", handleUpdate);
    return () => window.removeEventListener("changelog-updated", handleUpdate);
  }, []);

  const handleDismiss = (id: string) => {
    try {
      const dismissedRaw = localStorage.getItem(CHANGELOG_STORAGE_KEYS.DISMISSED_SPOTLIGHTS);
      const dismissedIds: string[] = dismissedRaw ? JSON.parse(dismissedRaw) : [];
      if (!dismissedIds.includes(id)) {
        const next = [...dismissedIds, id];
        localStorage.setItem(CHANGELOG_STORAGE_KEYS.DISMISSED_SPOTLIGHTS, JSON.stringify(next));
      }

      // Also mark as seen
      const seenRaw = localStorage.getItem(CHANGELOG_STORAGE_KEYS.SEEN_IDS);
      const seenIds: string[] = seenRaw ? JSON.parse(seenRaw) : [];
      if (!seenIds.includes(id)) {
        localStorage.setItem(CHANGELOG_STORAGE_KEYS.SEEN_IDS, JSON.stringify([...seenIds, id]));
      }

      setActiveEntry(null);
      window.dispatchEvent(new Event("changelog-updated"));
    } catch {
      setActiveEntry(null);
    }
  };

  if (!mounted || !activeEntry) {
    return null;
  }

  const EntryIcon = (activeEntry.iconName && ICON_MAP[activeEntry.iconName]) || Sparkles;

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-teal-200/90 bg-gradient-to-l from-teal-900 via-teal-800 to-slate-900 p-4 sm:p-5 text-white shadow-md shadow-teal-950/5 transition-all">
        {/* Decorative background glow */}
        <div className="absolute -left-12 -bottom-12 h-32 w-32 rounded-full bg-teal-500/20 blur-xl pointer-events-none" />
        <div className="absolute right-1/3 -top-12 h-32 w-32 rounded-full bg-amber-400/10 blur-xl pointer-events-none" />

        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-200 backdrop-blur-sm border border-white/10">
              <EntryIcon className="h-5 w-5 text-amber-300" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-400/20 border border-amber-400/30 px-2 py-0.5 text-[10px] font-extrabold text-amber-300">
                  <Sparkles className="h-3 w-3" />
                  ميزة رئيسية جديدة
                </span>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold font-numeric text-teal-200">
                  {activeEntry.version}
                </span>
              </div>

              <h3 className="text-sm font-bold tracking-tight text-white">
                {activeEntry.title}
              </h3>
              <p className="max-w-2xl text-xs font-medium leading-relaxed text-slate-200/90">
                {activeEntry.description}
              </p>
            </div>
          </div>

          {/* Action CTAs & Dismiss */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0">
            {activeEntry.actionHref && activeEntry.actionLabel && (
              <Link
                href={activeEntry.actionHref}
                onClick={() => handleDismiss(activeEntry.id)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-extrabold text-teal-900 shadow-sm hover:bg-teal-50 transition active:scale-95"
              >
                <span>{activeEntry.actionLabel}</span>
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            )}

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-white transition"
            >
              كل التحديثات
            </button>

            <button
              type="button"
              onClick={() => handleDismiss(activeEntry.id)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
              title="إخفاء التنبيه"
              aria-label="إخفاء التنبيه"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <WhatsNewDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onStateChange={evaluateSpotlight}
      />
    </>
  );
}

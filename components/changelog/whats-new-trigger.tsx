"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { CHANGELOG_ENTRIES, CHANGELOG_STORAGE_KEYS } from "@/lib/changelog-data";
import { WhatsNewDrawer } from "./whats-new-drawer";
import { cn } from "@/lib/utils";

interface WhatsNewTriggerProps {
  compact?: boolean;
  className?: string;
}

export function WhatsNewTrigger({ compact = false, className }: WhatsNewTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const checkUnread = () => {
    try {
      const stored = localStorage.getItem(CHANGELOG_STORAGE_KEYS.SEEN_IDS);
      const seenIds: string[] = stored ? JSON.parse(stored) : [];
      // Only highlight badge for MEDIUM and HIGH priority entries as requested
      const unreadAlerts = CHANGELOG_ENTRIES.filter(
        (e) => (e.priority === "HIGH" || e.priority === "MEDIUM") && !seenIds.includes(e.id)
      );
      setHasUnread(unreadAlerts.length > 0);
    } catch {
      setHasUnread(false);
    }
  };

  useEffect(() => {
    checkUnread();

    const handleUpdate = () => checkUnread();
    window.addEventListener("changelog-updated", handleUpdate);
    return () => window.removeEventListener("changelog-updated", handleUpdate);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="ما الجديد في النظام"
        aria-label="ما الجديد في النظام"
        className={cn(
          "relative flex items-center rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer",
          compact
            ? "h-10 w-10 justify-center text-slate-500 hover:bg-teal-50 hover:text-teal-700"
            : "w-full gap-2.5 px-3.5 py-2.5 text-slate-600 hover:bg-teal-50 hover:text-teal-800",
          className
        )}
      >
        <div className="relative flex items-center justify-center">
          <Sparkles className="h-4.5 w-4.5 text-amber-500" />
          {hasUnread && (
            <span
              className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-teal-600 border-2 border-white"
              title="تحديثات جديدة متاحة"
            />
          )}
        </div>

        {!compact && (
          <div className="flex flex-1 items-center justify-between">
            <span>ما الجديد؟</span>
            {hasUnread && (
              <span className="rounded-md bg-teal-100 text-teal-800 border border-teal-200 px-1.5 py-0.2 text-[10px] font-bold">
                جديد
              </span>
            )}
          </div>
        )}
      </button>

      <WhatsNewDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onStateChange={checkUnread}
      />
    </>
  );
}

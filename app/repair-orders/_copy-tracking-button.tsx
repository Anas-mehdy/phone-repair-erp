"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { captureClientEvent } from "@/lib/analytics/client";

interface CopyTrackingLinkButtonProps {
  trackingUrl: string;
  className?: string;
}

export function CopyTrackingLinkButton({
  trackingUrl,
  className = "",
}: CopyTrackingLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(trackingUrl);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textarea = document.createElement("textarea");
        textarea.value = trackingUrl;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      captureClientEvent(ANALYTICS_EVENTS.REPAIR_TRACKING_LINK_COPIED);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy tracking link:", err);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleCopy}
      className={`w-full font-bold text-xs rounded-xl h-10 transition-all duration-200 shadow-xs flex items-center justify-center gap-2 ${
        copied
          ? "border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100/80 hover:border-emerald-500"
          : "border-slate-200 text-slate-700 bg-slate-50/60 hover:bg-teal-50 hover:text-teal-900 hover:border-teal-300"
      } ${className}`}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>تم نسخ الرابط بنجاح!</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5 text-teal-700 shrink-0" />
          <span>انسخ رابط التعقب</span>
        </>
      )}
    </Button>
  );
}

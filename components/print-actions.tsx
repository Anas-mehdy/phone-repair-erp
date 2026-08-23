"use client";

import { useEffect } from "react";
import { Printer, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintActions({ backUrl }: { backUrl?: string }) {
  useEffect(() => {
    // Optional smooth delay then open print
    const timer = setTimeout(() => {
      window.print();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="no-print fixed top-4 left-4 z-50 flex items-center gap-3 bg-white/90 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200 shadow-xl">
      <Button
        onClick={() => window.print()}
        className="bg-primary text-white font-bold text-xs h-10 px-4 rounded-xl shadow-md flex items-center gap-2"
      >
        <Printer className="h-4 w-4" />
        طباعة الآن
      </Button>

      {backUrl && (
        <Button
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              window.location.href = backUrl;
            }
          }}
          variant="outline"
          className="border-slate-200 text-slate-700 font-bold text-xs h-10 px-4 rounded-xl hover:bg-slate-100 flex items-center gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          رجوع
        </Button>
      )}
    </div>
  );
}

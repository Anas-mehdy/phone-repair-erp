"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, ArrowLeft } from "lucide-react";

export function LifetimeOfferBanner({ remaining, total }: { remaining: number; total: number }) {
  const pathname = usePathname();
  if (pathname === "/onboarding") return null;

  return (
    <div className="sticky top-0 z-[60] border-b border-amber-300 bg-gradient-to-l from-amber-500 via-orange-500 to-amber-500 px-3 py-2 text-slate-950 shadow-md print:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-center text-[11px] font-black sm:text-xs">
        <Crown className="h-4 w-4 shrink-0 fill-current" />
        <span>عرض محدود: اشترك في مسار مدى الحياة — متبقي {remaining} من {total}</span>
        <Link href="/subscription#lifetime-plan" className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-950 px-2.5 py-1 text-[10px] font-black text-white transition hover:bg-slate-800">
          عرض الخطة <ArrowLeft className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

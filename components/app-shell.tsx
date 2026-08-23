"use client";

import { Smartphone, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { logoutAction } from "@/app/actions/authActions";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // For marketing landing page, auth pages, and printable receipts, render clean layout without dashboard sidebar
  const isPublicPage = pathname === "/" || pathname === "/login" || pathname === "/register" || pathname.includes("/print");

  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50/20">
      {/* Sidebar Desktop */}
      <aside className="fixed inset-y-0 right-0 hidden w-64 border-l border-slate-200/60 bg-white/70 backdrop-blur-xl px-5 py-6 shadow-sm shadow-slate-100/30 lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/60 bg-slate-50/40 p-4 transition-all duration-300 hover:border-primary/10">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary/95 to-teal-800 text-primary-foreground shadow-md shadow-primary/20">
              <Smartphone className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-base font-extrabold tracking-tight text-slate-800 bg-gradient-to-l from-slate-900 to-slate-700 bg-clip-text text-transparent truncate">
                مصلح OS
              </h1>
              <p className="mt-0.5 text-[10px] font-bold text-teal-700 uppercase tracking-wide truncate">
                منظومة إدارة الصيانة
              </p>
            </div>
          </div>

          <AppNav />
        </div>

        {/* User / Logout footer in sidebar */}
        <div className="pt-4 border-t border-slate-200/60">
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center justify-between gap-2.5 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition"
            >
              <div className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                <span>تسجيل الخروج</span>
              </div>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pr-64">
        {/* Header Mobile */}
        <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-xl px-5 py-4 shadow-sm lg:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary/95 to-teal-800 text-primary-foreground shadow-sm shadow-primary/10">
                <Smartphone className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h1 className="font-extrabold text-slate-800 text-sm">مصلح OS</h1>
                <p className="text-[9px] font-bold text-slate-400">إدارة صيانة الأجهزة والـ POS</p>
              </div>
            </div>

            <form action={logoutAction}>
              <button
                type="submit"
                className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>خروج</span>
              </button>
            </form>
          </div>
          <AppNav compact />
        </header>

        <main className="mx-auto min-h-screen max-w-[1600px] px-5 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

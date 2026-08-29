"use client";

import { LogOut, Menu, X, ChevronsLeft, ChevronsRight } from "lucide-react";
import Image from "next/image";
import { useState, useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { logoutAction } from "@/app/actions/authActions";
import { cn } from "@/lib/utils";
import { UserPresenceHeartbeat } from "@/components/user-presence-heartbeat";
import { GlobalSubscriptionBanner } from "@/components/subscription/global-subscription-banner";

export function AppShell({
  children,
  canSettings = false,
  canReports = false,
  canManageSubscription = false,
}: {
  children: ReactNode;
  canSettings?: boolean;
  canReports?: boolean;
  canManageSubscription?: boolean;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Default to collapsed (folded) on desktop
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Load user preference from localStorage if previously set
  useEffect(() => {
    try {
      const saved = localStorage.getItem("phone_repair_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // ignore storage access errors
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("phone_repair_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Close drawer on page navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent background body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // For marketing landing page, auth pages, tracking page, and printable receipts, render clean layout without dashboard sidebar
  const isPublicPage =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname.includes("/print") ||
    pathname.includes("/sticker") ||
    pathname.startsWith("/track") ||
    pathname.startsWith("/installment-track");

  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50/20">
      {/* Sidebar Desktop */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-30 hidden border-l border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-sm shadow-slate-100/30 transition-all duration-300 ease-in-out lg:flex lg:flex-col lg:justify-between",
          isCollapsed ? "w-20 px-3 py-5" : "w-64 px-5 py-6"
        )}
      >
        <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden">
          {/* Header / Brand & Toggle */}
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={toggleSidebar}
                title="توسيع القائمة الجانبية"
                aria-label="توسيع القائمة الجانبية"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200/80 hover:border-emerald-200 transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs"
              >
                <ChevronsLeft className="h-4.5 w-4.5" />
              </button>
              <div
                title="مسار - منظومة إدارة الصيانة"
                onClick={toggleSidebar}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white p-2 border border-slate-200/80 shadow-md shadow-slate-200/50 cursor-pointer transition hover:scale-105 hover:border-teal-300"
              >
                <Image
                  src="/masar-icon.png"
                  alt="مسار"
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200/60 bg-slate-50/50 p-3 transition-all duration-300 hover:border-teal-200/60">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white p-2 border border-slate-200/80 shadow-xs">
                  <Image
                    src="/masar-icon.png"
                    alt="مسار"
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                  />
                </div>
                <div className="overflow-hidden">
                  <h1 className="text-base font-black tracking-tight text-slate-900 truncate">
                    مسار
                  </h1>
                  <p className="mt-0.5 text-[10px] font-bold text-teal-700 uppercase tracking-wide truncate">
                    منظومة إدارة الصيانة
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleSidebar}
                title="طي القائمة الجانبية"
                aria-label="طي القائمة الجانبية"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition active:scale-95 cursor-pointer"
              >
                <ChevronsRight className="h-4.5 w-4.5" />
              </button>
            </div>
          )}

          {/* Navigation Items */}
          <div className="mt-4 flex-1">
            <AppNav canSettings={canSettings} canReports={canReports} canManageSubscription={canManageSubscription} compact={isCollapsed} />
          </div>

          {/* User / Logout footer in sidebar */}
          <div className={cn("pt-4 border-t border-slate-200/60 mt-auto", isCollapsed ? "flex justify-center" : "")}>
            <form action={logoutAction} className="w-full">
              {isCollapsed ? (
                <button
                  type="submit"
                  title="تسجيل الخروج"
                  aria-label="تسجيل الخروج"
                  className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition active:scale-95 cursor-pointer"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="w-full flex items-center justify-between gap-2.5 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition"
                >
                  <div className="flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    <span>تسجيل الخروج</span>
                  </div>
                </button>
              )}
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 lg:hidden",
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Drawer Panel (Slide-over from Right in RTL) */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-72 max-w-[85vw] bg-white shadow-2xl border-l border-slate-200 transition-transform duration-300 ease-out flex flex-col justify-between lg:hidden",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
        aria-label="قائمة التنقل الجانبية"
      >
        <div className="flex flex-col h-full overflow-y-auto p-5">
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white p-2 border border-slate-200 shadow-xs">
                <Image
                  src="/masar-icon.png"
                  alt="مسار"
                  width={24}
                  height={24}
                  className="h-6 w-6 object-contain"
                />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-800">مسار</h2>
                <p className="text-[9px] font-bold text-teal-700 uppercase">منظومة إدارة الصيانة</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
              aria-label="إغلاق القائمة"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav Items */}
          <div className="mt-4 flex-1">
            <AppNav canSettings={canSettings} canReports={canReports} canManageSubscription={canManageSubscription} onNavigate={() => setMobileMenuOpen(false)} compact={false} />
          </div>

          {/* Drawer Footer */}
          <div className="pt-4 mt-6 border-t border-slate-100">
            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-50 border border-rose-100 py-3 text-xs font-bold text-rose-600 hover:bg-rose-100 transition cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>تسجيل الخروج</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={cn("transition-all duration-300 ease-in-out", isCollapsed ? "lg:pr-20" : "lg:pr-64")}>
        {/* Header Mobile */}
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl px-4 py-3 shadow-xs lg:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 hover:text-primary active:scale-95 transition cursor-pointer"
                aria-label="فتح القائمة الجانبية"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white p-1.5 border border-slate-200 shadow-2xs">
                  <Image
                    src="/masar-icon.png"
                    alt="مسار"
                    width={22}
                    height={22}
                    className="h-5 w-5 object-contain"
                  />
                </div>
                <div>
                  <h1 className="font-extrabold text-slate-800 text-sm leading-tight">مسار</h1>
                  <p className="text-[9px] font-bold text-slate-400">إدارة صيانة الأجهزة والـ POS</p>
                </div>
              </div>
            </div>

            <form action={logoutAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 px-3 py-2 rounded-xl border border-slate-200 hover:border-rose-200 transition cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>خروج</span>
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto min-h-screen max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <UserPresenceHeartbeat />
          <GlobalSubscriptionBanner />
          {children}
        </main>
      </div>
    </div>
  );
}

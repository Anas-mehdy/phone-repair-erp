"use client";

import { ChevronsLeft, ChevronsRight, LogOut } from "lucide-react";
import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppNav, MobileBottomNav, navigationLabelForPath } from "@/components/app-nav";
import { logoutAction } from "@/app/actions/authActions";
import { cn } from "@/lib/utils";
import { UserPresenceHeartbeat } from "@/components/user-presence-heartbeat";
import { GlobalSubscriptionBanner } from "@/components/subscription/global-subscription-banner";
import { TutorialOnboarding } from "@/components/tutorial-onboarding";

export function AppShell({
  children,
  canSettings = false,
  canReports = false,
  canManageSubscription = false,
  canManageDebts = false,
  tutorialInitialShowBanner = false,
}: {
  children: ReactNode;
  canSettings?: boolean;
  canReports?: boolean;
  canManageSubscription?: boolean;
  canManageDebts?: boolean;
  tutorialInitialShowBanner?: boolean;
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("phone_repair_sidebar_collapsed");
      if (saved !== null) setIsCollapsed(saved === "true");
    } catch {
      // ignore storage access errors
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((previous) => {
      const next = !previous;
      try {
        localStorage.setItem("phone_repair_sidebar_collapsed", String(next));
      } catch {
        // ignore storage access errors
      }
      return next;
    });
  };

  const isPublicPage =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/partners") ||
    pathname.startsWith("/partner-invite/") ||
    pathname.startsWith("/register/partner/") ||
    pathname.includes("/print") ||
    pathname.includes("/sticker") ||
    pathname.startsWith("/track") ||
    pathname.startsWith("/installment-track");

  if (isPublicPage) return <>{children}</>;

  const navPermissions = { canSettings, canReports, canManageSubscription, canManageDebts };
  const currentPageLabel = navigationLabelForPath(pathname);

  return (
    <div className="min-h-screen bg-slate-50/30">
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 hidden border-l border-slate-200/70 bg-white/95 shadow-[0_0_50px_-38px_rgba(15,23,42,0.35)] backdrop-blur-xl transition-[width,padding] duration-300 ease-out lg:flex lg:flex-col",
          isCollapsed ? "w-[84px] px-3 py-4" : "w-[280px] px-4 py-5",
        )}
        aria-label="القائمة الرئيسية"
      >
        <div className={cn("flex min-h-0 flex-1 flex-col", isCollapsed ? "overflow-visible" : "overflow-y-auto overflow-x-hidden")}>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={toggleSidebar}
                title="توسيع القائمة"
                aria-label="توسيع القائمة الجانبية"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 active:scale-95"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={toggleSidebar}
                title="مسار - منظومة إدارة الصيانة"
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition hover:border-teal-200 hover:shadow-md"
              >
                <Image src="/masar-icon.png" alt="مسار" width={28} height={28} className="h-7 w-7 object-contain" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-gradient-to-l from-slate-50 to-white p-3 shadow-sm">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                  <Image src="/masar-icon.png" alt="مسار" width={28} height={28} className="h-7 w-7 object-contain" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-[16px] font-black tracking-tight text-slate-900">مسار</h1>
                  <p className="mt-0.5 truncate text-[10px] font-bold text-teal-700">إدارة الصيانة والأعمال</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleSidebar}
                title="طي القائمة"
                aria-label="طي القائمة الجانبية"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className={cn("flex-1", isCollapsed ? "overflow-visible" : "min-h-0")}>
            <AppNav {...navPermissions} compact={isCollapsed} />
          </div>

          <div className={cn("mt-auto border-t border-slate-200/70 pt-3", isCollapsed && "flex justify-center")}>
            <form action={logoutAction} className={cn(!isCollapsed && "w-full")}>
              <button
                type="submit"
                title="تسجيل الخروج"
                className={cn(
                  "flex items-center rounded-xl font-bold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 active:scale-[0.98]",
                  isCollapsed ? "h-10 w-10 justify-center" : "min-h-10 w-full gap-2.5 px-3 text-[12px]",
                )}
              >
                <LogOut className="h-4 w-4" />
                {!isCollapsed && <span>تسجيل الخروج</span>}
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className={cn("transition-[padding] duration-300 ease-out", isCollapsed ? "lg:pr-[84px]" : "lg:pr-[280px]")}>
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur-xl lg:hidden">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
                <Image src="/masar-icon.png" alt="مسار" width={22} height={22} className="h-5 w-5 object-contain" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5"><span className="text-[13px] font-black text-slate-900">مسار</span><span className="h-1 w-1 rounded-full bg-teal-400" /></div>
                <p className="truncate text-[11px] font-bold text-slate-500">{currentPageLabel}</p>
              </div>
            </div>
            <form action={logoutAction}>
              <button type="submit" title="تسجيل الخروج" aria-label="تسجيل الخروج" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition active:bg-rose-50 active:text-rose-600">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto min-h-screen max-w-[1600px] px-4 pb-28 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-8">
          <UserPresenceHeartbeat />
          <GlobalSubscriptionBanner />
          <TutorialOnboarding initialShowBanner={tutorialInitialShowBanner} />
          {children}
        </main>
      </div>

      <MobileBottomNav {...navPermissions} />
    </div>
  );
}

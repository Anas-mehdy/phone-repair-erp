import type { Metadata, Viewport } from "next";
import { Cairo, Outfit } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { DashboardKpiNavigation } from "@/components/dashboard/dashboard-kpi-navigation";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { LifetimeOfferBanner } from "@/components/lifetime-offer-banner";
import { getAuthContext, can } from "@/lib/auth/context";
import { APP_URL } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";
import { subscriptionOfferService } from "@/lib/services/subscriptionOfferService";
import { lifetimeSubscriptionService } from "@/lib/services/lifetimeSubscriptionService";
import "./globals.css";

const cairo = Cairo({ subsets: ["arabic"], weight: ["300","400","500","600","700","800","900"], variable: "--font-cairo", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], weight: ["300","400","500","600","700","800","900"], variable: "--font-outfit", display: "swap" });
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 5, themeColor: "#0f766e" };
export const metadata: Metadata = { metadataBase: new URL(APP_URL), title: "مسار | إدارة صيانة الهواتف", description: "مسار متكامل لإدارة صيانة الهواتف من الاستلام حتى التسليم", applicationName: "مسار", manifest: "/manifest.webmanifest", icons: { icon: [{ url: "/massar-pwa-192.png", sizes: "192x192", type: "image/png" }, { url: "/massar-pwa-512.png", sizes: "512x512", type: "image/png" }], apple: [{ url: "/massar-apple-touch.png", sizes: "180x180", type: "image/png" }] }, appleWebApp: { capable: true, statusBarStyle: "default", title: "مسار" } };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let canSettings = false, canReports = false, canManageSubscription = false, canManageDebts = false, showTutorialBanner = false;
  let lifetimeBanner: { remaining: number; total: number } | null = null;
  try {
    const auth = await getAuthContext({ allowRedirect: false });
    canSettings = can(auth, "shop:settings"); canReports = can(auth, "reports:read"); canManageDebts = can(auth, "debts:manage");
    const tutorialRows = await prisma.$queryRaw<Array<{ tutorialBannerSeenAt: Date | null }>>`SELECT "tutorialBannerSeenAt" FROM "User" WHERE "id" = ${auth.user.id}::uuid AND "deletedAt" IS NULL LIMIT 1`;
    showTutorialBanner = tutorialRows[0]?.tutorialBannerSeenAt == null;
    const hasSubscriptionPermission = can(auth, "subscription:manage");
    if (hasSubscriptionPermission) {
      const rows = await prisma.$queryRaw<Array<{ partnerId: string | null }>>`SELECT "partnerId" FROM "Shop" WHERE "id" = ${auth.shop.id}::uuid AND "deletedAt" IS NULL LIMIT 1`;
      canManageSubscription = !rows[0]?.partnerId;
      if (canManageSubscription) {
        const activeLifetime = await lifetimeSubscriptionService.getActiveLifetimeForShop(auth.shop.id);
        if (!activeLifetime) {
          const offer = await subscriptionOfferService.getOfferSettings();
          if (offer.isActive && offer.remainingEligible > 0) lifetimeBanner = { remaining: offer.remainingEligible, total: offer.totalEligible };
        }
      }
    }
  } catch {
    canSettings = false; canReports = false; canManageSubscription = false; canManageDebts = false; showTutorialBanner = false; lifetimeBanner = null;
  }
  return <html lang="ar" dir="rtl" className={`${cairo.variable} ${outfit.variable} overflow-x-hidden w-full max-w-full`}><body className="font-sans antialiased overflow-x-hidden min-h-screen w-full max-w-full"><DashboardKpiNavigation /><PwaInstallPrompt />{lifetimeBanner ? <LifetimeOfferBanner remaining={lifetimeBanner.remaining} total={lifetimeBanner.total} /> : null}<AppShell canSettings={canSettings} canReports={canReports} canManageSubscription={canManageSubscription} canManageDebts={canManageDebts} tutorialInitialShowBanner={showTutorialBanner}>{children}</AppShell></body></html>;
}

import type { Metadata, Viewport } from "next";
import { Cairo, Outfit } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { DashboardKpiNavigation } from "@/components/dashboard/dashboard-kpi-navigation";
import { getAuthContext, can } from "@/lib/auth/context";
import { APP_URL } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-outfit",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "مسار | إدارة صيانة الهواتف",
  description: "مسار متكامل لإدارة صيانة الهواتف من الاستلام حتى التسليم",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let canSettings = false;
  let canReports = false;
  let canManageSubscription = false;
  let canManageDebts = false;
  let showTutorialBanner = false;

  try {
    const auth = await getAuthContext({ allowRedirect: false });
    canSettings = can(auth, "shop:settings");
    canReports = can(auth, "reports:read");
    canManageDebts = can(auth, "debts:manage");

    const tutorialRows = await prisma.$queryRaw<Array<{ tutorialBannerSeenAt: Date | null }>>`
      SELECT "tutorialBannerSeenAt"
      FROM "User"
      WHERE "id" = ${auth.user.id}::uuid
        AND "deletedAt" IS NULL
      LIMIT 1
    `;
    showTutorialBanner = tutorialRows[0]?.tutorialBannerSeenAt == null;

    const hasSubscriptionPermission = can(auth, "subscription:manage");
    if (hasSubscriptionPermission) {
      const rows = await prisma.$queryRaw<Array<{ partnerId: string | null }>>`
        SELECT "partnerId"
        FROM "Shop"
        WHERE "id" = ${auth.shop.id}::uuid
          AND "deletedAt" IS NULL
        LIMIT 1
      `;
      canManageSubscription = !rows[0]?.partnerId;
    }
  } catch {
    canSettings = false;
    canReports = false;
    canManageSubscription = false;
    canManageDebts = false;
    showTutorialBanner = false;
  }

  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${outfit.variable} overflow-x-hidden w-full max-w-full`}
    >
      <body className="font-sans antialiased overflow-x-hidden min-h-screen w-full max-w-full">
        <DashboardKpiNavigation />
        <AppShell
          canSettings={canSettings}
          canReports={canReports}
          canManageSubscription={canManageSubscription}
          canManageDebts={canManageDebts}
          tutorialInitialShowBanner={showTutorialBanner}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}

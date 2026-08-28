import type { Metadata, Viewport } from "next";
import { Cairo, Outfit } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { getAuthContext, can } from "@/lib/auth/context";
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

  try {
    const auth = await getAuthContext({ allowRedirect: false });
    canSettings = can(auth, "shop:settings");
    canReports = can(auth, "reports:read");
  } catch {
    canSettings = false;
    canReports = false;
  }

  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${outfit.variable} overflow-x-hidden w-full max-w-full`}
    >
      <body className="font-sans antialiased overflow-x-hidden min-h-screen w-full max-w-full">
        <AppShell canSettings={canSettings} canReports={canReports}>{children}</AppShell>
      </body>
    </html>
  );
}

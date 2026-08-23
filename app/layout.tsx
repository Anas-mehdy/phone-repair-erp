import type { Metadata, Viewport } from "next";
import { Cairo, Outfit } from "next/font/google";
import { AppShell } from "@/components/app-shell";
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
  title: "إدارة الصيانة | Phone Repair OS",
  description: "نظام متكامل لإدارة صيانة الهواتف الذكية والمبيعات والمخزون",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${outfit.variable} overflow-x-hidden w-full max-w-full`}>
      <body className="font-sans antialiased overflow-x-hidden min-h-screen w-full max-w-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

"use client";

import { Download, Share2, X } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

export function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(true);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const navigatorWithStandalone = navigator as NavigatorWithStandalone;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      navigatorWithStandalone.standalone === true;

    setIsInstalled(standalone);
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((registration) => registration.update())
        .catch(() => undefined);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setIsInstalled(false);
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setShowIosHelp(false);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setIsInstalled(true);
      setInstallPrompt(null);
      return;
    }

    if (isIos) setShowIosHelp(true);
  }

  if (isInstalled || (!installPrompt && !isIos)) return null;

  return (
    <>
      <button
        type="button"
        onClick={install}
        className="fixed bottom-4 left-4 z-[70] inline-flex items-center gap-2 rounded-2xl border border-teal-200 bg-white px-4 py-3 text-xs font-black text-teal-800 shadow-xl shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-teal-50"
        aria-label="تثبيت تطبيق مسار"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        تثبيت تطبيق مسار
      </button>

      {showIosHelp ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="pwa-ios-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="pwa-ios-title" className="text-base font-black text-slate-900">تثبيت مسار على الآيفون</h2>
                <p className="mt-1 text-xs font-medium leading-6 text-slate-500">يتم التثبيت من قائمة المشاركة في Safari.</p>
              </div>
              <button type="button" onClick={() => setShowIosHelp(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200" aria-label="إغلاق">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3 text-sm font-bold text-slate-700">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm"><Share2 className="h-4 w-4" /></span>
                <span>1. اضغط زر المشاركة في Safari.</span>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">2. اختر «إضافة إلى الشاشة الرئيسية».</div>
              <div className="rounded-2xl bg-slate-50 p-3">3. اضغط «إضافة» وسيظهر مسار كتطبيق مستقل.</div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

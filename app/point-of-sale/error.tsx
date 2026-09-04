"use client";

import { AlertTriangle, RefreshCw, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PointOfSaleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-2xl items-center justify-center px-3 py-8">
      <section className="w-full rounded-[26px] border border-rose-200 bg-white p-6 text-center shadow-sm dark:border-rose-900/70 dark:bg-slate-950 sm:p-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-950/35 dark:text-rose-300 dark:ring-rose-900"><AlertTriangle className="h-6 w-6" /></span>
        <h1 className="mt-4 text-lg font-black text-slate-900 dark:text-slate-100">تعذر تحميل نقطة البيع</h1>
        <p className="mx-auto mt-2 max-w-lg text-[11px] font-semibold leading-6 text-slate-500 dark:text-slate-400">لم يتم تسجيل عملية جديدة من هذه الشاشة. حاول إعادة تحميل بيانات التاب، وإذا استمرت المشكلة ارجع لنقطة البيع وافتح العملية من جديد.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={reset} className="h-10 rounded-xl px-4 text-[11px] font-black"><RefreshCw className="ml-1.5 h-4 w-4" />إعادة المحاولة</Button>
          <Button asChild variant="outline" className="h-10 rounded-xl px-4 text-[11px] font-black"><Link href="/point-of-sale"><ShoppingCart className="ml-1.5 h-4 w-4" />العودة لنقطة البيع</Link></Button>
        </div>
      </section>
    </div>
  );
}

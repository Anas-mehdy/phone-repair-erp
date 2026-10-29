import Link from "next/link";
import { requireAccountantPage } from "@/lib/auth/stocktake";
import { listStocktakes } from "@/lib/services/stocktakeService";
import { stocktakeScopes } from "@/lib/stocktake";
import { StartStocktake } from "./start";
export const dynamic = "force-dynamic";
export default async function StocktakesPage() {
  const auth = await requireAccountantPage();
  const sessions = await listStocktakes({
    shopId: auth.shop.id,
    userId: auth.user.id,
  });
  return (
    <main dir="rtl" className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <header>
        <p className="text-sm font-bold text-teal-700">مساحة المحاسب</p>
        <h1 className="mt-2 text-3xl font-black">جرد الأجهزة</h1>
        <p className="mt-3 text-sm text-slate-500">
          امسح الأجهزة الموجودة فعليًا، ثم راجع الفروقات وأغلق الجلسة لحفظ
          التقرير. الجرد لا يعدّل كميات المخزون.
        </p>
      </header>
      <StartStocktake />
      <section className="rounded-2xl border bg-white p-5 dark:bg-slate-950 dark:border-slate-800">
        <h2 className="mb-4 text-lg font-black">
          جلسات الجرد{" "}
          <span className="text-sm text-slate-400">آخر 100 جلسة</span>
        </h2>
        {!sessions.length ? (
          <p className="py-10 text-center text-slate-500">
            لا توجد جلسات بعد. ابدأ جلسة الجرد الأولى.
          </p>
        ) : (
          <div className="divide-y dark:divide-slate-800">
            {sessions.map((s) => (
              <Link
                href={`/stocktakes/${s.id}`}
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4 hover:text-teal-700"
              >
                <div>
                  <h3 className="font-bold">{s.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(s.startedAt).toLocaleString("ar")} ·{" "}
                    {stocktakeScopes[s.scope]}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span>
                    {s.counted} / {s.total} تم مسحه
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 font-bold ${s.status === "OPEN" ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-600"}`}
                  >
                    {s.status === "OPEN" ? "قيد الجرد" : "مغلقة"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

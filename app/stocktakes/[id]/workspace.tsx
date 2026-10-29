"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  StocktakeView,
  StocktakeLineView,
} from "@/lib/services/stocktakeService";
import {
  resultLabels,
  stocktakeScopes,
  type StocktakeResult,
} from "@/lib/stocktake";
import { stocktakeAction } from "../actions";
import {
  reportLines,
  money,
  sumMoney,
  reportLabels as tabLabels,
  type StocktakeReport as Tab,
} from "@/lib/stocktake-report";
export function StocktakeTable({
  lines,
  open,
}: {
  lines: StocktakeLineView[];
  open: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-right text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-900">
          <tr>
            {[
              "الباركود",
              "الجهاز / الموديل",
              "الحالة",
              "تكلفة الشراء",
              "سعر البيع",
              "النتيجة",
              "ملاحظات",
            ].map((t) => (
              <th key={t} className="p-3 font-bold">
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-slate-800">
          {lines.map((l) => (
            <tr key={l.id}>
              <td className="p-3 font-mono" dir="ltr">
                {l.countedBarcode || l.barcodeSnapshot || "—"}
              </td>
              <td className="p-3">
                <strong>{l.modelSnapshot || l.nameSnapshot}</strong>
                {l.modelSnapshot ? (
                  <div className="mt-1 text-xs text-slate-400">
                    {l.nameSnapshot}
                  </div>
                ) : null}
              </td>
              <td className="p-3">
                {stocktakeScopes[
                  l.conditionSnapshot as keyof typeof stocktakeScopes
                ] || "غير محدد"}
              </td>
              <td className="p-3 whitespace-nowrap">
                {money(l.unitCostSnapshot)}
              </td>
              <td className="p-3 whitespace-nowrap">
                {money(l.unitPriceSnapshot)}
              </td>
              <td className="p-3">
                <span
                  className={`whitespace-nowrap rounded-lg px-2 py-1 text-xs font-bold ${l.result === "COUNTED" ? "bg-teal-50 text-teal-800" : l.result === "MISSING" ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-800"}`}
                >
                  {open && l.result === "MISSING"
                    ? "بانتظار المسح"
                    : (resultLabels[l.result as StocktakeResult] ??
                      "بانتظار المسح")}
                </span>
              </td>
              <td className="max-w-xs p-3 text-xs leading-6 text-slate-500">
                {l.reason}
                {l.countedAt ? (
                  <div>
                    آخر مسح: {new Date(l.countedAt).toLocaleString("ar")}
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!lines.length ? (
        <p className="p-10 text-center text-slate-500">
          لا توجد أجهزة ضمن هذا التقرير.
        </p>
      ) : null}
    </div>
  );
}
export function StocktakeWorkspace({ data }: { data: StocktakeView }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<{ text: string; good: boolean } | null>(
    null,
  );
  const [recount, setRecount] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [tab, setTab] = useState<Tab>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const open = data.status === "OPEN";
  const counted = data.lines.filter((l) => l.countedAt).length;
  const missing = data.lines.filter((l) => l.result === "MISSING").length;
  const review = data.lines.filter((l) => l.result === "REVIEW").length;
  const selected = reportLines(data, tab).filter((l) =>
    `${l.barcodeSnapshot} ${l.countedBarcode ?? ""} ${l.nameSnapshot} ${l.modelSnapshot ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const present = selected.filter((l) => l.result !== "MOVED");
  const totalCost = sumMoney(present.map((l) => l.unitCostSnapshot));
  const totalPrice = sumMoney(present.map((l) => l.unitPriceSnapshot));
  const unresolved = present.filter((l) => l.unitCostSnapshot === null).length;
  const unsetPrices = present.filter(
    (l) => l.unitPriceSnapshot === null,
  ).length;
  return (
    <main dir="rtl" className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <Link href="/stocktakes" className="text-sm font-bold text-teal-700">
        ← جلسات الجرد
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-teal-700">
            {data.shopNameSnapshot} · {stocktakeScopes[data.scope]}
          </p>
          <h1 className="mt-2 text-2xl font-black">{data.title}</h1>
          <p className="mt-2 text-xs text-slate-500">
            بدأت {new Date(data.startedAt).toLocaleString("ar")}
            {data.closedAt
              ? ` · أُغلقت ${new Date(data.closedAt).toLocaleString("ar")}`
              : " · النتائج مبدئية حتى الإغلاق"}
          </p>
        </div>
        <span className="rounded-full border px-4 py-2 text-sm font-bold">
          {open ? "قيد الجرد" : "تقرير محفوظ"}
        </span>
      </header>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["الأجهزة في الجلسة", data.lines.length],
          ["تم مسحه", counted],
          [open ? "بانتظار المسح" : "غير موجود فعليًا", missing],
          ["تحتاج مراجعة", review],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border bg-white p-4 dark:bg-slate-950 dark:border-slate-800"
          >
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black">{value}</p>
          </div>
        ))}
      </div>
      {open ? (
        <section className="rounded-2xl border border-teal-200 bg-teal-50/50 p-5 dark:bg-teal-950/20 dark:border-teal-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const barcode = input.current?.value ?? "";
              if (!barcode.trim() || pending) return;
              start(async () => {
                const r = await stocktakeAction({
                  action: "SCAN",
                  id: data.id,
                  barcode,
                  recount,
                });
                if (!r.ok) setNotice({ text: r.error, good: false });
                else {
                  setNotice({
                    text: r.message ?? "تم التسجيل",
                    good: r.result === "COUNTED" || r.result === "RECOUNTED",
                  });
                  if (input.current) input.current.value = "";
                  setRecount(false);
                  router.refresh();
                }
                requestAnimationFrame(() => input.current?.focus());
              });
            }}
          >
            <label htmlFor="scan" className="font-black">
              مسح باركود الجهاز
            </label>
            <div className="mt-3 flex gap-3">
              <input
                id="scan"
                ref={input}
                autoFocus
                autoComplete="off"
                maxLength={160}
                dir="ltr"
                placeholder="امسح الباركود ثم Enter"
                readOnly={pending}
                className="min-w-0 flex-1 rounded-xl border bg-white p-3 font-mono text-lg dark:bg-slate-900"
              />
              <button
                disabled={pending}
                className="rounded-xl bg-teal-700 px-6 font-bold text-white disabled:opacity-50"
              >
                {pending ? "جاري التحقق…" : "تسجيل"}
              </button>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={recount}
                onChange={(e) => setRecount(e.target.checked)}
                disabled={pending}
              />
              إعادة مسح جهاز سبق جرده
            </label>
          </form>
          <div
            aria-live="polite"
            role="status"
            className={`mt-3 min-h-6 text-sm font-bold ${notice?.good ? "text-teal-700" : "text-amber-800 dark:text-amber-300"}`}
          >
            {notice?.text}
          </div>
        </section>
      ) : null}
      <section className="overflow-hidden rounded-2xl border bg-white dark:bg-slate-950 dark:border-slate-800">
        <div
          className="flex flex-wrap gap-2 border-b p-3 dark:border-slate-800"
          role="tablist"
          aria-label="تقارير الجرد"
        >
          {Object.entries(tabLabels).map(([key, label]) => (
            <button
              role="tab"
              aria-selected={tab === key}
              key={key}
              className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === key ? "bg-teal-700 text-white" : "bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}
              onClick={() => {
                setTab(key as Tab);
                setPage(0);
              }}
            >
              {open && key === "MISSING" ? "بانتظار المسح" : label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <input
            aria-label="بحث بالأجهزة"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="بحث بالباركود أو الموديل…"
            className="rounded-xl border bg-transparent p-2 text-sm"
          />
          <div className="flex gap-3 text-sm font-bold">
            {!open ? (
              <>
                <Link
                  className="text-teal-700 underline"
                  href={`/stocktakes/${data.id}/print?report=${tab}`}
                  target="_blank"
                >
                  طباعة التقرير
                </Link>
                <a
                  className="text-teal-700 underline"
                  href={`/api/stocktakes/${data.id}/export?report=${tab}`}
                >
                  تصدير Excel
                </a>
              </>
            ) : (
              <span className="text-xs text-slate-400">
                الطباعة والتصدير بعد إغلاق الجلسة
              </span>
            )}
          </div>
        </div>
        <StocktakeTable
          lines={selected.slice(page * 50, (page + 1) * 50)}
          open={open}
        />
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-xs dark:border-slate-800">
          <p>
            {selected.length} جهاز · تكلفة {money(String(totalCost))} · بيع{" "}
            {money(String(totalPrice))} {data.currency}
            <span className="block mt-1 text-slate-500">
              الإجماليات حسب النتائج المعروضة وتستثني الأجهزة التي خرجت.{" "}
              {unresolved
                ? `${unresolved} جهاز دون تكلفة؛ الإجمالي غير مكتمل.`
                : ""}{" "}
              {unsetPrices
                ? `${unsetPrices} جهاز دون سعر بيع؛ إجمالي البيع غير مكتمل.`
                : ""}
            </span>
          </p>
          <div className="flex items-center gap-3">
            <button
              disabled={!page}
              onClick={() => setPage((p) => p - 1)}
              className="disabled:opacity-30"
            >
              السابق
            </button>
            <span>
              {page + 1} / {Math.max(1, Math.ceil(selected.length / 50))}
            </span>
            <button
              disabled={(page + 1) * 50 >= selected.length}
              onClick={() => setPage((p) => p + 1)}
              className="disabled:opacity-30"
            >
              التالي
            </button>
          </div>
        </footer>
      </section>
      {tab === "REVIEW" && data.issues.length ? (
        <section className="rounded-2xl border border-amber-200 p-5">
          <h2 className="font-black">
            باركودات تحتاج مراجعة{" "}
            <span className="text-xs font-normal">(آخر 500 محاولة)</span>
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.issues.map((i) => (
              <li key={i.id} className="flex flex-wrap justify-between gap-3">
                <code dir="ltr">{i.barcode}</code>
                <span>
                  {i.result === "UNKNOWN"
                    ? "جهاز غير معروف"
                    : i.result === "OUT_OF_SCOPE"
                      ? "خارج نطاق الجلسة"
                      : "باركود مكرر في المخزون"}
                </span>
                <time>{new Date(i.createdAt).toLocaleString("ar")}</time>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {open ? (
        <section className="rounded-2xl border p-5 dark:border-slate-800">
          <h2 className="font-black">إغلاق الجلسة</h2>
          <p className="mt-2 text-sm text-slate-500">
            يثبّت النتائج وأسعار الأجهزة لهذه الجلسة. راجع الأجهزة المنتظرة
            والفروقات قبل الإغلاق؛ لن تتغير كميات المخزون تلقائيًا.
          </p>
          {confirm ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm font-bold">
                حفظ التقرير النهائي وإيقاف المسح؟
              </p>
              <button
                disabled={pending}
                className="rounded-xl bg-rose-700 px-4 py-2 font-bold text-white disabled:opacity-50"
                onClick={() =>
                  start(async () => {
                    const r = await stocktakeAction({
                      action: "CLOSE",
                      id: data.id,
                    });
                    if (!r.ok) setNotice({ text: r.error, good: false });
                    else {
                      setConfirm(false);
                      router.refresh();
                    }
                  })
                }
              >
                تأكيد الإغلاق
              </button>
              <button disabled={pending} onClick={() => setConfirm(false)}>
                رجوع للمراجعة
              </button>
            </div>
          ) : (
            <button
              disabled={pending}
              onClick={() => setConfirm(true)}
              className="mt-4 rounded-xl border border-rose-200 px-5 py-2 font-bold text-rose-700"
            >
              إغلاق وحفظ التقرير
            </button>
          )}
        </section>
      ) : null}
    </main>
  );
}

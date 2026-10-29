"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { stocktakeScopes } from "@/lib/stocktake";
import { stocktakeAction } from "./actions";
export function StartStocktake() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <form
      className="rounded-2xl border border-teal-200 bg-teal-50/50 p-5 dark:bg-teal-950/20 dark:border-teal-900"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setError("");
        start(async () => {
          const r = await stocktakeAction({
            action: "START",
            title: String(form.get("title") ?? ""),
            scope: String(form.get("scope") ?? "ALL"),
          });
          if (r.ok && r.id) router.push(`/stocktakes/${r.id}`);
          else if (!r.ok) setError(r.error);
        });
      }}
    >
      <h2 className="mb-4 font-black">جلسة جديدة</h2>
      <div className="flex flex-wrap items-end gap-4">
        <label className="min-w-48 flex-1 text-sm font-bold">
          اسم الجلسة
          <input
            name="title"
            required
            maxLength={120}
            placeholder="مثال: جرد أجهزة نهاية الشهر"
            className="mt-2 block w-full rounded-xl border bg-white p-3 dark:bg-slate-900"
          />
        </label>
        <label className="text-sm font-bold">
          نطاق الأجهزة
          <select
            name="scope"
            className="mt-2 block rounded-xl border bg-white p-3 dark:bg-slate-900"
          >
            {Object.entries(stocktakeScopes).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={pending}
          className="rounded-xl bg-teal-700 px-6 py-3 font-bold text-white disabled:opacity-50"
        >
          {pending ? "جاري التحضير…" : "بدء الجرد"}
        </button>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        يشمل الأجهزة المستقلة ذات الباركود الخاص. يحفظ التكلفة وسعر البيع عند
        إدراج الجهاز في الجلسة.
      </p>
      {error ? (
        <p role="alert" className="mt-3 text-red-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}

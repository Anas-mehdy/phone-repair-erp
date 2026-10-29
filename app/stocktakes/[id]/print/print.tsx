"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { StocktakeView } from "@/lib/services/stocktakeService";
import {
  reportLines,
  reportLabels,
  money,
  sumMoney,
  type StocktakeReport,
} from "@/lib/stocktake-report";
import {
  resultLabels,
  stocktakeScopes,
  type StocktakeResult,
} from "@/lib/stocktake";
export function StocktakePrint({
  data,
  report,
}: {
  data: StocktakeView;
  report: StocktakeReport;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  const lines = reportLines(data, report);
  const present = lines.filter((l) => l.result !== "MOVED");
  const content = (
    <article dir="rtl" className="stocktake-paper">
      <h1>{data.shopNameSnapshot}</h1>
      <h2>
        {reportLabels[report]} · {data.title}
      </h2>
      <p>
        {stocktakeScopes[data.scope]} · بدأ:{" "}
        {new Date(data.startedAt).toLocaleString("ar")} · أغلق:{" "}
        {new Date(data.closedAt!).toLocaleString("ar")} · العملة:{" "}
        {data.currency}
      </p>
      <table>
        <thead>
          <tr>
            {[
              "الباركود",
              "الجهاز / الموديل",
              "الحالة",
              "التكلفة",
              "البيع",
              "النتيجة",
              "ملاحظات",
            ].map((t) => (
              <th key={t}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id}>
              <td dir="ltr" style={{ fontFamily: "monospace" }}>
                {l.countedBarcode || l.barcodeSnapshot}
              </td>
              <td>{l.modelSnapshot || l.nameSnapshot}</td>
              <td>
                {stocktakeScopes[
                  l.conditionSnapshot as keyof typeof stocktakeScopes
                ] || "غير محدد"}
              </td>
              <td>{money(l.unitCostSnapshot)}</td>
              <td>{money(l.unitPriceSnapshot)}</td>
              <td>{resultLabels[l.result as StocktakeResult]}</td>
              <td>{l.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!lines.length ? <p>لا توجد أجهزة ضمن التقرير.</p> : null}
      <p>
        عدد الأجهزة: {lines.length} · إجمالي التكلفة:{" "}
        {money(sumMoney(present.map((l) => l.unitCostSnapshot)))} · إجمالي
        البيع: {money(sumMoney(present.map((l) => l.unitPriceSnapshot)))}
      </p>
      <p>
        الإجماليات تستثني الأجهزة التي خرجت. أجهزة دون تكلفة:{" "}
        {present.filter((l) => l.unitCostSnapshot === null).length} · دون سعر
        بيع: {present.filter((l) => l.unitPriceSnapshot === null).length}. القيم
        غير المسجلة غير مشمولة في الإجماليات.
      </p>
      {(report === "REVIEW" || report === "ALL") && data.issues.length ? (
        <>
          <h3>باركودات تحتاج مراجعة (آخر 500 محاولة)</h3>
          <table>
            <thead>
              <tr>
                <th>الباركود</th>
                <th>الملاحظة</th>
                <th>الوقت</th>
              </tr>
            </thead>
            <tbody>
              {data.issues.map((i) => (
                <tr key={i.id}>
                  <td dir="ltr">{i.barcode}</td>
                  <td>
                    {i.result === "UNKNOWN"
                      ? "غير معروف"
                      : i.result === "OUT_OF_SCOPE"
                        ? "خارج النطاق"
                        : "باركود ملتبس"}
                  </td>
                  <td>{new Date(i.createdAt).toLocaleString("ar")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
      <p>هذا التقرير يوثّق الجرد فقط ولا يغيّر رصيد المخزون.</p>
    </article>
  );
  return (
    <>
      <style>{`@page { size: A4 landscape; margin: 12mm; } .stocktake-paper { background:white;color:#0f172a;padding:24px;font-size:12px; } .stocktake-paper h1 {font-size:22px;font-weight:800;margin-bottom:6px;} .stocktake-paper h2{font-size:17px;font-weight:700;margin-bottom:12px;} .stocktake-paper p{margin:10px 0;} .stocktake-paper table{width:100%;border-collapse:collapse;text-align:right;} .stocktake-paper td,.stocktake-paper th{border:1px solid #cbd5e1;padding:7px;overflow-wrap:anywhere;} .stocktake-paper th{background:#f1f5f9;} .stocktake-print-only{display:none;} @media print {body > *:not(.stocktake-print-only){display:none!important;} .stocktake-print-only{display:block!important;} .stocktake-paper{padding:0;} .stocktake-paper thead{display:table-header-group;} .stocktake-paper tr{break-inside:avoid;} }`}</style>
      <div className="mx-auto max-w-7xl p-4">
        <button
          className="mb-4 rounded-xl bg-teal-700 px-5 py-3 font-bold text-white"
          onClick={() => window.print()}
        >
          طباعة / حفظ PDF
        </button>
        {content}
      </div>
      {ready
        ? createPortal(
            <div className="stocktake-print-only">{content}</div>,
            document.body,
          )
        : null}
    </>
  );
}

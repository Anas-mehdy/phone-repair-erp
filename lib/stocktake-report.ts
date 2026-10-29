import type { StocktakeView } from "./services/stocktakeService";
import {
  resultLabels,
  spreadsheetXml,
  stocktakeScopes,
  type StocktakeResult,
} from "./stocktake";
export type StocktakeReport = "COUNTED" | "MISSING" | "REVIEW" | "ALL";
export const reportLabels: Record<StocktakeReport, string> = {
  COUNTED: "الأجهزة التي تم جردها",
  MISSING: "الأجهزة غير الموجودة فعليًا",
  REVIEW: "مراجعة الفروقات",
  ALL: "كل الأجهزة",
};
export function parseStocktakeReport(
  value: string | null | undefined,
): StocktakeReport {
  if (value && Object.hasOwn(reportLabels, value))
    return value as StocktakeReport;
  return "ALL";
}
export function reportLines(data: StocktakeView, tab: StocktakeReport) {
  return data.lines.filter(
    (l) =>
      tab === "ALL" ||
      (tab === "COUNTED"
        ? Boolean(l.countedAt)
        : tab === "MISSING"
          ? l.result === "MISSING"
          : l.result === "REVIEW"),
  );
}
// Aggregate six-decimal purchase costs without binary floating-point rounding.
export function sumMoney(values: (string | null)[]): string {
  const scale = BigInt(1000000);
  const total = values.reduce((sum, value) => {
    if (value === null) return sum;
    const negative = value.startsWith("-");
    const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
    const amount =
      BigInt(whole || "0") * scale +
      BigInt(fraction.padEnd(6, "0").slice(0, 6));
    return sum + (negative ? -amount : amount);
  }, BigInt(0));
  const abs = total < BigInt(0) ? -total : total;
  return `${total < BigInt(0) ? "-" : ""}${abs / scale}.${String(abs % scale).padStart(6, "0")}`;
}
export function money(value: string | null) {
  if (value === null) return "غير مسجل";
  const [whole, fraction = ""] = value.split(".");
  const decimals = fraction.slice(0, 6).replace(/0+$/, "");
  return (
    BigInt(whole || "0").toLocaleString("en-US") +
    (decimals ? `.${decimals}` : "")
  );
}
export function exportStocktake(data: StocktakeView, report: StocktakeReport) {
  const lines = reportLines(data, report);
  const present = lines.filter((l) => l.result !== "MOVED");
  const totals = present.reduce(
    (s, l) => ({
      missingCost: s.missingCost + Number(l.unitCostSnapshot === null),
      missingPrice: s.missingPrice + Number(l.unitPriceSnapshot === null),
    }),
    { missingCost: 0, missingPrice: 0 },
  );
  const rows: (string | number | null)[][] = [
    [data.shopNameSnapshot, data.title],
    [reportLabels[report], stocktakeScopes[data.scope]],
    ["تاريخ البدء", data.startedAt],
    ["تاريخ الإغلاق", data.closedAt],
    ["العملة", data.currency],
    [
      "الباركود",
      "الجهاز",
      "الموديل",
      "الحالة",
      "تكلفة الشراء",
      "سعر البيع",
      "تم مسحه",
      "كمية الإغلاق",
      "النتيجة",
      "ملاحظات",
    ],
    ...lines.map((l) => [
      l.countedBarcode || l.barcodeSnapshot,
      l.nameSnapshot,
      l.modelSnapshot,
      stocktakeScopes[l.conditionSnapshot as keyof typeof stocktakeScopes] ||
        "غير محدد",
      l.unitCostSnapshot === null ? "غير مسجل" : Number(l.unitCostSnapshot),
      l.unitPriceSnapshot === null ? "غير مسجل" : Number(l.unitPriceSnapshot),
      l.countedAt,
      l.closingQuantity,
      resultLabels[l.result as StocktakeResult],
      l.reason,
    ]),
    ["عدد الأجهزة", lines.length],
    [
      "إجمالي التكلفة (باستثناء الأجهزة التي خرجت)",
      sumMoney(present.map((l) => l.unitCostSnapshot)),
    ],
    [
      "إجمالي البيع (باستثناء الأجهزة التي خرجت)",
      sumMoney(present.map((l) => l.unitPriceSnapshot)),
    ],
    ["أجهزة دون تكلفة مسجلة", totals.missingCost],
    ["أجهزة دون سعر بيع مسجل", totals.missingPrice],
  ];
  if (report === "REVIEW" || report === "ALL") {
    rows.push(
      ["محاولات المسح التي تحتاج مراجعة (آخر 500)"],
      ["الباركود", "النتيجة", "وقت المسح"],
    );
    rows.push(
      ...data.issues.map((i) => [
        i.barcode,
        i.result === "UNKNOWN"
          ? "غير معروف"
          : i.result === "OUT_OF_SCOPE"
            ? "خارج النطاق"
            : "باركود ملتبس",
        i.createdAt,
      ]),
    );
  }
  return spreadsheetXml(rows);
}

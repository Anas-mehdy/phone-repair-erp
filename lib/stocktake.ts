export const stocktakeScopes = {
  ALL: "كل الأجهزة",
  NEW: "جديد",
  USED: "مستعمل",
  REFURBISHED: "مجدد",
} as const;
export type StocktakeScope = keyof typeof stocktakeScopes;
export type StocktakeResult = "COUNTED" | "MISSING" | "MOVED" | "REVIEW";
export const resultLabels: Record<StocktakeResult, string> = {
  COUNTED: "تم جرده",
  MISSING: "غير موجود فعليًا",
  MOVED: "خرج من المخزون",
  REVIEW: "يحتاج مراجعة",
};
export type ReconciliationInput = {
  counted: boolean;
  quantitySnapshot: number;
  versionSnapshot: number;
  countedVersion: number | null;
  countedBarcode: string | null;
  current: {
    quantity: number;
    version: number;
    barcode: string | null;
    valid: boolean;
  } | null;
  movementChanges: number[];
};
export function reconcileStocktake(input: ReconciliationInput): {
  result: StocktakeResult;
  observedQuantity: number | null;
  reason: string;
} {
  const { current } = input;
  const observedQuantity = input.counted
    ? 1 + input.movementChanges.reduce((sum, n) => sum + n, 0)
    : null;
  if (!current?.valid)
    return {
      result: "REVIEW",
      observedQuantity,
      reason: "حُذف الجهاز أو تغيّر تصنيفه؛ راجع السجل.",
    };
  if (input.counted) {
    if (
      observedQuantity !== current.quantity ||
      (observedQuantity !== 0 && observedQuantity !== 1)
    )
      return {
        result: "REVIEW",
        observedQuantity,
        reason:
          "العدد الفعلي بعد الحركات لا يطابق المخزون؛ أعد المسح وراجع الحركات.",
      };
    if (
      current.barcode !== input.countedBarcode ||
      (current.version !== input.countedVersion &&
        !input.movementChanges.length)
    )
      return {
        result: "REVIEW",
        observedQuantity,
        reason: "تغيّرت بيانات الجهاز بعد مسحه؛ أعد المسح.",
      };
    return {
      result: current.quantity === 1 ? "COUNTED" : "MOVED",
      observedQuantity,
      reason:
        current.quantity === 1
          ? "تم التحقق بالباركود."
          : "تم مسحه ثم خرج بحركة مخزون مسجّلة.",
    };
  }
  if (current.quantity === 0)
    return {
      result: "MOVED",
      observedQuantity,
      reason: "خرج من المخزون أثناء الجرد؛ لا يُحسب نقصًا.",
    };
  if (!input.quantitySnapshot || current.version !== input.versionSnapshot)
    return {
      result: "REVIEW",
      observedQuantity,
      reason: "أُضيف الجهاز أو تحرّك أثناء الجرد؛ يلزم مسحه.",
    };
  return {
    result: "MISSING",
    observedQuantity,
    reason: "مسجّل بالمخزون ولم يتم مسحه.",
  };
}
export function xmlEscape(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
export function spreadsheetXml(rows: (string | number | null)[][]) {
  return (
    '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="الجرد"><Table>' +
    rows
      .map(
        (row) =>
          "<Row>" +
          row
            .map(
              (value) =>
                '<Cell><Data ss:Type="' +
                (typeof value === "number" ? "Number" : "String") +
                '">' +
                xmlEscape(String(value ?? "")) +
                "</Data></Cell>",
            )
            .join("") +
          "</Row>",
      )
      .join("") +
    '</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><DisplayRightToLeft/></WorksheetOptions></Worksheet></Workbook>'
  );
}

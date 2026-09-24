import { parseFlexibleNumber, type ImportedPurchaseRowDraft } from "./purchase-import";

export const PURCHASE_TEMPLATE_HEADERS = ["اسم الصنف", "الباركود أو SKU", "التصنيف", "الكمية", "تكلفة الوحدة", "سعر البيع"];
export const PURCHASE_TEMPLATE_SHEET = "البنود";
export const PURCHASE_EXCEL_MAX_ROWS = 300;
export type TemplatePurchaseRow = ImportedPurchaseRowDraft & { category?: string };

/** Fixed template: typed Excel numbers retain their meaning, identifiers stay text. */
export function parsePurchaseTemplate(rows: unknown[][]): TemplatePurchaseRow[] {
  if (!rows.length || PURCHASE_TEMPLATE_HEADERS.some((header, i) => String(rows[0][i] ?? "").trim() !== header) || rows[0].slice(6).some(v => v != null && v !== "")) {
    throw new Error("عناوين الملف لا تطابق قالب مسار. نزّل القالب واحتفظ بعناوين الأعمدة وترتيبها واسم ورقة البنود.");
  }
  const filled = rows.slice(1).map((cells, i) => ({ cells, rowIndex: i + 2 })).filter(({cells}) => cells.some(v => v != null && String(v).trim() !== ""));
  if (filled.length > PURCHASE_EXCEL_MAX_ROWS) throw new Error("الحد 300 صنف في الملف الواحد. قسّم البنود على عدة ملفات؛ لا يوجد حد يومي للاستيراد.");
  if (!filled.length) throw new Error("القالب فارغ. عبّئ ورقة البنود، وليس ورقة التعليمات، ثم ارفعه مجدداً.");
  return filled.map(({cells, rowIndex}) => {
    const text = (i: number) => String(cells[i] ?? "").trim();
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!text(0) && !text(1)) errors.push("اسم الصنف أو الباركود مطلوب.");
    // Excel numeric cells can represent short integer identifiers exactly.
    // Once Excel has removed leading zeros or rounded a long identifier, the
    // original value cannot be reconstructed from the imported number.
    if (typeof cells[1] === "number") {
      const identifier = cells[1];
      if (!Number.isSafeInteger(identifier) || identifier < 0 || String(identifier).length > 15) {
        errors.push("الباركود أو SKU طويل أو غير صالح كرقم في Excel. أعد إدخاله من المصدر كنص للتحقق من جميع أرقامه.");
      } else {
        warnings.push("الباركود محفوظ كرقم في Excel؛ تحقق من عدم وجود أصفار في بدايته الأصلية.");
      }
    }
    if (cells.slice(6).some(v => v != null && v !== "")) errors.push("توجد بيانات خارج أعمدة القالب الستة.");
    const number = (i: number, label: string, required: boolean, integer = false) => {
      const value = cells[i];
      if (typeof value === "number") {
        if (!Number.isFinite(value) || value < 0 || (integer && (!Number.isSafeInteger(value) || value <= 0))) errors.push(`${label}: قيمة غير صالحة.`);
        return String(value);
      }
      const parsed = parseFlexibleNumber(text(i), {required, integer});
      if (parsed.error || (integer && parsed.value !== null && parsed.value <= 0)) errors.push(`${label}: ${parsed.error || "يجب أن تكون أكبر من صفر"}`);
      if (parsed.warning) warnings.push(`${label}: ${parsed.warning}`);
      return parsed.value === null ? text(i) : String(parsed.value);
    };
    const quantity = number(3, "الكمية", true, true);
    const unitCost = number(4, "تكلفة الوحدة", true);
    const salePrice = number(5, "سعر البيع", false);
    return {rowIndex, name: text(0), barcode: text(1), category: text(2), quantity, unitCost, salePrice, sourceText: JSON.stringify(cells), errors, warnings};
  });
}

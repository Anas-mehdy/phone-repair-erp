export type SourceDebtType = "SALE" | "SOFTWARE_SERVICE";

const SOURCE_DEBT_PREFIX = "SOURCE-DEBT";

export type SourceDebtReference = {
  sourceType: SourceDebtType;
  sourceId: string;
  displayReference: string | null;
};

export function buildSourceDebtReference(
  sourceType: SourceDebtType,
  sourceId: string,
  displayReference?: string | null,
) {
  const label = displayReference?.trim();
  return `[${SOURCE_DEBT_PREFIX}:${sourceType}:${sourceId}]${label ? ` ${label}` : ""}`;
}

export function parseSourceDebtReference(reference?: string | null): SourceDebtReference | null {
  if (!reference) return null;
  const match = /^\[SOURCE-DEBT:(SALE|SOFTWARE_SERVICE):([0-9a-f-]+)\]\s*(.*)$/i.exec(reference.trim());
  if (!match) return null;
  return {
    sourceType: match[1].toUpperCase() as SourceDebtType,
    sourceId: match[2],
    displayReference: match[3]?.trim() || null,
  };
}

export function sourceDebtHref(source: SourceDebtReference) {
  if (source.sourceType === "SALE") return `/sales/${source.sourceId}`;
  return `/software-services/${source.sourceId}`;
}

export function sourceDebtLinkLabel(source: SourceDebtReference) {
  return source.sourceType === "SALE" ? "فتح المبيعة" : "فتح خدمة السوفتوير";
}

export function sourceDebtKindLabel(source: SourceDebtReference) {
  return source.sourceType === "SALE" ? "دين مبيعة" : "دين خدمة سوفتوير";
}

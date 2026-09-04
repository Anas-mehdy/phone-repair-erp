export type SourceDebtType = "SALE" | "SOFTWARE_SERVICE" | "ELECTRONIC_SERVICE";

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
  const match = /^\[SOURCE-DEBT:(SALE|SOFTWARE_SERVICE|ELECTRONIC_SERVICE):([0-9a-f-]+)\]\s*(.*)$/i.exec(reference.trim());
  if (!match) return null;
  return {
    sourceType: match[1].toUpperCase() as SourceDebtType,
    sourceId: match[2],
    displayReference: match[3]?.trim() || null,
  };
}

export function sourceDebtHref(source: SourceDebtReference) {
  if (source.sourceType === "SALE") return `/sales/${source.sourceId}`;
  if (source.sourceType === "SOFTWARE_SERVICE") return `/software-services/${source.sourceId}`;
  return `/electronic-services/new?transaction=${source.sourceId}`;
}

export function sourceDebtLinkLabel(source: SourceDebtReference) {
  if (source.sourceType === "SALE") return "فتح المبيعة";
  if (source.sourceType === "SOFTWARE_SERVICE") return "فتح خدمة السوفتوير";
  return "فتح الخدمة الإلكترونية";
}

export function sourceDebtKindLabel(source: SourceDebtReference) {
  if (source.sourceType === "SALE") return "دين مبيعة";
  if (source.sourceType === "SOFTWARE_SERVICE") return "دين خدمة سوفتوير";
  return "دين خدمة إلكترونية";
}

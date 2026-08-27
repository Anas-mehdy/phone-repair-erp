/**
 * Normalization Engine for Search & Identification
 * 
 * CORE ARCHITECTURAL INVARIANT:
 * NORMALIZATION = SEARCH / IDENTIFICATION AID
 * NORMALIZATION ≠ COMPATIBILITY VERIFICATION
 * 
 * Normalization must never create, imply, or assume compatibility.
 */

/**
 * Standard deterministic normalization for search strings.
 * Lowercases and strips whitespace and punctuation (dashes, slashes, dots, underscores, pluses).
 */
export function normalizeSearchString(text?: string | null): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Normalizes model numbers, handling regional / dual-SIM slash variations safely.
 * e.g., "SM-A125F/DS" -> "sma125f" and "sma125fds"
 */
export function normalizeModelNumber(modelNumber?: string | null): {
  normalized: string;
  baseNormalized: string;
} {
  if (!modelNumber) return { normalized: "", baseNormalized: "" };
  
  const raw = modelNumber.trim().toLowerCase();
  const normalized = normalizeSearchString(raw);
  
  // Strip common dual-SIM suffixes like /DS, /DSN, /SS without altering distinct model digits
  const baseRaw = raw.replace(/\/(ds|dsn|ss|duos)$/i, "");
  const baseNormalized = normalizeSearchString(baseRaw);

  return {
    normalized,
    baseNormalized: baseNormalized || normalized,
  };
}

/**
 * Normalizes part and IC codes.
 * e.g., "EB-BA125ABY" -> "ebba125aby", "PM6150-002" -> "pm6150002"
 */
export function normalizePartCode(partCode?: string | null): string {
  return normalizeSearchString(partCode);
}

/**
 * Tokenizes multi-word search queries into clean normalized search tokens.
 */
export function tokenizeQuery(query: string): string[] {
  if (!query) return [];
  return query
    .toLowerCase()
    .split(/[\s,-_/]+/)
    .map((t) => t.replace(/[^a-z0-9]/g, "").trim())
    .filter((t) => t.length > 0);
}

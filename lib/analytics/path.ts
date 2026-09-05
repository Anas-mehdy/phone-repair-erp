const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TICKET_SEGMENT = /^(?:RO|SALE|INV)-[A-Z0-9-]+$/i;

const PUBLIC_TOKEN_PREFIXES = new Set(["track", "installment-track", "partner-invite"]);
const KNOWN_DYNAMIC_PREFIXES = new Set([
  "repair-orders",
  "sales",
  "inventory",
  "customers",
  "invoices",
  "debts",
  "suppliers",
  "electronic-services",
  "software-services",
]);

export function sanitizeAnalyticsPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "/";

  const first = segments[0];
  if (first === "register" && segments[1] === "partner" && segments.length > 2) {
    return `/register/partner/:token${segments.length > 3 ? `/${segments.slice(3).join("/")}` : ""}`;
  }
  if (PUBLIC_TOKEN_PREFIXES.has(first) && segments.length > 1) {
    return `/${first}/:token${segments.length > 2 ? `/${segments.slice(2).join("/")}` : ""}`;
  }

  const sanitized = segments.map((segment, index) => {
    if (UUID_SEGMENT.test(segment) || TICKET_SEGMENT.test(segment)) return ":id";
    if (index === 1 && KNOWN_DYNAMIC_PREFIXES.has(first) && segment !== "new") {
      // Keep known static child routes, anonymize identifiers/slugs that are not recognized.
      const staticChildren = new Set(["new", "templates", "reconcile", "reports", "print", "edit"]);
      if (!staticChildren.has(segment)) return ":id";
    }
    return segment;
  });

  return `/${sanitized.join("/")}`;
}

const FALLBACK_APP_URL = "https://massarerp.com";

export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL?.trim() || FALLBACK_APP_URL
).replace(/\/+$/, "");

export function buildAppUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${APP_URL}${normalizedPath}`;
}

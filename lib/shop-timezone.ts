import { prisma } from "@/lib/prisma";

export const COUNTRY_TIME_ZONES: Record<string, string> = {
  SA: "Asia/Riyadh", EG: "Africa/Cairo", AE: "Asia/Dubai", KW: "Asia/Kuwait", QA: "Asia/Qatar",
  BH: "Asia/Bahrain", OM: "Asia/Muscat", JO: "Asia/Amman", IQ: "Asia/Baghdad", SY: "Asia/Damascus",
  PS: "Asia/Hebron", YE: "Asia/Aden", LB: "Asia/Beirut", LY: "Africa/Tripoli", TN: "Africa/Tunis",
  DZ: "Africa/Algiers", MA: "Africa/Casablanca", SD: "Africa/Khartoum", MR: "Africa/Nouakchott",
  SO: "Africa/Mogadishu", DJ: "Africa/Djibouti", KM: "Indian/Comoro", TR: "Europe/Istanbul", US: "America/New_York",
};

export function timeZoneForCountry(countryCode?: string | null) {
  const code = countryCode?.trim().toUpperCase();
  return code ? COUNTRY_TIME_ZONES[code] || "UTC" : "UTC";
}

export async function getShopTimeZone(shopId: string) {
  const shop = await prisma.shop.findFirst({
    where: { id: shopId, deletedAt: null },
    select: { countryCode: true },
  });
  return timeZoneForCountry(shop?.countryCode);
}

export function formatDateTimeInTimeZone(value: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat("ar", {
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).format(new Date(value));
}

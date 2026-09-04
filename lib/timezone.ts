export const COUNTRY_TIME_ZONES: Record<string, string> = {
  SA: "Asia/Riyadh",
  EG: "Africa/Cairo",
  AE: "Asia/Dubai",
  KW: "Asia/Kuwait",
  QA: "Asia/Qatar",
  BH: "Asia/Bahrain",
  OM: "Asia/Muscat",
  JO: "Asia/Amman",
  IQ: "Asia/Baghdad",
  SY: "Asia/Damascus",
  PS: "Asia/Hebron",
  YE: "Asia/Aden",
  LB: "Asia/Beirut",
  LY: "Africa/Tripoli",
  TN: "Africa/Tunis",
  DZ: "Africa/Algiers",
  MA: "Africa/Casablanca",
  SD: "Africa/Khartoum",
  MR: "Africa/Nouakchott",
  SO: "Africa/Mogadishu",
  DJ: "Africa/Djibouti",
  KM: "Indian/Comoro",
  TR: "Europe/Istanbul",
  US: "America/New_York",
};

export type LocalDateParts = {
  year: number;
  month: number;
  day: number;
};

export function timeZoneForCountry(countryCode?: string | null) {
  const code = countryCode?.trim().toUpperCase();
  return code ? COUNTRY_TIME_ZONES[code] || "UTC" : "UTC";
}

function numericParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function localDateParts(value: Date | string, timeZone: string): LocalDateParts {
  const date = new Date(value);
  const parts = numericParts(date, timeZone);
  return { year: parts.year, month: parts.month, day: parts.day };
}

export function localDateString(value: Date | string, timeZone: string) {
  const { year, month, day } = localDateParts(value, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function timeZoneOffsetMs(value: Date, timeZone: string) {
  const parts = numericParts(value, timeZone);
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  const wholeSecondTimestamp = Math.floor(value.getTime() / 1000) * 1000;
  return representedAsUtc - wholeSecondTimestamp;
}

export function zonedDateTimeToUtc(
  parts: LocalDateParts & { hour?: number; minute?: number; second?: number },
  timeZone: string,
) {
  const targetAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
  );
  let guess = targetAsUtc;

  for (let index = 0; index < 4; index += 1) {
    const offset = timeZoneOffsetMs(new Date(guess), timeZone);
    const next = targetAsUtc - offset;
    if (Math.abs(next - guess) < 1000) {
      guess = next;
      break;
    }
    guess = next;
  }

  return new Date(guess);
}

function addCalendarDays(parts: LocalDateParts, days: number): LocalDateParts {
  const value = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
  };
}

export function dayUtcBoundsForTimeZone(reference: Date | string, timeZone: string) {
  const local = localDateParts(reference, timeZone);
  return {
    start: zonedDateTimeToUtc(local, timeZone),
    end: zonedDateTimeToUtc(addCalendarDays(local, 1), timeZone),
  };
}

export function monthUtcBoundsForTimeZone(reference: Date | string, timeZone: string) {
  const local = localDateParts(reference, timeZone);
  const startParts = { year: local.year, month: local.month, day: 1 };
  const nextMonthDate = new Date(Date.UTC(local.year, local.month, 1));
  const endParts = {
    year: nextMonthDate.getUTCFullYear(),
    month: nextMonthDate.getUTCMonth() + 1,
    day: 1,
  };
  return {
    start: zonedDateTimeToUtc(startParts, timeZone),
    end: zonedDateTimeToUtc(endParts, timeZone),
  };
}

export function yearUtcBoundsForTimeZone(reference: Date | string, timeZone: string) {
  const local = localDateParts(reference, timeZone);
  return {
    start: zonedDateTimeToUtc({ year: local.year, month: 1, day: 1 }, timeZone),
    end: zonedDateTimeToUtc({ year: local.year + 1, month: 1, day: 1 }, timeZone),
  };
}

export function dateInputValueForTimeZone(value: Date | string, timeZone: string) {
  return localDateString(value, timeZone);
}

function parseDateInput(value: string): LocalDateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const check = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (
    check.getUTCFullYear() !== parts.year ||
    check.getUTCMonth() + 1 !== parts.month ||
    check.getUTCDate() !== parts.day
  ) return null;
  return parts;
}

export function dateInputStartUtcForTimeZone(value: string, timeZone: string) {
  const parts = parseDateInput(value);
  return parts ? zonedDateTimeToUtc(parts, timeZone) : undefined;
}

export function dateInputEndUtcForTimeZone(value: string, timeZone: string) {
  const parts = parseDateInput(value);
  return parts ? zonedDateTimeToUtc(addCalendarDays(parts, 1), timeZone) : undefined;
}

export function dateInputUtcBoundsForTimeZone(from: string, to: string, timeZone: string) {
  const start = dateInputStartUtcForTimeZone(from, timeZone);
  const end = dateInputEndUtcForTimeZone(to, timeZone);
  return start && end && start < end ? { start, end } : null;
}

export function isWithinUtcBounds(value: Date | string, bounds: { start: Date; end: Date }) {
  const timestamp = new Date(value).getTime();
  return timestamp >= bounds.start.getTime() && timestamp < bounds.end.getTime();
}

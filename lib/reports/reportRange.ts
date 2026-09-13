import {
  dateInputEndUtcForTimeZone,
  dateInputStartUtcForTimeZone,
  dateInputValueForTimeZone,
  dayUtcBoundsForTimeZone,
  localDateParts,
  monthUtcBoundsForTimeZone,
  yearUtcBoundsForTimeZone,
  zonedDateTimeToUtc,
} from "@/lib/timezone";

export type ReportSearchParams = {
  preset?: string;
  start?: string;
  end?: string;
};

export type ResolvedReportRange = {
  preset: "today" | "week" | "month" | "year" | "custom";
  start: Date;
  end: Date;
  label: string;
};

function localDayShift(reference: Date, days: number, timeZone: string) {
  const local = localDateParts(reference, timeZone);
  const shifted = new Date(Date.UTC(local.year, local.month - 1, local.day + days));
  return zonedDateTimeToUtc({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  }, timeZone);
}

export function resolveReportRange(params: ReportSearchParams, timeZone: string): ResolvedReportRange {
  const now = new Date();
  const today = dayUtcBoundsForTimeZone(now, timeZone);
  const preset = ["today", "week", "month", "year", "custom"].includes(params.preset ?? "")
    ? params.preset as ResolvedReportRange["preset"]
    : "today";

  if (preset === "today") return { preset, start: today.start, end: today.end, label: "اليوم" };
  if (preset === "week") return { preset, start: localDayShift(now, -6, timeZone), end: today.end, label: "آخر 7 أيام" };
  if (preset === "month") {
    const month = monthUtcBoundsForTimeZone(now, timeZone);
    return { preset, start: month.start, end: today.end, label: "هذا الشهر" };
  }
  if (preset === "year") {
    const year = yearUtcBoundsForTimeZone(now, timeZone);
    return { preset, start: year.start, end: today.end, label: "هذه السنة" };
  }
  if (preset === "custom" && params.start && params.end) {
    const start = dateInputStartUtcForTimeZone(params.start, timeZone);
    const end = dateInputEndUtcForTimeZone(params.end, timeZone);
    if (start && end && start < end) return { preset, start, end, label: "فترة مخصصة" };
  }

  return { preset: "today", start: today.start, end: today.end, label: "اليوم" };
}

export function reportRangeQuery(params: ReportSearchParams, range: ResolvedReportRange) {
  const search = new URLSearchParams({ preset: range.preset });
  if (range.preset === "custom" && params.start && params.end) {
    search.set("start", params.start);
    search.set("end", params.end);
  }
  return search.toString();
}

export function reportRangeInputs(range: ResolvedReportRange, timeZone: string) {
  const lastInstant = new Date(range.end.getTime() - 1);
  return {
    lastInstant,
    startInput: dateInputValueForTimeZone(range.start, timeZone),
    endInput: dateInputValueForTimeZone(lastInstant, timeZone),
  };
}

export function reportSearchParamsFromUrl(searchParams: URLSearchParams): ReportSearchParams {
  return {
    preset: searchParams.get("preset") ?? undefined,
    start: searchParams.get("start") ?? undefined,
    end: searchParams.get("end") ?? undefined,
  };
}

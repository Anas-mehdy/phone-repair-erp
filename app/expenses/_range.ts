import {
  dateInputEndUtcForTimeZone,
  dateInputStartUtcForTimeZone,
  dayUtcBoundsForTimeZone,
  localDateParts,
  monthUtcBoundsForTimeZone,
  yearUtcBoundsForTimeZone,
  zonedDateTimeToUtc,
} from "@/lib/timezone";

export type ExpenseSearchParams = {
  preset?: string;
  start?: string;
  end?: string;
  expenseSaved?: string;
  expenseDeleted?: string;
  expense?: string;
};

export type ExpenseRange = {
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

export function resolveExpenseRange(params: ExpenseSearchParams, timeZone: string): ExpenseRange {
  const now = new Date();
  const today = dayUtcBoundsForTimeZone(now, timeZone);
  const preset = ["today", "week", "month", "year", "custom"].includes(params.preset ?? "")
    ? params.preset as ExpenseRange["preset"]
    : "month";

  if (preset === "today") return { preset, start: today.start, end: today.end, label: "اليوم" };
  if (preset === "week") return { preset, start: localDayShift(now, -6, timeZone), end: today.end, label: "آخر 7 أيام" };
  if (preset === "year") {
    const year = yearUtcBoundsForTimeZone(now, timeZone);
    return { preset, start: year.start, end: today.end, label: "هذه السنة" };
  }
  if (preset === "custom" && params.start && params.end) {
    const start = dateInputStartUtcForTimeZone(params.start, timeZone);
    const end = dateInputEndUtcForTimeZone(params.end, timeZone);
    if (start && end && start < end) return { preset, start, end, label: "فترة مخصصة" };
  }

  const month = monthUtcBoundsForTimeZone(now, timeZone);
  return { preset: "month", start: month.start, end: today.end, label: "هذا الشهر" };
}

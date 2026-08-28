import assert from "node:assert/strict";
import { InstallmentFrequency } from "@prisma/client";
import { buildInstallmentSchedule } from "../lib/services/installmentService";

const first = new Date("2026-01-31T12:00:00.000Z");
const monthly = buildInstallmentSchedule(100_000, 3, first, InstallmentFrequency.MONTHLY);
assert.deepEqual(monthly.map((item) => item.amount.toString()), ["333.33", "333.33", "333.34"]);
assert.deepEqual(monthly.map((item) => item.dueAt.toISOString().slice(0, 10)), ["2026-01-31", "2026-02-28", "2026-03-31"]);
assert.equal(monthly.reduce((sum, item) => sum + Number(item.amount), 0), 1000);

const weekly = buildInstallmentSchedule(10_000, 4, new Date("2026-08-01T12:00:00.000Z"), InstallmentFrequency.WEEKLY);
assert.deepEqual(weekly.map((item) => item.dueAt.toISOString().slice(0, 10)), ["2026-08-01", "2026-08-08", "2026-08-15", "2026-08-22"]);
assert.deepEqual(weekly.map((item) => item.amount.toString()), ["25", "25", "25", "25"]);

assert.throws(() => buildInstallmentSchedule(50, 100, first, InstallmentFrequency.MONTHLY));
assert.throws(() => buildInstallmentSchedule(1000, 0, first, InstallmentFrequency.MONTHLY));

console.log("Installment schedule calculations passed.");

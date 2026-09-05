import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ONBOARDING_VALUE_COPY_EXPERIMENT, type OnboardingValueCopyVariant } from "@/lib/experiments/catalog";
import { growthExperimentService } from "@/lib/services/growthExperimentService";
import { buildGrowthShopProgress } from "@/lib/growth/dashboard";
import { timeZoneForCountry } from "@/lib/timezone";

const MIN_DIRECTIONAL_SAMPLE = 20;

type ExposureRow = {
  shopId: string;
  variant: string;
  firstExposedAt: Date;
  countryCode: string;
  onboardingCompletedAt: Date | null;
  skippedAt: Date | null;
  paidAt: Date | null;
};

type ActivityRow = { shopId: string; occurredAt: Date };

function rate(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[middle]!;
}

async function loadExposureRows(experimentKey: string) {
  return prisma.$queryRaw<ExposureRow[]>(Prisma.sql`
    SELECT a."shopId", a."variant", a."firstExposedAt", s."countryCode",
      p."completedAt" AS "onboardingCompletedAt", p."skippedAt",
      CASE WHEN sub."activatedAt" >= a."firstExposedAt" THEN sub."activatedAt" ELSE NULL END AS "paidAt"
    FROM "GrowthExperimentAssignment" a
    JOIN "Shop" s ON s."id" = a."shopId" AND s."deletedAt" IS NULL
    LEFT JOIN "ShopOnboardingProfile" p ON p."shopId" = a."shopId"
    LEFT JOIN "Subscription" sub ON sub."shopId" = a."shopId"
    WHERE a."experimentKey" = ${experimentKey}
      AND a."firstExposedAt" IS NOT NULL
    ORDER BY a."firstExposedAt" ASC
  `);
}

async function loadActivity(experimentKey: string) {
  return prisma.$queryRaw<ActivityRow[]>(Prisma.sql`
    WITH cohort AS (
      SELECT a."shopId", p."completedAt", p."selectedJobs"
      FROM "GrowthExperimentAssignment" a
      JOIN "ShopOnboardingProfile" p ON p."shopId" = a."shopId"
      JOIN "Shop" s ON s."id" = a."shopId" AND s."deletedAt" IS NULL
      WHERE a."experimentKey" = ${experimentKey}
        AND a."firstExposedAt" IS NOT NULL
        AND p."completedAt" IS NOT NULL AND p."skippedAt" IS NULL
    ), activity AS (
      SELECT r."shopId", r."createdAt" AS "occurredAt"
      FROM "RepairOrder" r JOIN cohort c ON c."shopId" = r."shopId"
      WHERE r."deletedAt" IS NULL AND r."createdAt" >= c."completedAt" AND 'REPAIRS' = ANY(c."selectedJobs")
      UNION ALL
      SELECT s."shopId", s."createdAt"
      FROM "Sale" s JOIN cohort c ON c."shopId" = s."shopId"
      WHERE s."deletedAt" IS NULL AND s."status" = 'COMPLETED' AND s."createdAt" >= c."completedAt" AND 'SALES' = ANY(c."selectedJobs")
      UNION ALL
      SELECT i."shopId", i."createdAt"
      FROM "InventoryItem" i JOIN cohort c ON c."shopId" = i."shopId"
      WHERE i."deletedAt" IS NULL AND i."createdAt" >= c."completedAt" AND 'INVENTORY' = ANY(c."selectedJobs")
      UNION ALL
      SELECT f."shopId", f."createdAt"
      FROM "FinancialTransfer" f JOIN cohort c ON c."shopId" = f."shopId"
      WHERE f."deletedAt" IS NULL AND f."status" = 'ACTIVE' AND f."createdAt" >= c."completedAt" AND 'WALLETS' = ANY(c."selectedJobs")
      UNION ALL
      SELECT d."shopId", d."createdAt"
      FROM "DebtLedgerEntry" d JOIN cohort c ON c."shopId" = d."shopId"
      WHERE d."isReversed" = FALSE AND d."type" IN ('DEBT', 'OPENING_BALANCE', 'PAYMENT') AND d."createdAt" >= c."completedAt" AND 'DEBTS' = ANY(c."selectedJobs")
      UNION ALL
      SELECT e."shopId", e."createdAt"
      FROM "ElectronicServiceTransaction" e JOIN cohort c ON c."shopId" = e."shopId"
      WHERE e."status" = 'ACTIVE' AND e."createdAt" >= c."completedAt" AND 'ELECTRONIC_SERVICES' = ANY(c."selectedJobs")
    )
    SELECT "shopId", "occurredAt" FROM activity ORDER BY "occurredAt" ASC
  `);
}

export async function getGrowthExperimentsDashboard() {
  const config = ONBOARDING_VALUE_COPY_EXPERIMENT;
  const [rows, activity] = await Promise.all([loadExposureRows(config.key), loadActivity(config.key)]);
  const activityByShop = new Map<string, Date[]>();
  for (const item of activity) {
    const list = activityByShop.get(item.shopId) ?? [];
    list.push(item.occurredAt);
    activityByShop.set(item.shopId, list);
  }

  const runtime = growthExperimentService.getRuntimeState().onboardingValueCopy;
  const variantRows = config.variants.map((definition) => {
    const exposed = rows.filter((row) => row.variant === definition.key);
    const progress = exposed.map((row) => buildGrowthShopProgress({
      shopId: row.shopId,
      signupAt: row.firstExposedAt,
      onboardingCompletedAt: row.skippedAt ? null : row.onboardingCompletedAt,
      primaryJob: null,
      timeZone: timeZoneForCountry(row.countryCode),
      activityAt: activityByShop.get(row.shopId) ?? [],
      paidAt: row.paidAt,
    }));
    const onboardingCompleted = progress.filter((row) => row.onboardingCompletedAt).length;
    const firstValue = progress.filter((row) => row.firstValueAt).length;
    const habit = progress.filter((row) => row.habitAt).length;
    const paid = progress.filter((row) => row.paidAt).length;
    const firstValueHours = progress
      .filter((row) => row.firstValueAt)
      .map((row) => (row.firstValueAt!.getTime() - row.signupAt.getTime()) / 3_600_000)
      .filter((value) => value >= 0);
    return {
      variant: definition.key as OnboardingValueCopyVariant,
      label: definition.label,
      exposed: exposed.length,
      onboardingCompleted,
      firstValue,
      habit,
      paid,
      onboardingCompletionRate: rate(onboardingCompleted, exposed.length),
      firstValueRate: rate(firstValue, exposed.length),
      habitRate: rate(habit, exposed.length),
      paidRate: rate(paid, exposed.length),
      medianExposureToFirstValueHours: median(firstValueHours),
    };
  });

  const control = variantRows.find((row) => row.variant === config.controlVariant)!;
  const treatment = variantRows.find((row) => row.variant !== config.controlVariant) ?? null;
  const enoughSample = Boolean(treatment && control.exposed >= MIN_DIRECTIONAL_SAMPLE && treatment.exposed >= MIN_DIRECTIONAL_SAMPLE);
  const firstValueLift = treatment && control.firstValueRate > 0
    ? ((treatment.firstValueRate - control.firstValueRate) / control.firstValueRate) * 100
    : null;

  return {
    experiments: [{
      key: config.key,
      label: config.label,
      hypothesis: config.hypothesis,
      primaryMetric: config.primaryMetric,
      guardrailMetric: config.guardrailMetric,
      enabled: runtime.enabled,
      mode: runtime.mode,
      variants: variantRows,
      minDirectionalSample: MIN_DIRECTIONAL_SAMPLE,
      enoughSample,
      firstValueLift,
    }],
  };
}

export type GrowthExperimentsDashboardData = Awaited<ReturnType<typeof getGrowthExperimentsDashboard>>;
export const growthExperimentDashboardService = { getDashboard: getGrowthExperimentsDashboard };

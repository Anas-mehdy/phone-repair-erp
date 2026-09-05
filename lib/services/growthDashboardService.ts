import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildGrowthCohorts,
  buildGrowthFunnel,
  buildGrowthJobBreakdown,
  buildGrowthShopProgress,
  buildGrowthTimingMetrics,
  biggestActivationDropoff,
  type GrowthDashboardRangeDays,
  type GrowthShopProgress,
} from "@/lib/growth/dashboard";
import {
  CURRENT_ONBOARDING_FLOW_VERSION,
  isOnboardingJob,
  type OnboardingJob,
} from "@/lib/onboarding/jobs";
import { posthogGrowthService } from "@/lib/services/posthogGrowthService";
import { timeZoneForCountry } from "@/lib/timezone";

type CohortRow = {
  shopId: string;
  signupAt: Date;
  countryCode: string;
  primaryJob: string | null;
  completedAt: Date | null;
  skippedAt: Date | null;
  paidAt: Date | null;
};

type ActivityRow = { shopId: string; occurredAt: Date };

function rangeStart(days: GrowthDashboardRangeDays, now: Date) {
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - days);
  return start;
}

async function loadCohort(from: Date, to: Date, primaryJob?: OnboardingJob) {
  const jobFilter = primaryJob ? Prisma.sql`AND p."primaryJob" = ${primaryJob}` : Prisma.sql``;
  return prisma.$queryRaw<CohortRow[]>(Prisma.sql`
    SELECT p."shopId" AS "shopId", s."createdAt" AS "signupAt", s."countryCode",
      p."primaryJob", p."completedAt", p."skippedAt", sub."activatedAt" AS "paidAt"
    FROM "ShopOnboardingProfile" p
    JOIN "Shop" s ON s."id" = p."shopId" AND s."deletedAt" IS NULL
    LEFT JOIN "Subscription" sub ON sub."shopId" = s."id"
    WHERE p."flowVersion" = ${CURRENT_ONBOARDING_FLOW_VERSION}
      AND s."createdAt" >= ${from} AND s."createdAt" < ${to}
      ${jobFilter}
    ORDER BY s."createdAt" ASC
  `);
}

async function loadActivity(from: Date, to: Date, primaryJob?: OnboardingJob) {
  const jobFilter = primaryJob ? Prisma.sql`AND p."primaryJob" = ${primaryJob}` : Prisma.sql``;
  return prisma.$queryRaw<ActivityRow[]>(Prisma.sql`
    WITH cohort AS (
      SELECT p."shopId", p."completedAt", p."selectedJobs"
      FROM "ShopOnboardingProfile" p
      JOIN "Shop" s ON s."id" = p."shopId" AND s."deletedAt" IS NULL
      WHERE p."flowVersion" = ${CURRENT_ONBOARDING_FLOW_VERSION}
        AND p."completedAt" IS NOT NULL AND p."skippedAt" IS NULL
        AND s."createdAt" >= ${from} AND s."createdAt" < ${to}
        ${jobFilter}
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

function buildProgress(cohort: CohortRow[], activity: ActivityRow[]): GrowthShopProgress[] {
  const activityByShop = new Map<string, Date[]>();
  for (const row of activity) {
    const values = activityByShop.get(row.shopId) ?? [];
    values.push(row.occurredAt);
    activityByShop.set(row.shopId, values);
  }
  return cohort.map((row) => buildGrowthShopProgress({
    shopId: row.shopId,
    signupAt: row.signupAt,
    onboardingCompletedAt: row.skippedAt ? null : row.completedAt,
    primaryJob: row.primaryJob && isOnboardingJob(row.primaryJob) ? row.primaryJob : null,
    timeZone: timeZoneForCountry(row.countryCode),
    activityAt: activityByShop.get(row.shopId) ?? [],
    paidAt: row.paidAt,
  }));
}

export async function getGrowthDashboard(input: {
  rangeDays: GrowthDashboardRangeDays;
  primaryJob?: OnboardingJob;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const from = rangeStart(input.rangeDays, now);
  const to = new Date(now.getTime() + 1_000);
  const [cohort, activity] = await Promise.all([
    loadCohort(from, to, input.primaryJob),
    loadActivity(from, to, input.primaryJob),
  ]);
  const progress = buildProgress(cohort, activity);
  const funnel = buildGrowthFunnel(progress);
  const telemetry = await posthogGrowthService.getTelemetry({
    shopIds: progress.map((shop) => shop.shopId),
    from,
    to: now,
  });
  const jobs = buildGrowthJobBreakdown(progress);
  const weakestJob = jobs
    .filter((row) => row.signups >= 3)
    .sort((a, b) => a.habitRate - b.habitRate || b.signups - a.signups)[0] ?? null;

  return {
    generatedAt: now,
    rangeDays: input.rangeDays,
    from,
    to: now,
    primaryJob: input.primaryJob ?? null,
    funnel,
    timing: buildGrowthTimingMetrics(progress),
    jobs,
    cohorts: buildGrowthCohorts(progress, input.rangeDays),
    biggestDropoff: biggestActivationDropoff(funnel),
    weakestJob,
    telemetry,
  };
}

export type GrowthDashboardData = Awaited<ReturnType<typeof getGrowthDashboard>>;

export const growthDashboardService = { getDashboard: getGrowthDashboard };

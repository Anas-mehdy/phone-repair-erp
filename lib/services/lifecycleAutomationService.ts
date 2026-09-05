import "server-only";

import {
  MembershipRole,
  MembershipStatus,
  Prisma,
  SubscriptionStatus,
  UserRole,
} from "@prisma/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { captureShopOwnerEvent } from "@/lib/analytics/server";
import { lifecycleEmailDeliveryEnabled, sendLifecycleEmail } from "@/lib/lifecycle/email";
import {
  decideLifecycleMessage,
  type LifecycleDecision,
  type LifecycleJobActivity,
  type LifecycleMessageKind,
} from "@/lib/lifecycle/rules";
import {
  CURRENT_ONBOARDING_FLOW_VERSION,
  isOnboardingJob,
  normalizeOnboardingJobs,
  type OnboardingJob,
} from "@/lib/onboarding/jobs";
import { prisma } from "@/lib/prisma";
import { timeZoneForCountry } from "@/lib/timezone";

const MAX_ATTEMPTS = 3;
const RETRY_AFTER_HOURS = 6;
const PROCESSING_STALE_MINUTES = 20;

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

type CandidateRow = {
  shopId: string;
  shopName: string;
  countryCode: string;
  flowVersion: number;
  primaryJob: string | null;
  selectedJobs: string[];
  onboardingStartedAt: Date | null;
  onboardingCompletedAt: Date | null;
  onboardingSkippedAt: Date | null;
  subscriptionStatus: string;
  trialStartedAt: Date;
  trialEndsAt: Date;
};

type ActivityRow = {
  job: string;
  count: bigint | number | string;
  firstAt: Date | null;
  lastAt: Date | null;
  activeDays: string[] | null;
};

type Owner = {
  id: string;
  email: string;
  name: string;
  lastActiveAt: Date | null;
};

type ReservationRow = { id: string; attemptCount: number };

type RunSummary = {
  enabled: boolean;
  scanned: number;
  eligible: number;
  sent: number;
  failed: number;
  skippedOptOut: number;
  skippedDuplicateOrCooldown: number;
  byKind: Partial<Record<LifecycleMessageKind, number>>;
};

function numberValue(value: bigint | number | string | null | undefined) {
  if (typeof value === "bigint") return Number(value);
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeFailureCode(error: unknown) {
  const text = error instanceof Error ? error.message : "UNKNOWN";
  if (text.startsWith("Resend rejected lifecycle email")) return "RESEND_REJECTED";
  if (text.includes("RESEND_API_KEY")) return "RESEND_NOT_CONFIGURED";
  if (text.includes("UNSUBSCRIBE_SECRET")) return "UNSUBSCRIBE_SECRET_NOT_CONFIGURED";
  if (text.includes("disabled")) return "DELIVERY_DISABLED";
  return "SEND_FAILED";
}

async function listCandidates(limit: number, now: Date): Promise<CandidateRow[]> {
  return prisma.$queryRaw<CandidateRow[]>`
    SELECT
      s."id" AS "shopId",
      s."name" AS "shopName",
      s."countryCode" AS "countryCode",
      p."flowVersion" AS "flowVersion",
      p."primaryJob" AS "primaryJob",
      p."selectedJobs" AS "selectedJobs",
      p."startedAt" AS "onboardingStartedAt",
      p."completedAt" AS "onboardingCompletedAt",
      p."skippedAt" AS "onboardingSkippedAt",
      sub."status"::text AS "subscriptionStatus",
      sub."trialStartedAt" AS "trialStartedAt",
      sub."trialEndsAt" AS "trialEndsAt"
    FROM "Shop" s
    JOIN "ShopOnboardingProfile" p ON p."shopId" = s."id"
    JOIN "Subscription" sub ON sub."shopId" = s."id"
    WHERE s."deletedAt" IS NULL
      AND p."flowVersion" = ${CURRENT_ONBOARDING_FLOW_VERSION}
      AND p."startedAt" IS NOT NULL
      AND p."skippedAt" IS NULL
      AND sub."status" = ${SubscriptionStatus.TRIALING}::"SubscriptionStatus"
      AND sub."trialEndsAt" > ${now}
    ORDER BY sub."trialEndsAt" ASC, p."startedAt" ASC
    LIMIT ${Math.max(1, Math.min(limit, 250))}
  `;
}

async function resolveOwner(shopId: string): Promise<Owner | null> {
  const membership = await prisma.membership.findFirst({
    where: {
      shopId,
      role: MembershipRole.OWNER,
      status: MembershipStatus.ACTIVE,
      deletedAt: null,
      user: { is: { deletedAt: null } },
    },
    select: {
      user: { select: { id: true, email: true, name: true, lastActiveAt: true } },
    },
  });
  if (membership?.user?.email) return membership.user;

  const legacy = await prisma.user.findFirst({
    where: { shopId, role: UserRole.OWNER, deletedAt: null },
    select: { id: true, email: true, name: true, lastActiveAt: true },
  });
  return legacy?.email ? legacy : null;
}

async function loadActivity(shopId: string, startAt: Date, timeZone: string): Promise<LifecycleJobActivity[]> {
  const rows = await prisma.$queryRaw<ActivityRow[]>(Prisma.sql`
    SELECT 'REPAIRS'::text AS "job", COUNT(*)::bigint AS "count", MIN("createdAt") AS "firstAt", MAX("createdAt") AS "lastAt",
      COALESCE(array_agg(DISTINCT ((("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone})::date)::text ORDER BY ((("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone})::date)::text), ARRAY[]::text[]) AS "activeDays"
    FROM "RepairOrder"
    WHERE "shopId" = ${shopId}::uuid AND "deletedAt" IS NULL AND "createdAt" >= ${startAt}

    UNION ALL

    SELECT 'SALES'::text, COUNT(*)::bigint, MIN("createdAt"), MAX("createdAt"),
      COALESCE(array_agg(DISTINCT ((("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone})::date)::text ORDER BY ((("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone})::date)::text), ARRAY[]::text[])
    FROM "Sale"
    WHERE "shopId" = ${shopId}::uuid AND "deletedAt" IS NULL AND "status" = 'COMPLETED' AND "createdAt" >= ${startAt}

    UNION ALL

    SELECT 'INVENTORY'::text, COUNT(*)::bigint, MIN("createdAt"), MAX("createdAt"),
      COALESCE(array_agg(DISTINCT ((("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone})::date)::text ORDER BY ((("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone})::date)::text), ARRAY[]::text[])
    FROM "InventoryItem"
    WHERE "shopId" = ${shopId}::uuid AND "deletedAt" IS NULL AND "createdAt" >= ${startAt}

    UNION ALL

    SELECT 'WALLETS'::text, COUNT(*)::bigint, MIN("createdAt"), MAX("createdAt"),
      COALESCE(array_agg(DISTINCT ((("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone})::date)::text ORDER BY ((("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone})::date)::text), ARRAY[]::text[])
    FROM "FinancialTransfer"
    WHERE "shopId" = ${shopId}::uuid AND "deletedAt" IS NULL AND "status" = 'ACTIVE' AND "createdAt" >= ${startAt}

    UNION ALL

    SELECT 'DEBTS'::text, COUNT(*)::bigint, MIN("createdAt"), MAX("createdAt"),
      COALESCE(array_agg(DISTINCT ((("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone})::date)::text ORDER BY ((("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone})::date)::text), ARRAY[]::text[])
    FROM "DebtLedgerEntry"
    WHERE "shopId" = ${shopId}::uuid AND "isReversed" = FALSE
      AND "type" IN ('DEBT', 'OPENING_BALANCE', 'PAYMENT') AND "createdAt" >= ${startAt}

    UNION ALL

    SELECT 'ELECTRONIC_SERVICES'::text, COUNT(*)::bigint, MIN("createdAt"), MAX("createdAt"),
      COALESCE(array_agg(DISTINCT ((("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone})::date)::text ORDER BY ((("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone})::date)::text), ARRAY[]::text[])
    FROM "ElectronicServiceTransaction"
    WHERE "shopId" = ${shopId}::uuid AND "status" = 'ACTIVE' AND "createdAt" >= ${startAt}
  `);

  return rows.flatMap((row) => {
    if (!isOnboardingJob(row.job)) return [];
    return [{
      job: row.job,
      count: numberValue(row.count),
      activeDays: row.activeDays ?? [],
      firstAt: row.firstAt,
      lastAt: row.lastAt,
    }];
  });
}

async function isOptedOut(shopId: string) {
  const rows = await prisma.$queryRaw<Array<{ emailOptOutAt: Date | null }>>`
    SELECT "emailOptOutAt" FROM "GrowthLifecyclePreference"
    WHERE "shopId" = ${shopId}::uuid
    LIMIT 1
  `;
  return Boolean(rows[0]?.emailOptOutAt);
}

async function latestSentAt(shopId: string) {
  const rows = await prisma.$queryRaw<Array<{ sentAt: Date | null }>>`
    SELECT "sentAt" FROM "GrowthLifecycleDelivery"
    WHERE "shopId" = ${shopId}::uuid AND "status" = 'SENT'
    ORDER BY "sentAt" DESC NULLS LAST
    LIMIT 1
  `;
  return rows[0]?.sentAt ?? null;
}

async function reserveDelivery(shopId: string, decision: LifecycleDecision, now: Date) {
  const failedRetryBefore = new Date(now.getTime() - RETRY_AFTER_HOURS * HOUR_MS);
  const staleProcessingBefore = new Date(now.getTime() - PROCESSING_STALE_MINUTES * MINUTE_MS);
  const rows = await prisma.$queryRaw<ReservationRow[]>`
    INSERT INTO "GrowthLifecycleDelivery" (
      "shopId", "flowVersion", "kind", "triggerKey", "status", "attemptCount", "lastAttemptAt", "createdAt", "updatedAt"
    ) VALUES (
      ${shopId}::uuid, ${CURRENT_ONBOARDING_FLOW_VERSION}, ${decision.kind}, ${decision.triggerKey},
      'PROCESSING', 1, ${now}, ${now}, ${now}
    )
    ON CONFLICT ("shopId", "kind", "triggerKey") DO UPDATE
    SET "status" = 'PROCESSING',
        "attemptCount" = "GrowthLifecycleDelivery"."attemptCount" + 1,
        "lastAttemptAt" = ${now},
        "failureCode" = NULL,
        "updatedAt" = ${now}
    WHERE "GrowthLifecycleDelivery"."status" <> 'SENT'
      AND "GrowthLifecycleDelivery"."attemptCount" < ${MAX_ATTEMPTS}
      AND (
        ("GrowthLifecycleDelivery"."status" = 'FAILED' AND ("GrowthLifecycleDelivery"."lastAttemptAt" IS NULL OR "GrowthLifecycleDelivery"."lastAttemptAt" <= ${failedRetryBefore}))
        OR
        ("GrowthLifecycleDelivery"."status" = 'PROCESSING' AND ("GrowthLifecycleDelivery"."lastAttemptAt" IS NULL OR "GrowthLifecycleDelivery"."lastAttemptAt" <= ${staleProcessingBefore}))
      )
    RETURNING "id", "attemptCount"
  `;
  return rows[0] ?? null;
}

async function markSent(deliveryId: string, providerMessageId: string | null, now: Date) {
  await prisma.$executeRaw`
    UPDATE "GrowthLifecycleDelivery"
    SET "status" = 'SENT', "sentAt" = ${now}, "providerMessageId" = ${providerMessageId},
        "failureCode" = NULL, "updatedAt" = ${now}
    WHERE "id" = ${deliveryId}::uuid
  `;
}

async function markFailed(deliveryId: string, failureCode: string, now: Date) {
  await prisma.$executeRaw`
    UPDATE "GrowthLifecycleDelivery"
    SET "status" = 'FAILED', "failureCode" = ${failureCode}, "updatedAt" = ${now}
    WHERE "id" = ${deliveryId}::uuid
  `;
}

export async function unsubscribeLifecycleEmailForShop(shopId: string, now = new Date()) {
  await prisma.$executeRaw`
    INSERT INTO "GrowthLifecyclePreference" ("shopId", "emailOptOutAt", "createdAt", "updatedAt")
    VALUES (${shopId}::uuid, ${now}, ${now}, ${now})
    ON CONFLICT ("shopId") DO UPDATE
    SET "emailOptOutAt" = ${now}, "updatedAt" = ${now}
  `;

  await captureShopOwnerEvent({
    event: ANALYTICS_EVENTS.LIFECYCLE_EMAIL_UNSUBSCRIBED,
    shopId,
    properties: { channel: "email" },
  });
}

export async function runLifecycleAutomation(input: { now?: Date; limit?: number } = {}): Promise<RunSummary> {
  if (!lifecycleEmailDeliveryEnabled()) {
    return {
      enabled: false,
      scanned: 0,
      eligible: 0,
      sent: 0,
      failed: 0,
      skippedOptOut: 0,
      skippedDuplicateOrCooldown: 0,
      byKind: {},
    };
  }

  const now = input.now ?? new Date();
  const limit = Math.max(1, Math.min(input.limit ?? 50, 250));
  const candidates = await listCandidates(limit, now);
  const summary: RunSummary = {
    enabled: true,
    scanned: candidates.length,
    eligible: 0,
    sent: 0,
    failed: 0,
    skippedOptOut: 0,
    skippedDuplicateOrCooldown: 0,
    byKind: {},
  };

  for (const candidate of candidates) {
    if (await isOptedOut(candidate.shopId)) {
      summary.skippedOptOut += 1;
      continue;
    }

    const selectedJobs = normalizeOnboardingJobs(candidate.selectedJobs);
    const primaryJob: OnboardingJob | null = candidate.primaryJob && isOnboardingJob(candidate.primaryJob)
      ? candidate.primaryJob
      : null;
    const activityStartAt = candidate.onboardingCompletedAt ?? candidate.onboardingStartedAt ?? candidate.trialStartedAt;
    const timeZone = timeZoneForCountry(candidate.countryCode);

    const [owner, activity, lastLifecycleEmailSentAt] = await Promise.all([
      resolveOwner(candidate.shopId),
      loadActivity(candidate.shopId, activityStartAt, timeZone),
      latestSentAt(candidate.shopId),
    ]);
    if (!owner) continue;

    const decision = decideLifecycleMessage({
      flowVersion: candidate.flowVersion,
      now,
      timeZone,
      trialStartedAt: candidate.trialStartedAt,
      trialEndsAt: candidate.trialEndsAt,
      subscriptionStatus: candidate.subscriptionStatus,
      onboardingStartedAt: candidate.onboardingStartedAt,
      onboardingCompletedAt: candidate.onboardingCompletedAt,
      onboardingSkippedAt: candidate.onboardingSkippedAt,
      primaryJob,
      selectedJobs,
      jobActivity: activity,
      ownerLastActiveAt: owner.lastActiveAt,
      lastLifecycleEmailSentAt,
    });
    if (!decision) {
      summary.skippedDuplicateOrCooldown += 1;
      continue;
    }

    summary.eligible += 1;
    const reservation = await reserveDelivery(candidate.shopId, decision, now);
    if (!reservation) {
      summary.skippedDuplicateOrCooldown += 1;
      continue;
    }

    try {
      const sent = await sendLifecycleEmail({
        shopId: candidate.shopId,
        email: owner.email,
        ownerName: owner.name,
        shopName: candidate.shopName,
        decision,
      });
      await markSent(reservation.id, sent.providerMessageId, now);
      summary.sent += 1;
      summary.byKind[decision.kind] = (summary.byKind[decision.kind] ?? 0) + 1;
      await captureShopOwnerEvent({
        event: ANALYTICS_EVENTS.LIFECYCLE_EMAIL_SENT,
        shopId: candidate.shopId,
        countryCode: candidate.countryCode,
        properties: {
          lifecycle_kind: decision.kind,
          flow_version: candidate.flowVersion,
          attempt: reservation.attemptCount,
        },
      });
    } catch (error) {
      const failureCode = safeFailureCode(error);
      await markFailed(reservation.id, failureCode, now);
      summary.failed += 1;
      await captureShopOwnerEvent({
        event: ANALYTICS_EVENTS.LIFECYCLE_EMAIL_FAILED,
        shopId: candidate.shopId,
        countryCode: candidate.countryCode,
        properties: {
          lifecycle_kind: decision.kind,
          flow_version: candidate.flowVersion,
          attempt: reservation.attemptCount,
          failure_code: failureCode,
        },
      });
    }
  }

  return summary;
}

export const lifecycleAutomationService = {
  runLifecycleAutomation,
  unsubscribeLifecycleEmailForShop,
};

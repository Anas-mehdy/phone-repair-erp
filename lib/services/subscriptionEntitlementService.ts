/**
 * subscriptionEntitlementService.ts
 *
 * Central Entitlement Service — the ONLY source of truth for subscription
 * and usage gate-keeping across Massar ERP.
 *
 * ═══════════════════════════════════════════════════════
 * SECURITY CONTRACT (non-negotiable):
 *
 *  1. shopId MUST be sourced from getAuthContext().shop.id — never from
 *     browser-supplied body/query parameters.
 *  2. plan, status, and all timestamps are read from the database only.
 *  3. No client-supplied values are ever trusted for authorization decisions.
 *  4. Every database query is scoped by shopId.
 *  5. Prisma server-side only — no Supabase client-side access for these tables.
 *
 * SUBSCRIPTION MUTATIONS:
 *  Any write to the Subscription table (plan, status, dates, billing) is a
 *  Super Admin operation and MUST be guarded by requireSuperAdmin() server-side.
 *  The "subscription:manage" AppPermission is intentionally read-only:
 *  it controls only whether a shop OWNER can VIEW /subscription.
 *  It must never be used to gate an actual mutation.
 *  See: lib/adminAuth.ts → requireSuperAdmin()
 *
 * EFFECTIVE STATE:
 *  The stored `status` field is a hint, not ground truth. Effective status is
 *  computed by comparing timestamps against wall-clock time so that:
 *  - A TRIALING record whose trialEndsAt has passed is treated as EXPIRED.
 *  - An ACTIVE record whose currentPeriodEndsAt has passed is treated as EXPIRED.
 *  - A GRACE_PERIOD record with null/past gracePeriodEndsAt is treated as EXPIRED.
 *
 * MISSING SUBSCRIPTION:
 *  If a shop has no Subscription record (should not happen after backfill but
 *  possible in tests or edge cases), the service fails CLOSED — new operations
 *  are denied, but no exception is thrown. Existing data reads are unaffected.
 * ═══════════════════════════════════════════════════════
 */

import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// PUBLIC TYPES
// ---------------------------------------------------------------------------

/**
 * All error/deny codes emitted by this service.
 * UI MUST use these codes, not parse the message strings.
 */
export type EntitlementDenyCode =
  | "SUBSCRIPTION_EXPIRED"
  | "REPAIR_LIMIT_REACHED"
  | "EMPLOYEE_LIMIT_REACHED"
  | "COMPATIBILITY_SEARCH_LIMIT_REACHED";

/** Effective subscription lifecycle state computed from wall-clock time. */
export type EffectiveStatus =
  | "TRIALING"      // trial active:      trialEndsAt > now
  | "ACTIVE"        // paid period active: currentPeriodEndsAt > now
  | "GRACE_PERIOD"  // grace window:       gracePeriodEndsAt > now
  | "EXPIRED"       // all windows elapsed — fail-closed
  | "CANCELED";     // manually canceled — fail-closed

/** Plan entitlements that actually apply at this moment. */
export type EffectivePlan = "TRIAL_AS_PROFESSIONAL" | "BASIC" | "PROFESSIONAL";

/** Computed subscription snapshot — immutable value object. */
export type SubscriptionSnapshot = {
  shopId: string;
  storedPlan: SubscriptionPlan;
  effectivePlan: EffectivePlan;
  effectiveStatus: EffectiveStatus;
  computedAt: Date;
  trialStartedAt: Date;
  trialEndsAt: Date;
  currentPeriodStartedAt: Date | null;
  currentPeriodEndsAt: Date | null;
  gracePeriodEndsAt: Date | null;
};

/** Per-plan usage limits. null = unlimited. */
export type PlanLimits = {
  /** Max RepairOrders creatable in the current UTC calendar month. null = unlimited. */
  monthlyRepairOrders: number | null;
  /** Max total active Membership seats. null = unlimited. */
  totalSeats: number | null;
  /** Max Compatibility searches per UTC calendar day. null = unlimited. */
  dailyCompatibilitySearches: number | null;
};

/** Live usage figures, scoped to the relevant windows. */
export type UsageSnapshot = {
  repairOrdersThisMonth: number;
  activeSeats: number;
  compatibilitySearchesToday: number;
};

/** Full entitlement picture. */
export type EntitlementContext = {
  subscription: SubscriptionSnapshot;
  limits: PlanLimits;
  usage: UsageSnapshot;
  isOperationallyActive: boolean;
  canCreateRepairOrder: boolean;
  canAddEmployee: boolean;
  canPerformCompatibilitySearch: boolean;
};

/** Typed allow/deny result. Use code for control flow, message for the user. */
export type EntitlementResult =
  | { allowed: true }
  | {
      allowed: false;
      code: EntitlementDenyCode;
      message: string;
      upgradeUrl: string;
    };

/**
 * Callback type for withRepairOrderLimitGuard.
 * Receives the Prisma transaction client so the INSERT happens inside the
 * same atomic boundary as the COUNT.
 */
export type RepairOrderCreateCallback<T> = (
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
) => Promise<T>;

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

const UPGRADE_URL = "/subscription";
const REPAIR_ORDER_MONTHLY_LIMIT = 100;

export const PLAN_LIMITS: Record<EffectivePlan, PlanLimits> = {
  TRIAL_AS_PROFESSIONAL: {
    monthlyRepairOrders: null,
    totalSeats: null,
    dailyCompatibilitySearches: null,
  },
  PROFESSIONAL: {
    monthlyRepairOrders: null,
    totalSeats: null,
    dailyCompatibilitySearches: null,
  },
  BASIC: {
    monthlyRepairOrders: REPAIR_ORDER_MONTHLY_LIMIT,
    totalSeats: 1,
    dailyCompatibilitySearches: 10,
  },
};

// ---------------------------------------------------------------------------
// UTC DATE HELPERS
// ---------------------------------------------------------------------------

/**
 * Returns a Date object representing the start of the UTC calendar day.
 * This is the canonical helper for all daily-bucket calculations.
 * Uses UTC methods exclusively — never relies on server local timezone.
 *
 * Example: toUtcDateOnly(new Date("2026-08-29T23:59:59+03:00"))
 *          → Date("2026-08-29T00:00:00.000Z")
 */
export function toUtcDateOnly(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

/** Returns the UTC start-of-month Date for monthly RepairOrder counting. */
function utcStartOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

// ---------------------------------------------------------------------------
// EFFECTIVE STATE COMPUTATION
// ---------------------------------------------------------------------------

/**
 * Derives the real subscription state from timestamps, ignoring stored status
 * when timestamps tell a different story.
 *
 * ACTIVE edge cases:
 *   - currentPeriodEndsAt null   → EXPIRED (no paid period established)
 *   - currentPeriodEndsAt <= now → EXPIRED (paid period lapsed)
 *
 * GRACE_PERIOD edge cases:
 *   - gracePeriodEndsAt null   → EXPIRED (grace never set)
 *   - gracePeriodEndsAt <= now → EXPIRED (grace lapsed)
 *
 * MISSING SUBSCRIPTION (sub = null):
 *   Handled by callers — returns fail-closed snapshot without throwing.
 */
export function computeEffectiveStatus(
  storedStatus: SubscriptionStatus,
  trialEndsAt: Date,
  currentPeriodStartedAt: Date | null,
  currentPeriodEndsAt: Date | null,
  gracePeriodEndsAt: Date | null,
  now: Date
): EffectiveStatus {
  switch (storedStatus) {
    case SubscriptionStatus.TRIALING:
      return trialEndsAt.getTime() > now.getTime() ? "TRIALING" : "EXPIRED";

    case SubscriptionStatus.ACTIVE:
      // If the subscription period has not started yet (future start date), it is not active
      if (currentPeriodStartedAt && currentPeriodStartedAt.getTime() > now.getTime()) {
        return "EXPIRED";
      }
      if (!currentPeriodEndsAt) return "EXPIRED";
      return currentPeriodEndsAt.getTime() > now.getTime() ? "ACTIVE" : "EXPIRED";

    case SubscriptionStatus.GRACE_PERIOD:
      if (!gracePeriodEndsAt) return "EXPIRED";
      return gracePeriodEndsAt.getTime() > now.getTime() ? "GRACE_PERIOD" : "EXPIRED";

    case SubscriptionStatus.CANCELED:
      return "CANCELED";

    case SubscriptionStatus.EXPIRED:
    default:
      return "EXPIRED";
  }
}

/**
 * Maps effective status + stored plan to the plan that governs limits now.
 * TRIAL always grants PROFESSIONAL entitlements regardless of storedPlan.
 * EXPIRED/CANCELED returns the stored plan for display; isOperationallyActive
 * will be false so the limits are never enforced against new operations.
 */
export function computeEffectivePlan(
  effectiveStatus: EffectiveStatus,
  storedPlan: SubscriptionPlan
): EffectivePlan {
  if (effectiveStatus === "TRIALING") return "TRIAL_AS_PROFESSIONAL";
  if (effectiveStatus === "ACTIVE" || effectiveStatus === "GRACE_PERIOD") {
    return storedPlan === SubscriptionPlan.BASIC ? "BASIC" : "PROFESSIONAL";
  }
  // EXPIRED / CANCELED — return stored plan for display; operations blocked by
  // isOperationallyActive = false, not by limit comparisons.
  return storedPlan === SubscriptionPlan.BASIC ? "BASIC" : "PROFESSIONAL";
}

// ---------------------------------------------------------------------------
// SNAPSHOT BUILDER
// ---------------------------------------------------------------------------

/**
 * Loads and computes the subscription snapshot for a shop.
 * Fails closed (EXPIRED) rather than throwing when subscription is missing.
 *
 * @param shopId - MUST come from verified Auth Context.
 * @param now    - Injected for testability.
 */
async function getSubscriptionSnapshot(
  shopId: string,
  now: Date
): Promise<SubscriptionSnapshot> {
  const sub = await prisma.subscription.findUnique({
    where: { shopId },
    select: {
      plan: true,
      status: true,
      trialStartedAt: true,
      trialEndsAt: true,
      currentPeriodStartedAt: true,
      currentPeriodEndsAt: true,
      gracePeriodEndsAt: true,
    },
  });

  if (!sub) {
    // MISSING SUBSCRIPTION: fail-closed. New operations denied; reads unaffected.
    // Log for operational awareness (not an exception — avoids breaking read paths).
    console.warn(`[EntitlementService] No Subscription record found for shopId=${shopId}. Failing closed.`);
    return {
      shopId,
      storedPlan: SubscriptionPlan.PROFESSIONAL,
      effectivePlan: "PROFESSIONAL",
      effectiveStatus: "EXPIRED",
      computedAt: now,
      trialStartedAt: now,
      trialEndsAt: now,
      currentPeriodStartedAt: null,
      currentPeriodEndsAt: null,
      gracePeriodEndsAt: null,
    };
  }

  const effectiveStatus = computeEffectiveStatus(
    sub.status,
    sub.trialEndsAt,
    sub.currentPeriodStartedAt ?? null,
    sub.currentPeriodEndsAt ?? null,
    sub.gracePeriodEndsAt ?? null,
    now
  );
  const effectivePlan = computeEffectivePlan(effectiveStatus, sub.plan);

  return {
    shopId,
    storedPlan: sub.plan,
    effectivePlan,
    effectiveStatus,
    computedAt: now,
    trialStartedAt: sub.trialStartedAt,
    trialEndsAt: sub.trialEndsAt,
    currentPeriodStartedAt: sub.currentPeriodStartedAt ?? null,
    currentPeriodEndsAt: sub.currentPeriodEndsAt ?? null,
    gracePeriodEndsAt: sub.gracePeriodEndsAt ?? null,
  };
}

// ---------------------------------------------------------------------------
// USAGE COUNTER READERS (read-only, for context/UI)
// ---------------------------------------------------------------------------

async function countMonthlyRepairOrders(shopId: string, now: Date): Promise<number> {
  return prisma.repairOrder.count({
    where: {
      shopId,
      createdAt: { gte: utcStartOfMonth(now) },
      deletedAt: null,
    },
  });
}

async function countActiveSeats(shopId: string): Promise<number> {
  return prisma.membership.count({
    where: { shopId, status: "ACTIVE", deletedAt: null },
  });
}

async function readCompatibilitySearchesToday(shopId: string, now: Date): Promise<number> {
  const today = toUtcDateOnly(now);
  const row = await prisma.compatibilitySearchUsage.findUnique({
    where: { shopId_usageDate: { shopId, usageDate: today } },
    select: { searchCount: true },
  });
  return row?.searchCount ?? 0;
}

// ---------------------------------------------------------------------------
// ATOMIC COMPATIBILITY SEARCH INCREMENT — UNLIMITED PLANS
// ---------------------------------------------------------------------------

/**
 * Atomically records a compatibility search for TRIAL/PROFESSIONAL plans.
 * Does NOT enforce any limit.
 *
 * ATOMICITY: PostgreSQL INSERT ... ON CONFLICT DO UPDATE is a single
 * server-side statement. Two concurrent requests produce two serialized
 * increments — no lost updates, no phantom rows.
 *
 * @param shopId - MUST come from Auth Context.
 * @param now    - Injected for testability.
 */
export async function incrementCompatibilitySearch(
  shopId: string,
  now: Date = new Date()
): Promise<number> {
  const today = toUtcDateOnly(now);
  const result = await prisma.$queryRaw<Array<{ searchCount: number }>>`
    INSERT INTO "CompatibilitySearchUsage"
      ("id", "shopId", "usageDate", "searchCount", "createdAt", "updatedAt")
    VALUES
      (gen_random_uuid(), ${shopId}::uuid, ${today}::date, 1, NOW(), NOW())
    ON CONFLICT ("shopId", "usageDate")
    DO UPDATE SET
      "searchCount" = "CompatibilitySearchUsage"."searchCount" + 1,
      "updatedAt"   = NOW()
    RETURNING "searchCount"
  `;
  return result[0]?.searchCount ?? 1;
}

// ---------------------------------------------------------------------------
// ATOMIC COMPATIBILITY SEARCH INCREMENT — BASIC PLAN (ENFORCED)
// ---------------------------------------------------------------------------

/**
 * Atomically increments the daily compatibility search counter for BASIC plan,
 * enforcing the per-day limit in a SINGLE PostgreSQL statement.
 *
 * ── CONCURRENCY STRATEGY ──────────────────────────────────────────────────
 * A single INSERT ... ON CONFLICT DO UPDATE ... WHERE count < limit statement
 * is used. This is fully atomic at the PostgreSQL row level:
 *
 *   INSERT INTO "CompatibilitySearchUsage" ... searchCount = 1
 *   ON CONFLICT ("shopId", "usageDate")
 *   DO UPDATE SET
 *     searchCount = searchCount + 1
 *   WHERE "CompatibilitySearchUsage".searchCount < $limit
 *   RETURNING searchCount
 *
 * Behaviour:
 *   - Row does not exist → INSERT with count=1 (always succeeds if count=1 <= limit).
 *   - Row exists, count < limit  → UPDATE increments, RETURNING returns new count.
 *   - Row exists, count >= limit → WHERE rejects the update, RETURNING returns nothing.
 *
 * Two concurrent requests at count=9 (limit=10):
 *   PostgreSQL serializes the two row-level updates. One gets count=10 (success),
 *   the other also gets count= but wait — they both target the same row.
 *   PostgreSQL's row-level locking ensures only one UPDATE fires at a time.
 *   Result: one succeeds (count → 10), other fails the WHERE (count is already 10).
 *
 * Why NOT two-step (INSERT to ensure row, then conditional UPDATE)?
 *   The two-step approach from the previous version had a window between the
 *   INSERT-DO-NOTHING and the UPDATE where a second concurrent request could
 *   also pass the INSERT-DO-NOTHING and then both attempt the UPDATE. While
 *   PostgreSQL row locking still prevents double-counting, the single-statement
 *   approach eliminates that window entirely and is cleaner.
 *
 * NOTE: The INSERT path (first search of the day) always starts at 1.
 *   If limit=1, a first-time INSERT would set count=1 which satisfies
 *   count < limit only if limit > 1. The RETURNING check handles this.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * @param shopId - MUST come from Auth Context.
 * @param limit  - Daily limit (from PLAN_LIMITS.dailyCompatibilitySearches).
 * @param now    - Injected for testability.
 * @returns      - New count on success, null if limit already reached.
 */
export async function incrementCompatibilitySearchEnforced(
  shopId: string,
  limit: number,
  now: Date = new Date()
): Promise<number | null> {
  const today = toUtcDateOnly(now);

  const result = await prisma.$queryRaw<Array<{ searchCount: number }>>`
    INSERT INTO "CompatibilitySearchUsage"
      ("id", "shopId", "usageDate", "searchCount", "createdAt", "updatedAt")
    VALUES
      (gen_random_uuid(), ${shopId}::uuid, ${today}::date, 1, NOW(), NOW())
    ON CONFLICT ("shopId", "usageDate")
    DO UPDATE SET
      "searchCount" = "CompatibilitySearchUsage"."searchCount" + 1,
      "updatedAt"   = NOW()
    WHERE "CompatibilitySearchUsage"."searchCount" < ${limit}
    RETURNING "searchCount"
  `;

  // No rows returned → either limit reached (existing row not updated)
  // or INSERT count=1 > limit (limit < 1, which should never happen in practice).
  if (result.length === 0) return null;
  return result[0].searchCount;
}

// ---------------------------------------------------------------------------
// REPAIR ORDER CONCURRENT LIMIT — ATOMIC WRAPPER
// ---------------------------------------------------------------------------

/**
 * withRepairOrderLimitGuard
 *
 * Executes a RepairOrder creation callback inside a SERIALIZABLE transaction
 * that first verifies the monthly BASIC plan limit is not exceeded.
 *
 * ── CONCURRENCY STRATEGY ──────────────────────────────────────────────────
 * The CHECK (COUNT) and the INSERT (callback) happen inside THE SAME
 * SERIALIZABLE transaction. This is the critical difference from a naive
 * check-then-insert pattern:
 *
 *   Naive (UNSAFE):
 *     tx1: COUNT = 99 → allowed
 *     tx2: COUNT = 99 → allowed
 *     tx1: INSERT → count = 100  ✓
 *     tx2: INSERT → count = 101  ✗ OVERFLOW
 *
 *   This function (SAFE):
 *     tx1: [SERIALIZABLE] COUNT = 99 → INSERT → COMMIT → count = 100  ✓
 *     tx2: [SERIALIZABLE] COUNT = 100 → ABORT (serialization failure) → retry
 *          on retry: COUNT = 100 → DENIED ✓
 *
 * SERIALIZABLE isolation in PostgreSQL prevents tx2 from seeing count=99 once
 * tx1 has committed its INSERT, because the COUNT predicate on (shopId, month)
 * overlaps with the INSERT. PostgreSQL detects this as a write-write conflict
 * and aborts one transaction with error code 40001.
 *
 * The caller's CREATE callback must use the `tx` TransactionClient, not the
 * global `prisma` client, to stay inside the atomic boundary.
 *
 * Retry policy: up to `maxRetries` attempts with exponential backoff (10ms base).
 * If all attempts fail with serialization errors, the last error is re-thrown.
 *
 * NOTE: This function is NOT yet wired to the production RepairOrder creation
 * path. It is provided as a correct primitive for the next enforcement phase.
 * Concurrency enforcement at exactly count=99+2 simultaneous creates cannot be
 * fully integration-tested without connecting to the production create path —
 * that test is explicitly deferred to the Enforcement phase.
 *
 * @param shopId     - MUST come from Auth Context.
 * @param now        - Injected for testability.
 * @param callback   - Receives TransactionClient; MUST use it for the INSERT.
 * @param maxRetries - Max serialization failure retries (default 3).
 */
export async function withRepairOrderLimitGuard<T>(
  shopId: string,
  callback: RepairOrderCreateCallback<T>,
  now: Date = new Date(),
  maxRetries = 3
): Promise<{ result: T } | { denied: true; code: EntitlementDenyCode; message: string; upgradeUrl: string }> {
  const monthStart = utcStartOfMonth(now);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const outcome = await prisma.$transaction(
        async (tx) => {
          // ── STEP 1: Check entitlement subscription snapshot ──────────────
          // Re-read subscription inside the transaction for consistency.
          const sub = await tx.subscription.findUnique({
            where: { shopId },
            select: {
              plan: true,
              status: true,
              trialStartedAt: true,
              trialEndsAt: true,
              currentPeriodStartedAt: true,
              currentPeriodEndsAt: true,
              gracePeriodEndsAt: true,
            },
          });

          if (!sub) {
            return {
              denied: true,
              code: "SUBSCRIPTION_EXPIRED" as EntitlementDenyCode,
              message: "لم يتم العثور على اشتراك لهذا المتجر.",
              upgradeUrl: UPGRADE_URL,
            } as const;
          }

          const effectiveStatus = computeEffectiveStatus(
            sub.status,
            sub.trialEndsAt,
            sub.currentPeriodStartedAt ?? null,
            sub.currentPeriodEndsAt ?? null,
            sub.gracePeriodEndsAt ?? null,
            now
          );
          const isOperationallyActive =
            effectiveStatus === "TRIALING" ||
            effectiveStatus === "ACTIVE" ||
            effectiveStatus === "GRACE_PERIOD";

          if (!isOperationallyActive) {
            return {
              denied: true,
              code: "SUBSCRIPTION_EXPIRED" as EntitlementDenyCode,
              message: "اشتراك متجرك منتهٍ. جدد اشتراكك للاستمرار في إنشاء تذاكر الصيانة.",
              upgradeUrl: UPGRADE_URL,
            } as const;
          }

          const effectivePlan = computeEffectivePlan(effectiveStatus, sub.plan);
          const limits = PLAN_LIMITS[effectivePlan];

          // ── STEP 2: COUNT check — only for BASIC (unlimited plans skip) ──
          if (limits.monthlyRepairOrders !== null) {
            const count = await tx.repairOrder.count({
              where: {
                shopId,
                createdAt: { gte: monthStart },
                deletedAt: null,
              },
            });

            if (count >= limits.monthlyRepairOrders) {
              return {
                denied: true,
                code: "REPAIR_LIMIT_REACHED" as EntitlementDenyCode,
                message: `وصلت إلى الحد الأقصى من تذاكر الصيانة هذا الشهر (${limits.monthlyRepairOrders} تذكرة). جدد اشتراكك أو انتظر بداية الشهر القادم.`,
                upgradeUrl: UPGRADE_URL,
              } as const;
            }
          }

          // ── STEP 3: Execute CREATE inside the SAME transaction ───────────
          const created = await callback(tx);
          return { created } as const;
        },
        { isolationLevel: "Serializable", timeout: 10000 }
      );

      if ("denied" in outcome && outcome.denied) {
        return { denied: true, code: outcome.code, message: outcome.message, upgradeUrl: outcome.upgradeUrl };
      }

      return { result: (outcome as { created: T }).created };
    } catch (err: unknown) {
      const isSerializationError =
        err instanceof Error &&
        "code" in err &&
        (err as { code: string }).code === "40001";

      if (isSerializationError && attempt < maxRetries - 1) {
        // Exponential backoff: 10ms, 20ms, 40ms
        await new Promise((resolve) => setTimeout(resolve, 10 * Math.pow(2, attempt)));
        continue;
      }
      throw err; // non-serialization error or exhausted retries
    }
  }

  // Should never reach here given the loop structure
  return {
    denied: true,
    code: "REPAIR_LIMIT_REACHED",
    message: "تعذر التحقق من الحد الشهري بعد عدة محاولات. يرجى المحاولة مرة أخرى.",
    upgradeUrl: UPGRADE_URL,
  };
}

// ---------------------------------------------------------------------------
// MAIN ENTITLEMENT CONTEXT BUILDER
// ---------------------------------------------------------------------------

/**
 * Builds the full entitlement picture for a shop.
 * Safe to call from any Server Action or API Route after extracting shopId
 * from Auth Context.
 *
 * SECURITY: shopId MUST come from getAuthContext().shop.id — never from
 * request body or URL params.
 *
 * @param shopId - Verified shop identifier from Auth Context.
 * @param now    - Injected for testability; defaults to current UTC time.
 */
export async function getEntitlementContext(
  shopId: string,
  now: Date = new Date()
): Promise<EntitlementContext> {
  const [snapshot, repairOrdersThisMonth, activeSeats, compatibilitySearchesToday] =
    await Promise.all([
      getSubscriptionSnapshot(shopId, now),
      countMonthlyRepairOrders(shopId, now),
      countActiveSeats(shopId),
      readCompatibilitySearchesToday(shopId, now),
    ]);

  const limits = PLAN_LIMITS[snapshot.effectivePlan];

  const isOperationallyActive =
    snapshot.effectiveStatus === "TRIALING" ||
    snapshot.effectiveStatus === "ACTIVE" ||
    snapshot.effectiveStatus === "GRACE_PERIOD";

  const canCreateRepairOrder =
    isOperationallyActive &&
    (limits.monthlyRepairOrders === null || repairOrdersThisMonth < limits.monthlyRepairOrders);

  const canAddEmployee =
    isOperationallyActive &&
    (limits.totalSeats === null || activeSeats < limits.totalSeats);

  const canPerformCompatibilitySearch =
    isOperationallyActive &&
    (limits.dailyCompatibilitySearches === null ||
      compatibilitySearchesToday < limits.dailyCompatibilitySearches);

  return {
    subscription: snapshot,
    limits,
    usage: { repairOrdersThisMonth, activeSeats, compatibilitySearchesToday },
    isOperationallyActive,
    canCreateRepairOrder,
    canAddEmployee,
    canPerformCompatibilitySearch,
  };
}

// ---------------------------------------------------------------------------
// TYPED CHECK HELPERS (read-only, no side effects)
// ---------------------------------------------------------------------------

/**
 * Returns a typed EntitlementResult for RepairOrder creation.
 * Does NOT create anything. For the atomic guarded create, use
 * withRepairOrderLimitGuard() instead.
 *
 * SECURITY: shopId MUST come from Auth Context.
 */
export async function checkCanCreateRepairOrder(
  shopId: string,
  now: Date = new Date()
): Promise<EntitlementResult> {
  const ctx = await getEntitlementContext(shopId, now);
  if (!ctx.isOperationallyActive) {
    return {
      allowed: false,
      code: "SUBSCRIPTION_EXPIRED",
      message: "اشتراك متجرك منتهٍ. جدد اشتراكك للاستمرار في إنشاء تذاكر الصيانة.",
      upgradeUrl: UPGRADE_URL,
    };
  }
  if (!ctx.canCreateRepairOrder) {
    return {
      allowed: false,
      code: "REPAIR_LIMIT_REACHED",
      message: `وصلت إلى الحد الأقصى من تذاكر الصيانة هذا الشهر (${ctx.limits.monthlyRepairOrders!} تذكرة). جدد اشتراكك أو انتظر بداية الشهر القادم.`,
      upgradeUrl: UPGRADE_URL,
    };
  }
  return { allowed: true };
}

/**
 * Returns a typed EntitlementResult for adding an employee.
 * Does NOT add the employee.
 *
 * SECURITY: shopId MUST come from Auth Context.
 */
export async function checkCanAddEmployee(
  shopId: string,
  now: Date = new Date()
): Promise<EntitlementResult> {
  const ctx = await getEntitlementContext(shopId, now);
  if (!ctx.isOperationallyActive) {
    return {
      allowed: false,
      code: "SUBSCRIPTION_EXPIRED",
      message: "اشتراك متجرك منتهٍ. جدد اشتراكك للاستمرار في إدارة الفريق.",
      upgradeUrl: UPGRADE_URL,
    };
  }
  if (!ctx.canAddEmployee) {
    return {
      allowed: false,
      code: "EMPLOYEE_LIMIT_REACHED",
      message: `الخطة الأساسية تسمح بـ ${ctx.limits.totalSeats!} مستخدم فقط. ترقَّ إلى الخطة الاحترافية لإضافة موظفين بلا حدود.`,
      upgradeUrl: UPGRADE_URL,
    };
  }
  return { allowed: true };
}

/**
 * Returns a typed EntitlementResult for a Compatibility Search.
 * Does NOT increment the counter. Call incrementCompatibilitySearchEnforced()
 * after confirming allowed.
 *
 * SECURITY: shopId MUST come from Auth Context.
 */
export async function checkCanPerformCompatibilitySearch(
  shopId: string,
  now: Date = new Date()
): Promise<EntitlementResult> {
  const ctx = await getEntitlementContext(shopId, now);
  if (!ctx.isOperationallyActive) {
    return {
      allowed: false,
      code: "SUBSCRIPTION_EXPIRED",
      message: "اشتراك متجرك منتهٍ. جدد اشتراكك للاستمرار في استخدام البحث عن التوافقات.",
      upgradeUrl: UPGRADE_URL,
    };
  }
  if (!ctx.canPerformCompatibilitySearch) {
    return {
      allowed: false,
      code: "COMPATIBILITY_SEARCH_LIMIT_REACHED",
      message: `وصلت إلى حد عمليات البحث اليومية (${ctx.limits.dailyCompatibilitySearches!} بحث). تجدد الحصة يومياً عند منتصف الليل بتوقيت UTC. ترقَّ إلى الخطة الاحترافية للبحث بلا حدود.`,
      upgradeUrl: UPGRADE_URL,
    };
  }
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// EXPORT
// ---------------------------------------------------------------------------

export const entitlementService = {
  // Context builder
  getEntitlementContext,
  // Read-only check helpers
  checkCanCreateRepairOrder,
  checkCanAddEmployee,
  checkCanPerformCompatibilitySearch,
  // Atomic write primitives
  withRepairOrderLimitGuard,
  incrementCompatibilitySearch,
  incrementCompatibilitySearchEnforced,
  // UTC date utility
  toUtcDateOnly,
};

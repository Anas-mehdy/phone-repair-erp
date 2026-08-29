/**
 * test-entitlement-service.ts
 *
 * Backend integration tests for the Central Entitlement Service and
 * Usage Counters.
 *
 * Run: npx tsx scripts/test-entitlement-service.ts
 *
 * Tests are isolated per run using unique shopId values that match the UUID
 * format but point to dedicated test records created at test start and
 * cleaned up at test end.
 *
 * IMPORTANT: These tests require a live database connection.
 * They do NOT touch any production shop records.
 */

import { prisma } from "@/lib/prisma";
import {
  entitlementService,
  incrementCompatibilitySearch,
  incrementCompatibilitySearchEnforced,
  checkRepairOrderLimitForBasic,
  toUtcDateString,
  type EntitlementContext,
} from "@/lib/services/subscriptionEntitlementService";
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    const msg = detail ? `${name} — ${detail}` : name;
    console.error(`  ❌ ${msg}`);
    failed++;
    errors.push(msg);
  }
}

function assertEqual<T>(actual: T, expected: T, name: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  assert(ok, name, ok ? undefined : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ---------------------------------------------------------------------------
// Unique shop ID factory (not real shops – test-only)
// ---------------------------------------------------------------------------

// We create minimal Shop + User + Membership + Subscription records for each test group.
// All records are prefixed to make cleanup safe.
const TEST_PREFIX = `test-entitlement-${Date.now()}`;

type TestShopConfig = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialStartedAt: Date;
  trialEndsAt: Date;
  currentPeriodEndsAt?: Date | null;
  gracePeriodEndsAt?: Date | null;
};

const SHOP_IDS: string[] = [];

async function createTestShop(config: TestShopConfig): Promise<string> {
  const now = new Date();

  // Create Shop
  const shop = await prisma.shop.create({
    data: {
      name: `${TEST_PREFIX}-shop`,
      currency: "SAR",
      countryCode: "SA",
      phone: "+966500000000",
    },
  });
  SHOP_IDS.push(shop.id);

  // Create User
  const user = await prisma.user.create({
    data: {
      email: `${TEST_PREFIX}-${shop.id}@test.invalid`,
      name: "Test Owner",
      passwordHash: "fake-hash",
      shopId: shop.id,
      role: "OWNER",
    },
  });

  // Create Membership (owner seat)
  await prisma.membership.create({
    data: {
      shopId: shop.id,
      userId: user.id,
      role: "OWNER",
      status: "ACTIVE",
    },
  });

  // Create Subscription
  await prisma.subscription.create({
    data: {
      shopId: shop.id,
      plan: config.plan,
      status: config.status,
      trialStartedAt: config.trialStartedAt,
      trialEndsAt: config.trialEndsAt,
      currentPeriodEndsAt: config.currentPeriodEndsAt ?? null,
      gracePeriodEndsAt: config.gracePeriodEndsAt ?? null,
    },
  });

  return shop.id;
}

async function cleanupTestShops() {
  if (SHOP_IDS.length === 0) return;
  // Cascade delete removes all related records
  await prisma.shop.deleteMany({ where: { id: { in: SHOP_IDS } } });
  console.log(`\n🧹 Cleaned up ${SHOP_IDS.length} test shop(s).`);
}

// ---------------------------------------------------------------------------
// Test groups
// ---------------------------------------------------------------------------

async function testTrialActive() {
  console.log("\n--- Trial: Active ---");
  const now = new Date();
  const shopId = await createTestShop({
    plan: SubscriptionPlan.PROFESSIONAL,
    status: SubscriptionStatus.TRIALING,
    trialStartedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    trialEndsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),    // 7 days ahead
  });

  const ctx: EntitlementContext = await entitlementService.getEntitlementContext(shopId, now);

  assertEqual(ctx.subscription.effectiveStatus, "TRIALING", "effectiveStatus = TRIALING");
  assertEqual(ctx.subscription.effectivePlan, "TRIAL_AS_PROFESSIONAL", "effectivePlan = TRIAL_AS_PROFESSIONAL");
  assert(ctx.isOperationallyActive, "isOperationallyActive = true");
  assert(ctx.canCreateRepairOrder, "canCreateRepairOrder = true (unlimited in trial)");
  assert(ctx.canAddEmployee, "canAddEmployee = true (unlimited in trial)");
  assert(ctx.canPerformCompatibilitySearch, "canPerformCompatibilitySearch = true (unlimited in trial)");
  assert(ctx.limits.monthlyRepairOrders === null, "monthlyRepairOrders limit = null");
  assert(ctx.limits.totalSeats === null, "totalSeats limit = null");
  assert(ctx.limits.dailyCompatibilitySearches === null, "dailyCompatibilitySearches limit = null");
}

async function testTrialExpiredByTime() {
  console.log("\n--- Trial: Expired by time (status still TRIALING in DB) ---");
  const now = new Date();
  const shopId = await createTestShop({
    plan: SubscriptionPlan.PROFESSIONAL,
    status: SubscriptionStatus.TRIALING,
    trialStartedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
    trialEndsAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),    // 5 days AGO
  });

  const ctx = await entitlementService.getEntitlementContext(shopId, now);

  assertEqual(ctx.subscription.effectiveStatus, "EXPIRED", "effectiveStatus = EXPIRED despite TRIALING in DB");
  assert(!ctx.isOperationallyActive, "isOperationallyActive = false");
  assert(!ctx.canCreateRepairOrder, "canCreateRepairOrder = false");
  assert(!ctx.canAddEmployee, "canAddEmployee = false");
  assert(!ctx.canPerformCompatibilitySearch, "canPerformCompatibilitySearch = false");

  // Check typed result code
  const repairResult = await entitlementService.checkCanCreateRepairOrder(shopId, now);
  assert(!repairResult.allowed, "checkCanCreateRepairOrder.allowed = false");
  if (!repairResult.allowed) {
    assertEqual(repairResult.code, "SUBSCRIPTION_EXPIRED", "deny code = SUBSCRIPTION_EXPIRED");
  }
}

async function testProfessionalActive() {
  console.log("\n--- Professional: Active paid subscription ---");
  const now = new Date();
  const shopId = await createTestShop({
    plan: SubscriptionPlan.PROFESSIONAL,
    status: SubscriptionStatus.ACTIVE,
    trialStartedAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
    trialEndsAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    currentPeriodEndsAt: new Date(now.getTime() + 150 * 24 * 60 * 60 * 1000),
  });

  const ctx = await entitlementService.getEntitlementContext(shopId, now);

  assertEqual(ctx.subscription.effectiveStatus, "ACTIVE", "effectiveStatus = ACTIVE");
  assertEqual(ctx.subscription.effectivePlan, "PROFESSIONAL", "effectivePlan = PROFESSIONAL");
  assert(ctx.isOperationallyActive, "isOperationallyActive = true");
  assert(ctx.limits.monthlyRepairOrders === null, "no monthly repair limit");
  assert(ctx.limits.totalSeats === null, "no seat limit");
  assert(ctx.limits.dailyCompatibilitySearches === null, "no search limit");
}

async function testBasicUnderLimit() {
  console.log("\n--- Basic: Under repair order limit ---");
  const now = new Date();
  const shopId = await createTestShop({
    plan: SubscriptionPlan.BASIC,
    status: SubscriptionStatus.ACTIVE,
    trialStartedAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
    trialEndsAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    currentPeriodEndsAt: new Date(now.getTime() + 150 * 24 * 60 * 60 * 1000),
  });

  const ctx = await entitlementService.getEntitlementContext(shopId, now);

  assertEqual(ctx.subscription.effectivePlan, "BASIC", "effectivePlan = BASIC");
  assert(ctx.limits.monthlyRepairOrders === 100, "monthlyRepairOrders limit = 100");
  assert(ctx.limits.totalSeats === 1, "totalSeats limit = 1");
  assert(ctx.limits.dailyCompatibilitySearches === 10, "dailyCompatibilitySearches limit = 10");
  // No orders yet - should be allowed
  assert(ctx.canCreateRepairOrder, "canCreateRepairOrder = true (0/100)");
  assert(ctx.usage.repairOrdersThisMonth === 0, "repairOrdersThisMonth = 0");
}

async function testBasicAtRepairLimit() {
  console.log("\n--- Basic: At repair order limit (100) ---");
  const now = new Date();
  const shopId = await createTestShop({
    plan: SubscriptionPlan.BASIC,
    status: SubscriptionStatus.ACTIVE,
    trialStartedAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
    trialEndsAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    currentPeriodEndsAt: new Date(now.getTime() + 150 * 24 * 60 * 60 * 1000),
  });

  // Create 100 repair orders this month using the test customer from the shop
  const customer = await prisma.customer.create({
    data: { shopId, name: "Test Customer", phone: "+966500000001" },
  });

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  // Batch create 100 orders
  for (let i = 0; i < 100; i++) {
    await prisma.repairOrder.create({
      data: {
        shopId,
        customerId: customer.id,
        ticketNumber: `T-${i.toString().padStart(4, "0")}`,
        reportedIssue: "Test issue",
        createdAt: new Date(monthStart.getTime() + i * 60000),
      },
    });
  }

  const ctx = await entitlementService.getEntitlementContext(shopId, now);

  assertEqual(ctx.usage.repairOrdersThisMonth, 100, "repairOrdersThisMonth = 100");
  assert(!ctx.canCreateRepairOrder, "canCreateRepairOrder = false at limit");

  const result = await entitlementService.checkCanCreateRepairOrder(shopId, now);
  assert(!result.allowed, "checkCanCreateRepairOrder.allowed = false");
  if (!result.allowed) {
    assertEqual(result.code, "REPAIR_LIMIT_REACHED", "deny code = REPAIR_LIMIT_REACHED");
  }

  // Verify the SERIALIZABLE check also returns false
  const limCheck = await checkRepairOrderLimitForBasic(shopId, now);
  assert(!limCheck, "checkRepairOrderLimitForBasic = false at limit");
}

async function testBasicCompatibilityUnderLimit() {
  console.log("\n--- Basic: Compatibility search under limit ---");
  const now = new Date();
  const shopId = await createTestShop({
    plan: SubscriptionPlan.BASIC,
    status: SubscriptionStatus.ACTIVE,
    trialStartedAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
    trialEndsAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    currentPeriodEndsAt: new Date(now.getTime() + 150 * 24 * 60 * 60 * 1000),
  });

  const ctx = await entitlementService.getEntitlementContext(shopId, now);
  assert(ctx.canPerformCompatibilitySearch, "canPerformCompatibilitySearch = true (0 searches today)");
  assertEqual(ctx.usage.compatibilitySearchesToday, 0, "compatibilitySearchesToday = 0");
}

async function testBasicCompatibilityAtLimit() {
  console.log("\n--- Basic: Compatibility search at limit (10) ---");
  const now = new Date();
  const today = toUtcDateString(now);
  const shopId = await createTestShop({
    plan: SubscriptionPlan.BASIC,
    status: SubscriptionStatus.ACTIVE,
    trialStartedAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
    trialEndsAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    currentPeriodEndsAt: new Date(now.getTime() + 150 * 24 * 60 * 60 * 1000),
  });

  // Seed 10 searches
  await prisma.compatibilitySearchUsage.create({
    data: { shopId, usageDate: today, searchCount: 10 },
  });

  const ctx = await entitlementService.getEntitlementContext(shopId, now);

  assertEqual(ctx.usage.compatibilitySearchesToday, 10, "compatibilitySearchesToday = 10");
  assert(!ctx.canPerformCompatibilitySearch, "canPerformCompatibilitySearch = false at limit");

  const result = await entitlementService.checkCanPerformCompatibilitySearch(shopId, now);
  assert(!result.allowed, "checkCanPerformCompatibilitySearch.allowed = false");
  if (!result.allowed) {
    assertEqual(result.code, "COMPATIBILITY_SEARCH_LIMIT_REACHED", "deny code = COMPATIBILITY_SEARCH_LIMIT_REACHED");
  }
}

async function testUtcDayBoundary() {
  console.log("\n--- UTC day boundary: new day resets search counter ---");
  const shopId = await createTestShop({
    plan: SubscriptionPlan.BASIC,
    status: SubscriptionStatus.ACTIVE,
    trialStartedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
    trialEndsAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    currentPeriodEndsAt: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
  });

  // Simulate: yesterday had 10 searches
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const yesterdayStr = toUtcDateString(yesterday);
  await prisma.compatibilitySearchUsage.create({
    data: { shopId, usageDate: yesterdayStr, searchCount: 10 },
  });

  // Check today
  const today = new Date();
  const ctx = await entitlementService.getEntitlementContext(shopId, today);

  assertEqual(ctx.usage.compatibilitySearchesToday, 0, "Today count = 0 (new UTC day)");
  assert(ctx.canPerformCompatibilitySearch, "canPerformCompatibilitySearch = true on new day");
}

async function testTenantIsolation() {
  console.log("\n--- Tenant isolation: Shop A usage does not affect Shop B ---");
  const now = new Date();
  const today = toUtcDateString(now);

  const baseConfig = {
    plan: SubscriptionPlan.BASIC,
    status: SubscriptionStatus.ACTIVE,
    trialStartedAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
    trialEndsAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    currentPeriodEndsAt: new Date(now.getTime() + 150 * 24 * 60 * 60 * 1000),
  };

  const shopIdA = await createTestShop(baseConfig);
  const shopIdB = await createTestShop(baseConfig);

  // Give shop A 10 searches
  await prisma.compatibilitySearchUsage.create({
    data: { shopId: shopIdA, usageDate: today, searchCount: 10 },
  });

  const ctxA = await entitlementService.getEntitlementContext(shopIdA, now);
  const ctxB = await entitlementService.getEntitlementContext(shopIdB, now);

  assertEqual(ctxA.usage.compatibilitySearchesToday, 10, "Shop A has 10 searches");
  assertEqual(ctxB.usage.compatibilitySearchesToday, 0, "Shop B has 0 searches (isolated)");
  assert(!ctxA.canPerformCompatibilitySearch, "Shop A blocked");
  assert(ctxB.canPerformCompatibilitySearch, "Shop B allowed");
}

async function testAtomicCompatibilityIncrement() {
  console.log("\n--- Atomic: Concurrent compatibility increments do not exceed limit ---");
  const now = new Date();
  const shopId = await createTestShop({
    plan: SubscriptionPlan.BASIC,
    status: SubscriptionStatus.ACTIVE,
    trialStartedAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
    trialEndsAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    currentPeriodEndsAt: new Date(now.getTime() + 150 * 24 * 60 * 60 * 1000),
  });

  const LIMIT = 10;

  // Simulate 15 concurrent enforced increments
  const results = await Promise.all(
    Array.from({ length: 15 }, () =>
      incrementCompatibilitySearchEnforced(shopId, LIMIT, now)
    )
  );

  const successes = results.filter((r) => r !== null).length;
  const denials = results.filter((r) => r === null).length;

  assert(successes === 10, `Exactly 10 increments succeeded (got ${successes})`);
  assert(denials === 5, `Exactly 5 were denied (got ${denials})`);

  // Verify final DB count is exactly 10
  const today = toUtcDateString(now);
  const row = await prisma.compatibilitySearchUsage.findUnique({
    where: { shopId_usageDate: { shopId, usageDate: today } },
  });
  assertEqual(row?.searchCount, 10, "DB searchCount = 10 (not exceeded)");
}

async function testNoModificationOfTrialDates() {
  console.log("\n--- Safety: getEntitlementContext does not modify trial dates ---");
  const now = new Date();
  const originalTrialEndsAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  const shopId = await createTestShop({
    plan: SubscriptionPlan.PROFESSIONAL,
    status: SubscriptionStatus.TRIALING,
    trialStartedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    trialEndsAt: originalTrialEndsAt,
  });

  // Call entitlement context multiple times
  await entitlementService.getEntitlementContext(shopId, now);
  await entitlementService.getEntitlementContext(shopId, now);
  await entitlementService.getEntitlementContext(shopId, now);

  // Verify DB is unchanged
  const sub = await prisma.subscription.findUnique({ where: { shopId } });
  assert(
    sub?.trialEndsAt.getTime() === originalTrialEndsAt.getTime(),
    "trialEndsAt not modified by entitlement reads"
  );
  assertEqual(sub?.status, "TRIALING", "status unchanged in DB");
}

async function testGracePeriodActive() {
  console.log("\n--- Grace Period: Active grace window allows operations ---");
  const now = new Date();
  const shopId = await createTestShop({
    plan: SubscriptionPlan.BASIC,
    status: SubscriptionStatus.GRACE_PERIOD,
    trialStartedAt: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000),
    trialEndsAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
    currentPeriodEndsAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    gracePeriodEndsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  });

  const ctx = await entitlementService.getEntitlementContext(shopId, now);

  assertEqual(ctx.subscription.effectiveStatus, "GRACE_PERIOD", "effectiveStatus = GRACE_PERIOD");
  assert(ctx.isOperationallyActive, "isOperationallyActive = true during grace period");
}

async function testGracePeriodExpired() {
  console.log("\n--- Grace Period: Expired grace window blocks operations ---");
  const now = new Date();
  const shopId = await createTestShop({
    plan: SubscriptionPlan.BASIC,
    status: SubscriptionStatus.GRACE_PERIOD,
    trialStartedAt: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000),
    trialEndsAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
    currentPeriodEndsAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    gracePeriodEndsAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
  });

  const ctx = await entitlementService.getEntitlementContext(shopId, now);

  assertEqual(ctx.subscription.effectiveStatus, "EXPIRED", "effectiveStatus = EXPIRED (grace period over)");
  assert(!ctx.isOperationallyActive, "isOperationallyActive = false");
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(60));
  console.log("Entitlement Service & Usage Counter Tests");
  console.log("=".repeat(60));

  try {
    await testTrialActive();
    await testTrialExpiredByTime();
    await testProfessionalActive();
    await testBasicUnderLimit();
    await testBasicAtRepairLimit();
    await testBasicCompatibilityUnderLimit();
    await testBasicCompatibilityAtLimit();
    await testUtcDayBoundary();
    await testTenantIsolation();
    await testAtomicCompatibilityIncrement();
    await testNoModificationOfTrialDates();
    await testGracePeriodActive();
    await testGracePeriodExpired();
  } finally {
    await cleanupTestShops();
    await prisma.$disconnect();
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (errors.length > 0) {
    console.error("\nFailed tests:");
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  } else {
    console.log("\nAll tests passed ✅");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});

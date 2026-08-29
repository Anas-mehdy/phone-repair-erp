/**
 * test-entitlement-service.ts
 *
 * Comprehensive test suite for subscriptionEntitlementService.ts
 * Single Comprehensive Plan Architecture
 *
 * Run: npx tsx scripts/test-entitlement-service.ts
 */

import {
  computeEffectiveStatus,
  computeEffectivePlan,
  PLAN_LIMITS,
  TOTAL_SEAT_LIMIT,
  type EffectiveStatus,
  type EffectivePlan,
} from "@/lib/services/subscriptionEntitlementService";
import {
  calculateSubscriptionEnd,
  addCalendarMonthsUtc,
} from "@/lib/services/subscriptionAdminService";
import {
  calculateDiscountedPrice,
  validateOfferSettings,
} from "@/lib/services/subscriptionOfferService";
import { resolveEffectiveOffer } from "@/lib/subscription/offer-pricing";
import {

  SubscriptionBillingInterval,

  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    const msg = detail ? `${name} — ${detail}` : name;
    console.error(`  ❌ ${msg}`);
    failed++;
    failures.push(msg);
  }
}

function assertEqual<T>(actual: T, expected: T, name: string) {
  const ok = actual === expected;
  assert(ok, name, ok ? undefined : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const DAY_MS = 864e5; // 24 * 60 * 60 * 1000

function runPureUnitTests() {
  console.log("\n" + "=".repeat(70));
  console.log("Single Comprehensive Plan — Pure Unit Tests");
  console.log("=".repeat(70));

  const now = new Date("2026-08-29T12:00:00.000Z");

  // ── 1. computeEffectiveStatus Edge Cases ──────────────────────────────────
  console.log("\n[PURE 1] computeEffectiveStatus Edge Cases");

  // Case A: Active trial (trialEndsAt > now) -> TRIALING
  const trialActive = computeEffectiveStatus(
    SubscriptionStatus.TRIALING,
    new Date(now.getTime() + 7 * DAY_MS),
    null,
    null,
    null,
    now
  );
  assertEqual(trialActive, "TRIALING", "Trial active: trialEndsAt in future -> TRIALING");

  // Case B: Expired trial (trialEndsAt <= now) -> EXPIRED
  const trialExpired = computeEffectiveStatus(
    SubscriptionStatus.TRIALING,
    new Date(now.getTime() - 1 * DAY_MS),
    null,
    null,
    null,
    now
  );
  assertEqual(trialExpired, "EXPIRED", "Trial expired: trialEndsAt in past -> EXPIRED");

  // Case C: Active paid subscription -> ACTIVE
  const activeValid = computeEffectiveStatus(
    SubscriptionStatus.ACTIVE,
    new Date(now.getTime() - 30 * DAY_MS),
    new Date(now.getTime() - 30 * DAY_MS),
    new Date(now.getTime() + 150 * DAY_MS),
    null,
    now
  );
  assertEqual(activeValid, "ACTIVE", "Active valid: currentPeriodEndsAt in future -> ACTIVE");

  // Case D: Active expired by time -> EXPIRED
  const activeExpired = computeEffectiveStatus(
    SubscriptionStatus.ACTIVE,
    new Date(now.getTime() - 60 * DAY_MS),
    new Date(now.getTime() - 60 * DAY_MS),
    new Date(now.getTime() - 1 * DAY_MS),
    null,
    now
  );
  assertEqual(activeExpired, "EXPIRED", "Active expired: currentPeriodEndsAt in past -> EXPIRED");

  // Case E: Active with future start date -> EXPIRED
  const activeFuture = computeEffectiveStatus(
    SubscriptionStatus.ACTIVE,
    new Date(now.getTime() - 60 * DAY_MS),
    new Date(now.getTime() + 5 * DAY_MS),
    new Date(now.getTime() + 180 * DAY_MS),
    null,
    now
  );
  assertEqual(activeFuture, "EXPIRED", "Active starting in future: currentPeriodStartedAt in future -> EXPIRED");

  // Case F: Active with null currentPeriodEndsAt -> EXPIRED
  const activeNullEnd = computeEffectiveStatus(
    SubscriptionStatus.ACTIVE,
    new Date(now.getTime() - 60 * DAY_MS),
    new Date(now.getTime() - 60 * DAY_MS),
    null,
    null,
    now
  );
  assertEqual(activeNullEnd, "EXPIRED", "Active with null end -> EXPIRED");

  // Case G: Active grace period -> GRACE_PERIOD
  const graceActive = computeEffectiveStatus(
    SubscriptionStatus.GRACE_PERIOD,
    new Date(now.getTime() - 60 * DAY_MS),
    new Date(now.getTime() - 60 * DAY_MS),
    new Date(now.getTime() - 1 * DAY_MS),
    new Date(now.getTime() + 2 * DAY_MS),
    now
  );
  assertEqual(graceActive, "GRACE_PERIOD", "Grace active: gracePeriodEndsAt in future -> GRACE_PERIOD");

  // Case H: Grace period expired -> EXPIRED
  const graceExpired = computeEffectiveStatus(
    SubscriptionStatus.GRACE_PERIOD,
    new Date(now.getTime() - 60 * DAY_MS),
    new Date(now.getTime() - 60 * DAY_MS),
    new Date(now.getTime() - 10 * DAY_MS),
    new Date(now.getTime() - 1 * DAY_MS),
    now
  );
  assertEqual(graceExpired, "EXPIRED", "Grace expired: gracePeriodEndsAt in past -> EXPIRED");

  // Case I: Grace with null gracePeriodEndsAt -> EXPIRED
  const graceNullEnd = computeEffectiveStatus(
    SubscriptionStatus.GRACE_PERIOD,
    new Date(now.getTime() - 60 * DAY_MS),
    new Date(now.getTime() - 60 * DAY_MS),
    new Date(now.getTime() - 5 * DAY_MS),
    null,
    now
  );
  assertEqual(graceNullEnd, "EXPIRED", "Grace with null end -> EXPIRED");

  // Case J: Canceled status -> CANCELED
  const canceled = computeEffectiveStatus(
    SubscriptionStatus.CANCELED,
    new Date(now.getTime() - 60 * DAY_MS),
    new Date(now.getTime() - 60 * DAY_MS),
    new Date(now.getTime() + 100 * DAY_MS),
    null,
    now
  );
  assertEqual(canceled, "CANCELED", "Canceled status -> CANCELED");

  // Case K: Stored EXPIRED status -> EXPIRED
  const expiredStatus = computeEffectiveStatus(
    SubscriptionStatus.EXPIRED,
    new Date(now.getTime() - 60 * DAY_MS),
    null,
    null,
    null,
    now
  );
  assertEqual(expiredStatus, "EXPIRED", "Expired status -> EXPIRED");

  // ── 2. computeEffectivePlan Mappings ──────────────────────────────────────
  console.log("\n[PURE 2] computeEffectivePlan Mappings");

  assertEqual(computeEffectivePlan("TRIALING"), "TRIAL_AS_PROFESSIONAL", "TRIALING gives TRIAL_AS_PROFESSIONAL");
  assertEqual(computeEffectivePlan("ACTIVE"), "PROFESSIONAL", "ACTIVE -> PROFESSIONAL");
  assertEqual(computeEffectivePlan("GRACE_PERIOD"), "PROFESSIONAL", "GRACE_PERIOD -> PROFESSIONAL");
  assertEqual(computeEffectivePlan("EXPIRED"), "PROFESSIONAL", "EXPIRED -> PROFESSIONAL");
  assertEqual(computeEffectivePlan("CANCELED"), "PROFESSIONAL", "CANCELED -> PROFESSIONAL");

  // ── 3. PLAN_LIMITS Structure (Single Comprehensive Plan) ───────────────────
  console.log("\n[PURE 3] PLAN_LIMITS Structure & Seat Caps");

  assertEqual(PLAN_LIMITS.TRIAL_AS_PROFESSIONAL.monthlyRepairOrders, null, "Trial: monthlyRepairOrders = null (unlimited)");
  assertEqual(PLAN_LIMITS.TRIAL_AS_PROFESSIONAL.totalSeats, 5, "Trial: totalSeats = 5");
  assertEqual(PLAN_LIMITS.TRIAL_AS_PROFESSIONAL.dailyCompatibilitySearches, null, "Trial: dailyCompatibilitySearches = null (unlimited)");

  assertEqual(PLAN_LIMITS.PROFESSIONAL.monthlyRepairOrders, null, "Professional: monthlyRepairOrders = null (unlimited)");
  assertEqual(PLAN_LIMITS.PROFESSIONAL.totalSeats, 5, "Professional: totalSeats = 5");
  assertEqual(PLAN_LIMITS.PROFESSIONAL.dailyCompatibilitySearches, null, "Professional: dailyCompatibilitySearches = null (unlimited)");

  assertEqual(PLAN_LIMITS.BASIC.monthlyRepairOrders, null, "Legacy BASIC: monthlyRepairOrders = null (unlimited)");
  assertEqual(PLAN_LIMITS.BASIC.totalSeats, 5, "Legacy BASIC: totalSeats = 5");
  assertEqual(PLAN_LIMITS.BASIC.dailyCompatibilitySearches, null, "Legacy BASIC: dailyCompatibilitySearches = null (unlimited)");

  // ── 4. Operational & Seat Limit Logic ────────────────────────────────────
  console.log("\n[PURE 4] Operational & Seat Limit Logic");

  const isOpActive = (status: EffectiveStatus) =>
    status === "TRIALING" || status === "ACTIVE" || status === "GRACE_PERIOD";

  assert(isOpActive("TRIALING"), "TRIALING is operationally active");
  assert(isOpActive("ACTIVE"), "ACTIVE is operationally active");
  assert(isOpActive("GRACE_PERIOD"), "GRACE_PERIOD is operationally active");
  assert(!isOpActive("EXPIRED"), "EXPIRED is NOT operationally active");
  assert(!isOpActive("CANCELED"), "CANCELED is NOT operationally active");

  assertEqual(TOTAL_SEAT_LIMIT, 5, "TOTAL_SEAT_LIMIT constant is 5");

  const canAddSeat = (activeSeats: number) => activeSeats < TOTAL_SEAT_LIMIT;
  assert(canAddSeat(1), "1 < 5: seat addition allowed");
  assert(canAddSeat(4), "4 < 5: seat addition allowed (4th seat -> 5th available)");
  assert(!canAddSeat(5), "5 is NOT < 5: seat addition rejected at max cap 5");
  assert(!canAddSeat(6), "6 is NOT < 5: seat addition rejected beyond limit");

  // ── 5. Calendar Calculation Unit Tests ────────────────────────────────────
  console.log("\n[PURE 5] Calendar Calculation Unit Tests");

  const start = new Date("2026-01-31T00:00:00.000Z");
  const end6 = calculateSubscriptionEnd(start, SubscriptionBillingInterval.SIX_MONTHS, 0);
  assertEqual(end6.getUTCFullYear(), 2026, "6-month end year");
  assertEqual(end6.getUTCMonth(), 6, "6-month end month (July, 0-indexed 6)");
  assertEqual(end6.getUTCDate(), 31, "6-month end day (July 31)");

  const end12 = calculateSubscriptionEnd(start, SubscriptionBillingInterval.ANNUAL, 0);
  assertEqual(end12.getUTCFullYear(), 2027, "Annual end year");
  assertEqual(end12.getUTCMonth(), 0, "Annual end month (January, 0-indexed 0)");
  assertEqual(end12.getUTCDate(), 31, "Annual end day (Jan 31, 2027)");

  const endWithExtra = calculateSubscriptionEnd(start, SubscriptionBillingInterval.SIX_MONTHS, 10);
  assertEqual(endWithExtra.getTime() - end6.getTime(), 10 * DAY_MS, "Extra 10 days added precisely");

  // ── 6. Founders Offer Pricing & Validation Unit Tests ─────────────────────
  console.log("\n[PURE 6] Founders Offer Pricing & Validation Unit Tests");

  // Discount Calculation Tests
  assertEqual(calculateDiscountedPrice(1000, 0), 1000, "0% discount on 1000 => 1000");
  assertEqual(calculateDiscountedPrice(1000, 20), 800, "20% discount on 1000 => 800");
  assertEqual(calculateDiscountedPrice(1000, 100), 0, "100% discount on 1000 => 0");
  assertEqual(calculateDiscountedPrice(1000, -10), 1000, "Negative discount (-10%) rejected to original price 1000");
  assertEqual(calculateDiscountedPrice(1000, 120), 0, "Excess discount (>100%) clamped to 0");
  assertEqual(calculateDiscountedPrice(199.99, 15), 169.99, "15% discount on 199.99 with 2-decimal rounding => 169.99");
  assertEqual(calculateDiscountedPrice(0, 50), 0, "50% discount on 0 => 0");

  // Validation Rule Tests
  const validOffer = validateOfferSettings({
    isActive: true,
    totalEligible: 50,
    remainingEligible: 40,
    sixMonthsDiscountPercent: 20,
    annualDiscountPercent: 30,
  });
  assert(validOffer.valid, "Valid offer settings accepted");

  const invalidRemainingExcess = validateOfferSettings({
    isActive: true,
    totalEligible: 50,
    remainingEligible: 51,
    sixMonthsDiscountPercent: 20,
    annualDiscountPercent: 30,
  });
  assert(!invalidRemainingExcess.valid, "remainingEligible > totalEligible rejected");

  const invalidRemainingNegative = validateOfferSettings({
    isActive: true,
    totalEligible: 50,
    remainingEligible: -1,
    sixMonthsDiscountPercent: 20,
    annualDiscountPercent: 30,
  });
  assert(!invalidRemainingNegative.valid, "Negative remainingEligible rejected");

  const invalidTotalZero = validateOfferSettings({
    isActive: true,
    totalEligible: 0,
    remainingEligible: 0,
    sixMonthsDiscountPercent: 20,
    annualDiscountPercent: 30,
  });
  assert(!invalidTotalZero.valid, "totalEligible < 1 rejected");

  const invalidTotalTooLarge = validateOfferSettings({
    isActive: true,
    totalEligible: 100001,
    remainingEligible: 50,
    sixMonthsDiscountPercent: 20,
    annualDiscountPercent: 30,
  });
  assert(!invalidTotalTooLarge.valid, "totalEligible > 100000 rejected");

  const invalidDiscountAbove100 = validateOfferSettings({
    isActive: true,
    totalEligible: 50,
    remainingEligible: 40,
    sixMonthsDiscountPercent: 101,
    annualDiscountPercent: 30,
  });
  assert(!invalidDiscountAbove100.valid, "Discount > 100% rejected");

  const invalidDiscountNegative = validateOfferSettings({
    isActive: true,
    totalEligible: 50,
    remainingEligible: 40,
    sixMonthsDiscountPercent: -5,
    annualDiscountPercent: 30,
  });
  assert(!invalidDiscountNegative.valid, "Negative discount rejected");

  // ── 7. Per-Subscription Founders Offer Resolution & Lifetime Preservation ─
  console.log("\n[PURE 7] Per-Subscription Founders Offer Resolution & Lifetime Preservation");

  const activeGlobalOffer = {
    isActive: true,
    remainingEligible: 40,
    sixMonthsDiscountPercent: 20,
    annualDiscountPercent: 30,
  };

  const changedGlobalOffer = {
    isActive: true,
    remainingEligible: 30,
    sixMonthsDiscountPercent: 10,
    annualDiscountPercent: 15,
  };

  const disabledGlobalOffer = {
    isActive: false,
    remainingEligible: 40,
    sixMonthsDiscountPercent: 20,
    annualDiscountPercent: 30,
  };

  const soldOutGlobalOffer = {
    isActive: true,
    remainingEligible: 0,
    sixMonthsDiscountPercent: 20,
    annualDiscountPercent: 30,
  };

  // Test 1: New subscriber + active global offer (20% & 30%)
  const test1 = resolveEffectiveOffer(
    { foundersOfferEligible: false },
    activeGlobalOffer,
  );
  assertEqual(test1.isEligible, true, "Test 1: New subscriber is eligible for active global offer");
  assertEqual(test1.isFrozen, false, "Test 1: isFrozen is false for prospective subscriber");
  assertEqual(test1.sixMonthsDiscountPercent, 20, "Test 1: six-month discount is 20%");
  assertEqual(test1.annualDiscountPercent, 30, "Test 1: annual discount is 30%");

  // Test 2: Founders eligible frozen (20% & 25%), global changed to 10% & 15%
  const test2 = resolveEffectiveOffer(
    {
      foundersOfferEligible: true,
      foundersOfferSixMonthsDiscountPercent: 20,
      foundersOfferAnnualDiscountPercent: 25,
    },
    changedGlobalOffer,
  );
  assertEqual(test2.isEligible, true, "Test 2: Existing founder is eligible");
  assertEqual(test2.isFrozen, true, "Test 2: isFrozen is true");
  assertEqual(test2.sixMonthsDiscountPercent, 20, "Test 2: Retains frozen 20% six-month discount");
  assertEqual(test2.annualDiscountPercent, 25, "Test 2: Retains frozen 25% annual discount (ignores 15% global change)");

  // Test 3: Founders eligible frozen (20% & 25%), global disabled
  const test3 = resolveEffectiveOffer(
    {
      foundersOfferEligible: true,
      foundersOfferSixMonthsDiscountPercent: 20,
      foundersOfferAnnualDiscountPercent: 25,
    },
    disabledGlobalOffer,
  );
  assertEqual(test3.isEligible, true, "Test 3: Existing founder retains offer even when global is disabled");
  assertEqual(test3.isFrozen, true, "Test 3: isFrozen is true");
  assertEqual(test3.annualDiscountPercent, 25, "Test 3: Retains frozen discount when global disabled");

  // Test 4: Non-eligible subscriber + global disabled
  const test4 = resolveEffectiveOffer(
    { foundersOfferEligible: false },
    disabledGlobalOffer,
  );
  assertEqual(test4.isEligible, false, "Test 4: Non-eligible gets no offer when global is disabled");
  assertEqual(test4.annualDiscountPercent, 0, "Test 4: 0% discount");

  // Test 5: Non-eligible subscriber + remaining = 0
  const test5 = resolveEffectiveOffer(
    { foundersOfferEligible: false },
    soldOutGlobalOffer,
  );
  assertEqual(test5.isEligible, false, "Test 5: Non-eligible gets no offer when remaining = 0");
  assertEqual(test5.annualDiscountPercent, 0, "Test 5: 0% discount when sold out");

  // Test 6 & 7: Pure preservation logic on renewal
  const originalDate = new Date("2026-06-01T10:00:00.000Z");
  const existingSubSnapshot = {
    foundersOfferEligible: true,
    foundersOfferGrantedAt: originalDate,
    foundersOfferSixMonthsDiscountPercent: 25,
    foundersOfferAnnualDiscountPercent: 35,
  };

  // Renewal with grantFoundersOffer = false
  const renewalWithoutGrant = {
    foundersOfferEligible: existingSubSnapshot.foundersOfferEligible ? true : false,
    foundersOfferGrantedAt: existingSubSnapshot.foundersOfferEligible
      ? existingSubSnapshot.foundersOfferGrantedAt
      : null,
    foundersOfferSixMonthsDiscountPercent: existingSubSnapshot.foundersOfferEligible
      ? existingSubSnapshot.foundersOfferSixMonthsDiscountPercent
      : null,
    foundersOfferAnnualDiscountPercent: existingSubSnapshot.foundersOfferEligible
      ? existingSubSnapshot.foundersOfferAnnualDiscountPercent
      : null,
  };
  assertEqual(renewalWithoutGrant.foundersOfferEligible, true, "Test 6: Eligible preserved on renewal with grant=false");
  assertEqual(renewalWithoutGrant.foundersOfferSixMonthsDiscountPercent, 25, "Test 6: Six-months discount preserved");
  assertEqual(renewalWithoutGrant.foundersOfferAnnualDiscountPercent, 35, "Test 6: Annual discount preserved");
  assertEqual(renewalWithoutGrant.foundersOfferGrantedAt?.getTime(), originalDate.getTime(), "Test 6: GrantedAt timestamp preserved");

  // Renewal with grantFoundersOffer = true on already-eligible
  const renewalWithGrantAgain = {
    foundersOfferEligible: existingSubSnapshot.foundersOfferEligible ? true : true,
    foundersOfferGrantedAt: existingSubSnapshot.foundersOfferEligible
      ? existingSubSnapshot.foundersOfferGrantedAt
      : new Date(),
    foundersOfferSixMonthsDiscountPercent: existingSubSnapshot.foundersOfferEligible
      ? existingSubSnapshot.foundersOfferSixMonthsDiscountPercent
      : 10,
    foundersOfferAnnualDiscountPercent: existingSubSnapshot.foundersOfferEligible
      ? existingSubSnapshot.foundersOfferAnnualDiscountPercent
      : 15,
  };
  assertEqual(renewalWithGrantAgain.foundersOfferSixMonthsDiscountPercent, 25, "Test 7: Frozen discounts NOT overwritten if grant=true again");
  assertEqual(renewalWithGrantAgain.foundersOfferGrantedAt?.getTime(), originalDate.getTime(), "Test 7: GrantedAt NOT overwritten if grant=true again");
}



function main() {
  console.log("=".repeat(70));
  console.log("Massar ERP — Subscription Entitlement Service Test Suite");
  console.log("=".repeat(70));

  runPureUnitTests();

  console.log("\n" + "=".repeat(70));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    failures.forEach((f) => console.error(`  FAIL: ${f}`));
    process.exit(1);
  }
  console.log("\nAll tests passed successfully! ✅");
  process.exit(0);
}

main();

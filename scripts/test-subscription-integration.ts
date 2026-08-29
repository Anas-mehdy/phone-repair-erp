import { randomUUID } from "node:crypto";
import {
  PrismaClient,
  SubscriptionBillingInterval,
  SubscriptionPlan,
  SubscriptionStatus,
  MembershipRole,
  MembershipStatus,
  UserRole,
} from "@prisma/client";
import {
  entitlementService,
  withRepairOrderLimitGuard,
} from "@/lib/services/subscriptionEntitlementService";
import { teamService } from "@/lib/services/teamService";

const prisma = new PrismaClient();

const REQUIRED_OPT_IN = "ALLOW_LOCAL_INTEGRATION_TESTS";
const REQUIRED_OPT_IN_VALUE = "1";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const FORBIDDEN_DATABASES = new Set(["postgres", "template0", "template1"]);

function assertLocalDatabaseSafety(): URL {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is missing. Integration tests were NOT started.");
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("DATABASE_URL is invalid. Integration tests were NOT started.");
  }

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error(`Refusing integration tests: unsupported DB protocol ${url.protocol}`);
  }

  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(
      `Refusing integration tests: database host '${url.hostname}' is not localhost/127.0.0.1/::1.`,
    );
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, "")).trim();
  if (!databaseName || FORBIDDEN_DATABASES.has(databaseName.toLowerCase())) {
    throw new Error(
      `Refusing integration tests: database '${databaseName || "(empty)"}' is not an allowed disposable local test database.`,
    );
  }

  if (process.env[REQUIRED_OPT_IN] !== REQUIRED_OPT_IN_VALUE) {
    throw new Error(
      `Refusing integration tests: set ${REQUIRED_OPT_IN}=${REQUIRED_OPT_IN_VALUE} explicitly after verifying the local database.`,
    );
  }

  return url;
}

async function assertRequiredSchema() {
  const rows = await prisma.$queryRaw<Array<{ grace_column: string | null }>>`
    SELECT
      (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Subscription'
          AND column_name = 'gracePeriodEndsAt'
        LIMIT 1
      ) AS grace_column
  `;

  if (!rows[0]?.grace_column) {
    throw new Error(
      "Local test database is missing the entitlement grace-period migration. Apply migrations to the LOCAL disposable database only, then retry.",
    );
  }
}

function addUtcDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function createShopFixture(
  prefix: string,
  status: SubscriptionStatus = SubscriptionStatus.ACTIVE,
) {
  const shopId = randomUUID();
  const now = new Date();
  const isActive = status === SubscriptionStatus.ACTIVE;

  await prisma.shop.create({
    data: {
      id: shopId,
      name: `${prefix}-${shopId.slice(0, 8)}`,
      countryCode: "SA",
      currency: "SAR",
      subscription: {
        create: {
          plan: SubscriptionPlan.PROFESSIONAL,
          status,
          billingInterval: isActive ? SubscriptionBillingInterval.SIX_MONTHS : null,
          trialStartedAt: addUtcDays(now, -30),
          trialEndsAt: addUtcDays(now, -20),
          currentPeriodStartedAt: isActive ? addUtcDays(now, -1) : null,
          currentPeriodEndsAt: isActive ? addUtcDays(now, 30) : null,
          activatedAt: isActive ? addUtcDays(now, -1) : null,
        },
      },
    },
  });

  return { shopId, now };
}

async function cleanupShop(shopId: string) {
  await prisma.shop.delete({ where: { id: shopId } }).catch(() => undefined);
}

async function testConcurrentInvitations() {
  const { shopId } = await createShopFixture("integration-concurrent-invites");

  try {
    // 1 Owner
    const owner = await prisma.user.create({
      data: {
        email: `owner-${shopId.slice(0, 8)}@test.local`,
        name: "Shop Owner",
        passwordHash: "fake-hash",
        shopId,
        role: UserRole.OWNER,
      },
    });
    await prisma.membership.create({
      data: {
        shopId,
        userId: owner.id,
        role: MembershipRole.OWNER,
        status: MembershipStatus.ACTIVE,
      },
    });

    // 3 Active Staff (Total used seats = 4)
    for (let i = 1; i <= 3; i++) {
      const staff = await prisma.user.create({
        data: {
          email: `staff-${i}-${shopId.slice(0, 8)}@test.local`,
          name: `Staff Member ${i}`,
          passwordHash: "fake-hash",
          shopId,
          role: UserRole.STAFF,
        },
      });
      await prisma.membership.create({
        data: {
          shopId,
          userId: staff.id,
          role: MembershipRole.TECHNICIAN,
          status: MembershipStatus.ACTIVE,
        },
      });
    }

    const initialUsage = await teamService.getShopSeatUsage(shopId);
    if (initialUsage.usedSeats !== 4) {
      throw new Error(`Expected initial usedSeats = 4, got ${initialUsage.usedSeats}`);
    }

    // Attempt 2 simultaneous invitations
    const [res1, res2] = await Promise.allSettled([
      teamService.createInvitation(
        shopId,
        { name: "Candidate 1", email: `cand-1-${shopId.slice(0, 8)}@test.local`, role: MembershipRole.TECHNICIAN },
        owner.id,
      ),
      teamService.createInvitation(
        shopId,
        { name: "Candidate 2", email: `cand-2-${shopId.slice(0, 8)}@test.local`, role: MembershipRole.TECHNICIAN },
        owner.id,
      ),
    ]);

    const successes = [res1, res2].filter((r) => r.status === "fulfilled");
    const rejections = [res1, res2].filter((r) => r.status === "rejected");

    if (successes.length !== 1) {
      throw new Error(`Concurrent invitations failed: expected exactly 1 success, got ${successes.length}.`);
    }
    if (rejections.length !== 1) {
      throw new Error(`Concurrent invitations failed: expected exactly 1 rejection, got ${rejections.length}.`);
    }

    const rejectedError = (rejections[0] as PromiseRejectedResult).reason;
    const errorMsg = rejectedError instanceof Error ? rejectedError.message : String(rejectedError);
    if (!errorMsg.includes("وصلت إلى الحد الأقصى المسموح به وهو 5 مستخدمين للمتجر")) {
      throw new Error(`Unexpected rejection error message: ${errorMsg}`);
    }

    const finalUsage = await teamService.getShopSeatUsage(shopId);
    if (finalUsage.usedSeats !== 5) {
      throw new Error(`Concurrent invitations failed: expected final usedSeats = 5, got ${finalUsage.usedSeats}`);
    }

    console.log("✅ Test A — Concurrent Invitations: 4 seats + 2 simultaneous invites => exactly 1 accepted, 1 denied, final usedSeats=5");
  } finally {
    await cleanupShop(shopId);
  }
}

async function testConcurrentReactivation() {
  const { shopId } = await createShopFixture("integration-concurrent-reactivate");

  try {
    // 1 Owner
    const owner = await prisma.user.create({
      data: {
        email: `owner-${shopId.slice(0, 8)}@test.local`,
        name: "Shop Owner",
        passwordHash: "fake-hash",
        shopId,
        role: UserRole.OWNER,
      },
    });
    await prisma.membership.create({
      data: {
        shopId,
        userId: owner.id,
        role: MembershipRole.OWNER,
        status: MembershipStatus.ACTIVE,
      },
    });

    // 3 Active Staff (Total active seats = 4)
    for (let i = 1; i <= 3; i++) {
      const staff = await prisma.user.create({
        data: {
          email: `active-staff-${i}-${shopId.slice(0, 8)}@test.local`,
          name: `Active Staff ${i}`,
          passwordHash: "fake-hash",
          shopId,
          role: UserRole.STAFF,
        },
      });
      await prisma.membership.create({
        data: {
          shopId,
          userId: staff.id,
          role: MembershipRole.TECHNICIAN,
          status: MembershipStatus.ACTIVE,
        },
      });
    }

    // 2 Suspended Staff
    const suspendedMembers = [];
    for (let i = 1; i <= 2; i++) {
      const staff = await prisma.user.create({
        data: {
          email: `suspended-staff-${i}-${shopId.slice(0, 8)}@test.local`,
          name: `Suspended Staff ${i}`,
          passwordHash: "fake-hash",
          shopId,
          role: UserRole.STAFF,
        },
      });
      const membership = await prisma.membership.create({
        data: {
          shopId,
          userId: staff.id,
          role: MembershipRole.TECHNICIAN,
          status: MembershipStatus.SUSPENDED,
        },
      });
      suspendedMembers.push(membership);
    }

    const initialUsage = await teamService.getShopSeatUsage(shopId);
    if (initialUsage.usedSeats !== 4) {
      throw new Error(`Expected initial usedSeats = 4, got ${initialUsage.usedSeats}`);
    }

    // Attempt concurrent reactivation of both suspended members
    const [res1, res2] = await Promise.allSettled([
      teamService.toggleMemberStatus(shopId, suspendedMembers[0].id, MembershipStatus.ACTIVE, owner.id),
      teamService.toggleMemberStatus(shopId, suspendedMembers[1].id, MembershipStatus.ACTIVE, owner.id),
    ]);

    const successes = [res1, res2].filter((r) => r.status === "fulfilled");
    const rejections = [res1, res2].filter((r) => r.status === "rejected");

    if (successes.length !== 1) {
      throw new Error(`Concurrent reactivation failed: expected exactly 1 success, got ${successes.length}.`);
    }
    if (rejections.length !== 1) {
      throw new Error(`Concurrent reactivation failed: expected exactly 1 rejection, got ${rejections.length}.`);
    }

    const rejectedError = (rejections[0] as PromiseRejectedResult).reason;
    const errorMsg = rejectedError instanceof Error ? rejectedError.message : String(rejectedError);
    if (!errorMsg.includes("وصلت إلى الحد الأقصى المسموح به وهو 5 مستخدمين للمتجر")) {
      throw new Error(`Unexpected rejection error message: ${errorMsg}`);
    }

    const finalActiveMembers = await prisma.membership.count({
      where: { shopId, status: MembershipStatus.ACTIVE, deletedAt: null },
    });
    if (finalActiveMembers !== 5) {
      throw new Error(`Concurrent reactivation failed: expected 5 active members, got ${finalActiveMembers}`);
    }

    console.log("✅ Test B — Concurrent Reactivation: 4 active + 2 suspended reactivated simultaneously => exactly 1 active, 1 blocked, final active seats=5");
  } finally {
    await cleanupShop(shopId);
  }
}

async function testTenantIsolation() {
  const shopA = await createShopFixture("integration-tenant-lock-a", SubscriptionStatus.ACTIVE);
  const shopB = await createShopFixture("integration-tenant-lock-b", SubscriptionStatus.ACTIVE);

  try {
    // Both shops have 4 seats
    for (const shop of [shopA, shopB]) {
      const owner = await prisma.user.create({
        data: {
          email: `owner-${shop.shopId.slice(0, 8)}@test.local`,
          name: "Owner",
          passwordHash: "fake",
          shopId: shop.shopId,
          role: UserRole.OWNER,
        },
      });
      await prisma.membership.create({
        data: { shopId: shop.shopId, userId: owner.id, role: MembershipRole.OWNER, status: MembershipStatus.ACTIVE },
      });
      for (let i = 1; i <= 3; i++) {
        const staff = await prisma.user.create({
          data: { email: `staff-${i}-${shop.shopId.slice(0, 8)}@test.local`, name: "Staff", passwordHash: "fake", shopId: shop.shopId, role: UserRole.STAFF },
        });
        await prisma.membership.create({
          data: { shopId: shop.shopId, userId: staff.id, role: MembershipRole.TECHNICIAN, status: MembershipStatus.ACTIVE },
        });
      }
    }

    // Both shops create a 5th seat simultaneously
    const [ownerA, ownerB] = await Promise.all([
      prisma.user.findFirstOrThrow({ where: { shopId: shopA.shopId, role: UserRole.OWNER } }),
      prisma.user.findFirstOrThrow({ where: { shopId: shopB.shopId, role: UserRole.OWNER } }),
    ]);

    const [resA, resB] = await Promise.allSettled([
      teamService.createInvitation(shopA.shopId, { name: "A5", email: `a5-${shopA.shopId.slice(0, 8)}@test.local`, role: MembershipRole.TECHNICIAN }, ownerA.id),
      teamService.createInvitation(shopB.shopId, { name: "B5", email: `b5-${shopB.shopId.slice(0, 8)}@test.local`, role: MembershipRole.TECHNICIAN }, ownerB.id),
    ]);

    if (resA.status !== "fulfilled" || resB.status !== "fulfilled") {
      throw new Error("Tenant isolation failed: Independent shops at 4/5 should both succeed concurrently.");
    }

    const [usageA, usageB] = await Promise.all([
      teamService.getShopSeatUsage(shopA.shopId),
      teamService.getShopSeatUsage(shopB.shopId),
    ]);

    if (usageA.usedSeats !== 5 || usageB.usedSeats !== 5) {
      throw new Error(`Tenant isolation failed: expected 5 seats on both shops, got A=${usageA.usedSeats}, B=${usageB.usedSeats}`);
    }

    console.log("✅ Test C — Tenant Isolation: Separate shops under concurrent mutations lock independently; zero cross-tenant blocking");
  } finally {
    await cleanupShop(shopA.shopId);
    await cleanupShop(shopB.shopId);
  }
}

async function testUnlimitedRepairs() {
  const { shopId, now } = await createShopFixture("integration-unlimited-repairs");

  try {
    await prisma.repairOrder.createMany({
      data: Array.from({ length: 101 }, (_, index) => ({
        shopId,
        ticketNumber: `RO-INIT-${String(index + 1).padStart(3, "0")}`,
        reportedIssue: "unlimited repairs fixture",
        createdAt: now,
      })),
    });

    let ticketSequence = 102;
    const createAttempt = () =>
      withRepairOrderLimitGuard(
        shopId,
        async () => {
          const ticketNumber = `RO-CONC-${ticketSequence++}`;
          return prisma.repairOrder.create({
            data: {
              shopId,
              ticketNumber,
              reportedIssue: "concurrent create",
              createdAt: now,
            },
            select: { id: true, ticketNumber: true },
          });
        },
        now,
      );

    const outcomes = await Promise.all([createAttempt(), createAttempt()]);
    const accepted = outcomes.filter((result) => "result" in result);

    const finalCount = await prisma.repairOrder.count({
      where: { shopId, deletedAt: null },
    });

    if (accepted.length !== 2) {
      throw new Error(
        `Unlimited repair concurrency failed: expected 2 accepted creates, got ${accepted.length}.`,
      );
    }
    if (finalCount !== 103) {
      throw new Error(
        `Unlimited repair concurrency failed: final count is ${finalCount}, expected 103.`,
      );
    }

    console.log("✅ Unlimited repairs concurrency: 101 existing + 2 simultaneous creates => both accepted, final count=103");
  } finally {
    await cleanupShop(shopId);
  }
}

async function main() {
  const url = assertLocalDatabaseSafety();
  console.log(
    `🔒 Local integration safety gate passed: ${url.hostname}:${url.port || "5432"}${url.pathname}`,
  );
  console.log("   No production/remote database is permitted by this harness.\n");

  await assertRequiredSchema();
  await testConcurrentInvitations();
  await testConcurrentReactivation();
  await testTenantIsolation();
  await testUnlimitedRepairs();

  console.log("\n✅ All local PostgreSQL subscription integration tests passed.");
}

main()
  .catch((error) => {
    console.error("\n❌ Subscription integration test failed safely:");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

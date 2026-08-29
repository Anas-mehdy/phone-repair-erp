import { randomUUID } from "node:crypto";
import {
  MembershipRole,
  MembershipStatus,
  PrismaClient,
  SubscriptionBillingInterval,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";
import {
  entitlementService,
  withRepairOrderLimitGuard,
} from "@/lib/services/subscriptionEntitlementService";

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
    SELECT (
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
      countryCode: "TR",
      currency: "TRY",
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

async function testUnlimitedRepairCreation() {
  const { shopId, now } = await createShopFixture("integration-unlimited-repair");

  try {
    await prisma.repairOrder.createMany({
      data: Array.from({ length: 101 }, (_, index) => ({
        shopId,
        ticketNumber: `IT-${String(index + 1).padStart(3, "0")}`,
        reportedIssue: "single-plan unlimited fixture",
        createdAt: now,
      })),
    });

    let ticketSequence = 102;
    const createAttempt = () =>
      withRepairOrderLimitGuard(shopId, async () => {
        const ticketNumber = `IT-${ticketSequence++}`;
        return prisma.repairOrder.create({
          data: {
            shopId,
            ticketNumber,
            reportedIssue: "single-plan unlimited concurrent create",
            createdAt: now,
          },
          select: { id: true, ticketNumber: true },
        });
      }, now);

    const outcomes = await Promise.all([createAttempt(), createAttempt()]);
    const accepted = outcomes.filter((result) => "result" in result);
    const finalCount = await prisma.repairOrder.count({
      where: { shopId, deletedAt: null },
    });

    if (accepted.length !== 2) {
      throw new Error(`Unlimited repair test failed: expected 2 accepted creates, got ${accepted.length}.`);
    }
    if (finalCount !== 103) {
      throw new Error(`Unlimited repair test failed: final count is ${finalCount}, expected 103.`);
    }

    console.log("✅ Unlimited repair creation: 101 existing + 2 simultaneous creates => both accepted, final count=103");
  } finally {
    await cleanupShop(shopId);
  }
}

async function testFiveSeatLimit() {
  const { shopId } = await createShopFixture("integration-seat-limit");

  try {
    const ownerId = randomUUID();
    await prisma.user.create({
      data: {
        id: ownerId,
        shopId,
        email: `owner-${shopId}@integration.local`,
        name: "Integration Owner",
        role: "OWNER",
      },
    });

    for (let index = 0; index < 4; index++) {
      const userId = randomUUID();
      await prisma.user.create({
        data: {
          id: userId,
          shopId,
          email: `staff-${index}-${shopId}@integration.local`,
          name: `Integration Staff ${index + 1}`,
          role: "STAFF",
          memberships: {
            create: {
              shopId,
              role: MembershipRole.TECHNICIAN,
              status: MembershipStatus.ACTIVE,
            },
          },
        },
      });
    }

    const context = await entitlementService.getEntitlementContext(shopId);
    const addEmployee = await entitlementService.checkCanAddEmployee(shopId);

    if (context.usage.activeSeats !== 5) {
      throw new Error(`Seat limit test failed: activeSeats=${context.usage.activeSeats}, expected 5.`);
    }
    if (context.limits.totalSeats !== 5) {
      throw new Error(`Seat limit test failed: totalSeats=${context.limits.totalSeats}, expected 5.`);
    }
    if (addEmployee.allowed || addEmployee.code !== "EMPLOYEE_LIMIT_REACHED") {
      throw new Error("Seat limit test failed: sixth seat was not denied with EMPLOYEE_LIMIT_REACHED.");
    }

    console.log("✅ Seat limit: owner + 4 active staff = 5 total seats; sixth seat denied");
  } finally {
    await cleanupShop(shopId);
  }
}

async function testTenantSubscriptionIsolation() {
  const active = await createShopFixture("integration-active-shop", SubscriptionStatus.ACTIVE);
  const expired = await createShopFixture("integration-expired-shop", SubscriptionStatus.EXPIRED);

  try {
    const [activeResult, expiredResult] = await Promise.all([
      entitlementService.checkCanCreateNewOperation(active.shopId, active.now),
      entitlementService.checkCanCreateNewOperation(expired.shopId, expired.now),
    ]);

    if (!activeResult.allowed) {
      throw new Error("Tenant isolation failed: active shop was denied.");
    }
    if (expiredResult.allowed || expiredResult.code !== "SUBSCRIPTION_EXPIRED") {
      throw new Error("Tenant isolation failed: expired shop was not independently denied.");
    }

    console.log("✅ Tenant isolation: active shop remains allowed while expired shop is independently denied");
  } finally {
    await cleanupShop(active.shopId);
    await cleanupShop(expired.shopId);
  }
}

async function main() {
  const url = assertLocalDatabaseSafety();
  console.log(
    `🔒 Local integration safety gate passed: ${url.hostname}:${url.port || "5432"}${url.pathname}`,
  );
  console.log("   No production/remote database is permitted by this harness.\n");

  await assertRequiredSchema();
  await testUnlimitedRepairCreation();
  await testFiveSeatLimit();
  await testTenantSubscriptionIsolation();

  console.log("\n✅ All local PostgreSQL single-plan subscription integration tests passed.");
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

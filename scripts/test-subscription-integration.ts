import { randomUUID } from "node:crypto";
import {
  PrismaClient,
  SubscriptionBillingInterval,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";
import {
  incrementCompatibilitySearchEnforced,
  toUtcDateOnly,
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
  const rows = await prisma.$queryRaw<Array<{ compatibility_table: string | null; grace_column: string | null }>>`
    SELECT
      to_regclass('public."CompatibilitySearchUsage"')::text AS compatibility_table,
      (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Subscription'
          AND column_name = 'gracePeriodEndsAt'
        LIMIT 1
      ) AS grace_column
  `;

  if (!rows[0]?.compatibility_table || !rows[0]?.grace_column) {
    throw new Error(
      "Local test database is missing entitlement migrations. Apply migrations to the LOCAL disposable database only, then retry.",
    );
  }
}

function addUtcDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function createBasicShopFixture(prefix: string) {
  const shopId = randomUUID();
  const now = new Date();

  await prisma.shop.create({
    data: {
      id: shopId,
      name: `${prefix}-${shopId.slice(0, 8)}`,
      countryCode: "TR",
      currency: "TRY",
      subscription: {
        create: {
          plan: SubscriptionPlan.BASIC,
          status: SubscriptionStatus.ACTIVE,
          billingInterval: SubscriptionBillingInterval.SIX_MONTHS,
          trialStartedAt: addUtcDays(now, -30),
          trialEndsAt: addUtcDays(now, -16),
          currentPeriodStartedAt: addUtcDays(now, -1),
          currentPeriodEndsAt: addUtcDays(now, 30),
          activatedAt: addUtcDays(now, -1),
        },
      },
    },
  });

  return { shopId, now };
}

async function cleanupShop(shopId: string) {
  await prisma.shop.delete({ where: { id: shopId } }).catch(() => undefined);
}

async function testCompatibilityConcurrency() {
  const { shopId, now } = await createBasicShopFixture("integration-compat");

  try {
    const attempts = await Promise.all(
      Array.from({ length: 20 }, () =>
        incrementCompatibilitySearchEnforced(shopId, 10, now),
      ),
    );

    const successes = attempts.filter((value) => value !== null);
    const denials = attempts.filter((value) => value === null);
    const row = await prisma.compatibilitySearchUsage.findUnique({
      where: {
        shopId_usageDate: {
          shopId,
          usageDate: toUtcDateOnly(now),
        },
      },
      select: { searchCount: true },
    });

    if (successes.length !== 10) {
      throw new Error(`Compatibility race failed: expected 10 successes, got ${successes.length}.`);
    }
    if (denials.length !== 10) {
      throw new Error(`Compatibility race failed: expected 10 denials, got ${denials.length}.`);
    }
    if (row?.searchCount !== 10) {
      throw new Error(`Compatibility race failed: persisted count is ${row?.searchCount ?? "missing"}, expected 10.`);
    }

    console.log("✅ Compatibility concurrency: 20 simultaneous attempts => exactly 10 accepted, persisted count=10");
  } finally {
    await cleanupShop(shopId);
  }
}

async function testRepairOrderConcurrency() {
  const { shopId, now } = await createBasicShopFixture("integration-repair");

  try {
    await prisma.repairOrder.createMany({
      data: Array.from({ length: 99 }, (_, index) => ({
        shopId,
        ticketNumber: `IT-${String(index + 1).padStart(3, "0")}`,
        reportedIssue: "integration concurrency fixture",
        createdAt: now,
      })),
    });

    let ticketSequence = 100;
    const createAttempt = () =>
      withRepairOrderLimitGuard(
        shopId,
        async () => {
          // Intentionally use the global Prisma client rather than the transaction
          // client. This mirrors the production repair-order action, where the
          // advisory lock must remain effective while the existing service performs
          // its own database workflow/transaction.
          const ticketNumber = `IT-${ticketSequence++}`;
          return prisma.repairOrder.create({
            data: {
              shopId,
              ticketNumber,
              reportedIssue: "integration concurrent create",
              createdAt: now,
            },
            select: { id: true, ticketNumber: true },
          });
        },
        now,
      );

    const outcomes = await Promise.all([createAttempt(), createAttempt()]);
    const accepted = outcomes.filter((result) => "result" in result);
    const denied = outcomes.filter(
      (result) => "denied" in result && result.denied && result.code === "REPAIR_LIMIT_REACHED",
    );

    const finalCount = await prisma.repairOrder.count({
      where: { shopId, deletedAt: null },
    });

    if (accepted.length !== 1) {
      throw new Error(`Repair race failed: expected exactly 1 accepted create, got ${accepted.length}.`);
    }
    if (denied.length !== 1) {
      throw new Error(`Repair race failed: expected exactly 1 limit denial, got ${denied.length}.`);
    }
    if (finalCount !== 100) {
      throw new Error(`Repair race failed: final count is ${finalCount}, expected exactly 100.`);
    }

    console.log("✅ Repair concurrency: 99 existing + 2 simultaneous creates => exactly 1 accepted, final count=100");
  } finally {
    await cleanupShop(shopId);
  }
}

async function testTenantIsolation() {
  const a = await createBasicShopFixture("integration-tenant-a");
  const b = await createBasicShopFixture("integration-tenant-b");

  try {
    await Promise.all(
      Array.from({ length: 10 }, () =>
        incrementCompatibilitySearchEnforced(a.shopId, 10, a.now),
      ),
    );

    const bFirstSearch = await incrementCompatibilitySearchEnforced(b.shopId, 10, b.now);
    const [aRow, bRow] = await Promise.all([
      prisma.compatibilitySearchUsage.findUnique({
        where: { shopId_usageDate: { shopId: a.shopId, usageDate: toUtcDateOnly(a.now) } },
        select: { searchCount: true },
      }),
      prisma.compatibilitySearchUsage.findUnique({
        where: { shopId_usageDate: { shopId: b.shopId, usageDate: toUtcDateOnly(b.now) } },
        select: { searchCount: true },
      }),
    ]);

    if (aRow?.searchCount !== 10 || bRow?.searchCount !== 1 || bFirstSearch !== 1) {
      throw new Error(
        `Tenant isolation failed: shopA=${aRow?.searchCount ?? "missing"}, shopB=${bRow?.searchCount ?? "missing"}.`,
      );
    }

    console.log("✅ Tenant isolation: shop A at 10 does not affect shop B; shop B starts at 1");
  } finally {
    await cleanupShop(a.shopId);
    await cleanupShop(b.shopId);
  }
}

async function main() {
  const url = assertLocalDatabaseSafety();
  console.log(
    `🔒 Local integration safety gate passed: ${url.hostname}:${url.port || "5432"}${url.pathname}`,
  );
  console.log("   No production/remote database is permitted by this harness.\n");

  await assertRequiredSchema();
  await testCompatibilityConcurrency();
  await testRepairOrderConcurrency();
  await testTenantIsolation();

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

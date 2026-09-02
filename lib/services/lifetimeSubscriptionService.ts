import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type LifetimePriceRow = {
  id: string;
  countryCode: string;
  currencyCode: string;
  amount: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
};

let tableReady: Promise<void> | null = null;

async function createTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LifetimeSubscriptionPrice" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "countryCode" VARCHAR(2) NOT NULL UNIQUE,
      "currencyCode" VARCHAR(3) NOT NULL,
      "amount" DECIMAL(12,2) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "LifetimeSubscriptionPrice_countryCode_idx" ON "LifetimeSubscriptionPrice"("countryCode")`);
}

async function ensureTable() {
  if (!tableReady) {
    tableReady = createTable().catch((error) => {
      tableReady = null;
      throw error;
    });
  }
  await tableReady;
}

export async function listLifetimePrices() {
  await ensureTable();
  return prisma.$queryRaw<LifetimePriceRow[]>`
    SELECT "id", "countryCode", "currencyCode", "amount", "createdAt", "updatedAt"
    FROM "LifetimeSubscriptionPrice"
    ORDER BY "countryCode" ASC
  `;
}

export async function getLifetimePriceForCountry(countryCode: string) {
  await ensureTable();
  const rows = await prisma.$queryRaw<LifetimePriceRow[]>`
    SELECT "id", "countryCode", "currencyCode", "amount", "createdAt", "updatedAt"
    FROM "LifetimeSubscriptionPrice"
    WHERE "countryCode" IN (${countryCode}, 'ZZ')
    ORDER BY CASE WHEN "countryCode" = ${countryCode} THEN 0 ELSE 1 END
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export const lifetimeSubscriptionService = {
  listLifetimePrices,
  getLifetimePriceForCountry,
};

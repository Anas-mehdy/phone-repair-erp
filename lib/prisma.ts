import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Every Vercel function instance owns its own Prisma pool. Keep one connection per
// instance so concurrent functions do not exhaust Supavisor's client limit.
function productionDatabaseUrl(value: string): string {
  if (process.env.NODE_ENV !== "production") return value;

  const url = new URL(value);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") return value;
  url.searchParams.set("connection_limit", "1");
  return url.toString();
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(process.env.DATABASE_URL
      ? { datasources: { db: { url: productionDatabaseUrl(process.env.DATABASE_URL) } } }
      : {}),
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

// Reuse the pool within the same serverless instance.
globalForPrisma.prisma = prisma;

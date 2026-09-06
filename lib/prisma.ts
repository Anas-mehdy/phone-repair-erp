import { PrismaClient } from "@prisma/client";

// Safety rail for branch previews: Preview deployments must not talk to the project's
// configured database unless an isolated preview database was explicitly enabled.
// This branch-level guard lets Vercel build the app without risking runtime reads/writes
// against production when Preview environment variables still point there.
if (process.env.VERCEL_ENV === "preview" && process.env.MASSAR_ALLOW_PREVIEW_DATABASE !== "true") {
  process.env.DATABASE_URL =
    "postgresql://preview_disabled:preview_disabled@127.0.0.1:65432/preview_disabled?connect_timeout=1";
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

// Keep client warm across all serverless invocations
globalForPrisma.prisma = prisma;

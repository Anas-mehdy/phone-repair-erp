"use server";

import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth/context";

export async function markTutorialBannerSeenAction() {
  const auth = await getAuthContext();

  await prisma.$executeRaw`
    UPDATE "User"
    SET "tutorialBannerSeenAt" = COALESCE("tutorialBannerSeenAt", NOW())
    WHERE "id" = ${auth.user.id}::uuid
      AND "deletedAt" IS NULL
  `;

  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { captureServerEvent } from "@/lib/analytics/server";
import { onboardingDestination, shouldEnterOnboarding } from "@/lib/onboarding/navigation";
import { onboardingService } from "@/lib/services/onboardingService";
import { prisma } from "@/lib/prisma";

export type OnboardingActionState = {
  error: string | null;
};


async function requirePendingOwnerOnboarding() {
  const auth = await getAuthContext();
  if (auth.membership.role !== "OWNER") {
    throw new Error("إعداد المتجر الأولي متاح لمالك المتجر فقط.");
  }

  const profile = await onboardingService.getOnboardingProfile(auth.shop.id);
  if (!shouldEnterOnboarding(profile)) {
    return { auth, profile: null as null };
  }

  return { auth, profile };
}

async function retireLegacyTutorialBanner(userId: string) {
  await prisma.$executeRaw`
    UPDATE "User"
    SET "tutorialBannerSeenAt" = COALESCE("tutorialBannerSeenAt", NOW())
    WHERE "id" = ${userId}::uuid AND "deletedAt" IS NULL
  `;
}

export async function completeOnboardingAction(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  try {
    const pending = await requirePendingOwnerOnboarding();
    if (!pending.profile) redirect("/dashboard");

    const selectedJobs = formData.getAll("selectedJobs");
    const primaryJob = formData.get("primaryJob");

    const saved = await onboardingService.saveOnboardingPreferences(
      pending.auth.shop.id,
      { selectedJobs, primaryJob },
    );
    await onboardingService.markOnboardingCompleted(pending.auth.shop.id);
    await retireLegacyTutorialBanner(pending.auth.user.id);

    await captureServerEvent({
      event: ANALYTICS_EVENTS.ONBOARDING_COMPLETED,
      distinctId: pending.auth.user.id,
      shopId: pending.auth.shop.id,
      countryCode: pending.auth.shop.countryCode,
      properties: {
        flow_version: saved.flowVersion,
        primary_job: saved.primaryJob,
        selected_jobs: saved.selectedJobs.join(","),
        selected_jobs_count: saved.selectedJobs.length,
      },
    });

    revalidatePath("/dashboard");
    redirect(onboardingDestination(saved.primaryJob as Parameters<typeof onboardingDestination>[0]));
  } catch (error) {
    const digest = typeof error === "object" && error && "digest" in error ? String((error as { digest?: unknown }).digest ?? "") : "";
    if (digest.startsWith("NEXT_REDIRECT")) throw error;

    return {
      error: error instanceof Error ? error.message : "تعذر حفظ إعداد البداية. حاول مرة أخرى.",
    };
  }
}

export async function skipOnboardingAction() {
  const pending = await requirePendingOwnerOnboarding();
  if (!pending.profile) redirect("/dashboard");

  await onboardingService.markOnboardingSkipped(pending.auth.shop.id);
  await retireLegacyTutorialBanner(pending.auth.user.id);

  await captureServerEvent({
    event: ANALYTICS_EVENTS.ONBOARDING_SKIPPED,
    distinctId: pending.auth.user.id,
    shopId: pending.auth.shop.id,
    countryCode: pending.auth.shop.countryCode,
    properties: {
      flow_version: pending.profile.flowVersion,
    },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

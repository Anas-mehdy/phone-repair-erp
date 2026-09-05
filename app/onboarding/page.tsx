import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/app/onboarding/onboarding-wizard";
import { getAuthContext } from "@/lib/auth/context";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { captureServerEvent } from "@/lib/analytics/server";
import { isOnboardingJob, normalizeOnboardingJobs } from "@/lib/onboarding/jobs";
import { shouldEnterOnboarding } from "@/lib/onboarding/navigation";
import { onboardingService } from "@/lib/services/onboardingService";
import { growthExperimentService } from "@/lib/services/growthExperimentService";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "إعداد مسار | البداية" };

export default async function OnboardingPage() {
  const auth = await getAuthContext();
  if (auth.membership.role !== "OWNER") redirect("/dashboard");

  const profile = await onboardingService.getOnboardingProfile(auth.shop.id);
  if (!profile || !shouldEnterOnboarding(profile)) redirect("/dashboard");

  const firstExposure = !profile.startedAt;
  const currentProfile = firstExposure
    ? await onboardingService.markOnboardingStarted(auth.shop.id)
    : profile;

  if (firstExposure) {
    await captureServerEvent({
      event: ANALYTICS_EVENTS.ONBOARDING_STARTED,
      distinctId: auth.user.id,
      shopId: auth.shop.id,
      countryCode: auth.shop.countryCode,
      properties: { flow_version: currentProfile.flowVersion },
    });
  }

  const initialSelectedJobs = normalizeOnboardingJobs(currentProfile.selectedJobs);
  const initialPrimaryJob = isOnboardingJob(currentProfile.primaryJob) && initialSelectedJobs.includes(currentProfile.primaryJob)
    ? currentProfile.primaryJob
    : null;

  const experiment = await growthExperimentService.exposeOnboardingValueCopy(auth.shop.id);
  if (experiment.active && experiment.firstExposure) {
    await captureServerEvent({
      event: ANALYTICS_EVENTS.EXPERIMENT_EXPOSED,
      distinctId: auth.user.id,
      shopId: auth.shop.id,
      countryCode: auth.shop.countryCode,
      includeAcquisition: false,
      properties: {
        experiment_key: experiment.experimentKey,
        experiment_variant: experiment.variant,
        flow_version: currentProfile.flowVersion,
      },
    });
  }

  return (
    <OnboardingWizard
      userName={auth.user.name || ""}
      initialSelectedJobs={initialSelectedJobs}
      initialPrimaryJob={initialPrimaryJob}
      experimentVariant={experiment.variant}
    />
  );
}

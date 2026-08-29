import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { calculateDiscountedPrice } from "@/lib/subscription/offer-pricing";

export { calculateDiscountedPrice };
export const DEFAULT_OFFER_ID = "FOUNDERS_OFFER";

export interface SubscriptionOfferData {
  id: string;
  isActive: boolean;
  totalEligible: number;
  remainingEligible: number;
  claimedEligible: number;
  sixMonthsDiscountPercent: number;
  annualDiscountPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateOfferSettingsInput {
  isActive: boolean;
  totalEligible: number;
  remainingEligible: number;
  sixMonthsDiscountPercent: number;
  annualDiscountPercent: number;
}



/**
 * Validates offer bounds:
 * - totalEligible between 1 and 100,000
 * - remainingEligible between 0 and totalEligible
 * - discounts between 0 and 100
 */
export function validateOfferSettings(input: UpdateOfferSettingsInput): {
  valid: boolean;
  error?: string;
} {
  if (typeof input.isActive !== "boolean") {
    return { valid: false, error: "حالة تفعيل العرض غير صحيحة." };
  }

  if (
    !Number.isInteger(input.totalEligible) ||
    input.totalEligible < 1 ||
    input.totalEligible > 100000
  ) {
    return {
      valid: false,
      error: "إجمالي العدد المؤهل يجب أن يكون رقماً صحيحاً بين 1 و 100,000.",
    };
  }

  if (
    !Number.isInteger(input.remainingEligible) ||
    input.remainingEligible < 0 ||
    input.remainingEligible > input.totalEligible
  ) {
    return {
      valid: false,
      error:
        "العدد المتبقي يجب أن يكون رقماً صحيحاً بين 0 وإجمالي العدد المؤهل.",
    };
  }

  if (
    !Number.isInteger(input.sixMonthsDiscountPercent) ||
    input.sixMonthsDiscountPercent < 0 ||
    input.sixMonthsDiscountPercent > 100
  ) {
    return {
      valid: false,
      error: "نسبة خصم 6 أشهر يجب أن تكون نسبة مئوية بين 0 و 100.",
    };
  }

  if (
    !Number.isInteger(input.annualDiscountPercent) ||
    input.annualDiscountPercent < 0 ||
    input.annualDiscountPercent > 100
  ) {
    return {
      valid: false,
      error: "نسبة خصم السنة يجب أن تكون نسبة مئوية بين 0 و 100.",
    };
  }

  return { valid: true };
}

/**
 * Reads the singleton subscription offer settings (READ-ONLY, no DB writes).
 * Returns safe in-memory defaults if row is not yet created.
 */
export async function getOfferSettings(): Promise<SubscriptionOfferData> {
  const row = await prisma.subscriptionOfferSettings.findUnique({
    where: { id: DEFAULT_OFFER_ID },
  });

  if (!row) {
    return {
      id: DEFAULT_OFFER_ID,
      isActive: true,
      totalEligible: 50,
      remainingEligible: 50,
      claimedEligible: 0,
      sixMonthsDiscountPercent: 0,
      annualDiscountPercent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  return {
    id: row.id,
    isActive: row.isActive,
    totalEligible: row.totalEligible,
    remainingEligible: row.remainingEligible,
    claimedEligible: Math.max(0, row.totalEligible - row.remainingEligible),
    sixMonthsDiscountPercent: row.sixMonthsDiscountPercent,
    annualDiscountPercent: row.annualDiscountPercent,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}


/**
 * Super Admin mutation to manually update marketing offer settings.
 */
export async function updateOfferSettings(
  input: UpdateOfferSettingsInput,
): Promise<SubscriptionOfferData> {
  await requireSuperAdmin();

  const validation = validateOfferSettings(input);
  if (!validation.valid) {
    throw new Error(validation.error || "بيانات العرض غير صحيحة.");
  }

  const updated = await prisma.subscriptionOfferSettings.upsert({
    where: { id: DEFAULT_OFFER_ID },
    create: {
      id: DEFAULT_OFFER_ID,
      isActive: input.isActive,
      totalEligible: input.totalEligible,
      remainingEligible: input.remainingEligible,
      sixMonthsDiscountPercent: input.sixMonthsDiscountPercent,
      annualDiscountPercent: input.annualDiscountPercent,
    },
    update: {
      isActive: input.isActive,
      totalEligible: input.totalEligible,
      remainingEligible: input.remainingEligible,
      sixMonthsDiscountPercent: input.sixMonthsDiscountPercent,
      annualDiscountPercent: input.annualDiscountPercent,
    },
  });

  return {
    id: updated.id,
    isActive: updated.isActive,
    totalEligible: updated.totalEligible,
    remainingEligible: updated.remainingEligible,
    claimedEligible: Math.max(0, updated.totalEligible - updated.remainingEligible),
    sixMonthsDiscountPercent: updated.sixMonthsDiscountPercent,
    annualDiscountPercent: updated.annualDiscountPercent,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

export const subscriptionOfferService = {
  getOfferSettings,
  updateOfferSettings,
  calculateDiscountedPrice,
  validateOfferSettings,
};

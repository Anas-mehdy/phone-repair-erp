/**
 * Pure price discount calculator, offer data interfaces, and resolution logic.
 * Safe for both Client Components and Server Components (no server imports).
 */

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

export interface SubscriptionFoundersOfferSnapshot {
  foundersOfferEligible: boolean;
  foundersOfferGrantedAt?: Date | string | null;
  foundersOfferSixMonthsDiscountPercent?: number | null;
  foundersOfferAnnualDiscountPercent?: number | null;
}

export interface EffectiveShopOffer {
  isEligible: boolean;
  isFrozen: boolean;
  sixMonthsDiscountPercent: number;
  annualDiscountPercent: number;
}

export function calculateDiscountedPrice(basePrice: number, discountPercent: number): number {
  if (basePrice <= 0) return 0;
  if (!discountPercent || discountPercent <= 0) return basePrice;
  if (discountPercent >= 100) return 0;
  const discounted = basePrice * (1 - discountPercent / 100);
  return Math.round((discounted + Number.EPSILON) * 100) / 100;
}

/**
 * Resolves regular-plan discounts independently from the lifetime quota.
 * The manual total/remaining counters are reserved for the Lifetime offer UI.
 */
export function resolveEffectiveOffer(
  subscription: SubscriptionFoundersOfferSnapshot | null | undefined,
  globalOffer: {
    isActive: boolean;
    remainingEligible: number;
    sixMonthsDiscountPercent: number;
    annualDiscountPercent: number;
  },
): EffectiveShopOffer {
  if (subscription?.foundersOfferEligible) {
    return {
      isEligible: true,
      isFrozen: true,
      sixMonthsDiscountPercent: subscription.foundersOfferSixMonthsDiscountPercent ?? 0,
      annualDiscountPercent: subscription.foundersOfferAnnualDiscountPercent ?? 0,
    };
  }

  // Global regular-plan discounts no longer depend on remainingEligible.
  // This preserves existing pricing while freeing the manual quota for Lifetime only.
  if (globalOffer.sixMonthsDiscountPercent > 0 || globalOffer.annualDiscountPercent > 0) {
    return {
      isEligible: true,
      isFrozen: false,
      sixMonthsDiscountPercent: globalOffer.sixMonthsDiscountPercent,
      annualDiscountPercent: globalOffer.annualDiscountPercent,
    };
  }

  return {
    isEligible: false,
    isFrozen: false,
    sixMonthsDiscountPercent: 0,
    annualDiscountPercent: 0,
  };
}

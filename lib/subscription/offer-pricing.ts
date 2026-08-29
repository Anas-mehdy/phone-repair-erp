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

export function calculateDiscountedPrice(
  basePrice: number,
  discountPercent: number,
): number {
  if (basePrice <= 0) return 0;
  if (!discountPercent || discountPercent <= 0) return basePrice;
  if (discountPercent >= 100) return 0;

  const discounted = basePrice * (1 - discountPercent / 100);
  return Math.round((discounted + Number.EPSILON) * 100) / 100;
}

/**
 * Resolves whether a shop gets a frozen discount, a global offer discount, or no discount.
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
  // A. If shop has already been granted the founders offer (frozen):
  if (subscription?.foundersOfferEligible) {
    return {
      isEligible: true,
      isFrozen: true,
      sixMonthsDiscountPercent:
        subscription.foundersOfferSixMonthsDiscountPercent ?? 0,
      annualDiscountPercent:
        subscription.foundersOfferAnnualDiscountPercent ?? 0,
    };
  }

  // B. If prospective global offer is active and remaining quota > 0:
  if (globalOffer.isActive && globalOffer.remainingEligible > 0) {
    return {
      isEligible: true,
      isFrozen: false,
      sixMonthsDiscountPercent: globalOffer.sixMonthsDiscountPercent,
      annualDiscountPercent: globalOffer.annualDiscountPercent,
    };
  }

  // C. Otherwise, not eligible and no discount
  return {
    isEligible: false,
    isFrozen: false,
    sixMonthsDiscountPercent: 0,
    annualDiscountPercent: 0,
  };
}

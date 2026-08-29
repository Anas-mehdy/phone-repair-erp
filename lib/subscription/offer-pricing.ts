/**
 * Pure price discount calculator and offer data interfaces.
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

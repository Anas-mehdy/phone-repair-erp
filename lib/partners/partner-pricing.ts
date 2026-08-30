export type PartnerBillingInterval = "SIX_MONTHS" | "ANNUAL";

export interface PartnerWholesalePriceInput {
  baseAmount: number;
  discountPercent: number;
  currencyCode: string;
}

export interface PartnerWholesalePriceResult {
  baseAmount: number;
  discountPercent: number;
  discountAmount: number;
  payableAmount: number;
  currencyCode: string;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculatePartnerWholesalePrice(
  input: PartnerWholesalePriceInput,
): PartnerWholesalePriceResult {
  const baseAmount = Number(input.baseAmount);
  const discountPercent = Number(input.discountPercent);
  const currencyCode = input.currencyCode.trim().toUpperCase();

  if (!Number.isFinite(baseAmount) || baseAmount < 0) {
    throw new Error("السعر الأساسي غير صالح.");
  }

  if (
    !Number.isFinite(discountPercent) ||
    discountPercent < 0 ||
    discountPercent > 100
  ) {
    throw new Error("نسبة خصم الوكيل يجب أن تكون بين 0 و100.");
  }

  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new Error("رمز العملة غير صالح.");
  }

  const normalizedBase = roundMoney(baseAmount);
  const normalizedDiscount = roundMoney(discountPercent);
  const discountAmount = roundMoney(
    normalizedBase * (normalizedDiscount / 100),
  );
  const payableAmount = roundMoney(
    Math.max(0, normalizedBase - discountAmount),
  );

  return {
    baseAmount: normalizedBase,
    discountPercent: normalizedDiscount,
    discountAmount,
    payableAmount,
    currencyCode,
  };
}

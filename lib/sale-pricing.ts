import { Prisma } from "@prisma/client";

// Compare the amounts that will actually be stored (money: 2 decimals,
// inventory cost: up to 6). Never round cost down to the currency precision.
export function calculateSaleLine(unitPrice: Prisma.Decimal.Value, quantity: number, discount: Prisma.Decimal.Value = "0") {
  const price = new Prisma.Decimal(unitPrice).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const discountTotal = new Prisma.Decimal(discount).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || !price.isFinite() || price.lt(0) || !discountTotal.isFinite() || discountTotal.lt(0)) {
    throw new Error("سعر أو كمية أو خصم بند البيع غير صالح.");
  }
  const subtotal = price.mul(quantity);
  const lineTotal = subtotal.sub(discountTotal);
  if (lineTotal.lt(0)) throw new Error("خصم البند لا يمكن أن يتجاوز قيمته.");
  return { unitPrice: price, subtotal, discountTotal, lineTotal };
}

export function assertSaleCoversCost(name: string, unitCost: Prisma.Decimal | null, quantity: number, lineTotal: Prisma.Decimal) {
  if (unitCost === null) throw new Error(`تكلفة الصنف «${name}» غير مسجلة. سجّل تكلفة الوحدة في المخزون قبل البيع.`);
  if (!unitCost.isFinite() || unitCost.lt(0)) throw new Error(`تكلفة الصنف «${name}» غير صالحة. صحّحها في المخزون قبل البيع.`);
  if (lineTotal.lt(unitCost.mul(quantity))) {
    throw new Error(`لا يمكن بيع الصنف «${name}» بأقل من التكلفة بعد الخصم. ارفع السعر أو خفّض الخصم.`);
  }
}

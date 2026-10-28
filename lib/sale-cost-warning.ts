// Immediate form feedback; the server always rechecks using database costs and
// exact Decimal arithmetic, including when costs changed after the form loaded.
export function saleCostWarning(unitCost: string | null, quantity: number, unitPrice: string, discount = "0"): string | null {
  if (unitCost === null) return "تكلفة الصنف غير مسجلة. سجّل تكلفة الوحدة في المخزون قبل البيع.";
  const cost = Number(unitCost);
  if (!Number.isFinite(cost) || cost < 0) return "تكلفة الصنف غير صالحة. صحّحها في المخزون قبل البيع.";
  const price = Math.round(Number(unitPrice || 0) * 100) / 100;
  const reduction = Math.round(Number(discount || 0) * 100) / 100;
  const total = price * quantity - reduction;
  const costTotal = cost * quantity;
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(total), Math.abs(costTotal)) * 4;
  return total < costTotal - tolerance
    ? "لا يمكن البيع بأقل من التكلفة بعد الخصم. ارفع السعر أو خفّض الخصم."
    : null;
}

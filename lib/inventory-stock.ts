/** Individually tracked phones are sold once, rather than replenished by threshold. */
export function isLowStock(quantity: number, reorderLevel: number, isDevice = false) {
  return !isDevice && quantity <= reorderLevel;
}

export function inventoryStockLabel(quantity: number, reorderLevel: number, isDevice = false) {
  if (isDevice && quantity <= 0) return "غير متوفر";
  return isLowStock(quantity, reorderLevel, isDevice) ? "مخزون منخفض" : "متوفر";
}

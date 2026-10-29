export function inventoryDeviceSummary(item: { isDevice: boolean; deviceModel: string | null; deviceCondition: string | null; storageCapacity: string | null; batteryHealth: number | null }) {
  if (!item.isDevice) return null;
  const condition = item.deviceCondition === "NEW" ? "جديد" : item.deviceCondition === "USED" ? "مستعمل" : "مجدد";
  return [item.deviceModel, condition, item.storageCapacity, item.batteryHealth === null ? null : `Battery ${item.batteryHealth}%`].filter(Boolean).join(" • ");
}

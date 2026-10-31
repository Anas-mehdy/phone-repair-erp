import { z } from "zod";

export const DEVICE_CONDITIONS = { NEW: "جديد", USED: "مستعمل", REFURBISHED: "مجدد" } as const;
export const DEVICE_CONDITIONS_EN = { NEW: "New", USED: "Used", REFURBISHED: "Refurbished" } as const;
export const PHONE_STORAGE_OPTIONS = ["32 GB", "64 GB", "128 GB", "256 GB", "512 GB", "1 TB", "2 TB", "4 TB"] as const;
export type DeviceDetails = {
  isDevice: boolean;
  deviceModel: string | null;
  deviceCondition: keyof typeof DEVICE_CONDITIONS | null;
  batteryHealth: number | null;
  storageCapacity: string | null;
  deviceIdentifier: string | null;
  deviceColor?: string | null;
  deviceNotes?: string | null;
};
export const EMPTY_DEVICE_DETAILS: DeviceDetails = { isDevice: false, deviceModel: null, deviceCondition: null, batteryHealth: null, storageCapacity: null, deviceIdentifier: null, deviceColor: null, deviceNotes: null };
const nullableText = z.string().trim().transform((value) => value || null).nullable().optional();
export const deviceInputSchema = z.object({
  isDevice: z.boolean(),
  deviceModel: nullableText,
  deviceCondition: z.enum(["NEW", "USED", "REFURBISHED"]).nullable().optional(),
  batteryHealth: z.number().int("صحة البطارية يجب أن تكون رقماً صحيحاً.").min(0, "صحة البطارية من 0 إلى 100 بالمئة.").max(100, "صحة البطارية من 0 إلى 100 بالمئة.").nullable().optional(),
  storageCapacity: nullableText,
  deviceIdentifier: nullableText,
  deviceColor: z.string().trim().max(60, "اللون يجب ألا يتجاوز 60 حرفاً.").nullable().optional(),
  deviceNotes: z.string().trim().max(2000, "ملاحظات الحالة يجب ألا تتجاوز 2000 حرف.").nullable().optional(),
});
export function normalizeDeviceDetails(raw?: unknown): DeviceDetails {
  if (raw == null) return { ...EMPTY_DEVICE_DETAILS };
  const parsed = deviceInputSchema.parse(raw);
  if (!parsed.isDevice) return { ...EMPTY_DEVICE_DETAILS };
  const deviceModel = parsed.deviceModel?.replace(/\s+/g, " ") ?? "";
  const storageCapacity = parsed.storageCapacity?.replace(/\s+/g, " ").toUpperCase() ?? "";
  const deviceIdentifier = parsed.deviceIdentifier?.replace(/\s+/g, "").toUpperCase() || null;
  if (!deviceModel || deviceModel.length > 80) throw new Error("أدخل موديل الجهاز بحد أقصى 80 حرفاً.");
  if (!parsed.deviceCondition) throw new Error("اختر حالة الجهاز: جديد أو مستعمل أو مجدد.");
  if (!/^\d{1,5}(?:\.\d{1,2})?\s?(?:GB|TB)$/.test(storageCapacity) || Number.parseFloat(storageCapacity) <= 0) throw new Error("أدخل سعة الجهاز مثل 256 GB أو 1 TB.");
  if (deviceIdentifier && !/^[A-Z0-9-]{4,40}$/.test(deviceIdentifier)) throw new Error("رقم IMEI / Serial يجب أن يحتوي من 4 إلى 40 حرفاً أو رقماً بالإنكليزية.");
  return { isDevice: true, deviceModel, deviceCondition: parsed.deviceCondition, batteryHealth: parsed.batteryHealth ?? null, storageCapacity, deviceIdentifier, deviceColor: parsed.deviceColor || null, deviceNotes: parsed.deviceNotes || null };
}

/** The manual used-phone flow uses the inventory name as its model. */
export function normalizeInventoryDeviceDetails(name: string, raw?: unknown): DeviceDetails {
  if (raw && typeof raw === "object" && "isDevice" in raw && raw.isDevice === true && "deviceCondition" in raw && raw.deviceCondition === "USED") {
    return normalizeDeviceDetails({ ...raw, deviceModel: name });
  }
  return normalizeDeviceDetails(raw);
}
export function assertDeviceQuantity(isDevice: boolean, quantity: number) {
  if (isDevice && (!Number.isInteger(quantity) || quantity < 0 || quantity > 1)) throw new Error("لكل جهاز سجل وباركود مستقل وكمية واحدة فقط. أضف الأجهزة الأخرى كسطور منفصلة.");
}
export function normalizeDeviceBarcode(raw?: string | null) {
  const barcode = raw?.trim() || null;
  if (barcode && !/^[\x21-\x7e]{1,24}$/.test(barcode)) throw new Error("باركود الجهاز يجب أن يكون من 1 إلى 24 حرفاً أو رقماً بالإنكليزية وبدون فراغات، ليُطبع ويُقرأ بوضوح.");
  return barcode;
}

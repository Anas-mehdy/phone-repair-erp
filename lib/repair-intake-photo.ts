/**
 * Intake evidence lives in a separate table so ordinary ticket reads never load binary data.
 * All reads go through a shop-scoped, permission-protected route.
 */
export const MAX_REPAIR_INTAKE_PHOTO_BYTES = 2 * 1024 * 1024;
const VALID_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function hasValidSignature(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (type === "image/png") {
    return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
  }
  if (type === "image/webp") {
    return bytes.length >= 12 &&
      [82, 73, 70, 70].every((b, i) => bytes[i] === b) &&
      [87, 69, 66, 80].every((b, i) => bytes[i + 8] === b);
  }
  return false;
}

export async function readRepairIntakePhoto(entry: FormDataEntryValue | null) {
  if (entry === null) return undefined;
  if (typeof entry === "string") throw new Error("ملف صورة الاستلام غير صالح.");
  if (entry.size === 0) return undefined;
  if (entry.size > MAX_REPAIR_INTAKE_PHOTO_BYTES) {
    throw new Error("حجم صورة الاستلام يجب ألا يتجاوز 2 ميغابايت.");
  }
  if (!VALID_TYPES.has(entry.type)) {
    throw new Error("صيغة صورة الاستلام غير مدعومة. اختر JPG أو PNG أو WebP.");
  }

  const fileData = new Uint8Array(await entry.arrayBuffer());
  if (!hasValidSignature(fileData, entry.type)) {
    throw new Error("لم نتمكن من التحقق من صيغة صورة الاستلام.");
  }

  return {
    fileName: entry.name.slice(0, 160) || "intake-photo",
    mimeType: entry.type,
    fileSize: fileData.byteLength,
    fileData,
  };
}

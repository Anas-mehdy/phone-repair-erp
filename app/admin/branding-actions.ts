"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { platformBrandingService } from "@/lib/services/platformBrandingService";

export type BrandingActionState = {
  success: boolean;
  message?: string;
  error?: string;
  version?: string | null;
};

const MAX_LOGO_BYTES = 900 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/webp", "image/jpeg"]);

function hasValidImageSignature(bytes: Buffer, mimeType: string) {
  if (mimeType === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (mimeType === "image/webp") {
    return (
      bytes.length >= 12 &&
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  return false;
}

function revalidateBranding() {
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/api/branding/dark-logo");
}

export async function adminUploadDarkModeLogoAction(
  _previousState: BrandingActionState,
  formData: FormData,
): Promise<BrandingActionState> {
  await requireSuperAdmin();

  try {
    const entry = formData.get("darkLogo");

    if (!(entry instanceof File) || entry.size === 0) {
      return { success: false, error: "اختر صورة لوغو أولاً." };
    }

    if (!ALLOWED_MIME_TYPES.has(entry.type)) {
      return {
        success: false,
        error: "الصيغ المدعومة هي PNG أو WebP أو JPG فقط.",
      };
    }

    if (entry.size > MAX_LOGO_BYTES) {
      return {
        success: false,
        error: "حجم الصورة يجب ألا يتجاوز 900 كيلوبايت.",
      };
    }

    const bytes = Buffer.from(await entry.arrayBuffer());

    if (!hasValidImageSignature(bytes, entry.type)) {
      return {
        success: false,
        error: "محتوى الملف لا يطابق صيغة الصورة المختارة.",
      };
    }

    const updatedAt = await platformBrandingService.setDarkModeLogo(
      bytes.toString("base64"),
      entry.type,
    );

    revalidateBranding();

    return {
      success: true,
      message: "تم اعتماد لوغو الدارك مود الجديد بنجاح.",
      version: updatedAt.toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "تعذر رفع لوغو الدارك مود.",
    };
  }
}

export async function adminClearDarkModeLogoAction(
  _previousState: BrandingActionState,
  _formData: FormData,
): Promise<BrandingActionState> {
  await requireSuperAdmin();

  try {
    await platformBrandingService.clearDarkModeLogo();
    revalidateBranding();

    return {
      success: true,
      message: "تم حذف اللوغو المخصص والعودة إلى اللوغو الافتراضي.",
      version: null,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "تعذر حذف لوغو الدارك مود.",
    };
  }
}

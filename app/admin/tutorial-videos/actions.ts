"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { tutorialVideoService } from "@/lib/services/tutorialVideoService";
import { isTutorialVideoCategoryKey } from "@/lib/tutorial/categories";
import { parseYouTubeUrl } from "@/lib/tutorial/youtube";

export type TutorialVideoActionState = {
  success: boolean;
  categoryKey?: string;
  message?: string;
  error?: string;
  normalizedUrl?: string | null;
  isEnabled?: boolean;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function revalidateTutorialVideos() {
  revalidatePath("/tutorial");
  revalidatePath("/admin/tutorial-videos");
}

export async function adminSaveTutorialVideoAction(
  _previousState: TutorialVideoActionState,
  formData: FormData,
): Promise<TutorialVideoActionState> {
  const admin = await requireSuperAdmin();
  const categoryKey = text(formData, "categoryKey");
  const intent = text(formData, "intent") || "save";

  if (!isTutorialVideoCategoryKey(categoryKey)) {
    return { success: false, categoryKey, error: "تصنيف الفيديو غير صالح." };
  }

  try {
    if (intent === "clear") {
      await tutorialVideoService.clearSetting(categoryKey, admin.userId);
      revalidateTutorialVideos();
      return {
        success: true,
        categoryKey,
        message: "تم حذف رابط الفيديو من هذا التصنيف.",
        normalizedUrl: null,
        isEnabled: false,
      };
    }

    const youtubeUrl = text(formData, "youtubeUrl");
    const parsed = parseYouTubeUrl(youtubeUrl);
    if (!parsed) {
      return {
        success: false,
        categoryKey,
        error: "أدخل رابط YouTube صالحاً مثل youtu.be أو youtube.com/watch أو shorts.",
      };
    }

    const isEnabled = formData.get("isEnabled") === "on";
    await tutorialVideoService.saveSetting({
      categoryKey,
      youtubeUrl: parsed.canonicalUrl,
      isEnabled,
      updatedById: admin.userId,
    });
    revalidateTutorialVideos();

    return {
      success: true,
      categoryKey,
      message: isEnabled ? "تم حفظ الفيديو وتفعيله للمستخدمين." : "تم حفظ الرابط مع إبقاء الفيديو مخفياً.",
      normalizedUrl: parsed.canonicalUrl,
      isEnabled,
    };
  } catch (error) {
    return {
      success: false,
      categoryKey,
      error: error instanceof Error ? error.message : "تعذر حفظ فيديو الشرح.",
    };
  }
}

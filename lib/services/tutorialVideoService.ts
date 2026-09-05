import { prisma } from "@/lib/prisma";
import {
  TUTORIAL_VIDEO_CATEGORIES,
  isTutorialVideoCategoryKey,
  type TutorialVideoCategoryKey,
} from "@/lib/tutorial/categories";
import { parseYouTubeUrl } from "@/lib/tutorial/youtube";

type TutorialVideoRow = {
  categoryKey: string;
  youtubeUrl: string | null;
  youtubeVideoId: string | null;
  isEnabled: boolean;
  updatedAt: Date;
};

export type TutorialVideoSetting = {
  categoryKey: TutorialVideoCategoryKey;
  title: string;
  description: string;
  icon: (typeof TUTORIAL_VIDEO_CATEGORIES)[number]["icon"];
  youtubeUrl: string | null;
  youtubeVideoId: string | null;
  embedUrl: string | null;
  isEnabled: boolean;
  updatedAt: Date | null;
};

function emptySettings(): TutorialVideoSetting[] {
  return TUTORIAL_VIDEO_CATEGORIES.map((category) => ({
    ...category,
    categoryKey: category.key,
    youtubeUrl: null,
    youtubeVideoId: null,
    embedUrl: null,
    isEnabled: false,
    updatedAt: null,
  }));
}

export async function getTutorialVideoSettings(): Promise<TutorialVideoSetting[]> {
  try {
    const rows = await prisma.$queryRaw<TutorialVideoRow[]>`
      SELECT "categoryKey", "youtubeUrl", "youtubeVideoId", "isEnabled", "updatedAt"
      FROM "TutorialVideoSetting"
      ORDER BY "categoryKey" ASC
    `;
    const byKey = new Map(rows.map((row) => [row.categoryKey, row]));

    return TUTORIAL_VIDEO_CATEGORIES.map((category) => {
      const row = byKey.get(category.key);
      const parsed = row?.youtubeUrl ? parseYouTubeUrl(row.youtubeUrl) : null;
      return {
        ...category,
        categoryKey: category.key,
        youtubeUrl: parsed?.canonicalUrl ?? null,
        youtubeVideoId: parsed?.videoId ?? row?.youtubeVideoId ?? null,
        embedUrl: parsed?.embedUrl ?? null,
        isEnabled: Boolean(row?.isEnabled && parsed),
        updatedAt: row?.updatedAt ?? null,
      };
    });
  } catch {
    // Tutorial videos are non-critical. Before the migration is applied, the
    // tutorial page should still render all categories as pending.
    return emptySettings();
  }
}

export async function saveTutorialVideoSetting(input: {
  categoryKey: TutorialVideoCategoryKey;
  youtubeUrl: string;
  isEnabled: boolean;
  updatedById?: string | null;
}) {
  if (!isTutorialVideoCategoryKey(input.categoryKey)) throw new Error("تصنيف الشرح غير صالح.");
  const parsed = parseYouTubeUrl(input.youtubeUrl);
  if (!parsed) throw new Error("أدخل رابط فيديو YouTube صالحاً.");
  const now = new Date();

  await prisma.$executeRaw`
    INSERT INTO "TutorialVideoSetting" (
      "categoryKey", "youtubeUrl", "youtubeVideoId", "isEnabled", "updatedById", "createdAt", "updatedAt"
    ) VALUES (
      ${input.categoryKey}, ${parsed.canonicalUrl}, ${parsed.videoId}, ${input.isEnabled}, ${input.updatedById ?? null}::uuid, ${now}, ${now}
    )
    ON CONFLICT ("categoryKey") DO UPDATE SET
      "youtubeUrl" = EXCLUDED."youtubeUrl",
      "youtubeVideoId" = EXCLUDED."youtubeVideoId",
      "isEnabled" = EXCLUDED."isEnabled",
      "updatedById" = EXCLUDED."updatedById",
      "updatedAt" = EXCLUDED."updatedAt"
  `;

  return parsed;
}

export async function clearTutorialVideoSetting(categoryKey: TutorialVideoCategoryKey, updatedById?: string | null) {
  if (!isTutorialVideoCategoryKey(categoryKey)) throw new Error("تصنيف الشرح غير صالح.");
  const now = new Date();

  await prisma.$executeRaw`
    INSERT INTO "TutorialVideoSetting" (
      "categoryKey", "youtubeUrl", "youtubeVideoId", "isEnabled", "updatedById", "createdAt", "updatedAt"
    ) VALUES (
      ${categoryKey}, NULL, NULL, FALSE, ${updatedById ?? null}::uuid, ${now}, ${now}
    )
    ON CONFLICT ("categoryKey") DO UPDATE SET
      "youtubeUrl" = NULL,
      "youtubeVideoId" = NULL,
      "isEnabled" = FALSE,
      "updatedById" = EXCLUDED."updatedById",
      "updatedAt" = EXCLUDED."updatedAt"
  `;
}

export const tutorialVideoService = {
  getSettings: getTutorialVideoSettings,
  saveSetting: saveTutorialVideoSetting,
  clearSetting: clearTutorialVideoSetting,
};

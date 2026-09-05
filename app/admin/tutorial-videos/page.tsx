import { requireSuperAdmin } from "@/lib/adminAuth";
import { tutorialVideoService } from "@/lib/services/tutorialVideoService";
import { TutorialVideoManagement } from "./_tutorial-video-management";

export const dynamic = "force-dynamic";

export default async function AdminTutorialVideosPage() {
  await requireSuperAdmin();
  const settings = await tutorialVideoService.getSettings();
  return (
    <TutorialVideoManagement
      initialItems={settings.map((item) => ({
        categoryKey: item.categoryKey,
        title: item.title,
        description: item.description,
        youtubeUrl: item.youtubeUrl,
        isEnabled: item.isEnabled,
        updatedAt: item.updatedAt?.toISOString() ?? null,
      }))}
    />
  );
}

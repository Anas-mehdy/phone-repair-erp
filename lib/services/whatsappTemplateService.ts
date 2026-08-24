import { prisma } from "@/lib/prisma";

export type WhatsAppTemplateItem = {
  id: string;
  shopId: string;
  createdByUserId?: string | null;
  title: string;
  templateText: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function listWhatsAppTemplates(shopId: string): Promise<WhatsAppTemplateItem[]> {
  if (!shopId) return [];
  try {
    return await prisma.whatsAppTemplate.findMany({
      where: {
        shopId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (error) {
    console.error("Failed to list WhatsApp templates from DB:", error);
    return [];
  }
}

export async function createWhatsAppTemplate(
  shopId: string,
  data: {
    title: string;
    templateText: string;
    createdByUserId?: string | null;
  }
): Promise<WhatsAppTemplateItem> {
  const title = data.title.trim();
  const templateText = data.templateText.trim();

  if (!title) throw new Error("عنوان القالب مطلوب");
  if (!templateText) throw new Error("نص القالب مطلوب");

  return prisma.whatsAppTemplate.create({
    data: {
      shopId,
      createdByUserId: data.createdByUserId || null,
      title,
      templateText,
    },
  });
}

export async function updateWhatsAppTemplate(
  shopId: string,
  id: string,
  data: {
    title: string;
    templateText: string;
  }
): Promise<WhatsAppTemplateItem> {
  const title = data.title.trim();
  const templateText = data.templateText.trim();

  if (!title) throw new Error("عنوان القالب مطلوب");
  if (!templateText) throw new Error("نص القالب مطلوب");

  // Ensure template belongs to this shop and is not deleted
  const existing = await prisma.whatsAppTemplate.findFirst({
    where: { id, shopId, deletedAt: null },
  });

  if (!existing) {
    throw new Error("القالب غير موجود أو تم حذفه");
  }

  return prisma.whatsAppTemplate.update({
    where: { id },
    data: {
      title,
      templateText,
      version: { increment: 1 },
    },
  });
}

export async function deleteWhatsAppTemplate(shopId: string, id: string): Promise<void> {
  const existing = await prisma.whatsAppTemplate.findFirst({
    where: { id, shopId, deletedAt: null },
  });

  if (!existing) {
    throw new Error("القالب غير موجود أو تم حذفه");
  }

  await prisma.whatsAppTemplate.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      version: { increment: 1 },
    },
  });
}

export const whatsappTemplateService = {
  listTemplates: listWhatsAppTemplates,
  createTemplate: createWhatsAppTemplate,
  updateTemplate: updateWhatsAppTemplate,
  deleteTemplate: deleteWhatsAppTemplate,
};

"use server";

import { getCurrentShopContext } from "@/lib/current-shop";
import { requirePermission } from "@/lib/auth/context";
import { whatsappTemplateService } from "@/lib/services/whatsappTemplateService";

export type CustomWhatsAppTemplateDTO = {
  id: string;
  title: string;
  templateText: string;
  createdAt: number;
};

export async function getWhatsAppTemplatesAction(): Promise<{
  ok: boolean;
  shopId: string;
  templates: CustomWhatsAppTemplateDTO[];
  error?: string;
}> {
  try {
    const context = await getCurrentShopContext({ allowRedirect: false });
    if (!context.shopId) {
      return { ok: false, shopId: "", templates: [], error: "غير مسجل الدخول" };
    }

    const dbTemplates = await whatsappTemplateService.listTemplates(context.shopId);
    const templates: CustomWhatsAppTemplateDTO[] = dbTemplates.map((t) => ({
      id: t.id,
      title: t.title,
      templateText: t.templateText,
      createdAt: new Date(t.createdAt).getTime(),
    }));

    return { ok: true, shopId: context.shopId, templates };
  } catch (error) {
    console.error("getWhatsAppTemplatesAction error:", error);
    return { ok: false, shopId: "", templates: [], error: "فشل استرجاع القوالب" };
  }
}

export async function saveWhatsAppTemplateAction(data: {
  id?: string | null;
  title: string;
  templateText: string;
}): Promise<{
  ok: boolean;
  template?: CustomWhatsAppTemplateDTO;
  error?: string;
}> {
  try {
    const auth = await requirePermission("shop:settings", { allowRedirect: false });

    const title = data.title?.trim();
    const templateText = data.templateText?.trim();
    if (!title) return { ok: false, error: "عنوان القالب مطلوب" };
    if (!templateText) return { ok: false, error: "نص القالب مطلوب" };

    let result;
    if (data.id && !data.id.startsWith("local_") && !data.id.startsWith("tpl_")) {
      // Update existing database template
      result = await whatsappTemplateService.updateTemplate(auth.shop.id, data.id, {
        title,
        templateText,
      });
    } else {
      // Create new database template
      result = await whatsappTemplateService.createTemplate(auth.shop.id, {
        title,
        templateText,
        createdByUserId: auth.user.id,
      });
    }

    return {
      ok: true,
      template: {
        id: result.id,
        title: result.title,
        templateText: result.templateText,
        createdAt: new Date(result.createdAt).getTime(),
      },
    };
  } catch (error) {
    console.error("saveWhatsAppTemplateAction error:", error);
    return { ok: false, error: error instanceof Error ? error.message : "حدث خطأ أثناء حفظ القالب" };
  }
}

export async function deleteWhatsAppTemplateAction(id: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const auth = await requirePermission("shop:settings", { allowRedirect: false });

    if (!id.startsWith("local_") && !id.startsWith("tpl_")) {
      await whatsappTemplateService.deleteTemplate(auth.shop.id, id);
    }
    return { ok: true };
  } catch (error) {
    console.error("deleteWhatsAppTemplateAction error:", error);
    return { ok: false, error: error instanceof Error ? error.message : "حدث خطأ أثناء حذف القالب" };
  }
}

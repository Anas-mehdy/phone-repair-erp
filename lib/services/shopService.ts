import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const updateShopSchema = z.object({
  name: z.string().min(2, "اسم المتجر يجب ألا يقل عن حرفين"),
  phone: z.string().optional().default(""),
  currency: z.string().min(1, "العملة مطلوبة"),
  address: z.string().optional().default(""),
  taxNumber: z.string().optional().default(""),
  taxRate: z.coerce.number().min(0, "نسبة الضريبة لا يمكن أن تكون سالبة").default(15),
  terms: z.string().optional().default(""),
});

export type UpdateShopInput = z.infer<typeof updateShopSchema>;

export const shopService = {
  async getShopById(shopId: string) {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId, deletedAt: null },
      include: {
        users: {
          where: { deletedAt: null },
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        },
      },
    });

    if (!shop) {
      throw new Error("المتجر غير موجود");
    }

    return shop;
  },

  async updateShop(shopId: string, input: UpdateShopInput) {
    const validated = updateShopSchema.parse(input);

    const updated = await prisma.shop.update({
      where: { id: shopId },
      data: {
        name: validated.name.trim(),
        phone: validated.phone?.trim() || null,
        currency: validated.currency.trim(),
        address: validated.address?.trim() || null,
        taxNumber: validated.taxNumber?.trim() || null,
        taxRate: validated.taxRate,
        terms: validated.terms?.trim() || null,
        version: { increment: 1 },
      },
    });

    return updated;
  },
};

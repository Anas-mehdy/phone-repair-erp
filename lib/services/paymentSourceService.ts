import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type PaymentSourceInput = {
  sourceOptionId?: string;
  customSourceName?: string;
  saveCustomSource?: boolean;
};

function normalizeSourceName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ar");
}

export function listPaymentSourceOptions(shopId: string) {
  return prisma.paymentSourceOption.findMany({
    where: { shopId, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 100,
  });
}

export async function resolvePaymentSource(
  tx: Prisma.TransactionClient,
  shopId: string,
  input: PaymentSourceInput,
) {
  if (input.sourceOptionId) {
    const option = await tx.paymentSourceOption.findFirst({
      where: { id: input.sourceOptionId, shopId, deletedAt: null },
      select: { name: true },
    });
    if (!option) throw new Error("مصدر الدفع المحفوظ غير موجود.");
    return option.name;
  }

  const name = input.customSourceName?.trim().replace(/\s+/g, " ");
  if (!name) return null;
  if (name.length > 80) throw new Error("اسم مصدر الدفع طويل جداً.");

  if (input.saveCustomSource) {
    await tx.paymentSourceOption.upsert({
      where: {
        shopId_normalizedName: {
          shopId,
          normalizedName: normalizeSourceName(name),
        },
      },
      create: { shopId, name, normalizedName: normalizeSourceName(name) },
      update: { name, deletedAt: null },
    });
  }

  return name;
}

export const paymentSourceService = {
  listPaymentSourceOptions,
};

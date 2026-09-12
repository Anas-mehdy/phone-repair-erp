"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { lifetimeSubscriptionService } from "@/lib/services/lifetimeSubscriptionService";

const schema = z.object({
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  currencyCode: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  amount: z.coerce.number().positive("سعر مدى الحياة يجب أن يكون أكبر من صفر"),
});

const maintenanceSchema = z.object({
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  amount: z.coerce.number().positive("رسم الصيانة والتحديث السنوي يجب أن يكون أكبر من صفر"),
});

export async function adminUpsertLifetimePriceAction(formData: FormData) {
  await requireSuperAdmin();
  try {
    await lifetimeSubscriptionService.listLifetimePrices();
    const input = schema.parse({
      countryCode: formData.get("countryCode"),
      currencyCode: formData.get("currencyCode"),
      amount: formData.get("amount"),
    });

    const rows = await prisma.$queryRaw<Array<{ id: string; countryCode: string; currencyCode: string; amount: unknown }>>`
      INSERT INTO "LifetimeSubscriptionPrice" ("countryCode", "currencyCode", "amount", "updatedAt")
      VALUES (${input.countryCode}, ${input.currencyCode}, ${input.amount}, NOW())
      ON CONFLICT ("countryCode") DO UPDATE
      SET "currencyCode" = EXCLUDED."currencyCode", "amount" = EXCLUDED."amount", "updatedAt" = NOW()
      RETURNING "id", "countryCode", "currencyCode", "amount"
    `;

    revalidatePath("/admin");
    revalidatePath("/subscription");
    return {
      success: true,
      price: rows[0]
        ? { ...rows[0], amount: Number(rows[0].amount) }
        : null,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "تعذر حفظ سعر مدى الحياة.",
    };
  }
}

export async function adminUpsertLifetimeMaintenancePriceAction(formData: FormData) {
  await requireSuperAdmin();
  try {
    await lifetimeSubscriptionService.listLifetimePrices();
    const input = maintenanceSchema.parse({
      countryCode: formData.get("countryCode"),
      amount: formData.get("amount"),
    });

    const rows = await prisma.$queryRaw<Array<{
      id: string;
      countryCode: string;
      currencyCode: string;
      annualMaintenanceAmount: unknown;
    }>>`
      UPDATE "LifetimeSubscriptionPrice"
      SET "annualMaintenanceAmount" = ${input.amount}, "updatedAt" = NOW()
      WHERE "countryCode" = ${input.countryCode}
      RETURNING "id", "countryCode", "currencyCode", "annualMaintenanceAmount"
    `;

    const row = rows[0];
    if (!row) {
      throw new Error("حدد سعر خطة مدى الحياة لهذه الدولة أولاً، ثم أضف الرسم السنوي.");
    }

    revalidatePath("/admin");
    revalidatePath("/subscription");
    return {
      success: true,
      price: {
        id: `maintenance-${row.id}`,
        countryCode: row.countryCode,
        currencyCode: row.currencyCode,
        amount: Number(row.annualMaintenanceAmount),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "تعذر حفظ الرسم السنوي لخطة مدى الحياة.",
    };
  }
}

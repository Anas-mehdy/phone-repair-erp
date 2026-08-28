"use server";

import { ExpenseCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/context";
import { reportService } from "@/lib/services/reportService";

const createExpenseSchema = z.object({
  title: z.string().trim().min(1, "اسم المصروف مطلوب").max(120),
  category: z.nativeEnum(ExpenseCategory),
  amount: z.coerce.number().positive("قيمة المصروف يجب أن تكون أكبر من صفر"),
  spentAt: z.string().date(),
  notes: z.string().trim().max(500).optional(),
});

const deleteExpenseSchema = z.object({ expenseId: z.string().uuid() });

function read(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createExpenseAction(formData: FormData) {
  const input = createExpenseSchema.parse({
    title: read(formData, "title"),
    category: read(formData, "category"),
    amount: read(formData, "amount"),
    spentAt: read(formData, "spentAt"),
    notes: read(formData, "notes"),
  });
  const auth = await requirePermission("expenses:manage");

  await reportService.createExpense(auth.shop.id, auth.user.id, {
    title: input.title,
    category: input.category,
    amount: input.amount.toFixed(2),
    spentAt: new Date(`${input.spentAt}T12:00:00.000Z`),
    notes: input.notes,
  });

  revalidatePath("/reports");
  redirect("/reports?preset=month&expenseSaved=1");
}

export async function deleteExpenseAction(formData: FormData) {
  const input = deleteExpenseSchema.parse({ expenseId: read(formData, "expenseId") });
  const auth = await requirePermission("expenses:manage");
  await reportService.deleteExpense(auth.shop.id, input.expenseId);

  revalidatePath("/reports");
  redirect("/reports?preset=month&expenseDeleted=1");
}

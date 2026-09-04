"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/context";
import { electronicServiceReconciliationService } from "@/lib/services/electronicServiceReconciliationService";

const schema = z.object({
  providerId: z.string().uuid("معرف المزود غير صالح"),
  actualBalance: z.string().trim().min(1, "أدخل الرصيد الفعلي").refine((value) => {
    const number = Number(value.replace(",", "."));
    return Number.isFinite(number) && number >= 0;
  }, "الرصيد الفعلي غير صحيح"),
  reasonCode: z.enum(["UNRECORDED_TRANSACTION", "PROVIDER_FEE", "OPERATOR_ERROR", "ROUNDING", "OTHER"]),
  notes: z.string().trim().max(1000, "الملاحظات طويلة جداً").optional(),
  reference: z.string().trim().max(160, "المرجع طويل جداً").optional(),
});

function read(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "تحقق من البيانات.";
  return error instanceof Error ? error.message : "تعذر حفظ المطابقة.";
}

export async function reconcileElectronicServiceProviderAction(formData: FormData) {
  const auth = await requirePermission("sales:create");
  const parsed = schema.safeParse({
    providerId: read(formData, "providerId"),
    actualBalance: read(formData, "actualBalance"),
    reasonCode: read(formData, "reasonCode"),
    notes: read(formData, "notes") || undefined,
    reference: read(formData, "reference") || undefined,
  });
  if (!parsed.success) redirect(`/electronic-services/reconcile?error=${encodeURIComponent(errorMessage(parsed.error))}`);

  try {
    const result = await electronicServiceReconciliationService.reconcileProviderBalance(auth.shop.id, auth.user.id, parsed.data);
    revalidatePath("/electronic-services");
    revalidatePath("/electronic-services/reconcile");
    revalidatePath(`/electronic-services/${parsed.data.providerId}`);
    revalidatePath("/electronic-services/reports");
    revalidatePath("/dashboard");
    redirect(`/electronic-services/reconcile?saved=1&provider=${parsed.data.providerId}&difference=${encodeURIComponent(String(result.difference))}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(`/electronic-services/reconcile?provider=${parsed.data.providerId}&error=${encodeURIComponent(errorMessage(error))}`);
  }
}

"use server";
import { revalidatePath } from "next/cache";
import { requireAccountant } from "@/lib/auth/stocktake";
import {
  startStocktake,
  scanStocktake,
  closeStocktake,
} from "@/lib/services/stocktakeService";
type ActionResult =
  | { ok: true; id?: string; message?: string; result?: string }
  | { ok: false; error: string };
export async function stocktakeAction(input: {
  action: "START" | "SCAN" | "CLOSE";
  id?: string;
  title?: string;
  scope?: string;
  barcode?: string;
  recount?: boolean;
}): Promise<ActionResult> {
  try {
    const auth = await requireAccountant();
    const actor = { shopId: auth.shop.id, userId: auth.user.id };
    if (input.action === "START") {
      const id = await startStocktake(
        actor,
        input.title ?? "",
        input.scope ?? "ALL",
      );
      revalidatePath("/stocktakes");
      return { ok: true as const, id };
    }
    if (input.action === "SCAN") {
      const result = await scanStocktake(
        actor,
        input.id ?? "",
        input.barcode ?? "",
        input.recount === true,
      );
      revalidatePath(`/stocktakes/${input.id}`);
      return { ok: true as const, ...result };
    }
    if (input.action !== "CLOSE") throw new Error("عملية غير صالحة.");
    await closeStocktake(actor, input.id ?? "");
    revalidatePath("/stocktakes");
    revalidatePath(`/stocktakes/${input.id}`);
    return { ok: true as const };
  } catch (error) {
    console.error("[stocktake]", error);
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : "تعذر تنفيذ العملية. أعد المحاولة.",
    };
  }
}

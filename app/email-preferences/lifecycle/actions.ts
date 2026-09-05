"use server";

import { redirect } from "next/navigation";
import { verifyLifecycleUnsubscribeToken } from "@/lib/lifecycle/unsubscribe-token";
import { unsubscribeLifecycleEmailForShop } from "@/lib/services/lifecycleAutomationService";

export async function unsubscribeLifecycleEmailAction(formData: FormData) {
  const raw = formData.get("token");
  const token = typeof raw === "string" ? raw : "";
  const verified = verifyLifecycleUnsubscribeToken(token);
  if (!verified) redirect("/email-preferences/lifecycle?invalid=1");

  await unsubscribeLifecycleEmailForShop(verified.shopId);
  redirect("/email-preferences/lifecycle?done=1");
}

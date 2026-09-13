import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";

export async function redirectSalesEmployee(destination: string = "/employee/pos") {
  const auth = await getAuthContext();
  if (auth.membership.accessProfile === "SALES_EMPLOYEE") {
    redirect(destination);
  }
  return auth;
}

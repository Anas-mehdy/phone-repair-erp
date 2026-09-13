import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";

export default async function EmployeeWorkspaceLayout({ children }: { children: ReactNode }) {
  const auth = await getAuthContext();
  if (auth.membership.accessProfile !== "SALES_EMPLOYEE") redirect("/dashboard");
  return <div className="space-y-6">{children}</div>;
}

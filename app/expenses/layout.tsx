import type { ReactNode } from "react";
import { redirectSalesEmployee } from "@/lib/auth/salesEmployeeRoute";

export default async function ExpensesLayout({ children }: { children: ReactNode }) {
  await redirectSalesEmployee("/employee/expenses");
  return children;
}

import type { ReactNode } from "react";
import { redirectSalesEmployee } from "@/lib/auth/salesEmployeeRoute";

export default async function SalesLayout({ children }: { children: ReactNode }) {
  await redirectSalesEmployee("/employee/sales");
  return <div className="sales-workspace">{children}</div>;
}

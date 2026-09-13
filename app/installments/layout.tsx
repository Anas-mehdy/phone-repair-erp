import type { ReactNode } from "react";
import { redirectSalesEmployee } from "@/lib/auth/salesEmployeeRoute";
import "./installments-ui.css";
import "./installments-finish.css";
import "./dark-mode-preview-installments.css";

export default async function InstallmentsLayout({ children }: { children: ReactNode }) {
  await redirectSalesEmployee("/employee/pos");
  return <div className="installments-workspace">{children}</div>;
}

import type { ReactNode } from "react";
import { redirectSalesEmployee } from "@/lib/auth/salesEmployeeRoute";
import { requirePermission } from "@/lib/auth/context";
import "./software-services-ui.css";
import "./dark-mode-final-details.css";

export default async function SoftwareServicesLayout({ children }: { children: ReactNode }) {
  await redirectSalesEmployee("/employee/pos");
  await requirePermission("sales:read");
  return <div className="software-services-workspace">{children}</div>;
}

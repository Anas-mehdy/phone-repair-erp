import type { ReactNode } from "react";
import { redirectSalesEmployee } from "@/lib/auth/salesEmployeeRoute";
import "./compatibility-ui.css";

export default async function CompatibilityLayout({ children }: { children: ReactNode }) {
  await redirectSalesEmployee("/employee/pos");
  return <div className="masar-compatibility">{children}</div>;
}

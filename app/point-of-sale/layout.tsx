import type { ReactNode } from "react";
import { redirectSalesEmployee } from "@/lib/auth/salesEmployeeRoute";
import "./dark-mode-point-of-sale.css";

export default async function PointOfSaleLayout({ children }: { children: ReactNode }) {
  await redirectSalesEmployee("/employee/pos");
  return <div className="point-of-sale-dark-scope">{children}</div>;
}

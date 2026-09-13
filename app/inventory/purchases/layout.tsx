import type { ReactNode } from "react";
import { redirectSalesEmployee } from "@/lib/auth/salesEmployeeRoute";
import { PurchaseBulkCategorySyncBridge } from "./_bulk-category-sync-bridge";

export default async function PurchaseLayout({ children }: { children: ReactNode }) {
  await redirectSalesEmployee("/employee/receiving");
  return <><PurchaseBulkCategorySyncBridge />{children}</>;
}

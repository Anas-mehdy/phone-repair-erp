import type { ReactNode } from "react";
import { CashDrawerReportPanel } from "./_cash-drawer-report";
import "./reports-ui.css";

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return <div className="masar-reports">{children}<CashDrawerReportPanel /></div>;
}

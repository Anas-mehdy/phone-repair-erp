import type { ReactNode } from "react";
import "./reports-ui.css";

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return <div className="masar-reports">{children}</div>;
}

import type { ReactNode } from "react";
import "./invoices-ui.css";
import "./invoices-kpi.css";

export default function InvoicesLayout({ children }: { children: ReactNode }) {
  return <div className="invoices-workspace">{children}</div>;
}

import type { ReactNode } from "react";
import "./installments-ui.css";
import "./installments-finish.css";

export default function InstallmentsLayout({ children }: { children: ReactNode }) {
  return <div className="installments-workspace">{children}</div>;
}

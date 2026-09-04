import type { ReactNode } from "react";
import "./dashboard-ui.css";
import "./dashboard-pos-launcher.css";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className="masar-dashboard">{children}</div>;
}

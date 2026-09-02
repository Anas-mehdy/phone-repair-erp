import type { ReactNode } from "react";
import "./repair-orders-ui.css";

export default function RepairOrdersLayout({ children }: { children: ReactNode }) {
  return <div className="masar-repair-orders">{children}</div>;
}

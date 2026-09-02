import type { ReactNode } from "react";
import "./detail-ui.css";
import "./detail-hierarchy.css";

export default function RepairOrderDetailLayout({ children }: { children: ReactNode }) {
  return <div className="repair-order-detail">{children}</div>;
}

import type { ReactNode } from "react";
import "./inventory-ui.css";
import "./inventory-finish.css";
import "./dark-mode-final-details.css";

export default function InventoryLayout({ children }: { children: ReactNode }) {
  return <div className="inventory-workspace">{children}</div>;
}

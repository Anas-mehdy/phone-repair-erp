import type { ReactNode } from "react";
import "./dark-mode-preview-cash-drawer.css";

export default function CashDrawerLayout({ children }: { children: ReactNode }) {
  return <div className="cash-drawer-workspace">{children}</div>;
}

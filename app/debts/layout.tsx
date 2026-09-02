import type { ReactNode } from "react";
import "./debts-ui.css";
import "./debts-finish.css";

export default function DebtsLayout({ children }: { children: ReactNode }) {
  return <div className="debts-workspace">{children}</div>;
}

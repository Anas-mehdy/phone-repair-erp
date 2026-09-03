import type { ReactNode } from "react";
import "./debts-ui.css";
import "./debts-finish.css";
import "./dark-mode-preview-debts.css";

export default function DebtsLayout({ children }: { children: ReactNode }) {
  return <div className="debts-workspace">{children}</div>;
}

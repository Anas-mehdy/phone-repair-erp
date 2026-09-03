import type { ReactNode } from "react";

export default function CashDrawerLayout({ children }: { children: ReactNode }) {
  return <div className="cash-drawer-workspace">{children}</div>;
}

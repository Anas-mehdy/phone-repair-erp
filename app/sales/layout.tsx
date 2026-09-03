import type { ReactNode } from "react";

export default function SalesLayout({ children }: { children: ReactNode }) {
  return <div className="sales-workspace">{children}</div>;
}

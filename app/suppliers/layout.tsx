import type { ReactNode } from "react";

export default function SuppliersLayout({ children }: { children: ReactNode }) {
  return <div className="suppliers-workspace">{children}</div>;
}

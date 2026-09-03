import type { ReactNode } from "react";

export default function CustomersLayout({ children }: { children: ReactNode }) {
  return <div className="customers-workspace">{children}</div>;
}

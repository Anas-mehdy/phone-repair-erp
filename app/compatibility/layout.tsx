import type { ReactNode } from "react";
import "./compatibility-ui.css";

export default function CompatibilityLayout({ children }: { children: ReactNode }) {
  return <div className="masar-compatibility">{children}</div>;
}

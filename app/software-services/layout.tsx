import type { ReactNode } from "react";
import "./software-services-ui.css";

export default function SoftwareServicesLayout({ children }: { children: ReactNode }) {
  return <div className="software-services-workspace">{children}</div>;
}

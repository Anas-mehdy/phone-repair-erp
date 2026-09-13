import type { ReactNode } from "react";
import "./dark-mode-point-of-sale.css";

export default function PointOfSaleLayout({ children }: { children: ReactNode }) {
  return <div className="point-of-sale-dark-scope">{children}</div>;
}

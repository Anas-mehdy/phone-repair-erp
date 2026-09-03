import type { ReactNode } from "react";

export default function SubscriptionLayout({ children }: { children: ReactNode }) {
  return <div className="subscription-workspace">{children}</div>;
}

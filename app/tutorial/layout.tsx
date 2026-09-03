import type { ReactNode } from "react";

export default function TutorialLayout({ children }: { children: ReactNode }) {
  return <div className="tutorial-workspace">{children}</div>;
}

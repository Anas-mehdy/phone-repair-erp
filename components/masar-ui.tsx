import type { HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function MasarPage({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("masar-page", className)} {...props} />;
}

export function MasarSurface({ brand = false, className, ...props }: HTMLAttributes<HTMLElement> & { brand?: boolean }) {
  return <section className={cn(brand ? "masar-surface-brand" : "masar-surface", className)} {...props} />;
}

export function MasarSectionHeader({ icon, title, description, actions, className }: { icon?: ReactNode; title: string; description?: string; actions?: ReactNode; className?: string }) {
  return <div className={cn("masar-section-header", className)}>
    <div className="flex items-start gap-3">
      {icon}
      <div><h2 className="masar-section-title">{title}</h2>{description ? <p className="masar-section-description">{description}</p> : null}</div>
    </div>
    {actions ? <div className="shrink-0">{actions}</div> : null}
  </div>;
}

export function MasarInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("masar-input", className)} {...props} />;
}

export function MasarSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("masar-select", className)} {...props} />;
}

export function MasarTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("masar-textarea", className)} {...props} />;
}

export function MasarLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <label className={cn("masar-label", className)}>{children}</label>;
}

export type MasarBadgeTone = "brand" | "info" | "support" | "warning" | "success" | "danger";
export function MasarBadge({ tone = "brand", className, children }: { tone?: MasarBadgeTone; className?: string; children: ReactNode }) {
  return <span className={cn("masar-badge", `masar-badge-${tone}`, className)}>{children}</span>;
}

export function MasarEmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string }) {
  return <div className={cn("masar-empty-state", className)}>{icon}<h3 className="mt-3 text-[17px] font-black text-slate-700">{title}</h3>{description ? <p className="mt-1 max-w-md text-[15px] font-semibold leading-6 text-slate-400">{description}</p> : null}{action ? <div className="mt-4">{action}</div> : null}</div>;
}

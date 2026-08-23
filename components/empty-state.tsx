import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/20 p-12 text-center transition hover:bg-slate-50/30">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 text-primary shadow-sm ring-1 ring-primary/10">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-sm font-extrabold text-slate-800">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-slate-400 font-medium">
        {description}
      </p>
      {actionHref && actionLabel ? (
        <Button asChild className="mt-5 font-semibold shadow-sm rounded-xl px-5" size="sm">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}


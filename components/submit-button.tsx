"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type SubmitButtonProps = Omit<ComponentProps<typeof Button>, "type"> & {
  type?: "submit" | "button" | "reset";
  idleText?: string;
  loadingText?: string;
  icon?: React.ReactNode;
};

export function SubmitButton({
  children,
  idleText,
  loadingText = "جاري الحفظ والتحديث...",
  icon = <Save className="h-4.5 w-4.5 ml-1.5" aria-hidden="true" />,
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className={cn(className, pending && "cursor-wait opacity-80 select-none")}
      {...props}
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-current shrink-0" />
          <span>{loadingText}</span>
        </span>
      ) : (
        <span className="flex items-center justify-center">
          {icon}
          <span>{children || idleText}</span>
        </span>
      )}
    </Button>
  );
}

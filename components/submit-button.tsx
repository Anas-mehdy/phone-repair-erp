"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

type SubmitButtonProps = Omit<ComponentProps<typeof Button>, "type"> & {
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
      className={className}
      {...props}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
          {loadingText}
        </>
      ) : (
        <>
          {icon}
          {children || idleText}
        </>
      )}
    </Button>
  );
}

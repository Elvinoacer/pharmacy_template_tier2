"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

type PendingSubmitButtonProps = {
  children: ReactNode;
  pendingChildren: ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
};

export function PendingSubmitButton({
  children,
  pendingChildren,
  className,
  disabled,
  title,
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={className}
      title={title}
      aria-busy={pending}
    >
      {pending ? pendingChildren : children}
    </button>
  );
}

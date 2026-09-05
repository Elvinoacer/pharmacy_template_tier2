"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button that asks for confirmation before posting a server action form.
 * Use in Server Component pages where native onClick/confirm is not allowed.
 */
export default function ConfirmSubmitButton({
  message,
  className,
  title,
  children,
  type = "submit",
}: {
  message: string;
  className?: string;
  title?: string;
  children: React.ReactNode;
  type?: "submit" | "button";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type={type}
      disabled={pending}
      aria-busy={pending}
      title={title}
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {pending ? "Processing…" : children}
    </button>
  );
}

"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import ConfirmDialog from "@/app/components/admin/ConfirmDialog";

/**
 * Submit button that uses Afyvia's accessible confirmation dialog instead of
 * the browser-native confirm() prompt.
 */
export default function ConfirmSubmitButton({
  message,
  className,
  title,
  children,
  type = "submit",
  dialogTitle,
  confirmLabel,
  tone = "warning",
}: {
  message: string;
  className?: string;
  title?: string;
  children: React.ReactNode;
  type?: "submit" | "button";
  dialogTitle?: string;
  confirmLabel?: string;
  tone?: "danger" | "warning" | "neutral";
}) {
  const { pending } = useFormStatus();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function submitConfirmed() {
    const button = buttonRef.current;
    const form = button?.form;
    setOpen(false);

    if (type === "submit" && form && button) {
      form.requestSubmit(button);
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type={type}
        disabled={pending}
        aria-busy={pending}
        title={title}
        className={className}
        onClick={(event) => {
          event.preventDefault();
          if (!pending) setOpen(true);
        }}
      >
        {pending ? "Processing…" : children}
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={submitConfirmed}
        title={dialogTitle || title || "Confirm action"}
        message={message}
        confirmLabel={confirmLabel || title || "Confirm"}
        busy={pending}
        tone={tone}
      />
    </>
  );
}

"use client";

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
  return (
    <button
      type={type}
      title={title}
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

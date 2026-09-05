"use client";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

export function AdminSubmitButton({ children, pendingLabel = "Saving…" }: { children: React.ReactNode; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn-admin" disabled={pending} aria-busy={pending}>{pending && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}{pending ? pendingLabel : children}</button>;
}

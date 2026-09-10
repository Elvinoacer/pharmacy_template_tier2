"use client";

import { useActionState, useEffect } from "react";
import { adminEnquiryAction, type ActionState } from "@/app/actions/admin";
import { toast } from "@/app/components/Toaster";
import { Save, AlertCircle, Check } from "lucide-react";

export function EnquiryUpdateForm({
  id,
  status,
  staffNotes,
}: {
  id: string;
  status: string;
  staffNotes: string;
}) {
  const [state, formAction, pending] = useActionState(
    adminEnquiryAction,
    {} as ActionState,
  );

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="mt-4 grid gap-3 border-t border-[var(--admin-border)] pt-4 sm:grid-cols-[minmax(150px,0.35fr)_minmax(0,1fr)_auto] sm:items-end">
      <input type="hidden" name="id" value={id} />
      {state?.error && (
        <div className="admin-alert-error sm:col-span-3">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.error}</span>
        </div>
      )}
      {state?.success && (
        <div className="admin-alert-success sm:col-span-3">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.success}</span>
        </div>
      )}
      <div className="min-w-0">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide admin-soft">Status</label>
        <select
          name="status"
          defaultValue={status}
          className="input-admin w-full capitalize"
        >
          {["new", "in_progress", "resolved", "closed"].map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-0">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide admin-soft">Staff notes</label>
        <input
          name="staffNotes"
          defaultValue={staffNotes}
          placeholder="Add internal notes…"
          className="input-admin w-full"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--admin-accent-soft)] px-4 py-2 text-xs font-semibold admin-accent-text transition hover:brightness-105 disabled:opacity-50 sm:w-auto"
      >
        <Save className="h-3.5 w-3.5" /> {pending ? "Saving…" : "Update"}
      </button>
    </form>
  );
}

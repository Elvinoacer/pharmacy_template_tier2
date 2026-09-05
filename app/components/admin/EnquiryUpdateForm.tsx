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
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-[var(--admin-border)] pt-3">
      <input type="hidden" name="id" value={id} />
      {state?.error && (
        <div className="w-full admin-alert-error">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.error}</span>
        </div>
      )}
      {state?.success && (
        <div className="w-full admin-alert-success">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.success}</span>
        </div>
      )}
      <div>
        <label className="block text-xs uppercase tracking-wide admin-soft">Status</label>
        <select
          name="status"
          defaultValue={status}
          className="rounded-lg border border-[var(--admin-border-2)] bg-[var(--admin-inset)] px-2.5 py-1.5 text-xs admin-text focus:border-[var(--admin-accent)] focus:outline-none"
        >
          {["new", "in_progress", "resolved", "closed"].map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-w-[180px]">
        <label className="block text-xs uppercase tracking-wide admin-soft">Staff notes</label>
        <input
          name="staffNotes"
          defaultValue={staffNotes}
          placeholder="Add internal notes…"
          className="input-admin"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-lg bg-[var(--admin-accent-soft)] px-3 py-2 text-xs font-semibold admin-accent-text transition hover:bg-[var(--admin-accent-soft)] disabled:opacity-50"
      >
        <Save className="h-3.5 w-3.5" /> {pending ? "Saving…" : "Update"}
      </button>
    </form>
  );
}

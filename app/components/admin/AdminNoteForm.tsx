"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { StickyNote, Pin, AlertCircle, Check, Save } from "lucide-react";

export default function AdminNoteForm({
  action,
  customerId,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  customerId: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="customerId" value={customerId} />

      {state?.error && (
        <div className="admin-alert-error">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.error}</span>
        </div>
      )}
      {state?.success && (
        <div className="admin-alert-success">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.success}</span>
        </div>
      )}

      <div className="relative">
        <StickyNote className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 admin-soft" />
        <textarea
          name="body"
          required
          rows={3}
          placeholder="Add an internal staff note (visible only to your team)…"
          className="input-admin resize-y pl-9"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-xs admin-muted hover:text-[var(--admin-text)]">
          <input
            type="checkbox"
            name="isPinned"
            className="h-3.5 w-3.5 rounded border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-accent-text focus:ring-[var(--admin-accent)]"
          />
          <Pin className="h-3 w-3" /> Pin to top
        </label>
        <button
          type="submit"
          disabled={pending}
          className="btn-admin-sm disabled:opacity-50"
        >
          {pending ? <><span className="typing-dot" /> Saving…</> : <><Save className="h-3.5 w-3.5" /> Add note</>}
        </button>
      </div>
    </form>
  );
}

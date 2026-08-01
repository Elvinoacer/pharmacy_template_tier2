"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions/admin";

export default function AdminNoteForm({
  action,
  customerId,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  customerId: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="customerId" value={customerId} />
      {state?.success && <p className="text-xs text-teal-300">{state.success}</p>}
      <textarea
        name="body"
        required
        rows={2}
        placeholder="Add a staff note…"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-teal-100/60">
          <input type="checkbox" name="isPinned" /> Pin note
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-teal-500/20 px-3 py-1.5 text-xs text-teal-100 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Add note"}
        </button>
      </div>
    </form>
  );
}

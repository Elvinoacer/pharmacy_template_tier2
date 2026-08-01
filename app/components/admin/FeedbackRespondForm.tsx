"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions/admin";

export default function FeedbackRespondForm({
  action,
  id,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  id: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      {state?.success && <p className="text-xs text-teal-300">{state.success}</p>}
      <textarea name="response" required rows={2} placeholder="Staff response" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
      <label className="flex items-center gap-2 text-xs text-teal-100/60">
        <input type="checkbox" name="isPublic" /> Make public
      </label>
      <button type="submit" disabled={pending} className="rounded-lg bg-teal-500/20 px-3 py-1.5 text-xs text-teal-100 disabled:opacity-50">
        {pending ? "Saving…" : "Respond"}
      </button>
    </form>
  );
}

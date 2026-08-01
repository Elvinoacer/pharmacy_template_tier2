"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions/admin";

export default function KnowledgeForm({
  action,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  return (
    <form action={formAction} className="space-y-3">
      {state?.error && <p className="text-sm text-rose-300">{state.error}</p>}
      {state?.success && <p className="text-sm text-teal-300">{state.success}</p>}
      <input name="title" required placeholder="Title" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
      <input name="category" placeholder="Category" defaultValue="general" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
      <input name="priority" type="number" defaultValue={0} placeholder="Priority" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
      <textarea name="content" required rows={6} placeholder="Approved content the AI may use" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
      <label className="flex items-center gap-2 text-xs text-teal-100/60">
        <input type="checkbox" name="isApproved" defaultChecked /> Approved for AI
      </label>
      <button type="submit" disabled={pending} className="rounded-xl bg-teal-400 px-4 py-2 text-sm font-semibold text-[#042f2e] disabled:opacity-50">
        {pending ? "Saving…" : "Save article"}
      </button>
    </form>
  );
}

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
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.error}</span>
        </div>
      )}
      {state?.success && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.success}</span>
        </div>
      )}

      <div className="relative">
        <StickyNote className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-[#ecfdf5]/30" />
        <textarea
          name="body"
          required
          rows={3}
          placeholder="Add an internal staff note (visible only to your team)…"
          className="input-admin resize-y pl-9"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-[#ecfdf5]/65 hover:text-white">
          <input
            type="checkbox"
            name="isPinned"
            className="h-3.5 w-3.5 rounded border-white/20 bg-white/[0.04] text-[#2dd4bf] focus:ring-[#2dd4bf]"
          />
          <Pin className="h-3 w-3" /> Pin to top
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2dd4bf] to-[#0f766e] px-3 py-1.5 text-xs font-semibold text-[#042f2e] transition hover:brightness-110 disabled:opacity-50"
        >
          {pending ? <><span className="typing-dot" /> Saving…</> : <><Save className="h-3.5 w-3.5" /> Add note</>}
        </button>
      </div>
    </form>
  );
}

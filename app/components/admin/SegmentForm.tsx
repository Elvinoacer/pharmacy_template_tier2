"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { Layers, FileText, AlertCircle, Check, Save } from "lucide-react";

export default function SegmentForm({
  action,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);

  return (
    <form action={formAction} className="space-y-4">
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

      <div>
        <label className="label-admin">Segment name *</label>
        <div className="relative">
          <Layers className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#ecfdf5]/30" />
          <input name="name" required placeholder="e.g. Diabetes care patients" className="input-admin pl-9" />
        </div>
      </div>

      <div>
        <label className="label-admin">Description</label>
        <div className="relative">
          <FileText className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-[#ecfdf5]/30" />
          <textarea name="description" rows={3} placeholder="What unites customers in this segment?" className="input-admin resize-y pl-9" />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#0f766e] px-4 py-2.5 text-sm font-semibold text-[#042f2e] transition hover:brightness-110 disabled:opacity-50"
      >
        {pending ? (
          <><span className="typing-dot" /> Saving…</>
        ) : (
          <><Save className="h-4 w-4" /> Create segment</>
        )}
      </button>
    </form>
  );
}

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
        <div className="admin-alert-error">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.error}</span>
        </div>
      )}
      {state?.success && (
        <div className="admin-alert-success">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.success}</span>
        </div>
      )}

      <div>
        <label className="label-admin">Segment name *</label>
        <div className="relative">
          <Layers className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input name="name" required placeholder="e.g. Diabetes care patients" className="input-admin pl-9" />
        </div>
      </div>

      <div>
        <label className="label-admin">Description</label>
        <div className="relative">
          <FileText className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 admin-soft" />
          <textarea name="description" rows={3} placeholder="What unites customers in this segment?" className="input-admin resize-y pl-9" />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-admin w-full !rounded-xl py-2.5 disabled:opacity-50"
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

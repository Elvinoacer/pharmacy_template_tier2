"use client";

import { useActionState, useEffect, useRef } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  reviewPharmacyAction,
  type ReviewActionState,
} from "@/app/actions/platform";

const initial: ReviewActionState = {};

const decisions = [
  {
    value: "under_review",
    label: "Mark in review",
    className:
      "border-violet-400/40 bg-violet-400/10 text-violet-50 hover:bg-violet-400/20",
  },
  {
    value: "needs_info",
    label: "Request info",
    className:
      "border-amber-400/50 bg-amber-400/10 text-amber-50 hover:bg-amber-400/20",
    needsNotes: true,
  },
  {
    value: "approve",
    label: "Approve",
    className:
      "border-emerald-400/60 bg-emerald-400 text-emerald-950 hover:bg-emerald-300 font-semibold",
  },
  {
    value: "reject",
    label: "Reject",
    className:
      "border-rose-400/50 bg-rose-400/10 text-rose-50 hover:bg-rose-400/20",
    needsNotes: true,
  },
] as const;

export default function ReviewDecisionForm({
  pharmacyId,
  currentStatus,
}: {
  pharmacyId: string;
  currentStatus: string;
}) {
  const [state, action, pending] = useActionState(reviewPharmacyAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && formRef.current) {
      const notes = formRef.current.querySelector<HTMLTextAreaElement>('textarea[name="notes"]');
      if (notes) notes.value = "";
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <input type="hidden" name="pharmacyId" value={pharmacyId} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-teal-100/60">
          Current status
        </span>
        <span className="rounded-full border border-white/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-teal-50/90">
          {currentStatus.replace(/_/g, " ")}
        </span>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-teal-50/90">Review notes</span>
        <span className="mt-0.5 block text-xs text-teal-100/55">
          Required for reject or request-info. Visible on the onboarding timeline and emailed to the owner.
        </span>
        <textarea
          name="notes"
          rows={3}
          className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm outline-none placeholder:text-teal-100/35 focus:border-teal-300/50"
          placeholder="e.g. Licence number matches PPB register. Pin confirmed."
          disabled={pending}
        />
      </label>

      {state.error && (
        <p
          className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-3 py-2.5 text-sm text-rose-100"
          role="alert"
        >
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="flex items-start gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-2.5 text-sm text-emerald-50">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.success}</span>
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {decisions.map((d) => (
          <button
            key={d.value}
            type="submit"
            name="decision"
            value={d.value}
            disabled={pending}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${d.className}`}
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {d.label}
          </button>
        ))}
      </div>
    </form>
  );
}

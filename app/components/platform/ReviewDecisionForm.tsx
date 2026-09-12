"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { type ReviewActionState } from "@/app/actions/platform";
import { safeReviewPharmacyAction } from "@/app/actions/pharmacy-verification";

const initial: ReviewActionState = {};

const decisions = [
  {
    value: "under_review",
    label: "Mark in review",
    className:
      "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 dark:border-violet-400/40 dark:bg-violet-400/10 dark:text-violet-100 dark:hover:bg-violet-400/20",
  },
  {
    value: "needs_info",
    label: "Request info",
    className:
      "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-400/50 dark:bg-amber-400/10 dark:text-amber-100 dark:hover:bg-amber-400/20",
    needsNotes: true,
  },
  {
    value: "approve",
    label: "Approve verified pharmacy",
    className:
      "border-emerald-700 bg-emerald-700 font-semibold text-white hover:bg-emerald-800 dark:border-emerald-400/60 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300",
  },
  {
    value: "reject",
    label: "Reject",
    className:
      "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-400/50 dark:bg-rose-400/10 dark:text-rose-100 dark:hover:bg-rose-400/20",
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
  const [state, action, pending] = useActionState(safeReviewPharmacyAction, initial);
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
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#718078] dark:text-teal-100/55">
          Current status
        </span>
        <span className="rounded-full border border-[#d8e2dc] bg-[#f7faf8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#405047] dark:border-white/20 dark:bg-white/5 dark:text-teal-50/90">
          {currentStatus.replace(/_/g, " ")}
        </span>
      </div>

      <Link
        href={`/platform/pharmacies/${pharmacyId}/verification`}
        className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 text-sm font-semibold text-teal-900 transition hover:bg-teal-100 dark:border-teal-300/25 dark:bg-teal-300/10 dark:text-teal-50 dark:hover:bg-teal-300/15"
      >
        <span className="flex min-w-0 items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span className="truncate">Open regulatory verification dossier</span>
        </span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      </Link>
      <p className="text-xs leading-5 text-[#718078] dark:text-teal-100/55">
        Approval is protected by mandatory PPB, responsible-professional, location, ownership, applicant-authority and contact checks. The server will reject approval while any required verification remains incomplete.
      </p>

      <label className="block text-sm">
        <span className="font-semibold text-[#26352d] dark:text-teal-50/90">Review notes</span>
        <span className="mt-1 block text-xs leading-5 text-[#718078] dark:text-teal-100/55">
          Required for reject or request-info. For approval, record the decisive evidence or any resolved discrepancies.
        </span>
        <textarea
          name="notes"
          rows={4}
          className="mt-2 w-full resize-y rounded-xl border border-[#cfdcd4] bg-white px-3 py-2.5 text-sm text-[#17231d] outline-none transition placeholder:text-[#8e9a93] focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 dark:border-white/15 dark:bg-black/25 dark:text-white dark:placeholder:text-teal-100/35 dark:focus:border-teal-300/50 dark:focus:ring-teal-300/10"
          placeholder="e.g. PPB premises record matched; licence current; superintendent registration and practice licence matched; address/pin and business evidence confirmed."
          disabled={pending}
        />
      </label>

      {state.error ? (
        <p
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-100"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-50">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.success}</span>
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {decisions.map((decision) => (
          <button
            key={decision.value}
            type="submit"
            name="decision"
            value={decision.value}
            disabled={pending}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm ${decision.className}`}
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {decision.label}
          </button>
        ))}
      </div>
    </form>
  );
}

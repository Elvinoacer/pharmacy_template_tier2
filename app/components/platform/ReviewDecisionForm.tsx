"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { type ReviewActionState } from "@/app/actions/platform";
import { safeReviewPharmacyAction } from "@/app/actions/pharmacy-verification";

const initial: ReviewActionState = {};

type Readiness = {
  ready: boolean;
  missing: string[];
  checklistStale: boolean;
  riskScore: number;
};

export default function ReviewDecisionForm({
  pharmacyId,
  currentStatus,
}: {
  pharmacyId: string;
  currentStatus: string;
}) {
  const [state, action, pending] = useActionState(safeReviewPharmacyAction, initial);
  const [readiness, setReadiness] = useState<Readiness | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/platform/pharmacy-verification-readiness?pharmacyId=${encodeURIComponent(pharmacyId)}`, { cache: "no-store", credentials: "same-origin" });
        if (!response.ok) return;
        const data = await response.json() as Readiness;
        if (active) setReadiness(data);
      } catch {
        // The server-side approval action remains the final authority if this status request fails.
      }
    }
    void load();
    return () => { active = false; };
  }, [pharmacyId, state.success, state.error]);

  const approvalReady = readiness?.ready === true;
  const approvalLoading = readiness === null;

  const buttons = [
    ["under_review", "Mark in review", "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-400/40 dark:bg-violet-400/10 dark:text-violet-100"],
    ["needs_info", "Request info", "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/50 dark:bg-amber-400/10 dark:text-amber-100"],
    ["approve", approvalLoading ? "Checking verification…" : approvalReady ? "Approve verified pharmacy" : "Approval locked", "border-emerald-700 bg-emerald-700 font-semibold text-white dark:border-emerald-400/60 dark:bg-emerald-400 dark:text-emerald-950"],
    ["reject", "Reject", "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/50 dark:bg-rose-400/10 dark:text-rose-100"],
  ] as const;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="pharmacyId" value={pharmacyId} />
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold uppercase tracking-wide text-[#718078]">Current status</span>
        <span className="rounded-full border px-2.5 py-1 font-semibold uppercase">{currentStatus.replace(/_/g, " ")}</span>
      </div>

      <Link href={`/platform/pharmacies/${pharmacyId}/verification`} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 text-sm font-semibold text-teal-900 dark:border-teal-300/25 dark:bg-teal-300/10 dark:text-teal-50">
        <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Open regulatory verification dossier</span>
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>

      {approvalLoading ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-teal-50/75">
          <p className="flex items-center gap-2 font-semibold"><Loader2 className="h-4 w-4 animate-spin" /> Checking saved verification state…</p>
        </div>
      ) : approvalReady ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100">
          <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" /> Saved verification complete</p>
          <p className="mt-1 text-xs opacity-80">The approval action is reading a complete checklist from the server.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
          <p className="flex items-center gap-2 text-sm font-semibold"><LockKeyhole className="h-4 w-4" /> Approval is waiting for saved verification</p>
          <p className="mt-1 text-xs opacity-80">Complete the verification checklist. It autosaves, and this panel reads the persisted server copy.</p>
          {readiness.missing.length ? <p className="mt-2 text-xs opacity-80">Still required: {readiness.missing.slice(0, 4).join("; ")}{readiness.missing.length > 4 ? `; +${readiness.missing.length - 4} more` : ""}.</p> : null}
        </div>
      )}

      <label className="block text-sm font-semibold">
        Review notes
        <textarea name="notes" rows={4} disabled={pending} className="mt-2 w-full rounded-xl border border-[#cfdcd4] bg-white px-3 py-2.5 text-sm text-[#17231d] outline-none dark:border-white/15 dark:bg-black/25 dark:text-white" placeholder="Record decisive evidence or resolved discrepancies." />
      </label>

      {state.error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-100">{state.error}</p> : null}
      {state.success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-50">{state.success}</p> : null}

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {buttons.map(([value, label, className]) => {
          const blocked = value === "approve" && !approvalReady;
          return <button key={value} type="submit" name="decision" value={value} disabled={pending || blocked} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm ${className}`}>{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : blocked ? <LockKeyhole className="h-3.5 w-3.5" /> : null}{label}</button>;
        })}
      </div>
    </form>
  );
}

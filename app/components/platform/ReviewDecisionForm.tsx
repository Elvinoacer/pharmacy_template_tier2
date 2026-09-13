"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, KeyRound, Loader2, LockKeyhole, ShieldCheck, X } from "lucide-react";
import { type ReviewActionState } from "@/app/actions/platform";
import { safeReviewPharmacyAction } from "@/app/actions/pharmacy-approval";
import { verifyStepUpAction, type MfaState } from "@/app/actions/mfa";

const initial: ReviewActionState = {};
const initialMfa: MfaState = {};

type Readiness = {
  ready: boolean;
  missing: string[];
  checklistStale: boolean;
  riskScore: number;
};

function ApprovalStepUpDialog({ onClose, onVerified }: { onClose: () => void; onVerified: () => void }) {
  const [state, action, pending] = useActionState(verifyStepUpAction, initialMfa);

  useEffect(() => {
    if (state.success) onVerified();
  }, [state.success, onVerified]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="approval-step-up-title">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#111a17] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-200/65">Final trust decision</p>
              <h2 id="approval-step-up-title" className="mt-1 text-lg font-semibold text-white">Verify identity to approve</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={pending} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/55 transition hover:bg-white/10 hover:text-white disabled:opacity-40" aria-label="Close verification dialog">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={action} className="space-y-4 px-5 py-5">
          <p className="text-sm leading-6 text-emerald-50/70">Approval verifies this pharmacy and unlocks its guided setup. It stays off the public network until the owner finishes setup and publishes it. Enter a fresh authenticator or recovery code; your review state stays here.</p>
          <label className="block text-sm font-semibold text-white">
            Authenticator or recovery code
            <input name="code" autoComplete="one-time-code" required pattern="[0-9a-fA-F ]{6,12}" maxLength={12} autoFocus placeholder="Enter code" className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-black/25 px-3.5 text-base text-white outline-none transition placeholder:text-white/30 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/10" />
          </label>
          {state.error ? <p role="alert" className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2.5 text-sm text-rose-100">{state.error}</p> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={pending} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-4 text-sm font-semibold text-white/75 transition hover:bg-white/5 disabled:opacity-40">Cancel</button>
            <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {pending ? "Verifying…" : "Verify and approve"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ReviewDecisionForm({ pharmacyId, currentStatus }: { pharmacyId: string; currentStatus: string }) {
  const approveButtonRef = useRef<HTMLButtonElement>(null);
  const [state, action, pending] = useActionState(safeReviewPharmacyAction, initial);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [stepUpOpen, setStepUpOpen] = useState(false);

  useEffect(() => {
    if (state.error === "STEP_UP_REQUIRED") setStepUpOpen(true);
  }, [state.error]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/platform/pharmacy-verification-readiness?pharmacyId=${encodeURIComponent(pharmacyId)}`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) return;
        const data = await response.json() as Readiness;
        if (active) setReadiness(data);
      } catch {
        // The approval server action remains the final authority.
      }
    }

    void load();
    const timer = readiness?.ready ? null : window.setInterval(() => { void load(); }, 1500);
    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
    };
  }, [pharmacyId, state.success, state.error, readiness?.ready]);

  const approvalReady = readiness?.ready === true;
  const approvalLoading = readiness === null;
  const alreadyLive = currentStatus === "active";
  const buttons = [
    ["under_review", "Mark in review", "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-400/40 dark:bg-violet-400/10 dark:text-violet-100"],
    ["needs_info", "Request info", "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/50 dark:bg-amber-400/10 dark:text-amber-100"],
    ["approve", alreadyLive ? "Already live" : approvalLoading ? "Checking verification…" : approvalReady ? "Approve pharmacy" : "Approval locked", "border-emerald-700 bg-emerald-700 font-semibold text-white dark:border-emerald-400/60 dark:bg-emerald-400 dark:text-emerald-950"],
    ["reject", "Reject", "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/50 dark:bg-rose-400/10 dark:text-rose-100"],
  ] as const;

  return (
    <>
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

        {alreadyLive ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100">
            <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" /> Pharmacy is set up and public</p>
            <p className="mt-1 text-xs opacity-80">The guided setup is complete and the public network can surface eligible medicines, services and the pharmacy storefront.</p>
          </div>
        ) : approvalLoading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-teal-50/75">
            <p className="flex items-center gap-2 font-semibold"><Loader2 className="h-4 w-4 animate-spin" /> Checking saved verification state…</p>
          </div>
        ) : approvalReady ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100">
            <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" /> Saved verification complete</p>
            <p className="mt-1 text-xs opacity-80">Approval will provision the tenant, carry over verified location/contact data, create the monthly-service billing state, and send the owner into guided setup. Public listing waits for setup completion.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
            <p className="flex items-center gap-2 text-sm font-semibold"><LockKeyhole className="h-4 w-4" /> Approval is waiting for saved verification</p>
            <p className="mt-1 text-xs opacity-80">Complete the verification checklist. It autosaves, and this panel checks the persisted server copy every few seconds.</p>
            {readiness.missing.length ? <p className="mt-2 text-xs opacity-80">Still required: {readiness.missing.slice(0, 4).join("; ")}{readiness.missing.length > 4 ? `; +${readiness.missing.length - 4} more` : ""}.</p> : null}
          </div>
        )}

        <label className="block text-sm font-semibold">
          Review notes
          <textarea name="notes" rows={4} disabled={pending || alreadyLive} className="mt-2 w-full rounded-xl border border-[#cfdcd4] bg-white px-3 py-2.5 text-sm text-[#17231d] outline-none disabled:opacity-60 dark:border-white/15 dark:bg-black/25 dark:text-white" placeholder="Record decisive evidence or resolved discrepancies." />
        </label>

        {state.error && state.error !== "STEP_UP_REQUIRED" ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-100">{state.error}</p> : null}
        {state.error === "STEP_UP_REQUIRED" ? <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-100">Fresh identity verification is required for this approval. Complete the secure prompt; your approval will resume automatically.</p> : null}
        {state.success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-50">{state.success}</p> : null}

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {buttons.map(([value, label, className]) => {
            const blocked = (value === "approve" && (!approvalReady || alreadyLive)) || (alreadyLive && value !== "approve");
            return <button ref={value === "approve" ? approveButtonRef : undefined} key={value} type="submit" name="decision" value={value} disabled={pending || blocked} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm ${className}`}>{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : value === "approve" && !alreadyLive && !approvalReady ? <LockKeyhole className="h-3.5 w-3.5" /> : null}{label}</button>;
          })}
        </div>
      </form>

      {stepUpOpen ? (
        <ApprovalStepUpDialog
          onClose={() => setStepUpOpen(false)}
          onVerified={() => {
            setStepUpOpen(false);
            window.setTimeout(() => approveButtonRef.current?.click(), 0);
          }}
        />
      ) : null}
    </>
  );
}

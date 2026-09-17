"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, KeyRound, Loader2, Save, ShieldCheck, X } from "lucide-react";
import { savePharmacyVerificationChecklistAction, type VerificationActionState } from "@/app/actions/pharmacy-verification";
import { verifyStepUpAction, type MfaState } from "@/app/actions/mfa";
import VerificationDocumentEvidence from "@/app/components/platform/VerificationDocumentEvidence";

const initial: VerificationActionState = {};
const initialMfaState: MfaState = {};

type Checklist = {
  ppbRegistryMatched: boolean; licenceActive: boolean; licenceDocumentMatched: boolean;
  practitionerMatched: boolean; locationMatched: boolean; ownershipVerified: boolean;
  applicantAuthorityVerified: boolean; contactVerified: boolean; noCriticalMismatch: boolean;
  ppbRegistrySource: string | null; practitionerRegistrySource: string | null;
  checkedAt: string | null; notes: string | null;
} | null;

const CHECKS = [
  ["ppbRegistryMatched", "PPB facility register match", "Premises number, licensed name and facility type match the official PPB facilities register when those details are available.", false],
  ["licenceActive", "Current premises licence", "Confirm the submitted premises licence is current when the applicant has provided one.", false],
  ["licenceDocumentMatched", "Licence evidence match", "Confirm the uploaded licence image matches the submitted pharmacy identity when an image is available.", false],
  ["practitionerMatched", "Responsible professional match", "Confirm the professional in charge against the PPB practitioner register when professional details are available.", false],
  ["locationMatched", "Premises/location match", "The physical premises and captured map pin are consistent with the pharmacy being reviewed.", true],
  ["ownershipVerified", "Ownership / operating entity", "The reviewer is satisfied that the applicant has a credible relationship to the pharmacy or operating entity, using the evidence available.", true],
  ["applicantAuthorityVerified", "Applicant authority", "The applicant is authorized to act for this pharmacy.", true],
  ["contactVerified", "Contact identity", "Owner and contact details are consistent and independently credible.", true],
  ["noCriticalMismatch", "No critical mismatch", "No unresolved identity, safety, location, ownership or regulatory mismatch remains that should block approval.", true],
] as const;

const DEFAULT_FACILITY_SOURCE = "https://practice.pharmacyboardkenya.org/LicenseStatus?register=facilities";
const DEFAULT_PRACTITIONER_SOURCE = "https://practice.pharmacyboardkenya.org/LicenseStatus?registers=search";

function ChecklistStepUpDialog({
  open,
  onClose,
  onVerified,
}: {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}) {
  const [state, action, pending] = useActionState(verifyStepUpAction, initialMfaState);

  useEffect(() => {
    if (!state.success) return;
    onVerified();
  }, [state.success, onVerified]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="checklist-step-up-title">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#111a17] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-teal-300/20 bg-teal-300/10 text-teal-200">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-teal-200/65">Reviewer security</p>
              <h2 id="checklist-step-up-title" className="mt-1 text-lg font-semibold text-white">Re-verify to save verification checks</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={pending} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/55 transition hover:bg-white/10 hover:text-white disabled:opacity-40" aria-label="Close verification dialog">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={action} className="space-y-4 px-5 py-5">
          <p className="text-sm leading-6 text-teal-50/70">
            Your protected reviewer session expired. Your checklist changes are still kept on this page. Enter a fresh authenticator or recovery code and the pending checklist will be saved automatically.
          </p>
          <label className="block text-sm font-semibold text-white">
            Authenticator or recovery code
            <input
              name="code"
              autoComplete="one-time-code"
              required
              pattern="[0-9a-fA-F ]{6,12}"
              maxLength={12}
              autoFocus
              placeholder="Enter code"
              className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-black/25 px-3.5 text-base text-white outline-none transition placeholder:text-white/30 focus:border-teal-300/50 focus:ring-2 focus:ring-teal-300/10"
            />
          </label>

          {state.error ? (
            <p role="alert" className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2.5 text-sm text-rose-100">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p role="status" className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2.5 text-sm text-emerald-100">
              Verified. Saving your pending checklist…
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={pending} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-4 text-sm font-semibold text-white/75 transition hover:bg-white/5 disabled:opacity-40">
              Cancel
            </button>
            <button type="submit" disabled={pending || Boolean(state.success)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-300 px-4 text-sm font-semibold text-teal-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-50">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {pending ? "Verifying…" : "Verify and continue saving"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VerificationChecklistForm({ pharmacyId, checklist }: { pharmacyId: string; checklist: Checklist }) {
  const formRef = useRef<HTMLFormElement>(null);
  const lastAttemptedRevision = useRef(0);
  const submittedRevision = useRef(0);
  const submittedCheckCount = useRef(0);

  const initialChecked = CHECKS.filter(([key]) => checklist?.[key]).map(([key]) => key);
  const [revision, setRevision] = useState(0);
  const [attemptedRevision, setAttemptedRevision] = useState(0);
  const [persistedRevision, setPersistedRevision] = useState(0);
  const [persistedChecks, setPersistedChecks] = useState(initialChecked.length);
  const [checked, setChecked] = useState(() => new Set(initialChecked));
  const [facilitySource, setFacilitySource] = useState(checklist?.ppbRegistrySource || DEFAULT_FACILITY_SOURCE);
  const [practitionerSource, setPractitionerSource] = useState(checklist?.practitionerRegistrySource || DEFAULT_PRACTITIONER_SOURCE);
  const [notes, setNotes] = useState(checklist?.notes || "");
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [state, action, pending] = useActionState(savePharmacyVerificationChecklistAction, initial);

  const field = "mt-1.5 min-h-11 w-full rounded-xl border border-[#cfdcd4] bg-white px-3 py-2.5 text-sm text-[#17231d] outline-none focus:border-teal-500 dark:border-white/15 dark:bg-black/25 dark:text-white";
  const requiredTotal = CHECKS.filter(([, , , required]) => required).length;
  const requiredChecked = CHECKS.filter(([key, , , required]) => required && checked.has(key)).length;
  const requiredReady = requiredChecked === requiredTotal;

  function markDirty() {
    setRevision((value) => value + 1);
  }

  useEffect(() => {
    if (revision === 0 || pending || lastAttemptedRevision.current >= revision) return;
    const timer = window.setTimeout(() => {
      if (!formRef.current || pending || lastAttemptedRevision.current >= revision) return;
      formRef.current.requestSubmit();
    }, 650);
    return () => window.clearTimeout(timer);
  }, [revision, pending]);

  useEffect(() => {
    if (!state.success) return;
    setPersistedRevision((value) => Math.max(value, submittedRevision.current));
    setPersistedChecks(submittedCheckCount.current);
  }, [state]);

  useEffect(() => {
    if (state.error === "STEP_UP_REQUIRED" || state.error === "MFA_REQUIRED") {
      setStepUpOpen(true);
    }
  }, [state]);

  const retryPendingSave = useCallback(() => {
    setStepUpOpen(false);
    lastAttemptedRevision.current = -1;
    setAttemptedRevision(-1);
    window.setTimeout(() => formRef.current?.requestSubmit(), 0);
  }, []);

  const hasUnsavedChanges = revision > persistedRevision;
  const stepUpRequired = state.error === "STEP_UP_REQUIRED" || state.error === "MFA_REQUIRED";
  const saveBlocked = Boolean(state.error) && !stepUpRequired && attemptedRevision >= revision && hasUnsavedChanges;

  return (
    <div className="space-y-5">
      <VerificationDocumentEvidence pharmacyId={pharmacyId} />
      <form
        ref={formRef}
        action={action}
        onReset={(event) => {
          event.preventDefault();
        }}
        onSubmit={() => {
          lastAttemptedRevision.current = revision;
          setAttemptedRevision(revision);
          submittedRevision.current = revision;
          submittedCheckCount.current = checked.size;
        }}
        className="space-y-5"
      >
        <input type="hidden" name="pharmacyId" value={pharmacyId} />
        {CHECKS.map(([key]) => (
          <input key={`persist-${key}`} type="hidden" name={key} value={checked.has(key) ? "true" : "false"} />
        ))}

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-50">
          <p className="font-semibold">Regulatory paperwork is supporting evidence, not an automatic intake blocker.</p>
          <p className="mt-1 text-xs leading-5 opacity-80">
            Complete the five required reviewer checks before approval. PPB, licence and practitioner checks should be recorded whenever the evidence exists; leave them unchecked when the applicant has not supplied enough information and explain that in your notes.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <a href={DEFAULT_FACILITY_SOURCE} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-teal-800 dark:border-teal-300/25 dark:bg-teal-300/10 dark:text-teal-100">PPB facilities register <ExternalLink className="h-3.5 w-3.5" /></a>
          <a href={DEFAULT_PRACTITIONER_SOURCE} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-teal-800 dark:border-teal-300/25 dark:bg-teal-300/10 dark:text-teal-100">PPB practitioner register <ExternalLink className="h-3.5 w-3.5" /></a>
        </div>

        <div className="sticky top-4 z-10 rounded-2xl border border-teal-200 bg-white/95 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#10271f]/95">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span>Required verification</span>
              <span>{requiredChecked} / {requiredTotal}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold">
              {pending ? (
                <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-200"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</span>
              ) : stepUpRequired ? (
                <button type="button" onClick={() => setStepUpOpen(true)} className="inline-flex items-center gap-1.5 text-amber-700 hover:underline dark:text-amber-200"><KeyRound className="h-3.5 w-3.5" /> Identity check required</button>
              ) : saveBlocked ? (
                <span className="text-rose-700 dark:text-rose-200">Save needs attention</span>
              ) : hasUnsavedChanges ? (
                <span className="text-amber-700 dark:text-amber-200">Changes queued</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-200"><CheckCircle2 className="h-3.5 w-3.5" /> Saved</span>
              )}
            </div>
          </div>
          <progress className="mt-2 h-2 w-full accent-teal-600" value={requiredChecked} max={requiredTotal} />
          <p className="mt-2 text-xs text-slate-500 dark:text-teal-100/55">
            Approval requires all five core reviewer checks plus meaningful evidence notes. Regulatory checks remain visible so the reviewer can record stronger evidence when it is available.
          </p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-teal-100/40">
            Saved evidence checks: {persistedChecks}/{CHECKS.length}. PPB sources are required only when you positively confirm the corresponding PPB match.
          </p>
        </div>

        <div className="space-y-2.5">
          {CHECKS.map(([key, label, help, required]) => {
            const isChecked = checked.has(key);
            return (
              <label key={key} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition sm:p-4 ${isChecked ? "border-teal-300 bg-teal-50/70 dark:border-teal-300/30 dark:bg-teal-300/[0.07]" : "border-[#dce7e1] bg-[#f9fbfa] hover:border-teal-200 dark:border-white/10 dark:bg-white/[0.025] dark:hover:border-teal-300/25"}`}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(event) => {
                    const nextChecked = event.currentTarget.checked;
                    setChecked((previous) => {
                      const next = new Set(previous);
                      if (nextChecked) next.add(key); else next.delete(key);
                      return next;
                    });
                    markDirty();
                  }}
                  className="mt-1 h-4 w-4 accent-teal-700"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="block text-sm font-semibold text-[#26352d] dark:text-teal-50/95">{label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${required ? "bg-teal-700/10 text-teal-800 dark:bg-teal-300/15 dark:text-teal-100" : "bg-slate-500/10 text-slate-600 dark:bg-white/10 dark:text-white/55"}`}>
                      {required ? "Required" : "Supporting"}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#718078] dark:text-teal-100/55">{help}</span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            PPB facility-register source
            <input
              name="ppbRegistrySource"
              value={facilitySource}
              onChange={(event) => { setFacilitySource(event.currentTarget.value); markDirty(); }}
              className={field}
            />
          </label>
          <label className="text-sm font-medium">
            PPB practitioner-register source
            <input
              name="practitionerRegistrySource"
              value={practitionerSource}
              onChange={(event) => { setPractitionerSource(event.currentTarget.value); markDirty(); }}
              className={field}
            />
          </label>
        </div>

        <label className="block text-sm font-medium">
          Reviewer notes / evidence trail
          <textarea
            name="notes"
            rows={5}
            value={notes}
            onChange={(event) => { setNotes(event.currentTarget.value); markDirty(); }}
            className={field}
            placeholder="Explain what you verified, what paperwork was unavailable, which alternative evidence you relied on, and any discrepancy you resolved. Use at least 20 characters before approval."
          />
        </label>

        {stepUpRequired ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
            <p className="font-semibold">Your secure reviewer session expired.</p>
            <p className="mt-1 text-xs leading-5 opacity-80">Your current ticks and notes are still preserved in this browser. Re-verify once and the pending checklist will save automatically.</p>
            <button type="button" onClick={() => setStepUpOpen(true)} className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-amber-700 px-3.5 text-xs font-semibold text-white transition hover:bg-amber-800 dark:bg-amber-300 dark:text-amber-950 dark:hover:bg-amber-200">
              <KeyRound className="h-3.5 w-3.5" /> Verify identity and resume saving
            </button>
          </div>
        ) : state.error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-100">{state.error}</p>
        ) : null}
        {state.success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100">{state.success}</p> : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-60 dark:bg-teal-300 dark:text-teal-950"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {pending ? "Saving checks…" : "Save now"}
          </button>
          <span className="text-xs text-slate-500 dark:text-teal-100/50">Autosave runs about 0.7s after your last change.</span>
        </div>

        {state.success && !hasUnsavedChanges && requiredReady ? <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-700 dark:text-teal-200" href={`/platform/pharmacies/${pharmacyId}`}>Return to approval decision →</Link> : null}
      </form>

      {stepUpOpen ? (
        <ChecklistStepUpDialog
          open={stepUpOpen}
          onClose={() => setStepUpOpen(false)}
          onVerified={retryPendingSave}
        />
      ) : null}
    </div>
  );
}

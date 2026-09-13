"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, Save, ShieldCheck } from "lucide-react";
import { savePharmacyVerificationChecklistAction, type VerificationActionState } from "@/app/actions/pharmacy-verification";
import VerificationDocumentEvidence from "@/app/components/platform/VerificationDocumentEvidence";

const initial: VerificationActionState = {};
type Checklist = {
  ppbRegistryMatched: boolean; licenceActive: boolean; licenceDocumentMatched: boolean;
  practitionerMatched: boolean; locationMatched: boolean; ownershipVerified: boolean;
  applicantAuthorityVerified: boolean; contactVerified: boolean; noCriticalMismatch: boolean;
  ppbRegistrySource: string | null; practitionerRegistrySource: string | null;
  checkedAt: string | null; notes: string | null;
} | null;

const CHECKS = [
  ["ppbRegistryMatched", "PPB facility register match", "Premises number, licensed name and facility type match the official PPB facilities register."],
  ["licenceActive", "Current premises licence", "The submitted premises licence is current and valid."],
  ["licenceDocumentMatched", "Licence evidence match", "The uploaded licence image matches the submitted pharmacy identity."],
  ["practitionerMatched", "Responsible professional match", "The professional in charge matches the PPB practitioner register."],
  ["locationMatched", "Licensed location match", "The address and map pin match the licensed premises."],
  ["ownershipVerified", "Business ownership match", "Business evidence matches the operating entity."],
  ["applicantAuthorityVerified", "Applicant authority", "The applicant is authorized to act for this pharmacy."],
  ["contactVerified", "Contact identity", "Owner and contact details are consistent."],
  ["noCriticalMismatch", "No critical mismatch", "No unresolved identity, licence, practitioner, location or ownership mismatch remains."],
] as const;

export default function VerificationChecklistForm({ pharmacyId, checklist }: { pharmacyId: string; checklist: Checklist }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const lastSubmittedRevision = useRef(0);
  const [revision, setRevision] = useState(0);
  const [checked, setChecked] = useState(() => new Set(CHECKS.filter(([key]) => checklist?.[key]).map(([key]) => key)));
  const [state, action, pending] = useActionState(savePharmacyVerificationChecklistAction, initial);
  const field = "mt-1.5 min-h-11 w-full rounded-xl border border-[#cfdcd4] bg-white px-3 py-2.5 text-sm text-[#17231d] outline-none focus:border-teal-500 dark:border-white/15 dark:bg-black/25 dark:text-white";

  function markDirty() {
    setRevision((value) => value + 1);
  }

  useEffect(() => {
    if (revision === 0 || pending || lastSubmittedRevision.current >= revision) return;
    const timer = window.setTimeout(() => {
      if (!formRef.current || pending || lastSubmittedRevision.current >= revision) return;
      lastSubmittedRevision.current = revision;
      formRef.current.requestSubmit();
    }, 650);
    return () => window.clearTimeout(timer);
  }, [revision, pending]);

  useEffect(() => {
    if (!state.success) return;
    router.refresh();
  }, [state.success, router]);

  const persistedChecks = CHECKS.filter(([key]) => checklist?.[key]).length;
  const hasUnsavedChanges = revision > lastSubmittedRevision.current;

  return (
    <div className="space-y-5">
      <VerificationDocumentEvidence pharmacyId={pharmacyId} />
      <form ref={formRef} action={action} className="space-y-5">
        <input type="hidden" name="pharmacyId" value={pharmacyId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <a href="https://practice.pharmacyboardkenya.org/LicenseStatus?register=facilities" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-teal-800 dark:border-teal-300/25 dark:bg-teal-300/10 dark:text-teal-100">PPB facilities register <ExternalLink className="h-3.5 w-3.5" /></a>
          <a href="https://practice.pharmacyboardkenya.org/LicenseStatus?registers=search" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-teal-800 dark:border-teal-300/25 dark:bg-teal-300/10 dark:text-teal-100">PPB practitioner register <ExternalLink className="h-3.5 w-3.5" /></a>
        </div>

        <div className="sticky top-4 z-10 rounded-2xl border border-teal-200 bg-white/95 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#10271f]/95">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span>Evidence reviewed</span>
              <span>{checked.size} / {CHECKS.length}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold">
              {pending ? (
                <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-200"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</span>
              ) : hasUnsavedChanges ? (
                <span className="text-amber-700 dark:text-amber-200">Changes queued</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-200"><CheckCircle2 className="h-3.5 w-3.5" /> Saved</span>
              )}
            </div>
          </div>
          <progress className="mt-2 h-2 w-full accent-teal-600" value={checked.size} max={CHECKS.length} />
          <p className="mt-2 text-xs text-slate-500 dark:text-teal-100/55">
            Every checklist change is saved automatically. The approval decision uses the latest saved checklist from the server, not only the boxes currently visible in this browser.
          </p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-teal-100/40">
            Server-persisted checks on page load: {persistedChecks}/{CHECKS.length}. Complete all nine checks, use the official PPB sources, and add meaningful evidence notes to unlock approval.
          </p>
        </div>

        <div className="space-y-2.5">
          {CHECKS.map(([key, label, help]) => (
            <label key={key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#dce7e1] bg-[#f9fbfa] p-3 transition hover:border-teal-200 dark:border-white/10 dark:bg-white/[0.025] dark:hover:border-teal-300/25 sm:p-4">
              <input
                type="checkbox"
                name={key}
                checked={checked.has(key)}
                onChange={(event) => {
                  setChecked((previous) => {
                    const next = new Set(previous);
                    if (event.target.checked) next.add(key); else next.delete(key);
                    return next;
                  });
                  markDirty();
                }}
                className="mt-1 h-4 w-4 accent-teal-700"
              />
              <span>
                <span className="block text-sm font-semibold text-[#26352d] dark:text-teal-50/95">{label}</span>
                <span className="mt-1 block text-xs leading-5 text-[#718078] dark:text-teal-100/55">{help}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            PPB facility-register source
            <input name="ppbRegistrySource" defaultValue={checklist?.ppbRegistrySource || "https://practice.pharmacyboardkenya.org/LicenseStatus?register=facilities"} onChange={markDirty} className={field} />
          </label>
          <label className="text-sm font-medium">
            PPB practitioner-register source
            <input name="practitionerRegistrySource" defaultValue={checklist?.practitionerRegistrySource || "https://practice.pharmacyboardkenya.org/LicenseStatus?registers=search"} onChange={markDirty} className={field} />
          </label>
        </div>

        <label className="block text-sm font-medium">
          Reviewer notes / evidence trail
          <textarea name="notes" rows={5} defaultValue={checklist?.notes || ""} onChange={markDirty} className={field} placeholder="Record registry results, identifiers, discrepancies and resolutions. Use at least 20 characters before marking all checks passed." />
        </label>

        {state.error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-100">{state.error}</p> : null}
        {state.success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100">{state.success}</p> : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            onClick={() => { lastSubmittedRevision.current = revision; }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-60 dark:bg-teal-300 dark:text-teal-950"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {pending ? "Saving checks…" : "Save now"}
          </button>
          <span className="text-xs text-slate-500 dark:text-teal-100/50">Autosave runs about 0.7s after your last change.</span>
        </div>

        {state.success && checked.size === CHECKS.length ? <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-700 dark:text-teal-200" href={`/platform/pharmacies/${pharmacyId}`}>Return to approval decision →</Link> : null}
      </form>
    </div>
  );
}

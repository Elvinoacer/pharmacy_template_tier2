"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ExternalLink, Loader2, ShieldCheck } from "lucide-react";
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
  const [checked, setChecked] = useState(() => new Set(CHECKS.filter(([key]) => checklist?.[key]).map(([key]) => key)));
  const [state, action, pending] = useActionState(savePharmacyVerificationChecklistAction, initial);
  const field = "mt-1.5 min-h-11 w-full rounded-xl border border-[#cfdcd4] bg-white px-3 py-2.5 text-sm text-[#17231d] outline-none focus:border-teal-500 dark:border-white/15 dark:bg-black/25 dark:text-white";

  return (
    <div className="space-y-5">
      <VerificationDocumentEvidence pharmacyId={pharmacyId} />
      <form action={action} className="space-y-5">
        <input type="hidden" name="pharmacyId" value={pharmacyId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <a href="https://practice.pharmacyboardkenya.org/LicenseStatus?register=facilities" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-teal-800 dark:border-teal-300/25 dark:bg-teal-300/10 dark:text-teal-100">PPB facilities register <ExternalLink className="h-3.5 w-3.5" /></a>
          <a href="https://practice.pharmacyboardkenya.org/LicenseStatus?registers=search" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-teal-800 dark:border-teal-300/25 dark:bg-teal-300/10 dark:text-teal-100">PPB practitioner register <ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
        <div className="sticky top-4 z-10 rounded-2xl border border-teal-200 bg-white/95 p-4 backdrop-blur dark:border-white/10 dark:bg-[#10271f]/95">
          <div className="flex justify-between text-sm font-semibold"><span>Evidence reviewed</span><span>{checked.size} / {CHECKS.length}</span></div>
          <progress className="mt-2 h-2 w-full accent-teal-600" value={checked.size} max={CHECKS.length} />
          <p className="mt-2 text-xs text-slate-500">Check each item against the evidence above and the official PPB registers.</p>
        </div>
        <div className="space-y-2.5">
          {CHECKS.map(([key, label, help]) => <label key={key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#dce7e1] bg-[#f9fbfa] p-3 dark:border-white/10 dark:bg-white/[0.025] sm:p-4"><input type="checkbox" name={key} checked={checked.has(key)} onChange={(e) => setChecked((prev) => { const next = new Set(prev); e.target.checked ? next.add(key) : next.delete(key); return next; })} className="mt-1 h-4 w-4 accent-teal-700" /><span><span className="block text-sm font-semibold text-[#26352d] dark:text-teal-50/95">{label}</span><span className="mt-1 block text-xs leading-5 text-[#718078] dark:text-teal-100/55">{help}</span></span></label>)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">PPB facility-register source<input name="ppbRegistrySource" defaultValue={checklist?.ppbRegistrySource || "https://practice.pharmacyboardkenya.org/LicenseStatus?register=facilities"} className={field} /></label>
          <label className="text-sm font-medium">PPB practitioner-register source<input name="practitionerRegistrySource" defaultValue={checklist?.practitionerRegistrySource || "https://practice.pharmacyboardkenya.org/LicenseStatus?registers=search"} className={field} /></label>
        </div>
        <label className="block text-sm font-medium">Reviewer notes / evidence trail<textarea name="notes" rows={5} defaultValue={checklist?.notes || ""} className={field} placeholder="Record registry results, identifiers, discrepancies and resolutions." /></label>
        {state.error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-100">{state.error}</p> : null}
        {state.success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100">{state.success}</p> : null}
        <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-60 dark:bg-teal-300 dark:text-teal-950">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{pending ? "Saving checks…" : "Save verification checklist"}</button>
        {state.success && checked.size === CHECKS.length ? <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-700 dark:text-teal-200" href={`/platform/pharmacies/${pharmacyId}`}>Continue to approval decision →</Link> : null}
      </form>
    </div>
  );
}

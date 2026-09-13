"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import {
  savePharmacyVerificationChecklistAction,
  type VerificationActionState,
} from "@/app/actions/pharmacy-verification";

const initial: VerificationActionState = {};

type Checklist = {
  ppbRegistryMatched: boolean;
  licenceActive: boolean;
  licenceDocumentMatched: boolean;
  practitionerMatched: boolean;
  locationMatched: boolean;
  ownershipVerified: boolean;
  applicantAuthorityVerified: boolean;
  contactVerified: boolean;
  noCriticalMismatch: boolean;
  ppbRegistrySource: string | null;
  practitionerRegistrySource: string | null;
  checkedAt: string | null;
  notes: string | null;
} | null;

const CHECKS = [
  ["ppbRegistryMatched", "PPB facility register match", "The premises/facility number, licensed name and facility type match the official PPB facilities register."],
  ["licenceActive", "Current premises licence", "The submitted premises licence is active/current and not expired, suspended, revoked or otherwise invalid."],
  ["licenceDocumentMatched", "Licence evidence match", "The uploaded licence image matches the submitted licence number, premises identity and pharmacy name."],
  ["practitionerMatched", "Responsible professional match", "The superintendent / professional in charge is found on the PPB practitioner register and the supplied identifiers are consistent."],
  ["locationMatched", "Licensed location match", "The submitted physical address and precise map pin are consistent with the licensed premises."],
  ["ownershipVerified", "Business ownership match", "Business-registration evidence is consistent with the entity operating or owning the pharmacy."],
  ["applicantAuthorityVerified", "Applicant authority", "The applicant is reasonably established as authorized to act for this pharmacy."],
  ["contactVerified", "Contact identity", "Owner/contact details are verified and consistent with the submitted organization."],
  ["noCriticalMismatch", "No critical mismatch", "There is no unresolved identity, licence, practitioner, location or ownership mismatch."],
] as const;

export default function VerificationChecklistForm({
  pharmacyId,
  checklist,
}: {
  pharmacyId: string;
  checklist: Checklist;
}) {
  const [checked, setChecked] = useState(() => new Set(CHECKS.filter(([key]) => checklist?.[key]).map(([key]) => key)));
  const [state, action, pending] = useActionState(savePharmacyVerificationChecklistAction, initial);
  const inputClass =
    "mt-1.5 min-h-11 w-full rounded-xl border border-[#cfdcd4] bg-white px-3 py-2.5 text-sm text-[#17231d] outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 dark:border-white/15 dark:bg-black/25 dark:text-white dark:focus:border-teal-300/50 dark:focus:ring-teal-300/10";

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="pharmacyId" value={pharmacyId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href="https://practice.pharmacyboardkenya.org/LicenseStatus?register=facilities"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-teal-800 transition hover:bg-teal-100 dark:border-teal-300/25 dark:bg-teal-300/10 dark:text-teal-100 dark:hover:bg-teal-300/15"
        >
          PPB facilities register <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <a
          href="https://practice.pharmacyboardkenya.org/LicenseStatus?registers=search"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-teal-800 transition hover:bg-teal-100 dark:border-teal-300/25 dark:bg-teal-300/10 dark:text-teal-100 dark:hover:bg-teal-300/15"
        >
          PPB practitioner register <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="sticky top-4 z-10 rounded-2xl border border-teal-200 bg-white/95 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#10271f]/95">
        <div className="flex justify-between text-sm font-semibold"><span>Evidence reviewed</span><span>{checked.size} / {CHECKS.length}</span></div>
        <progress className="mt-2 h-2 w-full accent-teal-600" aria-label="Review checks completed" value={checked.size} max={CHECKS.length} />
        <p className="mt-2 text-xs text-slate-500">Check each item against the submitted evidence.</p>
      </div>
      <div className="space-y-2.5">
        {CHECKS.map(([key, label, help]) => (
          <label
            key={key}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#dce7e1] bg-[#f9fbfa] p-3 transition hover:border-teal-200 dark:border-white/10 dark:bg-white/[0.025] dark:hover:border-teal-300/25 sm:p-4"
          >
            <input
              type="checkbox"
              name={key}
              checked={checked.has(key)}
              onChange={(event) => setChecked((previous) => { const next = new Set(previous); if (event.target.checked) next.add(key); else next.delete(key); return next; })}
              className="mt-1 h-4 w-4 shrink-0 rounded border-[#aebdb5] text-teal-700 focus:ring-teal-500 dark:border-white/30 dark:bg-black/20"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[#26352d] dark:text-teal-50/95">{label}</span>
              <span className="mt-1 block text-xs leading-5 text-[#718078] dark:text-teal-100/55">{help}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-[#304139] dark:text-teal-50/90">
          PPB facility-register source
          <input
            name="ppbRegistrySource"
            defaultValue={checklist?.ppbRegistrySource || "https://practice.pharmacyboardkenya.org/LicenseStatus?register=facilities"}
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-medium text-[#304139] dark:text-teal-50/90">
          PPB practitioner-register source
          <input
            name="practitionerRegistrySource"
            defaultValue={checklist?.practitionerRegistrySource || "https://practice.pharmacyboardkenya.org/LicenseStatus?registers=search"}
            className={inputClass}
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-[#304139] dark:text-teal-50/90">
        Reviewer notes / evidence trail
        <textarea
          name="notes"
          rows={5}
          defaultValue={checklist?.notes || ""}
          className={inputClass}
          placeholder="Record exact PPB names/statuses, expiry dates, phone calls made, business-document identifiers, discrepancies, and how they were resolved."
        />
      </label>

      {state.error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-100">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100">
          {state.success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-300 dark:text-teal-950 dark:hover:bg-teal-200 sm:w-auto"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {pending ? "Saving checks…" : "Save verification checklist"}
      </button>
      {state.success && checked.size === CHECKS.length ? <Link className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-teal-700 dark:text-teal-200" href={`/platform/pharmacies/${pharmacyId}`}>Continue to approval decision →</Link> : null}
    </form>
  );
}

"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import TenantLink, { useTenantSlug } from "../TenantLink";
import Link from "next/link";
import {
  bookVaccinationAction,
  type VaccinationActionState,
} from "@/app/actions/vaccination";
import { toast } from "@/app/components/Toaster";
import {
  PRE_VACCINATION_QUESTIONS,
  CONSENT_TEXT,
  evaluatePreVaccinationScreening,
  type ScreeningAnswers,
  type VaccineSeed,
} from "@/app/lib/vaccination-catalog";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  ShieldAlert,
  Syringe,
} from "lucide-react";

type VaccineOption = {
  slug: string;
  name: string;
  antigen: string;
  pharmacyAdministered: boolean;
  bookable: boolean;
  visSummary: string;
  visTitle: string | null;
  visVersion: string | null;
  contraindications: string[];
  commonSideEffects: string[];
  priceKes: number | null;
};

export function VaccinationBookingForm({
  vaccines,
  defaultVaccine,
  defaultCampaign,
  defaultName = "",
  defaultPhone = "",
  defaultEmail = "",
  pharmacySlug: pharmacySlugProp,
}: {
  vaccines: VaccineOption[];
  defaultVaccine?: string;
  defaultCampaign?: string;
  defaultName?: string;
  defaultPhone?: string;
  defaultEmail?: string;
  pharmacySlug?: string;
}) {
  const tenantSlug = useTenantSlug();
  const pharmacySlug = pharmacySlugProp || tenantSlug || "";
  const bookable = vaccines.filter((v) => v.bookable && v.pharmacyAdministered);
  const [step, setStep] = useState(0);
  const [slug, setSlug] = useState(defaultVaccine && bookable.some((v) => v.slug === defaultVaccine) ? defaultVaccine : bookable[0]?.slug || "");
  const [answers, setAnswers] = useState<ScreeningAnswers>({});
  const [state, formAction, pending] = useActionState(bookVaccinationAction, {} as VaccinationActionState);

  const selected = bookable.find((v) => v.slug === slug) || bookable[0];
  const liveEval = useMemo(() => evaluatePreVaccinationScreening(answers), [answers]);

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  if (bookable.length === 0) {
    return (
      <div className="liquid-glass care-glass rounded-3xl border border-[var(--public-health-ui-border)] bg-[var(--care-glass)] p-8 text-center shadow-lg backdrop-blur-xl">
        <p className="text-sm font-semibold text-[var(--foreground)]">Online booking is not open for pharmacy-administered vaccines right now.</p>
        <p className="mt-2 text-sm text-[var(--muted)]">Call us or request preventive counselling and referral.</p>
        <TenantLink href="/preventive" className="btn-primary mt-5 inline-flex text-sm">Preventive services</TenantLink></div>
    );
  }

  if (state?.success || state?.appointmentId) {
    return (
      <div className="liquid-glass care-glass rounded-3xl border border-[var(--public-health-ui-border)] bg-[var(--care-glass)] p-8 shadow-lg backdrop-blur-xl">
        <CheckCircle2 className="h-10 w-10 text-[var(--brand)]" />
        <h2 className="mt-3 text-2xl font-semibold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display), serif" }}>
          Request received
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          {state.success || state.error}
        </p>
        {state.outcome && (
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-[var(--brand)]">
            Screening outcome: {state.outcome}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <TenantLink href="/vaccinations" className="btn-primary inline-flex text-sm">Back to vaccines</TenantLink>    <Link href="/portal/vaccinations" className="inline-flex items-center rounded-full border border-[var(--public-health-ui-border)] bg-[var(--card)] px-5 py-2.5 text-sm font-semibold text-[var(--brand-deep)] transition hover:bg-[var(--card-elev)]">
            View my immunisation record
          </Link>
        </div>
      </div>
    );
  }

  const steps = ["Vaccine", "Your details", "Screening", "Consent"];

  return (
    <form action={formAction} className="liquid-glass care-glass rounded-3xl border border-[var(--public-health-ui-border)] bg-[var(--care-glass)] p-5 shadow-[0_16px_50px_rgba(8,40,32,0.08)] backdrop-blur-xl sm:p-8">
      <input type="hidden" name="pharmacySlug" value={pharmacySlug} />
      <input type="hidden" name="vaccineSlug" value={slug} />
      <input type="hidden" name="campaignSlug" value={defaultCampaign || ""} />

      <ol className="mb-6 flex flex-wrap gap-2">
        {steps.map((label, i) => (
          <li
            key={label}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              i === step
                ? "border border-[var(--brand)] bg-[var(--brand)] text-[var(--background)]"
                : i < step
                  ? "border border-teal-700/60 bg-teal-100 text-teal-900 dark:border-teal-300/60 dark:text-teal-100"
                  : "border border-[var(--public-health-ui-border)] bg-[var(--card-elev)] text-[var(--muted)]"
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      <div className={step === 0 ? "" : "hidden"}>
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[#0c1a14]">Which vaccine do you need?</p>
          <div className="grid gap-2">
            {bookable.map((v) => (
              <label
                key={v.slug}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${
                  slug === v.slug
                    ? "border-[var(--brand)] bg-[var(--brand-soft)] shadow-sm"
                    : "border-[var(--public-health-ui-border)] bg-[var(--card)] hover:border-[var(--brand)]"
                }`}
              >
                <input
                  type="radio"
                  name="vaccineChoice"
                  className="mt-1"
                  checked={slug === v.slug}
                  onChange={() => setSlug(v.slug)}
                />
                <span>
                  <span className="block text-sm font-semibold text-[#0c1a14]">{v.name}</span>
                  <span className="mt-0.5 block text-xs text-[var(--public-health-editorial-body)]">{v.antigen}</span>
                  {v.priceKes != null && v.priceKes > 0 && (
                    <span className="mt-1 inline-block text-xs font-bold text-teal-800">KES {v.priceKes.toLocaleString()}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className={step === 1 ? "grid gap-4 sm:grid-cols-2" : "hidden"}
      >
          <Field label="Full name" name="fullName" defaultValue={defaultName} required />
          <Field label="Phone" name="phone" defaultValue={defaultPhone} required />
          <Field label="Email (optional)" name="email" type="email" defaultValue={defaultEmail} />
          <Field label="Date of birth" name="dateOfBirth" type="date" />
          <label className="block text-sm">
            <span className="font-medium text-[#0c1a14]">Gender (optional)</span>
            <select name="gender" className="mt-1 w-full rounded-xl border border-[var(--public-health-ui-border)] bg-[var(--card-elev)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_24%,transparent)]">
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </label>
          <Field label="Preferred date" name="preferredDate" type="date" />
          <Field label="Preferred time" name="preferredTime" placeholder="e.g. 10:30" />
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-[#0c1a14]">Notes for the pharmacist</span>
            <textarea name="notes" rows={3} className="mt-1 w-full rounded-xl border border-[var(--public-health-ui-border)] bg-[var(--card-elev)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_24%,transparent)]" placeholder="Travel dates, pregnancy, medicines, previous records…" />
          </label>
      </div>

      <div className={step === 2 ? "space-y-4" : "hidden"}>
          <p className="text-sm text-[var(--public-health-editorial-body)]">
            Answer honestly. This is a safety screen, not a diagnosis. A pharmacist still reviews every questionnaire.
          </p>
          {PRE_VACCINATION_QUESTIONS.map((q) => (
            <fieldset key={q.id} className="rounded-2xl border border-[var(--public-health-ui-border)] p-4">
              <legend className="text-sm font-medium text-[#0c1a14]">{q.prompt}</legend>
              <p className="mt-1 text-xs text-[var(--public-health-editorial-body)]">{q.help}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {(["no", "yes", "unsure"] as const).map((val) => (
                  <label key={val} className="inline-flex items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      name={`q_${q.id}`}
                      value={val}
                      required
                      checked={answers[q.id] === val}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: val }))}
                    />
                    {val === "no" ? "No" : val === "yes" ? "Yes" : "Not sure"}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <div
            className={`rounded-2xl p-4 text-sm ${
              liveEval.outcome === "eligible"
                ? "border border-emerald-700/60 bg-emerald-50 text-emerald-900 dark:border-emerald-300/60 dark:text-emerald-100"
                : liveEval.outcome === "defer"
                  ? "border border-amber-700/60 bg-amber-50 text-amber-950 dark:border-amber-300/60 dark:text-amber-100"
                  : "border border-rose-700/60 bg-rose-50 text-rose-950 dark:border-rose-300/60 dark:text-rose-100"
            }`}
          >
            <p className="font-semibold">Provisional screening: {liveEval.outcome}</p>
            <p className="mt-1 text-xs leading-relaxed">{liveEval.reason}</p>
          </div>
      </div>

      <div className={step === 3 ? "space-y-4" : "hidden"}>
          <div className="rounded-2xl border border-[var(--public-health-ui-border)] bg-[#f4fbf8] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#084c3f]">
              <FileText className="h-4 w-4" /> {selected.visTitle || "Vaccine information"}
              {selected.visVersion ? ` · ${selected.visVersion}` : ""}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--public-health-editorial-body)]">{selected.visSummary}</p>
            {selected.commonSideEffects.length > 0 && (
              <p className="mt-2 text-xs text-[var(--public-health-editorial-body)]">
                Common reactions: {selected.commonSideEffects.join(", ")}.
              </p>
            )}
            {selected.contraindications.length > 0 && (
              <p className="mt-2 text-xs text-rose-800">
                Do not proceed if: {selected.contraindications.join("; ")}.
              </p>
            )}
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="visAcknowledged" value="true" required className="mt-1" />
            <span>I have read and understood the vaccine information for {selected.name}.</span>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[#0c1a14]">Who is consenting?</span>
            <select name="consentType" defaultValue="self" className="mt-1 w-full rounded-xl border border-[var(--public-health-ui-border)] bg-[var(--card-elev)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_24%,transparent)]">
              <option value="self">I am the patient</option>
              <option value="parent_guardian">Parent / legal guardian</option>
              <option value="caregiver">Authorised caregiver</option>
            </select>
          </label>
          <Field label="Consenter name" name="consenterName" defaultValue={defaultName} required />
          <Field label="Relationship (if not self)" name="consenterRelationship" placeholder="e.g. mother, father, caregiver" />
          <div className="rounded-2xl border border-[var(--public-health-ui-border)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Consent statement</p>
            <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-[var(--public-health-editorial-body)]">{CONSENT_TEXT}</p>
          </div>
          <Field label="Type your full name as a signature" name="signatureName" required />
          <p className="flex items-start gap-2 text-xs text-[var(--public-health-editorial-body)]">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            You can withdraw consent before the dose is given. After administration, the clinical record is retained as required by local rules.
          </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || pending}
          className="inline-flex items-center gap-1 rounded-full border border-transparent px-4 py-2 text-sm font-semibold text-[var(--brand-deep)] transition hover:border-[var(--public-health-ui-border)] hover:bg-[var(--card-elev)] disabled:cursor-not-allowed disabled:border-[var(--public-health-ui-border)] disabled:bg-[var(--card-elev)] disabled:text-[var(--muted)] disabled:opacity-100"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(3, s + 1))}
            className="btn-primary inline-flex text-sm"
          >
            Continue <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button type="submit" disabled={pending} className="btn-primary inline-flex text-sm disabled:cursor-not-allowed disabled:opacity-100 disabled:saturate-50">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Syringe className="h-4 w-4" />}
            {pending ? "Submitting…" : "Submit booking & consent"}
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-[#0c1a14]">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-[var(--public-health-ui-border)] bg-[var(--card-elev)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_24%,transparent)]"
      />
    </label>
  );
}

export type { VaccineSeed };

"use client";

/* Private preview endpoint requires the browser session cookie, so these
 * images intentionally bypass Next/Image's server-side optimizer. */
/* eslint-disable @next/next/no-img-element */

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  FileCheck2,
  Loader2,
  ShieldCheck,
  UploadCloud,
  UserRound,
} from "lucide-react";
import {
  savePharmacyVerificationProfileAction,
  type VerificationActionState,
} from "@/app/actions/pharmacy-verification";
import type { PharmacyOnboardingSnapshot } from "@/app/lib/services/pharmacy-onboarding-journey";
import styles from "@/app/components/onboard/OnboardSurface.module.css";
import polish from "@/app/components/onboard/OnboardFormPolish.module.css";

type DocumentKind = "license" | "business";

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`${styles.field} ${polish.formField} ${className || ""}`}>
      <span className={`${styles.fieldLabel} ${polish.fieldLabel}`}>{label}</span>
      {children}
      {hint ? <span className={`${styles.fieldHint} ${polish.fieldHint}`}>{hint}</span> : null}
    </label>
  );
}

function SectionHeading({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-3 pt-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-300">
        {icon}
      </span>
      <div>
        <h3 className="text-sm font-bold text-[var(--foreground)]">{title}</h3>
        <p className="text-xs text-[var(--muted)]">{subtitle}</p>
      </div>
    </div>
  );
}

function previewSrc(pharmacyId: string, kind: DocumentKind, version: number) {
  const params = new URLSearchParams({ pharmacyId, kind, v: String(version) });
  return `/api/onboard/verification-documents?${params.toString()}`;
}

export function VerificationInformationStep({
  snapshot,
  isReviewEdit = false,
}: {
  snapshot: PharmacyOnboardingSnapshot;
  isReviewEdit?: boolean;
}) {
  const router = useRouter();
  const pharmacy = snapshot.pharmacy;
  const profile = snapshot.verificationProfile;
  const drafts = snapshot.documentDrafts;

  const [state, formAction, pending] = useActionState(
    savePharmacyVerificationProfileAction,
    {} as VerificationActionState,
  );

  const [licenseDocumentUrl, setLicenseDocumentUrl] = useState(
    drafts.license?.reference || pharmacy?.licenseDocumentUrl || "",
  );
  const [businessDocumentUrl, setBusinessDocumentUrl] = useState(
    drafts.business?.reference || profile?.businessDocumentUrl || "",
  );
  const [licensePreviewVersion, setLicensePreviewVersion] = useState(0);
  const [businessPreviewVersion, setBusinessPreviewVersion] = useState(0);
  const [uploading, setUploading] = useState<DocumentKind | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [authorityConfirmed, setAuthorityConfirmed] = useState(
    Boolean(profile?.applicantAuthorityConfirmed),
  );
  const hasSavedRef = useRef(false);

  useEffect(() => {
    if (state.success && !hasSavedRef.current) {
      hasSavedRef.current = true;
      if (isReviewEdit) {
        router.push(`/onboard?stage=review&pharmacyId=${pharmacy?.id}`);
      } else {
        router.refresh();
      }
    }
  }, [state.success, isReviewEdit, router, pharmacy?.id]);

  if (!pharmacy) return null;

  async function handleFileUpload(file: File, kind: DocumentKind) {
    setUploading(kind);
    setUploadError(null);
    try {
      const body = new FormData();
      body.set("pharmacyId", pharmacy!.id);
      body.set("kind", kind);
      body.set("file", file);
      const res = await fetch("/api/onboard/verification-documents", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.reference) {
        throw new Error(data.message || "Document upload failed.");
      }
      const v = Date.now();
      if (kind === "license") {
        setLicenseDocumentUrl(data.reference);
        setLicensePreviewVersion(v);
      } else {
        setBusinessDocumentUrl(data.reference);
        setBusinessPreviewVersion(v);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Document upload failed.");
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className={`${styles.form} ${polish.wizardShell}`} aria-busy={pending}>
      <div className={polish.topline}>
        <span className={polish.stepPill}>Step 4 · Verification Information</span>
        <span className={polish.securePill}>
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Private & Encrypted
        </span>
      </div>

      <header className={`${styles.formHead} ${polish.heading}`}>
        <h2>Share what you have — we’ll review the rest</h2>
        <p>
          Add the verification details and documentation currently available to you. Missing PPB or licensing paperwork does not prevent you from submitting an application; Aether will review the information before approval.
        </p>
      </header>

      {state.error ? (
        <p className={`${styles.alert} ${styles.alertError} mb-4`} role="alert">
          {state.error}
        </p>
      ) : null}

      {uploadError ? (
        <p className={`${styles.alert} ${styles.alertError} mb-4`} role="alert">
          {uploadError}
        </p>
      ) : null}

      <form action={formAction}>
        <input type="hidden" name="pharmacyId" value={pharmacy.id} />
        <input type="hidden" name="licenseDocumentUrl" value={licenseDocumentUrl} />
        <input type="hidden" name="businessDocumentUrl" value={businessDocumentUrl} />

        <div className={polish.contentStack}>
          {/* 1. Premises & Licensing Section */}
          <section className={polish.panel}>
            <SectionHeading
              icon={<Building2 className="h-5 w-5" />}
              title="1. Premises & Regulatory Details"
              subtitle="PPB premises registration or retail chemist licence."
            />
            <div className={polish.fieldsGrid}>
              <Field
                label="PPB Premises / Licence Number"
                hint="e.g. PPB/PREM/2024/1234 or leave blank if pending renewal."
              >
                <input
                  name="ppbPremisesNumber"
                  defaultValue={pharmacy.ppbPremisesNumber || ""}
                  className="input-admin"
                  placeholder="e.g. PPB/PREM/2024/1234"
                />
              </Field>
              <Field label="Facility Type" hint="Type of pharmaceutical premises.">
                <select
                  name="facilityType"
                  defaultValue={profile?.facilityType || "Retail Pharmacy / Community Chemist"}
                  className="input-admin"
                >
                  <option>Retail Pharmacy / Community Chemist</option>
                  <option>Wholesale & Distribution</option>
                  <option>Hospital Pharmacy Unit</option>
                  <option>Institutional Dispensary</option>
                  <option>Other / Unspecified</option>
                </select>
              </Field>
              <Field label="Physical Address / Landmark" hint="Building, street, or nearby landmark.">
                <input
                  name="physicalAddress"
                  defaultValue={profile?.physicalAddress || ""}
                  className="input-admin"
                  placeholder="e.g. Ground Floor, Plaza House, Biashara Street"
                />
              </Field>
              <Field label="Licence Expiry Date" hint="Current annual practice expiry.">
                <input
                  name="licenseExpiryDate"
                  type="date"
                  defaultValue={profile?.licenseExpiryDate || ""}
                  className="input-admin"
                />
              </Field>
            </div>

            {/* Document upload: Licence */}
            <div className="mt-4 pt-3 border-t border-[var(--line-2)]">
              <span className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                Upload PPB Licence Evidence <span>(Optional at intake)</span>
              </span>
              <p className="text-xs text-[var(--muted)] mb-3">
                Photo or scan of your annual practice licence or premises certificate (JPEG, PNG, WebP).
              </p>

              {licenseDocumentUrl ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-emerald-500/30 bg-black/5 shrink-0">
                    <img
                      src={previewSrc(pharmacy.id, "license", licensePreviewVersion)}
                      alt="Licence preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                      <FileCheck2 className="h-4 w-4 text-emerald-600" /> Licence document on file
                    </span>
                    <span className="text-[11px] text-emerald-900/70 dark:text-emerald-300/70 block truncate">
                      Secure private storage
                    </span>
                  </div>
                  <label className="btn-ghost cursor-pointer text-xs min-h-9 px-3 shrink-0">
                    Replace
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload(f, "license");
                      }}
                    />
                  </label>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[var(--line-2)] hover:border-[var(--brand)] p-4 text-center cursor-pointer transition-colors bg-[var(--card-elev)]/50">
                  {uploading === "license" ? (
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" />
                  ) : (
                    <UploadCloud className="h-6 w-6 text-[var(--muted)]" />
                  )}
                  <span className="text-xs font-semibold text-[var(--foreground)]">
                    {uploading === "license" ? "Uploading licence securely..." : "Click or tap to upload licence photo"}
                  </span>
                  <span className="text-[11px] text-[var(--muted)]">JPEG, PNG, WebP up to 10MB</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploading !== null}
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f, "license");
                    }}
                  />
                </label>
              )}
            </div>
          </section>

          {/* 2. Superintendent Pharmacist Section */}
          <section className={polish.panel}>
            <SectionHeading
              icon={<UserRound className="h-5 w-5" />}
              title="2. Superintendent Pharmacist / In-Charge"
              subtitle="The licensed professional responsible for this premises."
            />
            <div className={polish.fieldsGrid}>
              <Field label="Superintendent Pharmacist Name" hint="Full registered name.">
                <input
                  name="superintendentName"
                  defaultValue={profile?.superintendentName || ""}
                  className="input-admin"
                  placeholder="e.g. Dr. John Kimani"
                />
              </Field>
              <Field label="PPB Professional Registration Number" hint="Roll or enrolment number.">
                <input
                  name="superintendentRegistrationNumber"
                  defaultValue={profile?.superintendentRegistrationNumber || ""}
                  className="input-admin"
                  placeholder="e.g. REG-4321"
                />
              </Field>
              <Field label="Practice Licence Number" hint="Annual retention or licence serial.">
                <input
                  name="superintendentPracticeLicenseNumber"
                  defaultValue={profile?.superintendentPracticeLicenseNumber || ""}
                  className="input-admin"
                  placeholder="e.g. PL-2024-9988"
                />
              </Field>
            </div>
          </section>

          {/* 3. Business Registration Section */}
          <section className={polish.panel}>
            <SectionHeading
              icon={<BriefcaseBusiness className="h-5 w-5" />}
              title="3. Business Registration & Ownership"
              subtitle="Ownership structure and company registration."
            />
            <div className={polish.fieldsGrid}>
              <Field label="Ownership Type">
                <select
                  name="ownershipType"
                  defaultValue={profile?.ownershipType || "Sole Proprietorship"}
                  className="input-admin"
                >
                  <option>Sole Proprietorship</option>
                  <option>Partnership</option>
                  <option>Limited Liability Company (LLC / Ltd)</option>
                  <option>Faith-Based / NGO Health Facility</option>
                </select>
              </Field>
              <Field label="Business Registration Number" hint="BRS or certificate number.">
                <input
                  name="businessRegistrationNumber"
                  defaultValue={profile?.businessRegistrationNumber || ""}
                  className="input-admin"
                  placeholder="e.g. BN-ABCD1234 or CPR/2022/..."
                />
              </Field>
              <Field label="KRA PIN" hint="Tax PIN registered for this business.">
                <input
                  name="kraPin"
                  defaultValue={pharmacy.kraPin || ""}
                  className="input-admin uppercase"
                  placeholder="e.g. P051234567Z"
                />
              </Field>
            </div>

            {/* Document upload: Business Evidence */}
            <div className="mt-4 pt-3 border-t border-[var(--line-2)]">
              <span className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                Upload Business Registration Evidence <span>(Optional at intake)</span>
              </span>
              <p className="text-xs text-[var(--muted)] mb-3">
                Certificate of registration, CR12, or business permit.
              </p>

              {businessDocumentUrl ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-emerald-500/30 bg-black/5 shrink-0">
                    <img
                      src={previewSrc(pharmacy.id, "business", businessPreviewVersion)}
                      alt="Business doc preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                      <FileCheck2 className="h-4 w-4 text-emerald-600" /> Business document on file
                    </span>
                    <span className="text-[11px] text-emerald-900/70 dark:text-emerald-300/70 block truncate">
                      Secure private storage
                    </span>
                  </div>
                  <label className="btn-ghost cursor-pointer text-xs min-h-9 px-3 shrink-0">
                    Replace
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload(f, "business");
                      }}
                    />
                  </label>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[var(--line-2)] hover:border-[var(--brand)] p-4 text-center cursor-pointer transition-colors bg-[var(--card-elev)]/50">
                  {uploading === "business" ? (
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" />
                  ) : (
                    <UploadCloud className="h-6 w-6 text-[var(--muted)]" />
                  )}
                  <span className="text-xs font-semibold text-[var(--foreground)]">
                    {uploading === "business" ? "Uploading document securely..." : "Click or tap to upload business registration photo"}
                  </span>
                  <span className="text-[11px] text-[var(--muted)]">JPEG, PNG, WebP up to 10MB</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploading !== null}
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f, "business");
                    }}
                  />
                </label>
              )}
            </div>
          </section>

          {/* 4. Mandatory Applicant Authority Declaration */}
          <section className="rounded-2xl border border-teal-500/30 bg-teal-50/50 dark:bg-teal-950/20 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="applicantAuthorityConfirmed"
                checked={authorityConfirmed}
                onChange={(e) => setAuthorityConfirmed(e.target.checked)}
                required
                className="mt-1 h-4 w-4 rounded border-[var(--line-1)] text-[var(--brand)] focus:ring-[var(--brand)]"
              />
              <div className="text-xs leading-relaxed text-[var(--foreground)]">
                <strong className="block text-sm font-bold text-teal-950 dark:text-teal-100">
                  Applicant Authority Declaration (Required)
                </strong>
                I confirm that I am authorised to register and represent this pharmacy on the Aether Network, and that the information provided is accurate to the best of my knowledge.
              </div>
            </label>
          </section>
        </div>

        <div className={`${styles.actions} ${polish.actionsBar} mt-5`}>
          {isReviewEdit ? (
            <button
              type="button"
              onClick={() => router.push(`/onboard?stage=review&pharmacyId=${pharmacy.id}`)}
              className={`btn-ghost justify-center ${polish.secondaryAction}`}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Cancel
            </button>
          ) : null}

          <button
            className={`btn-primary justify-center ${polish.primaryAction}`}
            type="submit"
            disabled={pending || !authorityConfirmed}
          >
            {pending ? "Saving verification details…" : isReviewEdit ? "Save & return to review" : "Save & continue to payment"}
            {!pending ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
          </button>
        </div>
      </form>
    </div>
  );
}

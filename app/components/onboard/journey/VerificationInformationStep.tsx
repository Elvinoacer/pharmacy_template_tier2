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
  CheckCircle2,
  FileCheck2,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRound,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import {
  savePharmacyVerificationProfileAction,
  type VerificationActionState,
} from "@/app/actions/pharmacy-verification";
import type { PharmacyOnboardingSnapshot } from "@/app/lib/services/pharmacy-onboarding-journey";
import { cinematicAudio } from "@/app/components/onboard/cinema/CinematicAudio";
import styles from "@/app/components/onboard/OnboardSurface.module.css";
import polish from "@/app/components/onboard/OnboardFormPolish.module.css";

type DocumentKind = "license" | "business";

const FACILITY_TYPES = [
  "Retail Pharmacy / Community Chemist",
  "Wholesale & Distribution",
  "Hospital Pharmacy Unit",
  "Institutional Dispensary",
];

const OWNERSHIP_TYPES = [
  "Sole Proprietorship",
  "Partnership",
  "Limited Liability Company (LLC / Ltd)",
  "Faith-Based / NGO Health Facility",
];

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
  const user = snapshot.user;

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

  // Field states
  const [ppbPremisesNumber, setPpbPremisesNumber] = useState(
    pharmacy?.ppbPremisesNumber || pharmacy?.licenseNumber || "",
  );
  const [facilityType, setFacilityType] = useState(
    profile?.facilityType || "Retail Pharmacy / Community Chemist",
  );
  const [physicalAddress, setPhysicalAddress] = useState(
    profile?.physicalAddress || (pharmacy?.city ? `${pharmacy.city}, Kenya` : ""),
  );
  const [licenseExpiryDate, setLicenseExpiryDate] = useState(
    profile?.licenseExpiryDate || "",
  );
  const [superintendentName, setSuperintendentName] = useState(
    profile?.superintendentName || "",
  );
  const [superintendentRegistrationNumber, setSuperintendentRegistrationNumber] = useState(
    profile?.superintendentRegistrationNumber || "",
  );
  const [superintendentPracticeLicenseNumber, setSuperintendentPracticeLicenseNumber] = useState(
    profile?.superintendentPracticeLicenseNumber || "",
  );
  const [ownershipType, setOwnershipType] = useState(
    profile?.ownershipType || "Sole Proprietorship",
  );
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState(
    profile?.businessRegistrationNumber || "",
  );
  const [kraPin, setKraPin] = useState(pharmacy?.kraPin || "");
  const [soundActive, setSoundActive] = useState(() => cinematicAudio.getActive());

  function toggleSound() {
    const next = cinematicAudio.toggle();
    setSoundActive(next);
  }

  const hasAtLeastOneDoc = Boolean(licenseDocumentUrl || businessDocumentUrl);
  const [subStep, setSubStep] = useState<1 | 2 | 3>(hasAtLeastOneDoc ? 2 : 1);
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
      cinematicAudio.playClick();
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

  function handleUseOwnerForSuperintendent() {
    if (user?.fullName) {
      setSuperintendentName(user.fullName);
      cinematicAudio.playClick();
    }
  }

  // Encouragement copy
  let subStepEncouragement = "";
  if (subStep === 1) {
    subStepEncouragement = hasAtLeastOneDoc
      ? "✨ Verification document on file! PPB numbers are optional — our staff will verify details."
      : "📄 Step 1 of 3: Upload at least 1 document (PPB Licence or Business Registration) to qualify.";
  } else if (subStep === 2) {
    subStepEncouragement = superintendentName.trim()
      ? "👨‍⚕️ Pharmacist registered! All licensing fields here are optional if visible on your uploaded doc."
      : "👨‍⚕️ Step 2 of 3: Who is the superintendent pharmacist in charge? (Tap 1-click pre-fill if it's you).";
  } else {
    subStepEncouragement = authorityConfirmed
      ? "🚀 Authority confirmed! Ready to submit verification and proceed."
      : "🛡️ Step 3 of 3: Confirm your authority to represent this pharmacy to finish.";
  }

  return (
    <div className={`${styles.form} ${polish.wizardShell}`} aria-busy={pending}>
      <div className={polish.topline}>
        <div className="flex items-center gap-2">
          <span className={polish.stepPill}>Step 4 · Verification Information</span>
          <button
            type="button"
            onClick={toggleSound}
            className={`${polish.soundToggleBtn} ${soundActive ? polish.soundToggleBtnActive : ""}`}
            title="Toggle 3D cinema sound feedback"
          >
            {soundActive ? <Volume2 size={12} /> : <VolumeX size={12} />}
            <span>{soundActive ? "Sound On" : "Muted"}</span>
          </button>
        </div>
        <span className={hasAtLeastOneDoc ? polish.savedPill : polish.securePill}>
          {hasAtLeastOneDoc ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden /> Document on file
            </>
          ) : (
            <>
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> 1 Document upload required
            </>
          )}
        </span>
      </div>

      <header className={`${styles.formHead} ${polish.heading}`}>
        <h2>Share what you have — we’ll review the rest</h2>
        <p>
          Upload at least one document image (PPB Licence or Business Registration). Missing license numbers or certificates won’t stop you — our team extracts and verifies the rest.
        </p>
      </header>

      {/* Progressive Sub-Step Interactive Tracker */}
      <div className={polish.subStepTracker}>
        <div className={polish.subStepHeaderRow}>
          <span className={polish.subStepLabel}>
            Part {subStep} of 3 · {subStep === 1 ? "Official Documents" : subStep === 2 ? "Pharmacist & Business" : "Authority Declaration"}
          </span>
          <span className={polish.subStepProgressText}>
            {subStep === 1 ? "33% Complete" : subStep === 2 ? "66% Complete" : "Almost Done"}
          </span>
        </div>
        <div className={polish.subStepProgressBarTrack}>
          <div
            className={polish.subStepProgressBarFill}
            style={{ width: subStep === 1 ? "33%" : subStep === 2 ? "66%" : "100%" }}
          />
        </div>
        <div className={polish.subStepTabs}>
          <button
            type="button"
            onClick={() => {
              cinematicAudio.playClick();
              setSubStep(1);
            }}
            className={`${polish.subStepTab} ${subStep === 1 ? polish.subStepTabActive : hasAtLeastOneDoc ? polish.subStepTabDone : ""}`}
          >
            <UploadCloud size={12} />
            <span>1. Documents {hasAtLeastOneDoc ? "✓" : ""}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (hasAtLeastOneDoc) {
                cinematicAudio.playClick();
                setSubStep(2);
              }
            }}
            disabled={!hasAtLeastOneDoc}
            className={`${polish.subStepTab} ${subStep === 2 ? polish.subStepTabActive : ""}`}
          >
            <UserRound size={12} />
            <span>2. Pharmacist & Org</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (hasAtLeastOneDoc) {
                cinematicAudio.playClick();
                setSubStep(3);
              }
            }}
            disabled={!hasAtLeastOneDoc}
            className={`${polish.subStepTab} ${subStep === 3 ? polish.subStepTabActive : authorityConfirmed ? polish.subStepTabDone : ""}`}
          >
            <ShieldCheck size={12} />
            <span>3. Authority Sign-off</span>
          </button>
        </div>
      </div>

      {/* Energetic Milestone Encouragement Banner */}
      <div className={polish.energeticBanner} role="status">
        <span className={polish.energeticIcon}>
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <span className={polish.energeticText}>{subStepEncouragement}</span>
      </div>

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
        {/* Core hidden values for full form payload across all sub-steps */}
        <input type="hidden" name="pharmacyId" value={pharmacy.id} />
        <input type="hidden" name="licenseDocumentUrl" value={licenseDocumentUrl} />
        <input type="hidden" name="businessDocumentUrl" value={businessDocumentUrl} />
        <input type="hidden" name="ppbPremisesNumber" value={ppbPremisesNumber} />
        <input type="hidden" name="licenseNumber" value={ppbPremisesNumber} />
        <input type="hidden" name="facilityType" value={facilityType} />
        <input type="hidden" name="physicalAddress" value={physicalAddress} />
        <input type="hidden" name="licenseExpiryDate" value={licenseExpiryDate} />
        <input type="hidden" name="superintendentName" value={superintendentName} />
        <input type="hidden" name="superintendentRegistrationNumber" value={superintendentRegistrationNumber} />
        <input type="hidden" name="superintendentPracticeLicenseNumber" value={superintendentPracticeLicenseNumber} />
        <input type="hidden" name="ownershipType" value={ownershipType} />
        <input type="hidden" name="businessRegistrationNumber" value={businessRegistrationNumber} />
        <input type="hidden" name="kraPin" value={kraPin} />

        <div className={polish.contentStack}>
          {/* =========================================================================
              SUB-STEP 1: OFFICIAL DOCUMENTS & PREMISES DETAILS
              ========================================================================= */}
          {subStep === 1 && (
            <div className={polish.subStepCard}>
              <div className="mb-4 p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/25">
                <span className="flex items-center gap-1.5 text-xs font-bold text-teal-800 dark:text-teal-200">
                  <ShieldCheck size={14} className="text-teal-600 dark:text-teal-400" />
                  Upload at least 1 document to qualify
                </span>
                <p className="mt-1 text-xs text-teal-900/80 dark:text-teal-300/80 leading-relaxed">
                  Provide either your <strong>PPB Premises / Practice Licence</strong> OR your <strong>Business Registration Certificate / CR12</strong>. Both are accepted! Numbers will be extracted by our intake reviewers if left blank.
                </p>
              </div>

              {/* Dual Document Uploaders */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* 1. PPB Licence Upload */}
                <div className="p-3.5 rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_15%,var(--card-elev))] bg-[var(--card)]">
                  <span className="block text-xs font-bold text-[var(--foreground)] mb-1">
                    Option A: PPB Licence Photo / Scan
                  </span>
                  <p className="text-[11px] text-[var(--muted)] mb-3">
                    Annual practice licence or premises certificate.
                  </p>

                  {licenseDocumentUrl ? (
                    <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5">
                      <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-emerald-500/20 bg-black/5 shrink-0">
                        <img
                          src={previewSrc(pharmacy.id, "license", licensePreviewVersion)}
                          alt="Licence preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                          <FileCheck2 size={13} className="text-emerald-600" /> Uploaded
                        </span>
                        <span className="text-[10px] text-emerald-900/70 dark:text-emerald-300/70 block truncate">
                          Secure private storage
                        </span>
                      </div>
                      <label className="btn-ghost cursor-pointer text-xs min-h-8 px-2.5 shrink-0">
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
                    <label className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[color-mix(in_srgb,var(--foreground)_25%,var(--card-elev))] hover:border-[var(--brand)] p-4 text-center cursor-pointer transition-colors bg-[var(--card-elev)]/50">
                      {uploading === "license" ? (
                        <Loader2 className="h-5 w-5 animate-spin text-[var(--brand)]" />
                      ) : (
                        <UploadCloud className="h-5 w-5 text-[var(--muted)]" />
                      )}
                      <span className="text-xs font-semibold text-[var(--foreground)]">
                        {uploading === "license" ? "Uploading licence securely..." : "Upload PPB Licence"}
                      </span>
                      <span className="text-[10px] text-[var(--muted)]">JPEG, PNG, WebP up to 10MB</span>
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

                {/* 2. Business Registration Upload */}
                <div className="p-3.5 rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_15%,var(--card-elev))] bg-[var(--card)]">
                  <span className="block text-xs font-bold text-[var(--foreground)] mb-1">
                    Option B: Business Registration / CR12
                  </span>
                  <p className="text-[11px] text-[var(--muted)] mb-3">
                    Certificate of registration, CR12, or business permit.
                  </p>

                  {businessDocumentUrl ? (
                    <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5">
                      <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-emerald-500/20 bg-black/5 shrink-0">
                        <img
                          src={previewSrc(pharmacy.id, "business", businessPreviewVersion)}
                          alt="Business doc preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                          <FileCheck2 size={13} className="text-emerald-600" /> Uploaded
                        </span>
                        <span className="text-[10px] text-emerald-900/70 dark:text-emerald-300/70 block truncate">
                          Secure private storage
                        </span>
                      </div>
                      <label className="btn-ghost cursor-pointer text-xs min-h-8 px-2.5 shrink-0">
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
                    <label className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[color-mix(in_srgb,var(--foreground)_25%,var(--card-elev))] hover:border-[var(--brand)] p-4 text-center cursor-pointer transition-colors bg-[var(--card-elev)]/50">
                      {uploading === "business" ? (
                        <Loader2 className="h-5 w-5 animate-spin text-[var(--brand)]" />
                      ) : (
                        <UploadCloud className="h-5 w-5 text-[var(--muted)]" />
                      )}
                      <span className="text-xs font-semibold text-[var(--foreground)]">
                        {uploading === "business" ? "Uploading document securely..." : "Upload Business Cert"}
                      </span>
                      <span className="text-[10px] text-[var(--muted)]">JPEG, PNG, WebP up to 10MB</span>
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
              </div>

              {/* Optional Regulatory Fields (Kept Non-Scary) */}
              <section className={`${polish.panel} mt-4`}>
                <SectionHeading
                  icon={<Building2 className="h-5 w-5" />}
                  title="Facility details (Optional)"
                  subtitle="Help reviewers classify your premises."
                />

                <div className="mb-3">
                  <span className={`${styles.fieldLabel} ${polish.fieldLabel}`}>Facility Type:</span>
                  <div className={polish.chipGroup}>
                    {FACILITY_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setFacilityType(type);
                          cinematicAudio.playClick();
                        }}
                        className={`${polish.chipBtn} ${facilityType === type ? polish.chipBtnActive : ""}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={polish.fieldsGrid}>
                  <Field
                    label="PPB Premises / Licence Number"
                    hint="Optional — our staff will verify from your upload if left blank."
                  >
                    <input
                      name="ppbPremisesNumberInput"
                      value={ppbPremisesNumber}
                      onChange={(e) => setPpbPremisesNumber(e.target.value)}
                      className="input-admin"
                      placeholder="e.g. PPB/PREM/2024/1234"
                    />
                  </Field>

                  <Field label="Physical Address / Landmark" hint="Building, street, or nearby landmark.">
                    <input
                      name="physicalAddressInput"
                      value={physicalAddress}
                      onChange={(e) => setPhysicalAddress(e.target.value)}
                      className="input-admin"
                      placeholder="e.g. Ground Floor, Biashara Street"
                    />
                  </Field>

                  <Field label="Licence Expiry Date" hint="Optional — current annual licence expiry date.">
                    <input
                      type="date"
                      name="licenseExpiryDateInput"
                      value={licenseExpiryDate}
                      onChange={(e) => setLicenseExpiryDate(e.target.value)}
                      className="input-admin"
                    />
                  </Field>
                </div>
              </section>

              <div className={polish.navigationButtons}>
                <button
                  type="submit"
                  name="intent"
                  value="draft"
                  disabled={pending}
                  className={polish.backBtn}
                  title="Save draft progress"
                >
                  <Save size={13} />
                  <span>Save Draft</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    cinematicAudio.playClick();
                    setSubStep(2);
                  }}
                  disabled={!hasAtLeastOneDoc}
                  className={polish.nextBtn}
                >
                  <span>Next: Pharmacist & Org Details</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              SUB-STEP 2: SUPERINTENDENT PHARMACIST & BUSINESS REGISTRATION
              ========================================================================= */}
          {subStep === 2 && (
            <div className={polish.subStepCard}>
              {/* Superintendent Pharmacist */}
              <section className={polish.panel}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <SectionHeading
                    icon={<UserRound className="h-5 w-5" />}
                    title="Superintendent Pharmacist / In-Charge"
                    subtitle="Licensed professional responsible for this premises."
                  />
                  {user?.fullName && (
                    <button
                      type="button"
                      onClick={handleUseOwnerForSuperintendent}
                      className={`${polish.prefillBtn} shrink-0`}
                      title="Set yourself as the superintendent"
                    >
                      <Zap size={11} />
                      I am the Superintendent
                    </button>
                  )}
                </div>

                <div className={polish.fieldsGrid}>
                  <Field label="Superintendent Pharmacist Name" hint="Registered full name.">
                    <input
                      name="superintendentNameInput"
                      value={superintendentName}
                      onChange={(e) => setSuperintendentName(e.target.value)}
                      className="input-admin font-medium"
                      placeholder="e.g. Dr. Jane Mwangi"
                    />
                  </Field>

                  <Field label="PPB Registration Number" hint="Optional at intake.">
                    <input
                      name="superintendentRegistrationNumberInput"
                      value={superintendentRegistrationNumber}
                      onChange={(e) => setSuperintendentRegistrationNumber(e.target.value)}
                      className="input-admin"
                      placeholder="e.g. REG-4321"
                    />
                  </Field>

                  <Field label="Practice Licence Number" hint="Optional — annual retention or licence serial.">
                    <input
                      name="superintendentPracticeLicenseNumberInput"
                      value={superintendentPracticeLicenseNumber}
                      onChange={(e) => setSuperintendentPracticeLicenseNumber(e.target.value)}
                      className="input-admin"
                      placeholder="e.g. PL-2024-9988"
                    />
                  </Field>
                </div>
              </section>

              {/* Ownership & Tax */}
              <section className={`${polish.panel} mt-4`}>
                <SectionHeading
                  icon={<BriefcaseBusiness className="h-5 w-5" />}
                  title="Business entity & tax (Optional)"
                  subtitle="Structure and company registration."
                />

                <div className="mb-3">
                  <span className={`${styles.fieldLabel} ${polish.fieldLabel}`}>Ownership Structure:</span>
                  <div className={polish.chipGroup}>
                    {OWNERSHIP_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setOwnershipType(type);
                          cinematicAudio.playClick();
                        }}
                        className={`${polish.chipBtn} ${ownershipType === type ? polish.chipBtnActive : ""}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={polish.fieldsGrid}>
                  <Field label="Business Registration Number" hint="BRS or certificate number.">
                    <input
                      name="businessRegistrationNumberInput"
                      value={businessRegistrationNumber}
                      onChange={(e) => setBusinessRegistrationNumber(e.target.value)}
                      className="input-admin"
                      placeholder="e.g. BN-ABCD1234 or CPR/2022/..."
                    />
                  </Field>

                  <Field label="KRA PIN" hint="Tax PIN registered for this business.">
                    <input
                      name="kraPinInput"
                      value={kraPin}
                      onChange={(e) => setKraPin(e.target.value.toUpperCase())}
                      className="input-admin uppercase"
                      placeholder="e.g. P051234567Z"
                    />
                  </Field>
                </div>
              </section>

              <div className={polish.navigationButtons}>
                <button
                  type="button"
                  onClick={() => {
                    cinematicAudio.playClick();
                    setSubStep(1);
                  }}
                  className={polish.backBtn}
                >
                  <ArrowLeft size={14} />
                  <span>Back to Documents</span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    name="intent"
                    value="draft"
                    disabled={pending}
                    className={polish.backBtn}
                    title="Save current progress as draft"
                  >
                    <Save size={13} />
                    <span>Save Draft</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      cinematicAudio.playClick();
                      setSubStep(3);
                    }}
                    className={polish.nextBtn}
                  >
                    <span>Next: Authority Sign-off</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SUB-STEP 3: AUTHORITY SIGN-OFF & LAUNCH
              ========================================================================= */}
          {subStep === 3 && (
            <div className={polish.subStepCard}>
              {/* Summary Checklist of Verification Progress */}
              <div className="mb-4 p-4 rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_15%,var(--card-elev))] bg-[var(--card)]">
                <span className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider block mb-2">
                  Verification Intake Summary
                </span>
                <div className="grid gap-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-[color-mix(in_srgb,var(--foreground)_8%,var(--card-elev))]">
                    <span className="text-[var(--muted)]">Premises Licence Doc:</span>
                    <span className="font-semibold">
                      {licenseDocumentUrl ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Document on file
                        </span>
                      ) : (
                        <span className="text-[var(--muted)]">Not provided (Business doc attached)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[color-mix(in_srgb,var(--foreground)_8%,var(--card-elev))]">
                    <span className="text-[var(--muted)]">Business Registration Doc:</span>
                    <span className="font-semibold">
                      {businessDocumentUrl ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Document on file
                        </span>
                      ) : (
                        <span className="text-[var(--muted)]">Not provided (Licence doc attached)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[var(--muted)]">Superintendent Pharmacist:</span>
                    <span className="font-semibold text-[var(--foreground)]">
                      {superintendentName || "Pending reviewer review"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mandatory Authority Declaration */}
              <section className="rounded-2xl border border-teal-500/30 bg-teal-500/10 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="applicantAuthorityConfirmed"
                    checked={authorityConfirmed}
                    onChange={(e) => {
                      setAuthorityConfirmed(e.target.checked);
                      if (e.target.checked) cinematicAudio.playSuccess();
                    }}
                    required
                    className="mt-1 h-4 w-4 rounded border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] text-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-2"
                  />
                  <div className="text-xs leading-relaxed text-[var(--foreground)]">
                    <strong className="block text-sm font-bold text-teal-950 dark:text-teal-100">
                      Applicant Authority Declaration (Required)
                    </strong>
                    I confirm that I am authorised to register and represent this pharmacy on the Afyvia Network, and that the information provided is accurate to the best of my knowledge.
                  </div>
                </label>
              </section>

              <div className={polish.navigationButtons}>
                <button
                  type="button"
                  onClick={() => {
                    cinematicAudio.playClick();
                    setSubStep(2);
                  }}
                  className={polish.backBtn}
                >
                  <ArrowLeft size={14} />
                  <span>Back to Pharmacist & Org</span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    name="intent"
                    value="draft"
                    disabled={pending}
                    className={polish.backBtn}
                    title="Save current progress as draft"
                  >
                    <Save size={13} />
                    <span>Save Draft</span>
                  </button>

                  <button
                    className={`btn-primary justify-center ${polish.primaryAction}`}
                    type="submit"
                    disabled={pending || !authorityConfirmed || !hasAtLeastOneDoc}
                  >
                    {pending ? "Saving verification details…" : isReviewEdit ? "Save & return to review" : "Save & continue to payment"}
                    {!pending ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {isReviewEdit && subStep !== 3 ? (
          <div className="mt-4 flex justify-start">
            <button
              type="button"
              onClick={() => router.push(`/onboard?stage=review&pharmacyId=${pharmacy.id}`)}
              className={`btn-ghost justify-center ${polish.secondaryAction}`}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Cancel
            </button>
          </div>
        ) : null}
      </form>
    </div>
  );
}


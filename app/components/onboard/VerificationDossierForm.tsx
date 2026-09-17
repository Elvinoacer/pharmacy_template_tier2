"use client";

/* The private preview endpoint requires the browser session cookie, so these
 * images intentionally bypass Next/Image's server-side optimizer. */
/* eslint-disable @next/next/no-img-element */

import { useActionState, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ExternalLink,
  ImageIcon,
  Loader2,
  ShieldCheck,
  UploadCloud,
  UserRound,
} from "lucide-react";
import {
  resendOwnerVerificationEmailAction,
  savePharmacyVerificationProfileAction,
  type VerificationActionState,
} from "@/app/actions/pharmacy-verification";
import OnboardStepper from "./OnboardStepper";
import styles from "./OnboardSurface.module.css";
import polish from "./OnboardFormPolish.module.css";

const initial: VerificationActionState = {};

type DocumentKind = "license" | "business";

type Profile = {
  facilityType: string | null;
  physicalAddress: string | null;
  licenseExpiryDate: string | null;
  licenseQrPayload: string | null;
  superintendentName: string | null;
  superintendentRegistrationNumber: string | null;
  superintendentPracticeLicenseNumber: string | null;
  ownershipType: string | null;
  businessRegistrationNumber: string | null;
  businessDocumentUrl: string | null;
  applicantAuthorityConfirmed: boolean;
} | null;

type Props = {
  pharmacy: {
    id: string;
    name: string;
    legalName: string | null;
    licenseNumber: string | null;
    ppbPremisesNumber: string | null;
    licenseDocumentUrl: string | null;
    kraPin: string | null;
    status: string;
  };
  profile: Profile;
  initialLicenseDocumentUrl?: string | null;
  initialBusinessDocumentUrl?: string | null;
  ownerEmail: string;
  ownerEmailVerified: boolean;
  embedded?: boolean;
};

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

function previewSrc(pharmacyId: string, kind: DocumentKind, version: number) {
  const params = new URLSearchParams({ pharmacyId, kind, v: String(version) });
  return `/api/onboard/verification-documents?${params.toString()}`;
}

function DocumentPreview({
  pharmacyId,
  kind,
  version,
  label,
}: {
  pharmacyId: string;
  kind: DocumentKind;
  version: number;
  label: string;
}) {
  return (
    <div className={polish.previewCard}>
      <div className={polish.previewImage}>
        <img src={previewSrc(pharmacyId, kind, version)} alt={label} />
      </div>
      <div className={polish.previewMeta}>
        <span className={polish.previewSaved}>
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          Uploaded & saved as draft
        </span>
        <span className={polish.previewHint}>
          <ImageIcon className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Preview remains after refresh
        </span>
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  step,
  title,
  copy,
  children,
}: {
  icon: ReactNode;
  step: string;
  title: string;
  copy: string;
  children?: ReactNode;
}) {
  return (
    <div className={styles.sectionHead}>
      <div className={polish.panelHeader} style={{ marginBottom: 0 }}>
        <span className={polish.panelHeaderIcon}>{icon}</span>
        <div className={polish.panelHeaderText}>
          <span>{step}</span>
          <strong>{title}</strong>
          <span>{copy}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function VerificationDossierForm({
  pharmacy,
  profile,
  initialLicenseDocumentUrl,
  initialBusinessDocumentUrl,
  ownerEmail,
  ownerEmailVerified,
  embedded = false,
}: Props) {
  const [section, setSection] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(savePharmacyVerificationProfileAction, initial);
  const [emailState, emailAction, emailPending] = useActionState(resendOwnerVerificationEmailAction, initial);
  const [licenseDocumentUrl, setLicenseDocumentUrl] = useState(
    initialLicenseDocumentUrl || pharmacy.licenseDocumentUrl || "",
  );
  const [businessDocumentUrl, setBusinessDocumentUrl] = useState(
    initialBusinessDocumentUrl || profile?.businessDocumentUrl || "",
  );
  const [licensePreviewVersion, setLicensePreviewVersion] = useState(0);
  const [businessPreviewVersion, setBusinessPreviewVersion] = useState(0);
  const [uploading, setUploading] = useState<DocumentKind | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function nextSection() {
    const fields = formRef.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      `[data-licence-section="${section}"] input, [data-licence-section="${section}"] select, [data-licence-section="${section}"] textarea`,
    );
    for (const field of fields ?? []) {
      if (!field.reportValidity()) return;
    }
    setUploadError(null);
    setSection((value) => Math.min(2, value + 1));
  }

  async function uploadDocument(file: File, kind: DocumentKind) {
    setUploading(kind);
    setUploadError(null);
    try {
      const body = new FormData();
      body.set("pharmacyId", pharmacy.id);
      body.set("kind", kind);
      body.set("file", file);
      const response = await fetch("/api/onboard/verification-documents", { method: "POST", body });
      const payload = (await response.json().catch(() => ({}))) as {
        reference?: string;
        message?: string;
      };
      if (!response.ok || !payload.reference) {
        throw new Error(payload.message || "Document upload failed.");
      }

      const version = Date.now();
      if (kind === "license") {
        setLicenseDocumentUrl(payload.reference);
        setLicensePreviewVersion(version);
      } else {
        setBusinessDocumentUrl(payload.reference);
        setBusinessPreviewVersion(version);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Document upload failed.");
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className={`${styles.form} ${polish.wizardShell}`}>
      <OnboardStepper current={1} />

      <div className={polish.topline}>
        <span className={polish.stepPill}>Step 2 of 4 · Verification</span>
        <span className={polish.securePill}><ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Private review</span>
      </div>

      <header className={`${styles.formHead} ${polish.heading}`}>
        <h2>Share what you have — we’ll review the rest</h2>
        <p>
          Add the pharmacy, pharmacist and business details currently available to you. PPB numbers, licence documents and other compliance evidence are optional at this stage; a platform admin will make the final verification decision before the pharmacy can operate publicly.
        </p>
      </header>

      <section className={polish.ownerCard}>
        <div className={polish.ownerMeta}>
          <span>Owner account</span>
          <strong>{ownerEmail}</strong>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            ownerEmailVerified
              ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
              : "bg-amber-500/10 text-amber-900 dark:text-amber-100"
          }`}
        >
          {ownerEmailVerified ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : null}
          {ownerEmailVerified ? "Email verified" : "Verify email"}
        </span>
        {!ownerEmailVerified ? (
          <form action={emailAction} className="w-full border-t border-[var(--line-2)] pt-3">
            <button type="submit" disabled={emailPending} className={`btn-ghost ${polish.secondaryAction}`}>
              {emailPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
              Send verification email
            </button>
            {emailState.error ? <p className={`${styles.fieldError} mt-2`}>{emailState.error}</p> : null}
            {emailState.success ? <p className={styles.fieldHint}>{emailState.success}</p> : null}
          </form>
        ) : null}
      </section>

      <div className={polish.segmented} aria-label="Verification sections">
        {["Premises", "Pharmacist", "Business"].map((label, index) => (
          <button
            key={label}
            type="button"
            disabled={index > section}
            aria-current={index === section ? "step" : undefined}
            onClick={() => setSection(index)}
          >
            {index < section ? "✓" : index + 1} {label}
          </button>
        ))}
      </div>

      <form
        ref={formRef}
        action={action}
        className={polish.contentStack}
        aria-busy={pending || uploading !== null}
        onInvalidCapture={(event) => {
          const target = event.target as HTMLInputElement;
          const group = target.closest<HTMLElement>("[data-licence-section]");
          if (group?.hidden) {
            event.preventDefault();
            setSection(Number(group.dataset.licenceSection));
            requestAnimationFrame(() => target.focus());
          }
        }}
      >
        <input type="hidden" name="pharmacyId" value={pharmacy.id} />
        <input type="hidden" name="licenseDocumentUrl" value={licenseDocumentUrl} />
        <input type="hidden" name="businessDocumentUrl" value={businessDocumentUrl} />

        <section data-licence-section="0" hidden={section !== 0} className={`${styles.section} ${polish.panel}`}>
          <SectionHeader
            icon={<Building2 className="h-5 w-5" aria-hidden />}
            step="Section 1 of 3"
            title="Premises & licence"
            copy="Add the regulatory details you already have. Missing items can be reviewed later."
          >
            <a
              href="https://practice.pharmacyboardkenya.org/LicenseStatus?register=facilities"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.quietLink}
            >
              Check PPB register <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </SectionHeader>

          <div className={polish.fieldsGrid}>
            <Field label="PPB / premises licence number · Optional" hint="If available, enter it exactly as shown on the current premises licence.">
              <input name="licenseNumber" defaultValue={pharmacy.licenseNumber || ""} className="input-admin" autoComplete="off" placeholder="Premises licence number" />
            </Field>
            <Field label="Facility / premises number · Optional" hint="Add the facility identifier if you have it.">
              <input name="ppbPremisesNumber" defaultValue={pharmacy.ppbPremisesNumber || ""} className="input-admin" autoComplete="off" placeholder="Facility number" />
            </Field>
            <Field label="Facility type · Optional">
              <select name="facilityType" defaultValue={profile?.facilityType || ""} className="input-admin">
                <option value="">Not provided yet</option>
                <option value="retail">Retail pharmacy</option>
                <option value="wholesale">Wholesale pharmacy</option>
                <option value="hospital">Hospital pharmacy</option>
                <option value="manufacturer">Manufacturer</option>
                <option value="other">Other licensed outlet</option>
              </select>
            </Field>
            <Field label="Licence expiry · Optional" hint="Leave blank if you do not have the current licence with you.">
              <input name="licenseExpiryDate" type="date" defaultValue={profile?.licenseExpiryDate || ""} className="input-admin" />
            </Field>
            <Field label="Physical address · Optional" hint="If available, use the premises address shown on official records." className={styles.spanAll}>
              <textarea
                name="physicalAddress"
                rows={3}
                defaultValue={profile?.physicalAddress || ""}
                className="input-admin"
                placeholder="Premises address or leave blank for now"
              />
            </Field>
            <Field label="Licence QR text · Optional" hint="Only if you already have the decoded text." className={styles.spanAll}>
              <input name="licenseQrPayload" defaultValue={profile?.licenseQrPayload || ""} className="input-admin" placeholder="Optional QR payload" />
            </Field>
          </div>

          <div className={`${styles.upload} ${polish.uploadZone}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold tracking-[-0.01em]">Premises licence image · Optional</p>
                <p className={`${styles.fieldHint} ${polish.fieldHint}`}>Upload it if available. You can continue without it and the reviewer can request or validate evidence later.</p>
              </div>
              <label className={`btn-ghost inline-flex cursor-pointer ${polish.secondaryAction}`}>
                {uploading === "license" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <UploadCloud className="h-3.5 w-3.5" aria-hidden />}
                {licenseDocumentUrl ? "Replace image" : "Upload image"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploading !== null}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadDocument(file, "license");
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            {licenseDocumentUrl ? (
              <DocumentPreview
                pharmacyId={pharmacy.id}
                kind="license"
                version={licensePreviewVersion}
                label="Preview of the uploaded PPB premises licence"
              />
            ) : null}
          </div>
        </section>

        <section data-licence-section="1" hidden={section !== 1} className={`${styles.section} ${polish.panel}`}>
          <SectionHeader
            icon={<UserRound className="h-5 w-5" aria-hidden />}
            step="Section 2 of 3"
            title="Pharmacist in charge"
            copy="Add the professional details you currently know. They are supporting evidence for admin review."
          >
            <a
              href="https://practice.pharmacyboardkenya.org/LicenseStatus?registers=search"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.quietLink}
            >
              Check PPB professionals <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </SectionHeader>

          <div className={polish.fieldsGrid}>
            <Field label="Full name · Optional" className={styles.spanAll}>
              <input name="superintendentName" defaultValue={profile?.superintendentName || ""} className="input-admin" autoComplete="name" placeholder="Pharmacist’s full name" />
            </Field>
            <Field label="PPB registration number · Optional">
              <input
                name="superintendentRegistrationNumber"
                defaultValue={profile?.superintendentRegistrationNumber || ""}
                className="input-admin"
                autoComplete="off"
                placeholder="Registration number"
              />
            </Field>
            <Field label="Practice licence number · Optional">
              <input
                name="superintendentPracticeLicenseNumber"
                defaultValue={profile?.superintendentPracticeLicenseNumber || ""}
                className="input-admin"
                autoComplete="off"
                placeholder="Current practice licence"
              />
            </Field>
          </div>
        </section>

        <section data-licence-section="2" hidden={section !== 2} className={`${styles.section} ${polish.panel}`}>
          <SectionHeader
            icon={<BriefcaseBusiness className="h-5 w-5" aria-hidden />}
            step="Section 3 of 3"
            title="The business"
            copy="Share business-registration evidence if available; incomplete paperwork does not block intake."
          />

          <div className={polish.fieldsGrid}>
            <Field label="Ownership · Optional">
              <select name="ownershipType" defaultValue={profile?.ownershipType || ""} className="input-admin">
                <option value="">Not provided yet</option>
                <option value="sole_proprietorship">Sole proprietorship</option>
                <option value="partnership">Partnership</option>
                <option value="limited_company">Limited company</option>
                <option value="ngo_nonprofit">NGO / non-profit</option>
                <option value="public_institution">Public institution</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Business registration number · Optional">
              <input
                name="businessRegistrationNumber"
                defaultValue={profile?.businessRegistrationNumber || ""}
                className="input-admin"
                autoComplete="off"
                placeholder="Registration number"
              />
            </Field>
            <Field label="KRA PIN · Optional" hint="Useful for stronger business matching, but not required for intake." className={styles.spanAll}>
              <input name="kraPin" defaultValue={pharmacy.kraPin || ""} className="input-admin" autoComplete="off" placeholder="KRA PIN" />
            </Field>
          </div>

          <div className={`${styles.upload} ${polish.uploadZone}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold tracking-[-0.01em]">Business registration evidence · Optional</p>
                <p className={`${styles.fieldHint} ${polish.fieldHint}`}>Upload a certificate or other official evidence if you have it now.</p>
              </div>
              <label className={`btn-ghost inline-flex cursor-pointer ${polish.secondaryAction}`}>
                {uploading === "business" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <UploadCloud className="h-3.5 w-3.5" aria-hidden />}
                {businessDocumentUrl ? "Replace image" : "Upload image"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploading !== null}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadDocument(file, "business");
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            {businessDocumentUrl ? (
              <DocumentPreview
                pharmacyId={pharmacy.id}
                kind="business"
                version={businessPreviewVersion}
                label="Preview of the uploaded business registration evidence"
              />
            ) : null}
          </div>
        </section>

        <section data-licence-section="2" hidden={section !== 2} className={`${styles.section} ${polish.panel} ${polish.authorityCard}`}>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              name="applicantAuthorityConfirmed"
              type="checkbox"
              required
              defaultChecked={profile?.applicantAuthorityConfirmed || false}
              className="mt-1 h-4 w-4 rounded border-[var(--line-2)] text-[var(--brand)] focus:ring-[var(--brand)]"
            />
            <span>I’m authorised to represent this pharmacy, and the information I provided is accurate to the best of my knowledge.</span>
          </label>
        </section>

        {uploadError ? <p role="alert" className={`${styles.alert} ${styles.alertError}`}>{uploadError}</p> : null}
        {state.error ? <p role="alert" className={`${styles.alert} ${styles.alertError}`}>{state.error}</p> : null}
        {state.success ? <p className={`${styles.alert} ${styles.alertOk}`}>{state.success}</p> : null}

        <div className={`${styles.actions} ${polish.actionsBar}`}>
          {embedded ? null : (
            <Link href="/onboard" className={`btn-ghost justify-center ${polish.secondaryAction}`}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back
            </Link>
          )}
          <button
            type="submit"
            name="intent"
            value="draft"
            formNoValidate
            disabled={pending || uploading !== null}
            className={`btn-ghost justify-center ${polish.secondaryAction}`}
          >
            Save for later
          </button>
          {section < 2 ? (
            <button
              type="button"
              onClick={nextSection}
              disabled={pending || uploading !== null}
              className={`btn-primary justify-center ${polish.primaryAction}`}
            >
              Continue to {section === 0 ? "pharmacist" : "business"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <button
              type="submit"
              name="intent"
              value="complete"
              disabled={pending || uploading !== null}
              className={`btn-primary inline-flex justify-center gap-2 ${polish.primaryAction}`}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
              {pending ? "Saving…" : "Save & continue"}
              {!pending ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

"use client";

import { useActionState, useState, useRef, type ReactNode } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import {
  resendOwnerVerificationEmailAction,
  savePharmacyVerificationProfileAction,
  type VerificationActionState,
} from "@/app/actions/pharmacy-verification";
import OnboardStepper from "./OnboardStepper";
import styles from "./OnboardSurface.module.css";

const initial: VerificationActionState = {};

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
    <label className={`${styles.field} ${className || ""}`}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
      {hint ? <span className={styles.fieldHint}>{hint}</span> : null}
    </label>
  );
}

export default function VerificationDossierForm({
  pharmacy,
  profile,
  ownerEmail,
  ownerEmailVerified,
  embedded = false,
}: Props) {
  const [section, setSection] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  function nextSection() {
    const fields = formRef.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[data-licence-section="${section}"] input, [data-licence-section="${section}"] select, [data-licence-section="${section}"] textarea`);
    for (const field of fields ?? []) { if (!field.reportValidity()) return; }
    if (section === 0 && !licenseDocumentUrl) { setUploadError("Upload your premises licence to continue."); return; }
    setUploadError(null);
    setSection((value) => Math.min(2, value + 1));
  }
  const [state, action, pending] = useActionState(savePharmacyVerificationProfileAction, initial);
  const [emailState, emailAction, emailPending] = useActionState(resendOwnerVerificationEmailAction, initial);
  const [licenseDocumentUrl, setLicenseDocumentUrl] = useState(pharmacy.licenseDocumentUrl || "");
  const [businessDocumentUrl, setBusinessDocumentUrl] = useState(profile?.businessDocumentUrl || "");
  const [uploading, setUploading] = useState<"license" | "business" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function uploadDocument(file: File, kind: "license" | "business") {
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
      if (kind === "license") setLicenseDocumentUrl(payload.reference);
      else setBusinessDocumentUrl(payload.reference);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Document upload failed.");
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className={styles.form}>
      <OnboardStepper current={1} />
      <header className={styles.formHead}>
        <h2>Let’s verify your pharmacy</h2>
        <p>Have your premises licence and business certificate ready.</p>
      </header>

      <section className={styles.section} style={{ marginBottom: "1rem" }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={styles.kicker} style={{ letterSpacing: "0.12em" }}>Owner</p>
            <p className="mt-1 text-sm font-semibold">{ownerEmail}</p>
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
        </div>
        {!ownerEmailVerified ? (
          <form action={emailAction} className="mt-3">
            <button type="submit" disabled={emailPending} className="btn-ghost">
              {emailPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
              Send verification email
            </button>
            {emailState.error ? <p className={`${styles.fieldError} mt-2`}>{emailState.error}</p> : null}
            {emailState.success ? <p className={styles.fieldHint}>{emailState.success}</p> : null}
          </form>
        ) : null}
      </section>

      <div className={styles.licenceTabs} aria-label="Licence sections">
        {["Premises", "Pharmacist", "Business"].map((label, index) => <button key={label} type="button" disabled={index > section} aria-current={index === section ? "step" : undefined} onClick={() => setSection(index)}>{index < section ? "✓" : index + 1} {label}</button>)}
      </div>
      <form ref={formRef} action={action} className="space-y-4" aria-busy={pending || uploading !== null} onInvalidCapture={(event) => {
        const target = event.target as HTMLInputElement;
        const group = target.closest<HTMLElement>("[data-licence-section]");
        if (group?.hidden) {
          event.preventDefault();
          setSection(Number(group.dataset.licenceSection));
          requestAnimationFrame(() => target.focus());
        }
      }}>
        <input type="hidden" name="pharmacyId" value={pharmacy.id} />
        <input type="hidden" name="licenseDocumentUrl" value={licenseDocumentUrl} />
        <input type="hidden" name="businessDocumentUrl" value={businessDocumentUrl} />

        <section data-licence-section="0" hidden={section !== 0} className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <small>1 of 3</small>
              <h2>Premises licence</h2>
            </div>
            <a
              href="https://practice.pharmacyboardkenya.org/LicenseStatus?register=facilities"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.quietLink}
            >
              PPB register <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
          <div className={`${styles.fields} ${styles.fieldsTwo}`}>
            <Field label="PPB / premises licence number">
              <input name="licenseNumber" required defaultValue={pharmacy.licenseNumber || ""} className="input-admin" autoComplete="off" />
            </Field>
            <Field label="Facility / premises number">
              <input name="ppbPremisesNumber" required defaultValue={pharmacy.ppbPremisesNumber || ""} className="input-admin" autoComplete="off" />
            </Field>
            <Field label="Facility type">
              <select name="facilityType" required defaultValue={profile?.facilityType || ""} className="input-admin">
                <option value="">Select type</option>
                <option value="retail">Retail pharmacy</option>
                <option value="wholesale">Wholesale pharmacy</option>
                <option value="hospital">Hospital pharmacy</option>
                <option value="manufacturer">Manufacturer</option>
                <option value="other">Other licensed outlet</option>
              </select>
            </Field>
            <Field label="Licence expiry">
              <input name="licenseExpiryDate" type="date" required defaultValue={profile?.licenseExpiryDate || ""} className="input-admin" />
            </Field>
            <Field label="Physical address" className={styles.spanAll}>
              <textarea
                name="physicalAddress"
                required
                rows={3}
                defaultValue={profile?.physicalAddress || ""}
                className="input-admin"
                placeholder="Building, street, area, town, county"
              />
            </Field>
            <Field label="Licence QR text (optional)" className={styles.spanAll}>
              <input name="licenseQrPayload" defaultValue={profile?.licenseQrPayload || ""} className="input-admin" />
            </Field>
          </div>
          <div className={styles.upload}>
            <p className="text-sm font-semibold">Current licence image</p>
            <p className={styles.fieldHint}>JPEG, PNG or WebP. Include the QR if it is on the licence.</p>
            <label className="btn-ghost mt-3 inline-flex cursor-pointer">
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
            {licenseDocumentUrl ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Uploaded
              </p>
            ) : null}
          </div>
        </section>

        <section data-licence-section="1" hidden={section !== 1} className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <small>2 of 3</small>
              <h2>Pharmacist in charge</h2>
            </div>
            <a
              href="https://practice.pharmacyboardkenya.org/LicenseStatus?registers=search"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.quietLink}
            >
              PPB professionals <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
          <div className={`${styles.fields} ${styles.fieldsTwo}`}>
            <Field label="Full name" className={styles.spanAll}>
              <input name="superintendentName" required defaultValue={profile?.superintendentName || ""} className="input-admin" autoComplete="name" />
            </Field>
            <Field label="PPB registration number">
              <input
                name="superintendentRegistrationNumber"
                required
                defaultValue={profile?.superintendentRegistrationNumber || ""}
                className="input-admin"
                autoComplete="off"
              />
            </Field>
            <Field label="Practice licence number">
              <input
                name="superintendentPracticeLicenseNumber"
                required
                defaultValue={profile?.superintendentPracticeLicenseNumber || ""}
                className="input-admin"
                autoComplete="off"
              />
            </Field>
          </div>
        </section>

        <section data-licence-section="2" hidden={section !== 2} className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <small>3 of 3</small>
              <h2>The business</h2>
            </div>
          </div>
          <div className={`${styles.fields} ${styles.fieldsTwo}`}>
            <Field label="Ownership">
              <select name="ownershipType" required defaultValue={profile?.ownershipType || ""} className="input-admin">
                <option value="">Select ownership</option>
                <option value="sole_proprietorship">Sole proprietorship</option>
                <option value="partnership">Partnership</option>
                <option value="limited_company">Limited company</option>
                <option value="ngo_nonprofit">NGO / non-profit</option>
                <option value="public_institution">Public institution</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Business registration number">
              <input
                name="businessRegistrationNumber"
                required
                defaultValue={profile?.businessRegistrationNumber || ""}
                className="input-admin"
                autoComplete="off"
              />
            </Field>
            <Field label="KRA PIN (recommended)" className={styles.spanAll}>
              <input name="kraPin" defaultValue={pharmacy.kraPin || ""} className="input-admin" autoComplete="off" />
            </Field>
          </div>
          <div className={styles.upload}>
            <p className="text-sm font-semibold">Registration evidence</p>
            <p className={styles.fieldHint}>Certificate or document that ties the business to this pharmacy.</p>
            <label className="btn-ghost mt-3 inline-flex cursor-pointer">
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
            {businessDocumentUrl ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Uploaded
              </p>
            ) : null}
          </div>
        </section>

        <section data-licence-section="2" hidden={section !== 2} className={styles.section}>
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-6">
            <input
              name="applicantAuthorityConfirmed"
              type="checkbox"
              required
              defaultChecked={profile?.applicantAuthorityConfirmed || false}
              className="mt-1 h-4 w-4 rounded border-[var(--line-2)] text-[var(--brand)] focus:ring-[var(--brand)]"
            />
            <span>I am authorised to represent this pharmacy, and this information is accurate.</span>
          </label>
        </section>

        {uploadError ? <p role="alert" className={`${styles.alert} ${styles.alertError}`}>{uploadError}</p> : null}
        {state.error ? <p role="alert" className={`${styles.alert} ${styles.alertError}`}>{state.error}</p> : null}
        {state.success ? <p className={`${styles.alert} ${styles.alertOk}`}>{state.success}</p> : null}

        <div className={styles.actions}>
          {embedded ? null : (
            <Link href="/onboard" className="btn-ghost justify-center">
              Back
            </Link>
          )}
          <button type="submit" name="intent" value="draft" formNoValidate disabled={pending || uploading !== null} className="btn-ghost justify-center">
            Save for later
          </button>
          {section < 2 ? <button type="button" onClick={nextSection} disabled={pending || uploading !== null} className="btn-primary justify-center">Continue to {section === 0 ? "pharmacist" : "business"}</button> : <button
            type="submit"
            name="intent"
            value="complete"
            disabled={pending || uploading !== null}
            className="btn-primary inline-flex justify-center gap-2"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
            {pending ? "Saving…" : "Save & continue"}
          </button>}
        </div>
      </form>
    </div>
  );
}

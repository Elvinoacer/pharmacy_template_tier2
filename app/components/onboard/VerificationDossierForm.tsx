"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Loader2,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import {
  resendOwnerVerificationEmailAction,
  savePharmacyVerificationProfileAction,
  type VerificationActionState,
} from "@/app/actions/pharmacy-verification";

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
};

function FieldHelp({ children }: { children: React.ReactNode }) {
  return <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{children}</span>;
}

export default function VerificationDossierForm({
  pharmacy,
  profile,
  ownerEmail,
  ownerEmailVerified,
}: Props) {
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

  const inputClass =
    "mt-1.5 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 dark:focus:border-teal-300/60 dark:focus:ring-teal-300/10";
  const cardClass =
    "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-5";

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 dark:border-teal-300/20 dark:bg-teal-300/[0.06] sm:p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-700 dark:text-teal-200" />
          <div>
            <h2 className="text-sm font-semibold text-teal-950 dark:text-teal-50">Know Your Pharmacy verification</h2>
            <p className="mt-1 text-xs leading-5 text-teal-900/75 dark:text-teal-100/70">
              These details stay private and are used by the platform verification team to match your pharmacy against PPB records, responsible-professional records and business evidence before approval.
            </p>
          </div>
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">Owner identity</p>
            <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{ownerEmail}</p>
          </div>
          <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${ownerEmailVerified ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200" : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100"}`}>
            {ownerEmailVerified ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
            {ownerEmailVerified ? "Email verified" : "Email verification required"}
          </span>
        </div>
        {!ownerEmailVerified ? (
          <form action={emailAction} className="mt-4">
            <button type="submit" disabled={emailPending} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-alt)] disabled:opacity-60">
              {emailPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Send verification email
            </button>
            {emailState.error ? <p className="mt-2 text-xs text-rose-700 dark:text-rose-300">{emailState.error}</p> : null}
            {emailState.success ? <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">{emailState.success}</p> : null}
          </form>
        ) : null}
      </section>

      <form action={action} className="space-y-5">
        <input type="hidden" name="pharmacyId" value={pharmacy.id} />
        <input type="hidden" name="licenseDocumentUrl" value={licenseDocumentUrl} />
        <input type="hidden" name="businessDocumentUrl" value={businessDocumentUrl} />

        <section className={cardClass}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">1 · PPB premises identity</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">Match the licensed facility</h2>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Use the exact details appearing on the current Pharmacy and Poisons Board licence and public register.</p>
            </div>
            <a href="https://practice.pharmacyboardkenya.org/LicenseStatus?register=facilities" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-teal-800 dark:border-teal-300/25 dark:bg-teal-300/10 dark:text-teal-100">
              Open PPB facilities register <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-[var(--foreground)]">
              PPB / premises licence number
              <input name="licenseNumber" required defaultValue={pharmacy.licenseNumber || ""} className={inputClass} autoComplete="off" />
            </label>
            <label className="block text-sm font-medium text-[var(--foreground)]">
              PPB premises / facility number
              <input name="ppbPremisesNumber" required defaultValue={pharmacy.ppbPremisesNumber || ""} className={inputClass} autoComplete="off" />
              <FieldHelp>Use the facility/premises identifier from the licence or PPB register.</FieldHelp>
            </label>
            <label className="block text-sm font-medium text-[var(--foreground)]">
              Facility type
              <select name="facilityType" required defaultValue={profile?.facilityType || ""} className={inputClass}>
                <option value="">Select type</option>
                <option value="retail">Retail pharmacy</option>
                <option value="wholesale">Wholesale pharmacy</option>
                <option value="hospital">Hospital pharmacy</option>
                <option value="manufacturer">Manufacturer</option>
                <option value="other">Other licensed pharmaceutical outlet</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-[var(--foreground)]">
              Current licence expiry date
              <input name="licenseExpiryDate" type="date" required defaultValue={profile?.licenseExpiryDate || ""} className={inputClass} />
            </label>
            <label className="block text-sm font-medium text-[var(--foreground)] sm:col-span-2">
              Exact physical premises address
              <textarea name="physicalAddress" required rows={3} defaultValue={profile?.physicalAddress || ""} className={inputClass} placeholder="Building, road/street, area, town/city and county" />
            </label>
            <label className="block text-sm font-medium text-[var(--foreground)] sm:col-span-2">
              Licence QR payload or verification text <span className="font-normal text-[var(--muted)]">(optional)</span>
              <input name="licenseQrPayload" defaultValue={profile?.licenseQrPayload || ""} className={inputClass} placeholder="Paste the QR result if you have scanned it" />
            </label>
          </div>

          <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-200" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--foreground)]">Current PPB premises licence</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Upload a clear JPEG, PNG or WebP image of the complete current licence, including QR code where present. Stored in private object storage.</p>
                <label className="mt-3 inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-alt)]">
                  {uploading === "license" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                  {licenseDocumentUrl ? "Replace licence image" : "Upload licence image"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading !== null} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadDocument(file, "license"); event.currentTarget.value = ""; }} />
                </label>
                {licenseDocumentUrl ? <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Licence evidence securely uploaded</p> : null}
              </div>
            </div>
          </div>
        </section>

        <section className={cardClass}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">2 · Responsible professional</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">Superintendent / professional in charge</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">The platform team will independently check these details against the PPB practitioner register.</p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-[var(--foreground)] sm:col-span-2">
              Full name
              <input name="superintendentName" required defaultValue={profile?.superintendentName || ""} className={inputClass} autoComplete="name" />
            </label>
            <label className="block text-sm font-medium text-[var(--foreground)]">
              PPB registration / enrolment number
              <input name="superintendentRegistrationNumber" required defaultValue={profile?.superintendentRegistrationNumber || ""} className={inputClass} autoComplete="off" />
            </label>
            <label className="block text-sm font-medium text-[var(--foreground)]">
              Current practice licence number
              <input name="superintendentPracticeLicenseNumber" required defaultValue={profile?.superintendentPracticeLicenseNumber || ""} className={inputClass} autoComplete="off" />
            </label>
          </div>
          <a href="https://practice.pharmacyboardkenya.org/LicenseStatus?registers=search" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-alt)]">
            Check PPB professional register <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>

        <section className={cardClass}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">3 · Legal business identity</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">Who owns or operates this pharmacy?</h2>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-[var(--foreground)]">
              Ownership type
              <select name="ownershipType" required defaultValue={profile?.ownershipType || ""} className={inputClass}>
                <option value="">Select ownership</option>
                <option value="sole_proprietorship">Sole proprietorship</option>
                <option value="partnership">Partnership</option>
                <option value="limited_company">Limited company</option>
                <option value="ngo_nonprofit">NGO / non-profit</option>
                <option value="public_institution">Public institution</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-[var(--foreground)]">
              Business registration number
              <input name="businessRegistrationNumber" required defaultValue={profile?.businessRegistrationNumber || ""} className={inputClass} autoComplete="off" />
            </label>
            <label className="block text-sm font-medium text-[var(--foreground)] sm:col-span-2">
              KRA PIN <span className="font-normal text-[var(--muted)]">(recommended)</span>
              <input name="kraPin" defaultValue={pharmacy.kraPin || ""} className={inputClass} autoComplete="off" />
            </label>
          </div>

          <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] p-3 sm:p-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">Business-registration evidence</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Upload a clear image of the certificate/registration evidence that connects the applicant business to the legal entity operating the pharmacy.</p>
            <label className="mt-3 inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-alt)]">
              {uploading === "business" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
              {businessDocumentUrl ? "Replace business evidence" : "Upload business evidence"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading !== null} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadDocument(file, "business"); event.currentTarget.value = ""; }} />
            </label>
            {businessDocumentUrl ? <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Business evidence securely uploaded</p> : null}
          </div>
        </section>

        <section className={cardClass}>
          <label className="flex cursor-pointer items-start gap-3">
            <input name="applicantAuthorityConfirmed" type="checkbox" required defaultChecked={profile?.applicantAuthorityConfirmed || false} className="mt-1 h-4 w-4 rounded border-[var(--border)] text-teal-700 focus:ring-teal-500" />
            <span className="text-sm leading-6 text-[var(--foreground)]">
              I confirm that I am the owner, director, superintendent, authorized employee or authorized representative of this pharmacy, and that the information and evidence submitted are accurate to the best of my knowledge.
            </span>
          </label>
        </section>

        {uploadError ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-100">{uploadError}</p> : null}
        {state.error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-100">{state.error}</p> : null}
        {state.success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100">{state.success}</p> : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/onboard" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-alt)]">Back to onboarding</Link>
          <button type="submit" disabled={pending || uploading !== null} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-300 dark:text-teal-950 dark:hover:bg-teal-200">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Save verification dossier
          </button>
        </div>
      </form>
    </div>
  );
}

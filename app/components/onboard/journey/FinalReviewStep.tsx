"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Edit2,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { submitPharmacyApplicationAction, type OnboardState } from "@/app/actions/onboard";
import type { PharmacyOnboardingSnapshot } from "@/app/lib/services/pharmacy-onboarding-journey";
import styles from "@/app/components/onboard/OnboardSurface.module.css";
import polish from "@/app/components/onboard/OnboardFormPolish.module.css";

export function FinalReviewStep({ snapshot }: { snapshot: PharmacyOnboardingSnapshot }) {
  const router = useRouter();
  const pharmacy = snapshot.pharmacy;
  const user = snapshot.user;
  const profile = snapshot.verificationProfile;
  const payment = snapshot.verificationPayment;
  const drafts = snapshot.documentDrafts;

  const [state, formAction, pending] = useActionState(
    submitPharmacyApplicationAction,
    {} as OnboardState,
  );
  const submittedRef = useRef(false);

  useEffect(() => {
    if (state.success && !submittedRef.current) {
      submittedRef.current = true;
      router.refresh();
    }
  }, [state.success, router]);

  if (!pharmacy) return null;

  const hasLicenseDoc = Boolean(drafts.license?.reference || pharmacy?.licenseDocumentUrl);
  const hasBusinessDoc = Boolean(drafts.business?.reference || profile?.businessDocumentUrl);

  return (
    <div className={`${styles.form} ${polish.wizardShell}`} aria-busy={pending}>
      <div className={polish.topline}>
        <span className={polish.stepPill}>Step 6 · Final Review</span>
        <span className={polish.savedPill}>
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Ready for review
        </span>
      </div>

      <header className={`${styles.formHead} ${polish.heading}`}>
        <h2>Review your application</h2>
        <p>
          Confirm your details before submitting to the Afyvia review team. You can edit any section below.
        </p>
      </header>

      {state.error ? (
        <p className={`${styles.alert} ${styles.alertError} mb-4`} role="alert">
          {state.error}
        </p>
      ) : null}

      <div className={polish.contentStack}>
        {/* 1. Owner Account */}
        <section className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              <UserRound className="h-4 w-4 text-[var(--brand)]" /> Owner Account
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Verified
            </span>
          </div>
          <div className="grid gap-1 sm:grid-cols-2 text-xs">
            <div>
              <span className="text-[var(--muted)] block">Email:</span>
              <strong className="text-[var(--foreground)]">{user?.email}</strong>
            </div>
            {user?.fullName ? (
              <div>
                <span className="text-[var(--muted)] block">Name:</span>
                <strong className="text-[var(--foreground)]">{user.fullName}</strong>
              </div>
            ) : null}
          </div>
        </section>

        {/* 2. Pharmacy Identity & Contact */}
        <section className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              <Building2 className="h-4 w-4 text-[var(--brand)]" /> Pharmacy Identity & Premises
            </span>
            <Link
              href={`/onboard?stage=details&pharmacyId=${pharmacy.id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)] hover:underline"
            >
              <Edit2 className="h-3 w-3" /> Edit
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 text-xs">
            <div>
              <span className="text-[var(--muted)] block">Trading Name:</span>
              <strong className="text-[var(--foreground)]">{pharmacy.name}</strong>
            </div>
            <div>
              <span className="text-[var(--muted)] block">Public URL:</span>
              <strong className="text-[var(--foreground)]">/p/{pharmacy.slug}</strong>
            </div>
            <div>
              <span className="text-[var(--muted)] block">Premises Area:</span>
              <strong className="text-[var(--foreground)]">
                {[pharmacy.city, pharmacy.county].filter(Boolean).join(", ")}
              </strong>
            </div>
            <div>
              <span className="text-[var(--muted)] block">Patient Phone:</span>
              <strong className="text-[var(--foreground)]">{pharmacy.phone}</strong>
            </div>
            {pharmacy.latitude != null && pharmacy.longitude != null ? (
              <div className="sm:col-span-2 flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                <MapPin className="h-3.5 w-3.5" /> Premises GPS map pin securely captured
              </div>
            ) : null}
          </div>
        </section>

        {/* 3. Verification Information */}
        <section className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              <ShieldCheck className="h-4 w-4 text-[var(--brand)]" /> Verification Information
            </span>
            <Link
              href={`/onboard?stage=verification&pharmacyId=${pharmacy.id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)] hover:underline"
            >
              <Edit2 className="h-3 w-3" /> Edit
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 text-xs">
            <div>
              <span className="text-[var(--muted)] block">PPB Premises Number:</span>
              <strong className="text-[var(--foreground)]">
                {pharmacy.ppbPremisesNumber || "Pending / Provided later"}
              </strong>
            </div>
            <div>
              <span className="text-[var(--muted)] block">Superintendent:</span>
              <strong className="text-[var(--foreground)]">
                {profile?.superintendentName || "Pending / Provided later"}
              </strong>
            </div>
            <div>
              <span className="text-[var(--muted)] block">Ownership Type:</span>
              <strong className="text-[var(--foreground)]">
                {profile?.ownershipType || "Sole Proprietorship"}
              </strong>
            </div>
            <div>
              <span className="text-[var(--muted)] block">Licence Upload:</span>
              <strong className="text-[var(--foreground)]">
                {hasLicenseDoc ? "Uploaded (Private R2) ✓" : "None attached (Intake optional)"}
              </strong>
            </div>
            <div>
              <span className="text-[var(--muted)] block">Business Document:</span>
              <strong className="text-[var(--foreground)]">
                {hasBusinessDoc ? "Uploaded (Private R2) ✓" : "None attached (Intake optional)"}
              </strong>
            </div>
            <div>
              <span className="text-[var(--muted)] block">Authority Declaration:</span>
              <strong className="text-emerald-700 dark:text-emerald-400">
                Confirmed by applicant ✓
              </strong>
            </div>
          </div>
        </section>

        {/* 4. Verification Payment */}
        <section className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Verification Fee
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {payment.waived ? "Waived by promo ✓" : payment.isBundlePaid ? "Paid (Bundle) ✓" : "Paid ✓"}
            </span>
          </div>
          <p className="text-xs text-[var(--muted)]">
            {payment.hasPrepaidBundleCredit
              ? "Your KES 600 bundle payment is confirmed. First month platform service is prepaid."
              : "Your KES 100 verification fee has been settled."}
          </p>
        </section>
      </div>

      <form action={formAction} className="mt-6">
        <input type="hidden" name="pharmacyId" value={pharmacy.id} />

        <div className={`${styles.actions} ${polish.actionsBar}`}>
          <button
            className={`btn-primary justify-center ${polish.primaryAction}`}
            type="submit"
            disabled={pending}
          >
            {pending ? "Submitting application…" : "Submit application for review"}
            {!pending ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { resubmitPharmacyApplicationAction, type OnboardState } from "@/app/actions/onboard";
import type { PharmacyOnboardingSnapshot } from "@/app/lib/services/pharmacy-onboarding-journey";
import styles from "@/app/components/onboard/OnboardSurface.module.css";
import polish from "@/app/components/onboard/OnboardFormPolish.module.css";

export function AdminReviewStatusStep({
  snapshot,
}: {
  snapshot: PharmacyOnboardingSnapshot;
}) {
  const router = useRouter();
  const pharmacy = snapshot.pharmacy;

  const [state, resubmitFormAction, resubmitPending] = useActionState(
    resubmitPharmacyApplicationAction,
    {} as OnboardState,
  );
  const resubmittedRef = useRef(false);

  useEffect(() => {
    if (state.success && !resubmittedRef.current) {
      resubmittedRef.current = true;
      router.refresh();
    }
  }, [state.success, router]);

  if (!pharmacy) return null;

  const status = pharmacy.status;
  const isNeedsInfo = status === "needs_info";
  const isRejected = status === "rejected";
  const isUnderReview = status === "under_review";

  // If rejected:
  if (isRejected) {
    return (
      <div className={`${styles.form} ${polish.wizardShell}`}>
        <div className={polish.topline}>
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-rose-500/10 text-rose-800 dark:text-rose-200 border border-rose-500/20">
            <XCircle className="h-3.5 w-3.5" /> Decision: Application Not Approved
          </span>
        </div>

        <header className={`${styles.formHead} ${polish.heading}`}>
          <h2>Verification Review Decision</h2>
          <p>
            Your application for <strong>{pharmacy.name}</strong> was reviewed by the Afyvia verification team and could not be approved at this time.
          </p>
        </header>

        <section className="rounded-2xl border border-rose-500/20 bg-rose-50/50 dark:bg-rose-950/20 p-4 mb-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-sm font-bold text-rose-950 dark:text-rose-100">
                Reason from Reviewer:
              </strong>
              <p className="mt-1 text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
                {pharmacy.rejectionReason || "Please check your account email for full details."}
              </p>
            </div>
          </div>
        </section>

        <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-4 text-xs text-[var(--muted)]">
          <p className="font-semibold text-[var(--foreground)] mb-1">Have questions or additional evidence?</p>
          <p>
            You can appeal this decision or submit supporting documentation by replying to your review email or reaching out to{" "}
            <a href="mailto:support@afyvia.co.ke" className="text-[var(--brand)] underline">
              support@afyvia.co.ke
            </a>.
          </p>
        </div>
      </div>
    );
  }

  // If needs information / correction:
  if (isNeedsInfo) {
    return (
      <div className={`${styles.form} ${polish.wizardShell}`} aria-busy={resubmitPending}>
        <div className={polish.topline}>
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-amber-500/15 text-amber-900 dark:text-amber-100 border border-amber-500/25">
            <AlertTriangle className="h-3.5 w-3.5" /> Correction Requested
          </span>
          <span className={polish.savedPill}>Application {pharmacy.id.slice(0, 8)}</span>
        </div>

        <header className={`${styles.formHead} ${polish.heading}`}>
          <h2>A correction is needed</h2>
          <p>
            The Afyvia verification team reviewed your application and requested additional information or evidence.
          </p>
        </header>

        {/* Reviewer Note Alert */}
        <section className="rounded-2xl border border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/30 p-4 mb-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-sm font-bold text-amber-950 dark:text-amber-100">
                Reviewer Note:
              </strong>
              <p className="mt-1 text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                {pharmacy.verificationNotes || "Please review your verification details and provide the missing information."}
              </p>
            </div>
          </div>
        </section>

        {state.error ? (
          <p className={`${styles.alert} ${styles.alertError} mb-4`} role="alert">
            {state.error}
          </p>
        ) : null}

        {/* Quick jump to edit the affected areas */}
        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          <Link
            href={`/onboard?stage=verification&pharmacyId=${pharmacy.id}`}
            className="rounded-2xl border border-[var(--line-2)] hover:border-[var(--brand)] bg-[var(--card-elev)] p-4 transition-all block group"
          >
            <span className="flex items-center justify-between text-xs font-bold text-[var(--foreground)] group-hover:text-[var(--brand)] mb-1">
              <span>Update Verification Information</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs text-[var(--muted)]">
              Update PPB premises number, superintendent details, or upload documents.
            </p>
          </Link>

          <Link
            href={`/onboard?stage=details&pharmacyId=${pharmacy.id}`}
            className="rounded-2xl border border-[var(--line-2)] hover:border-[var(--brand)] bg-[var(--card-elev)] p-4 transition-all block group"
          >
            <span className="flex items-center justify-between text-xs font-bold text-[var(--foreground)] group-hover:text-[var(--brand)] mb-1">
              <span>Update Premises & Contact</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs text-[var(--muted)]">
              Update premises location map pin, town, or phone numbers.
            </p>
          </Link>
        </div>

        <form action={resubmitFormAction}>
          <input type="hidden" name="pharmacyId" value={pharmacy.id} />

          <div className={`${styles.actions} ${polish.actionsBar}`}>
            <button
              className={`btn-primary justify-center ${polish.primaryAction}`}
              type="submit"
              disabled={resubmitPending}
            >
              {resubmitPending ? "Resubmitting…" : "Resubmit application for review"}
              {!resubmitPending ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Standard waiting on Afyvia review screen:
  return (
    <div className={`${styles.form} ${styles.status} ${polish.wizardShell}`}>
      <div className={polish.topline}>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-teal-500/10 text-teal-800 dark:text-teal-200 border border-teal-500/20">
          <Clock3 className="h-3.5 w-3.5" />
          {isUnderReview ? "Under Review" : "Submitted for Review"}
        </span>
        <span className={polish.savedPill}>Application {pharmacy.id.slice(0, 8)}</span>
      </div>

      <header className={`${styles.formHead} ${polish.heading}`}>
        <h2>{pharmacy.name} is with the network team</h2>
        <p>
          We are independently reviewing your premises, regulatory and ownership evidence. Your pharmacy listing remains private until approval.
        </p>
      </header>

      {/* Progress sequence: Submitted -> In Review -> Setup Next */}
      <div className="my-6 rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-4">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 font-semibold">
            <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-emerald-600" />
            <span>✓ Submitted</span>
          </div>
          <div className="p-2 rounded-xl bg-[var(--brand-soft)] text-[var(--brand)] font-bold ring-1 ring-[var(--brand)]/20">
            <Clock3 className="h-4 w-4 mx-auto mb-1 animate-pulse" />
            <span>{isUnderReview ? "Under Review" : "In Review"}</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-[var(--muted)]">
            <span className="block text-sm font-bold mb-1 opacity-50">→</span>
            <span>Storefront Setup</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-4 text-xs text-[var(--muted)] text-left leading-relaxed">
        <p className="font-semibold text-[var(--foreground)] mb-1">What happens next?</p>
        <p>
          You will receive an email as soon as the verification review is complete. Once approved, you will continue seamlessly to set up your opening hours, medicines catalogue, and services.
        </p>
      </div>

      <div className="mt-5 flex items-center justify-center">
        <button
          type="button"
          onClick={() => router.refresh()}
          className="btn-ghost inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)]"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh status
        </button>
      </div>
    </div>
  );
}

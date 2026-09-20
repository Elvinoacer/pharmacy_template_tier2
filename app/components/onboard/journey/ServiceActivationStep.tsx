"use client";

import { useActionState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
} from "lucide-react";
import { pharmacyBillingAction } from "@/app/actions/pharmacy-billing";
import PaymentStatusRefresh from "@/app/components/onboard/PaymentStatusRefresh";
import type { PharmacyOnboardingSnapshot } from "@/app/lib/services/pharmacy-onboarding-journey";
import styles from "@/app/components/onboard/OnboardSurface.module.css";
import polish from "@/app/components/onboard/OnboardFormPolish.module.css";

export function ServiceActivationStep({
  snapshot,
  paymentAvailable = true,
}: {
  snapshot: PharmacyOnboardingSnapshot;
  paymentAvailable?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReturned = searchParams?.get("status") === "returned" || searchParams?.get("payment") === "returned";

  const pharmacy = snapshot.pharmacy;
  const payment = snapshot.verificationPayment;
  const grant = snapshot.promotionGrant;
  const subscription = snapshot.subscription;

  const [state, action, pending] = useActionState(pharmacyBillingAction, {});

  // Redirect to external IntaSend checkout if needed
  useEffect(() => {
    if (state.checkoutUrl) {
      window.location.href = state.checkoutUrl;
    }
  }, [state.checkoutUrl]);

  // If service is already active or settled
  useEffect(() => {
    if (subscription?.active || state.settled) {
      router.refresh();
    }
  }, [subscription?.active, state.settled, router]);

  if (!pharmacy) return null;

  const hasPrepaidCredit =
    payment.hasPrepaidBundleCredit ||
    Boolean(grant?.recurringMonths && grant.recurringMonths > 0 && (grant.recurringDiscountKes ?? 500) >= 500);
  const monthlyBalance = Math.max(0, 500 - (grant?.recurringDiscountKes ?? 0));
  const canSubmit = pending || (!paymentAvailable && !hasPrepaidCredit);

  return (
    <div className={`${styles.form} ${polish.wizardShell}`} aria-busy={pending}>
      <div className={polish.topline}>
        <span className={polish.stepPill}>Step 9 · Service Activation</span>
        <span className={polish.securePill}>
          <CreditCard className="h-3.5 w-3.5" aria-hidden /> Monthly Platform Plan
        </span>
      </div>

      <header className={`${styles.formHead} ${polish.heading}`}>
        <h2>Activate monthly platform service</h2>
        <p>
          Your setup is complete. Activate your monthly digital storefront service to connect with patients and launch your pharmacy.
        </p>
      </header>

      {/* Returning from checkout */}
      {isReturned && !subscription?.active ? (
        <div className="mb-5 rounded-2xl border border-teal-500/30 bg-teal-50/50 dark:bg-teal-950/30 p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--brand)] shrink-0" />
            <div className="min-w-0 flex-1">
              <strong className="block text-sm font-bold text-teal-950 dark:text-teal-100">
                Confirming service activation…
              </strong>
              <p className="text-xs text-[var(--muted)]">
                Waiting for IntaSend confirmation. This screen advances automatically.
              </p>
            </div>
          </div>
          <PaymentStatusRefresh pending={true} />
        </div>
      ) : null}

      {state.error ? (
        <p className={`${styles.alert} ${styles.alertError} mb-4`} role="alert">
          {state.error}
        </p>
      ) : null}

      {!paymentAvailable && !hasPrepaidCredit ? (
        <p className={`${styles.alert} ${styles.alertError} mb-4`} role="alert">
          Online payment is temporarily unavailable. Please try again later or contact support.
        </p>
      ) : null}

      {/* Plan Card */}
      <section className="rounded-2xl border border-[var(--brand)] bg-[var(--brand-soft)]/20 p-5 mb-5">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand)] block">
              Starter Plan
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[var(--foreground)]">
                KES {hasPrepaidCredit ? 0 : monthlyBalance}
              </span>
              <span className="text-xs text-[var(--muted)]">/ month</span>
              {hasPrepaidCredit ? (
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Prepaid in bundle ✓
                </span>
              ) : (
                <span className="text-xs text-[var(--muted)]">~KES 17 / day</span>
              )}
            </div>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-200">
            Cancel anytime
          </span>
        </div>

        <ul className="mt-4 space-y-2 text-xs text-[var(--foreground)]">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span><strong>Verified Storefront:</strong> Mobile-optimised pharmacy profile (/p/{pharmacy.slug})</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span><strong>Refill Retention:</strong> Automatic WhatsApp refill reminders for chronic patients</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span><strong>Kenyan Catalogue:</strong> 1,400+ pre-loaded formulations with active ingredient search</span>
          </li>
        </ul>
      </section>

      <form action={action}>
        <input type="hidden" name="pharmacyId" value={pharmacy.id} />
        <input type="hidden" name="intent" value="activate" />

        <div className={`${styles.actions} ${polish.actionsBar}`}>
          <button
            className={`btn-primary justify-center ${polish.primaryAction}`}
            type="submit"
            disabled={canSubmit}
          >
            {pending ? (
              "Activating platform service…"
            ) : hasPrepaidCredit ? (
              "Activate service (Prepaid Credit · KES 0)"
            ) : (
              "Activate service (KES 500 / month)"
            )}
            {!pending ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
          </button>
        </div>
      </form>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
        <Lock className="h-3 w-3" />
        <span>Secure automated billing powered by IntaSend & Safaricom</span>
      </div>
    </div>
  );
}

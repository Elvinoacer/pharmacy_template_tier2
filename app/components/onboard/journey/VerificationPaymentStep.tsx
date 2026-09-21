"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { pharmacyBillingAction } from "@/app/actions/pharmacy-billing";
import { WaiverRequestForm } from "@/app/components/onboard/BillingForms";
import PaymentStatusRefresh from "@/app/components/onboard/PaymentStatusRefresh";
import type { PharmacyOnboardingSnapshot } from "@/app/lib/services/pharmacy-onboarding-journey";
import styles from "@/app/components/onboard/OnboardSurface.module.css";
import polish from "@/app/components/onboard/OnboardFormPolish.module.css";

export function VerificationPaymentStep({
  snapshot,
  isReviewEdit = false,
  paymentAvailable = true,
}: {
  snapshot: PharmacyOnboardingSnapshot;
  isReviewEdit?: boolean;
  paymentAvailable?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReturned =
    searchParams?.get("status") === "returned" ||
    searchParams?.get("payment") === "returned";

  const pharmacy = snapshot.pharmacy;
  const payment = snapshot.verificationPayment;
  const grant = snapshot.promotionGrant;

  const [promoCode, setPromoCode] = useState("");
  const [state, action, pending] = useActionState(pharmacyBillingAction, {});

  // Redirect to IntaSend checkout if provided
  useEffect(() => {
    if (state.checkoutUrl) {
      window.location.href = state.checkoutUrl;
    }
  }, [state.checkoutUrl]);

  // If payment was already completed / settled:
  useEffect(() => {
    if (payment.paid || payment.waived || state.settled) {
      router.push(`/onboard?stage=review&pharmacyId=${pharmacy?.id}`);
    }
  }, [payment.paid, payment.waived, state.settled, router, pharmacy?.id]);

  // If promo code applied successfully:
  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  if (!pharmacy) return null;

  const verificationWaived = Boolean(grant?.verification);
  const verificationDiscountKes = grant?.verificationDiscountKes || (verificationWaived ? 100 : 0);
  const currentCost = Math.max(0, 100 - verificationDiscountKes);
  const isWaivedZero = currentCost === 0;
  const canSubmit = pending || (!paymentAvailable && !isWaivedZero);

  return (
    <div className={`${styles.form} ${polish.wizardShell}`} aria-busy={pending}>
      <div className={polish.topline}>
        <span className={polish.stepPill}>Step 5 · Verification Fee</span>
        <span className={polish.securePill}>
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Secure IntaSend
          Checkout
        </span>
      </div>

      <header className={`${styles.formHead} ${polish.heading}`}>
        <h2>Anti-clone verification fee</h2>
        <p>
          A one-time KES 100 admin review fee locks your pharmacy name and map
          pin so copycats cannot impersonate your business.
        </p>
      </header>

      {/* Returning from IntaSend waiting state */}
      {isReturned && !payment.paid ? (
        <div className="mb-5 rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-teal-50/50 dark:bg-teal-950/30 p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--brand)] shrink-0" />
            <div className="min-w-0 flex-1">
              <strong className="block text-sm font-bold text-teal-950 dark:text-teal-100">
                Confirming payment with IntaSend…
              </strong>
              <p className="text-xs text-[var(--muted)]">
                Checking your transaction status. This screen will advance
                automatically once confirmed.
              </p>
            </div>
          </div>
          <PaymentStatusRefresh pending={true} />
        </div>
      ) : null}

      {/* Feedback states */}
      {state.success ? (
        <p className={`${styles.alert} ${styles.alertOk} mb-4`} role="alert">
          {state.success}
        </p>
      ) : null}

      {state.error ? (
        <p className={`${styles.alert} ${styles.alertError} mb-4`} role="alert">
          {state.error}
        </p>
      ) : null}

      {!paymentAvailable && !isWaivedZero ? (
        <p className={`${styles.alert} ${styles.alertError} mb-4`} role="alert">
          Online payment is temporarily unavailable. Please try again later or
          contact support.
        </p>
      ) : null}

      <section className="mb-5 rounded-2xl border border-[var(--brand)] bg-[var(--brand-soft)]/30 p-4">
        <h3 className="font-semibold">One-time verification · KES {currentCost}</h3>
        <p className="mt-2 text-sm">No monthly payment is required to join or launch. Your free plan includes 5 public medicine listings, 2 services, reservations and bookings.</p>
        <p className="mt-2 text-xs text-[var(--muted)]">Upgrade later to Premium for KES 500/month when you need more listings or premium tools.</p>
      </section>

      {/* Payment Action Form */}
      <form action={action}>
        <input type="hidden" name="pharmacyId" value={pharmacy.id} />
        <input
          type="hidden"
          name="intent"
          value="verification_checkout"
        />

        <div className={`${styles.actions} ${polish.actionsBar}`}>
          {isReviewEdit ? (
            <button
              type="button"
              onClick={() =>
                router.push(`/onboard?stage=review&pharmacyId=${pharmacy.id}`)
              }
              className={`btn-ghost justify-center ${polish.secondaryAction}`}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Return to review
            </button>
          ) : null}

          <button
            className={`btn-primary justify-center ${polish.primaryAction}`}
            type="submit"
            disabled={canSubmit}
          >
            {pending
              ? "Securing checkout…"
              : isWaivedZero
                ? "Continue (Waiver Applied · KES 0)"
                : `Pay KES ${currentCost} via IntaSend / M-PESA`}
            {!pending ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
          </button>
        </div>
      </form>

      <details
        className="mt-5 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_30%,var(--card-elev))] bg-[color-mix(in_srgb,var(--card-elev)_45%,transparent)]"
        open={Boolean(grant)}
      >
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-3 text-xs font-semibold text-[var(--muted)] marker:hidden">
          <Tag className="h-3.5 w-3.5 text-[var(--brand)]" aria-hidden />
          <span>Have a voucher or need help with the fee?</span>
          <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
            Optional
          </span>
        </summary>
        <div className="space-y-4 border-t border-[color-mix(in_srgb,var(--foreground)_20%,var(--card-elev))] p-3.5">
          <form action={action} className="space-y-2">
            <input type="hidden" name="pharmacyId" value={pharmacy.id} />
            <input type="hidden" name="intent" value="apply_promo" />
            <label
              className="block text-xs font-semibold text-[var(--foreground)]"
              htmlFor="pharmacy-promo-code"
            >
              Promotional code
              <span className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                <input
                  id="pharmacy-promo-code"
                  name="code"
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Enter your code"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="input-admin min-h-10 w-full min-w-0 flex-1 uppercase font-mono text-sm tracking-wider"
                  disabled={pending}
                />
                <button
                  type="submit"
                  disabled={pending || !promoCode.trim()}
                  className="btn-ghost min-h-10 w-full shrink-0 justify-center px-4 text-xs font-semibold sm:w-auto"
                >
                  {pending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Apply code"
                  )}
                </button>
              </span>
            </label>
          </form>

          {grant ? (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 p-2.5 text-xs text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <strong>
                    Active benefit: {grant.promotionName || "Promotion"}
                  </strong>
                  {grant.promotionCode ? (
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold">
                      {grant.promotionCode}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[11px]">
                  {grant.verificationDiscountKes
                    ? `KES ${grant.verificationDiscountKes} off verification. `
                    : ""}
                  {grant.recurringDiscountKes
                    ? `KES ${grant.recurringDiscountKes} off monthly service for ${grant.recurringMonths} period${grant.recurringMonths === 1 ? "" : "s"}.`
                    : ""}
                </p>
              </div>
            </div>
          ) : null}

          <WaiverRequestForm
            pharmacyId={pharmacy.id}
            latestRequest={snapshot.waiverRequest}
          />
        </div>
      </details>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
        <Lock className="h-3 w-3" />
        <span>
          Supports M-PESA STK Push, Visa, Mastercard, and Bank Transfer
        </span>
      </div>
    </div>
  );
}

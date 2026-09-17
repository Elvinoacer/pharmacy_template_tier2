"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Tag,
} from "lucide-react";
import { pharmacyBillingAction } from "@/app/actions/pharmacy-billing";
import PaymentStatusRefresh from "@/app/components/onboard/PaymentStatusRefresh";
import type { PharmacyOnboardingSnapshot } from "@/app/lib/services/pharmacy-onboarding-journey";
import styles from "@/app/components/onboard/OnboardSurface.module.css";
import polish from "@/app/components/onboard/OnboardFormPolish.module.css";

export function VerificationPaymentStep({
  snapshot,
  isReviewEdit = false,
}: {
  snapshot: PharmacyOnboardingSnapshot;
  isReviewEdit?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReturned = searchParams?.get("status") === "returned" || searchParams?.get("payment") === "returned";

  const pharmacy = snapshot.pharmacy;
  const payment = snapshot.verificationPayment;
  const grant = snapshot.promotionGrant;

  const [selectedPlan, setSelectedPlan] = useState<"verification" | "bundle">("bundle");
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
      if (isReviewEdit) {
        router.push(`/onboard?stage=review&pharmacyId=${pharmacy?.id}`);
      } else {
        router.refresh();
      }
    }
  }, [payment.paid, payment.waived, state.settled, isReviewEdit, router, pharmacy?.id]);

  if (!pharmacy) return null;

  const verificationWaived = Boolean(grant?.verification);
  const recurringWaived = Boolean(grant?.recurringMonths && grant.recurringMonths > 0);

  const verificationCost = verificationWaived ? 0 : 100;
  const bundleCost = (verificationWaived ? 0 : 100) + (recurringWaived ? 0 : 500);

  const currentCost = selectedPlan === "bundle" ? bundleCost : verificationCost;
  const isWaivedZero = currentCost === 0;

  return (
    <div className={`${styles.form} ${polish.wizardShell}`} aria-busy={pending}>
      <div className={polish.topline}>
        <span className={polish.stepPill}>Step 5 · Verification Fee</span>
        <span className={polish.securePill}>
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Secure IntaSend Checkout
        </span>
      </div>

      <header className={`${styles.formHead} ${polish.heading}`}>
        <h2>Anti-clone verification fee</h2>
        <p>
          A one-time KES 100 admin review fee locks your pharmacy name and map pin so copycats cannot impersonate your business.
        </p>
      </header>

      {/* Returning from IntaSend waiting state */}
      {isReturned && !payment.paid ? (
        <div className="mb-5 rounded-2xl border border-teal-500/30 bg-teal-50/50 dark:bg-teal-950/30 p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--brand)] shrink-0" />
            <div className="min-w-0 flex-1">
              <strong className="block text-sm font-bold text-teal-950 dark:text-teal-100">
                Confirming payment with IntaSend…
              </strong>
              <p className="text-xs text-[var(--muted)]">
                Checking your transaction status. This screen will advance automatically once confirmed.
              </p>
            </div>
          </div>
          <PaymentStatusRefresh pending={true} />
        </div>
      ) : null}

      {/* Promo Code Input */}
      <section className="mb-5 rounded-2xl border border-teal-500/20 bg-teal-50/40 dark:bg-teal-950/20 p-4">
        <form action={action} className="space-y-2">
          <input type="hidden" name="pharmacyId" value={pharmacy.id} />
          <input type="hidden" name="intent" value="apply_promo" />

          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-[var(--brand)]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              Have a promotional card or voucher?
            </h3>
          </div>
          <div className="flex gap-2">
            <input
              name="code"
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="e.g. AETHER2026"
              className="input-admin uppercase font-mono text-sm flex-1 min-h-10"
              disabled={pending}
            />
            <button
              type="submit"
              disabled={pending || !promoCode.trim()}
              className="btn-primary min-h-10 px-4 text-xs font-semibold shrink-0"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply voucher"}
            </button>
          </div>
        </form>

        {grant ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-500/10 p-2.5 text-xs text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <strong>Active benefit: {grant.promotionName || "Promotion"}</strong>
              <p className="text-[11px] mt-0.5">
                {grant.verification ? "Verification fee waived (KES 0)." : ""}
                {grant.recurringMonths ? ` ${grant.recurringMonths} free monthly period included.` : ""}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      {/* Error state */}
      {state.error ? (
        <p className={`${styles.alert} ${styles.alertError} mb-4`} role="alert">
          {state.error}
        </p>
      ) : null}

      {/* Pricing options selector */}
      <div className="grid gap-3 sm:grid-cols-2 mb-5">
        {/* Bundle option */}
        <button
          type="button"
          onClick={() => setSelectedPlan("bundle")}
          className={`text-left rounded-2xl p-4 border transition-all relative cursor-pointer ${
            selectedPlan === "bundle"
              ? "border-[var(--brand)] bg-[var(--brand-soft)]/30 ring-2 ring-[var(--brand)]/20 shadow-sm"
              : "border-[var(--line-2)] bg-[var(--card-elev)] hover:border-[var(--line-1)]"
          }`}
        >
          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--brand)] text-white">
            Recommended
          </span>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--brand)]">
            <Sparkles className="h-4 w-4" />
            <span>Launch-Ready Bundle</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--foreground)]">
              KES {bundleCost}
            </span>
            {(verificationWaived || recurringWaived) && (
              <span className="text-sm text-[var(--muted)] line-through">KES 600</span>
            )}
          </div>
          <p className="mt-1 text-xs font-medium text-[var(--foreground)]">
            KES 100 verification + KES 500 prepaid 1st month subscription
          </p>
          <ul className="mt-2.5 space-y-1.5 text-xs text-[var(--muted)]">
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-[var(--brand)] shrink-0" />
              <span>PPB anti-clone review lock</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-[var(--brand)] shrink-0" />
              <span>Prepaid 1st month credited (activates after approval)</span>
            </li>
          </ul>
        </button>

        {/* Verification only option */}
        <button
          type="button"
          onClick={() => setSelectedPlan("verification")}
          className={`text-left rounded-2xl p-4 border transition-all cursor-pointer ${
            selectedPlan === "verification"
              ? "border-[var(--brand)] bg-[var(--brand-soft)]/30 ring-2 ring-[var(--brand)]/20 shadow-sm"
              : "border-[var(--line-2)] bg-[var(--card-elev)] hover:border-[var(--line-1)]"
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            <ShieldCheck className="h-4 w-4" />
            <span>Verification Only</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--foreground)]">
              KES {verificationCost}
            </span>
            {verificationWaived && (
              <span className="text-sm text-[var(--muted)] line-through">KES 100</span>
            )}
          </div>
          <p className="mt-1 text-xs font-medium text-[var(--foreground)]">
            One-time verification review only
          </p>
          <ul className="mt-2.5 space-y-1.5 text-xs text-[var(--muted)]">
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-[var(--brand)] shrink-0" />
              <span>PPB anti-clone review lock</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-[var(--brand)] shrink-0" />
              <span>Pay KES 500 monthly service later when ready to publish</span>
            </li>
          </ul>
        </button>
      </div>

      {/* Payment Action Form */}
      <form action={action}>
        <input type="hidden" name="pharmacyId" value={pharmacy.id} />
        <input
          type="hidden"
          name="intent"
          value={selectedPlan === "bundle" ? "bundle_checkout" : "verification_checkout"}
        />

        <div className={`${styles.actions} ${polish.actionsBar}`}>
          {isReviewEdit ? (
            <button
              type="button"
              onClick={() => router.push(`/onboard?stage=review&pharmacyId=${pharmacy.id}`)}
              className={`btn-ghost justify-center ${polish.secondaryAction}`}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Return to review
            </button>
          ) : null}

          <button
            className={`btn-primary justify-center ${polish.primaryAction}`}
            type="submit"
            disabled={pending}
          >
            {pending ? (
              "Securing checkout…"
            ) : isWaivedZero ? (
              "Continue (Waiver Applied · KES 0)"
            ) : (
              `Pay KES ${currentCost} via IntaSend / M-PESA`
            )}
            {!pending ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
          </button>
        </div>
      </form>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
        <Lock className="h-3 w-3" />
        <span>Supports M-PESA STK Push, Visa, Mastercard, and Bank Transfer</span>
      </div>
    </div>
  );
}

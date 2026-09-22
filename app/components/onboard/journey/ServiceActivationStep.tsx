"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  Tag,
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

  const [promoCode, setPromoCode] = useState("");
  const [state, action, pending] = useActionState(pharmacyBillingAction, {});

  // Redirect to external IntaSend checkout if needed
  useEffect(() => {
    if (state.checkoutUrl) {
      window.location.href = state.checkoutUrl;
    }
  }, [state.checkoutUrl]);

  // If service is already active or settled:
  useEffect(() => {
    if (subscription?.active || state.settled) {
      router.push(`/onboard?stage=launch&pharmacyId=${pharmacy?.id}`);
    }
  }, [subscription?.active, state.settled, router, pharmacy?.id]);

  // If promo code applied successfully:
  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  if (!pharmacy) return null;

  const recurringDiscountKes = grant?.recurringDiscountKes ?? 0;
  const recurringMonths = grant?.recurringMonths ?? 0;
  const isPromoFree = Boolean(recurringMonths > 0 && recurringDiscountKes >= 500);
  const hasPrepaidCredit = payment.hasPrepaidBundleCredit || isPromoFree;
  const monthlyBalance = Math.max(0, 500 - recurringDiscountKes);
  const canSubmit = pending || (!paymentAvailable && !hasPrepaidCredit);

  return (
    <div className={`${styles.form} ${polish.wizardShell}`} aria-busy={pending}>
      <div className={polish.topline}>
        <span className={polish.stepPill}>Optional · Premium</span>
        <span className={polish.securePill}>
          <CreditCard className="h-3.5 w-3.5" aria-hidden /> KES 500 / month
        </span>
      </div>

      <header className={`${styles.formHead} ${polish.heading}`}>
        <h2>Premium is optional</h2>
        <p>
          Launch stays free with 5 public medicine listings, 2 services, 10 direct Afyvia prescription referrals per month, reservations and bookings. Upgrade only when you need unlimited direct Afyvia prescription referrals, more listings, AI-assisted imports, advanced analytics or POS synchronization.
        </p>
      </header>
      <p className="mb-4">
        <button type="button" className="btn-ghost" onClick={() => router.push(`/onboard?stage=launch&pharmacyId=${pharmacy.id}`)}>
          Continue on the free plan <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </p>

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

      {/* Promo Code Input */}
      <section className="mb-5 rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-teal-50/40 dark:bg-teal-950/20 p-4">
        <form action={action} className="space-y-2">
          <input type="hidden" name="pharmacyId" value={pharmacy.id} />
          <input type="hidden" name="intent" value="apply_promo" />

          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-[var(--brand)]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              Have a promotional card or voucher?
            </h3>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              name="code"
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="e.g. AFYVIA2026"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-label="Promotional voucher code"
              className="input-admin min-h-12 w-full min-w-0 flex-1 uppercase font-mono text-base tracking-wider sm:min-h-10 sm:text-sm"
              disabled={pending}
            />
            <button
              type="submit"
              disabled={pending || !promoCode.trim()}
              className="btn-primary min-h-12 w-full shrink-0 justify-center px-4 text-sm font-semibold sm:min-h-10 sm:w-auto sm:text-xs"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply voucher"}
            </button>
          </div>
        </form>

        {grant ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-500/10 p-2.5 text-xs text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <strong>Active benefit: {grant.promotionName || "Promotion"}</strong>
                {grant.promotionCode && (
                  <span className="font-mono bg-emerald-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    {grant.promotionCode}
                  </span>
                )}
              </div>
              <p className="text-[11px] mt-0.5">
                {recurringDiscountKes ? `KES ${recurringDiscountKes} off monthly service for ${recurringMonths} period${recurringMonths === 1 ? "" : "s"}.` : ""}
                {grant.verificationDiscountKes ? ` (Verification subsidized KES ${grant.verificationDiscountKes}).` : ""}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      {/* Feedback alerts */}
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
              {!hasPrepaidCredit && recurringDiscountKes > 0 ? (
                <span className="text-sm text-[var(--muted)] line-through">KES 500</span>
              ) : null}
              <span className="text-xs text-[var(--muted)]">/ month</span>
              {hasPrepaidCredit ? (
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {isPromoFree
                    ? `${recurringMonths} Month${recurringMonths === 1 ? "" : "s"} Free Voucher ✓`
                    : "Prepaid in bundle ✓"}
                </span>
              ) : recurringDiscountKes > 0 ? (
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  KES {recurringDiscountKes} discount ({recurringMonths}mo)
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
              isPromoFree
                ? "Activate service (Promotional Voucher · KES 0)"
                : "Activate service (Prepaid Credit · KES 0)"
            ) : (
              `Activate service (KES ${monthlyBalance} / month)`
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

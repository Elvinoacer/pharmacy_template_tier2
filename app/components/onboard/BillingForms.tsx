"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  Check,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  KeyRound,
  Layers,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import {
  generatePromotionCodeAction,
  pharmacyBillingAction,
  promotionAction,
  submitWaiverRequestAction,
  waiverDecisionAction,
} from "@/app/actions/pharmacy-billing";
import { verifyStepUpAction, type MfaState } from "@/app/actions/mfa";

const input =
  "mt-1 min-h-12 w-full rounded-xl border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-[var(--card-elev)] px-3.5 text-base text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-2 focus:ring-offset-[var(--card)] disabled:cursor-not-allowed disabled:border-[color-mix(in_srgb,var(--foreground)_42%,var(--card-elev))] disabled:bg-[color-mix(in_srgb,var(--foreground)_7%,var(--card-elev))] disabled:text-[var(--muted)] disabled:opacity-100 sm:text-sm";

export function PromoCardForm({ pharmacyId }: { pharmacyId: string }) {
  const [state, action, pending] = useActionState(pharmacyBillingAction, {});
  const [code, setCode] = useState("");

  return (
    <form
      action={action}
      className="rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-teal-50/40 dark:bg-teal-950/20 p-4"
    >
      <input type="hidden" name="pharmacyId" value={pharmacyId} />
      <input type="hidden" name="intent" value="apply_promo" />

      <div className="flex items-center gap-2 mb-2">
        <Tag className="h-4 w-4 text-[var(--brand)]" />
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          Have a promotional card or voucher?
        </h3>
      </div>
      <p className="text-xs text-[var(--muted)] mb-3">
        Enter your promotional card or coupon code to waive your verification fee, recurring fees, or both.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className={`${input} mt-0 min-w-0 flex-1 uppercase tracking-wider font-mono`}
          name="code"
          type="text"
          placeholder="e.g. WELCOME2026"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-label="Promotional voucher code"
          required
          disabled={pending}
        />
        <button
          type="submit"
          disabled={pending || !code.trim()}
          className="btn-primary min-h-12 w-full shrink-0 items-center justify-center gap-2 px-5 sm:w-auto"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Code"}
        </button>
      </div>

      {state.error ? (
        <p role="alert" className="mt-2.5 text-xs font-medium text-rose-700 dark:text-rose-300">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <div role="status" className="mt-2.5 flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{state.success}</span>
        </div>
      ) : null}
    </form>
  );
}

export function WaiverRequestForm({
  pharmacyId,
  latestRequest,
}: {
  pharmacyId: string;
  latestRequest?: { status: string; requestedAmountKes: number | null; decisionNote?: string | null } | null;
}) {
  const [state, action, pending] = useActionState(submitWaiverRequestAction, {});
  const pendingRequest = latestRequest?.status === "pending";

  return (
    <section className="rounded-2xl border border-amber-500/25 bg-amber-50/40 p-4 dark:bg-amber-950/15">
      <h3 className="text-sm font-semibold text-[var(--foreground)]">Need help with the fee?</h3>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
        Ask the platform billing team for a partial subsidy or a full waiver. Applying does not pause a payment already in progress.
      </p>
      {pendingRequest ? (
        <p className="mt-3 rounded-xl bg-amber-500/10 p-3 text-xs font-semibold text-amber-900 dark:text-amber-100" role="status">
          Your waiver request is awaiting review{latestRequest.requestedAmountKes ? ` (KES ${latestRequest.requestedAmountKes.toLocaleString("en-KE")})` : " (full waiver requested)"}.
        </p>
      ) : (
        <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="pharmacyId" value={pharmacyId} />
          <label className="text-xs font-semibold text-[var(--foreground)]">
            Amount requested (optional)
            <input className={input} name="requestedAmount" type="number" min={1} max={60000} placeholder="Leave blank for full waiver" />
          </label>
          <label className="text-xs font-semibold text-[var(--foreground)] sm:col-span-2">
            Why do you need assistance?
            <textarea className={`${input} min-h-24 py-3`} name="reason" minLength={20} maxLength={1000} required placeholder="Briefly explain your circumstances and the support that would help." />
          </label>
          <button className="btn-primary min-h-11 justify-center sm:w-fit" disabled={pending}>
            {pending ? "Submitting…" : "Request fee waiver"}
          </button>
        </form>
      )}
      {latestRequest && latestRequest.status !== "pending" ? (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Last request: <strong className="capitalize">{latestRequest.status}</strong>{latestRequest.decisionNote ? ` — ${latestRequest.decisionNote}` : ""}
        </p>
      ) : null}
      <p role={state.error ? "alert" : "status"} className={`mt-2 text-xs font-medium ${state.error ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>
        {state.error || state.success}
      </p>
    </section>
  );
}

export function PharmacyEnrolmentPricingSelector({
  pharmacyId,
  grant,
  verificationPaid = false,
  subscriptionActive = false,
  defaultPhone,
  paymentAvailable = true,
}: {
  pharmacyId: string;
  grant?: {
    verification: boolean;
    verificationDiscountKes?: number | { toString(): string };
    recurringMonths: number;
    recurringDiscountKes?: number | { toString(): string };
  } | null;
  verificationPaid?: boolean;
  subscriptionActive?: boolean;
  defaultPhone?: string | null;
  paymentAvailable?: boolean;
}) {
  const [selectedPlan, setSelectedPlan] = useState<"bundle" | "verification" | "recurring">(
    verificationPaid ? "recurring" : "verification",
  );
  const [state, action, pending] = useActionState(pharmacyBillingAction, {});

  useEffect(() => {
    if (state.checkoutUrl) {
      window.location.href = state.checkoutUrl;
    }
  }, [state.checkoutUrl]);

  const verificationWaived = Boolean(grant?.verification);
  const recurringWaived = Boolean(grant?.recurringMonths && grant.recurringMonths > 0);
  const verificationDiscountKes = Math.min(100, Number(grant?.verificationDiscountKes ?? 0) || (verificationWaived ? 100 : 0));
  const monthlyDiscountKes = Math.min(500, Number(grant?.recurringDiscountKes ?? 0) || (recurringWaived ? 500 : 0));

  // Price calculations
  const effectiveVerification = verificationPaid ? 0 : Math.max(0, 100 - verificationDiscountKes);
  const effectiveMonthly = Math.max(0, 500 - monthlyDiscountKes);
  const effectiveBundle = effectiveVerification + effectiveMonthly;

  const activeCost =
    selectedPlan === "bundle"
      ? effectiveBundle
      : selectedPlan === "verification"
        ? effectiveVerification
        : effectiveMonthly;

  const isFree = activeCost === 0;
  const canSubmit = pending || (!paymentAvailable && !isFree);

  return (
    <div className="space-y-4">
      {/* Plan selection tabs */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Launch-Ready Bundle Card */}
        {!verificationPaid ? (
          <button
            type="button"
            onClick={() => setSelectedPlan("bundle")}
            className={`text-left rounded-2xl p-4 border transition-all relative ${
              selectedPlan === "bundle"
                ? "border-[var(--brand)] bg-[var(--brand-soft)]/30 ring-2 ring-[var(--brand)]/20 shadow-sm"
                : "border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-[var(--card-elev)] hover:border-[var(--brand)]"
            }`}
          >
            <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--brand)] text-[var(--background)]">
              Recommended
            </span>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--brand)]">
              <Sparkles className="h-4 w-4" />
              <span>Launch-Ready Bundle</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[var(--foreground)]">
                KES {effectiveBundle}
              </span>
              {(verificationDiscountKes > 0 || monthlyDiscountKes > 0) && (
                <span className="text-sm text-[var(--muted)] line-through">KES 600</span>
              )}
            </div>
            <p className="mt-1 text-xs font-medium text-[var(--foreground)]">
              KES 100 verification + KES 500 first month platform subscription
            </p>
            <ul className="mt-2.5 space-y-1 text-xs text-[var(--muted)]">
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[var(--brand)] shrink-0" />
                <span>One-time PPB premises verification &amp; anti-clone lock</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[var(--brand)] shrink-0" />
                <span>First month full platform access (Storefront, AI intake, 1,400+ meds)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[var(--brand)] shrink-0" />
                <span>Zero launch delay: opens to patients immediately upon approval</span>
              </li>
            </ul>
          </button>
        ) : null}

        {/* Verification Only Card */}
        {!verificationPaid ? (
          <button
            type="button"
            onClick={() => setSelectedPlan("verification")}
            className={`text-left rounded-2xl p-4 border transition-all ${
              selectedPlan === "verification"
                ? "border-[var(--brand)] bg-[var(--brand-soft)]/30 ring-2 ring-[var(--brand)]/20 shadow-sm"
                : "border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-[var(--card-elev)] hover:border-[var(--brand)]"
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              <ShieldCheck className="h-4 w-4" />
              <span>Verification Only</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[var(--foreground)]">
                KES {effectiveVerification}
              </span>
              {verificationDiscountKes > 0 && (
                <span className="text-sm text-[var(--muted)] line-through">KES 100</span>
              )}
            </div>
            <p className="mt-1 text-xs font-medium text-[var(--foreground)]">
              One-time PPB check only
            </p>
            <ul className="mt-2.5 space-y-1 text-xs text-[var(--muted)]">
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[var(--brand)] shrink-0" />
                <span>Get verified and anti-clone locked first</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[var(--brand)] shrink-0" />
                <span>Pay KES 500 monthly service later when ready to go live</span>
              </li>
            </ul>
          </button>
        ) : null}

        {/* Monthly Subscription Only Card */}
        {verificationPaid && !subscriptionActive ? (
          <div className="sm:col-span-2 rounded-2xl p-4 border border-[var(--brand)] bg-[var(--brand-soft)]/20">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--brand)]">
              <Sparkles className="h-4 w-4" />
              <span>First Month Platform Service</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[var(--foreground)]">
                KES {effectiveMonthly}
              </span>
              {monthlyDiscountKes > 0 && (
                <span className="text-sm text-[var(--muted)] line-through">KES 500</span>
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Verification is already completed. Activate your digital pharmacy storefront.
            </p>
          </div>
        ) : null}
      </div>

      {/* Payment Action Form */}
      <form action={action} className="rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-[var(--card-elev)] p-4">
        <input type="hidden" name="pharmacyId" value={pharmacyId} />
        <input
          type="hidden"
          name="intent"
          value={
            selectedPlan === "bundle"
              ? "bundle_checkout"
              : selectedPlan === "verification"
                ? "verification_checkout"
                : "activate"
          }
        />

        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h4 className="text-sm font-semibold text-[var(--foreground)]">
              {isFree
                ? "100% Promotional Waiver Active"
                : `Total Payable: KES ${activeCost}`}
            </h4>
            <p className="text-xs text-[var(--muted)]">
              {isFree
                ? "All required fees have been waived. Activate immediately with zero charges."
                : "Powered by IntaSend: Pay with M-PESA, Visa, Mastercard, or Bank."}
            </p>
          </div>
          {!isFree && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f1f5f9] dark:bg-[#1e293b] text-[10px] font-semibold text-[#475569] dark:text-[#94a3b8]">
              <Smartphone className="h-3 w-3 text-emerald-600" />
              <span>M-PESA</span>
              <span className="text-slate-300">·</span>
              <CreditCard className="h-3 w-3 text-blue-600" />
              <span>Card</span>
            </div>
          )}
        </div>

        {!paymentAvailable && !isFree ? (
          <p role="alert" className="mb-3 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
            Online payment is temporarily unavailable. Please try again later or contact support.
          </p>
        ) : null}

        <button
          disabled={canSubmit}
          type="submit"
          className={`btn-primary min-h-12 w-full justify-center text-sm font-semibold flex items-center gap-2 ${
            isFree ? "bg-emerald-700 hover:bg-emerald-800 text-white" : ""
          }`}
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : isFree ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>Activate Immediately (KES 0)</span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              <span>Pay KES {activeCost} with IntaSend</span>
            </>
          )}
        </button>

        {state.checkoutUrl && (
          <div className="mt-3 p-2 text-center text-xs text-[var(--brand)]">
            <span>Taking you to IntaSend... </span>
            <a
              href={state.checkoutUrl}
              className="underline font-semibold inline-flex items-center gap-1"
            >
              Click here if not redirected automatically <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {state.error && (
          <p role="alert" className="mt-2.5 text-xs text-rose-700 dark:text-rose-300">
            {state.error}
          </p>
        )}
        {state.success && (
          <p role="status" className="mt-2.5 text-xs text-emerald-700 dark:text-emerald-400">
            {state.success}
          </p>
        )}
      </form>
    </div>
  );
}

export function PharmacyPaymentForm({
  pharmacyId,
  invoiceId,
  invoiceNumber,
  checkoutAvailable = true,
}: {
  pharmacyId: string;
  invoiceId?: string;
  invoiceNumber?: string;
  checkoutAvailable?: boolean;
  defaultPhone?: string | null;
}) {
  const [state, action, pending] = useActionState(pharmacyBillingAction, {});
  const activation = !invoiceId;

  useEffect(() => {
    if (state.checkoutUrl) {
      window.location.href = state.checkoutUrl;
    }
  }, [state.checkoutUrl]);

  return (
    <form
      action={action}
      className={activation ? "space-y-3" : "rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-[var(--card-elev)] p-4"}
      aria-busy={pending}
    >
      <input type="hidden" name="pharmacyId" value={pharmacyId} />
      {invoiceId ? <input type="hidden" name="invoiceId" value={invoiceId} /> : null}
      {invoiceNumber ? <input type="hidden" name="invoiceNumber" value={invoiceNumber} /> : null}
      <input type="hidden" name="intent" value={activation ? "activate" : "intasend_checkout"} />

      {!activation ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
              <CreditCard className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Pay Invoice with IntaSend</h3>
              <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">
                Secure checkout supporting M-PESA, Visa, Mastercard, and Bank.
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] px-2 py-1 text-[10px] font-semibold text-[var(--muted)]">
            IntaSend
          </span>
        </div>
      ) : null}

      {checkoutAvailable ? (
        <button disabled={pending} className="btn-primary mt-3 min-h-11 w-full justify-center" type="submit">
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span>Connecting to IntaSend…</span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4 mr-2" aria-hidden />
              <span>{activation ? "Start Service with IntaSend" : "Pay with IntaSend"}</span>
            </>
          )}
        </button>
      ) : (
        <p className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-rose-500/10 p-3 text-xs leading-5 text-rose-700 dark:text-rose-300">
          Payment is temporarily unavailable. Please try again shortly.
        </p>
      )}

      {state.checkoutUrl && (
        <div className="mt-2 text-center text-xs text-[var(--brand)]">
          <a href={state.checkoutUrl} className="underline font-semibold inline-flex items-center gap-1">
            Proceeding to payment... Click here if not redirected <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      <p
        role={state.error ? "alert" : "status"}
        className={state.error ? "mt-2 text-sm text-rose-700 dark:text-rose-300" : "mt-2 text-sm text-emerald-700 dark:text-emerald-300"}
      >
        {state.error || state.success}
      </p>
    </form>
  );
}

export function RecurringMpesaSetupForm({
  pharmacyId,
  defaultPhone,
  active = false,
  authorising = false,
}: {
  pharmacyId: string;
  defaultPhone?: string | null;
  active?: boolean;
  authorising?: boolean;
}) {
  const [state, action, pending] = useActionState(pharmacyBillingAction, {});
  return (
    <form action={action} className="space-y-3" aria-busy={pending}>
      <input type="hidden" name="pharmacyId" value={pharmacyId} />
      <input type="hidden" name="intent" value="subscription_setup" />
      <button
        disabled={pending || active || authorising}
        className="btn-ghost min-h-11 w-full justify-center"
        type="submit"
      >
        <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} aria-hidden />
        {active
          ? "Monthly Auto-Billing Active"
          : pending
            ? "Setting up Renewal…"
            : "Manage Monthly Renewal"}
      </button>
      <p
        role={state.error ? "alert" : "status"}
        className={state.error ? "text-sm text-rose-700 dark:text-rose-300" : "text-sm text-emerald-700 dark:text-emerald-300"}
      >
        {state.error || state.success}
      </p>
    </form>
  );
}

export function RetryOverdueForm({
  pharmacyId,
  suspended = false,
}: {
  pharmacyId: string;
  defaultPhone?: string | null;
  suspended?: boolean;
}) {
  const [state, action, pending] = useActionState(pharmacyBillingAction, {});

  useEffect(() => {
    if (state.checkoutUrl) {
      window.location.href = state.checkoutUrl;
    }
  }, [state.checkoutUrl]);

  return (
    <form action={action} className="mt-3 space-y-3" aria-busy={pending}>
      <input type="hidden" name="pharmacyId" value={pharmacyId} />
      <input type="hidden" name="intent" value="retry_overdue" />
      <button className="btn-primary min-h-11 w-full justify-center" disabled={pending} type="submit">
        <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} aria-hidden />
        {pending ? "Opening IntaSend…" : suspended ? "Pay with IntaSend & Restore Pharmacy" : "Pay Overdue with IntaSend"}
      </button>
      {state.checkoutUrl && (
        <p className="text-xs text-center text-[var(--brand)]">
          <a href={state.checkoutUrl} className="underline font-semibold">
            Click here to open checkout if not redirected
          </a>
        </p>
      )}
      <p
        role={state.error ? "alert" : "status"}
        className={state.error ? "text-sm text-rose-700 dark:text-rose-300" : "text-sm text-emerald-700 dark:text-emerald-300"}
      >
        {state.error || state.success}
      </p>
    </form>
  );
}

function PromotionStepUpDialog({
  onClose,
  onVerified,
}: {
  onClose: () => void;
  onVerified: () => void;
}) {
  const [state, action, pending] = useActionState(verifyStepUpAction, {} as MfaState);

  useEffect(() => {
    if (state.success) onVerified();
  }, [state.success, onVerified]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="promotion-step-up-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#111a17] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-200/65">Billing security</p>
            <h2 id="promotion-step-up-title" className="mt-1 text-lg font-semibold text-white">
              Verify identity to manage promotions
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/55 transition hover:bg-white/10 hover:text-white"
            aria-label="Close verification dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form action={action} className="space-y-4 px-5 py-5">
          <p className="text-sm leading-6 text-emerald-50/70">
            Promotions can waive platform fees, so a fresh identity check is required before creating or stopping one.
          </p>
          <label className="block text-sm font-semibold text-white">
            Authenticator or recovery code
            <input
              name="code"
              autoComplete="one-time-code"
              required
              pattern="[0-9a-fA-F ]{6,12}"
              maxLength={12}
              autoFocus
              placeholder="Enter code"
              className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-black/25 px-3.5 text-base text-white outline-none placeholder:text-white/30 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/10"
            />
          </label>
          {state.error ? (
            <p role="alert" className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2.5 text-sm text-rose-100">
              {state.error}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={pending} className="min-h-11 rounded-xl border border-white/15 px-4 text-sm font-semibold text-white/75">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 text-sm font-semibold text-emerald-950 disabled:opacity-50">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {pending ? "Verifying…" : "Verify identity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PromotionForm({ promotionId }: { promotionId?: string }) {
  const submitRef = useRef<HTMLButtonElement>(null);
  const [state, action, pending] = useActionState(promotionAction, {});
  const [code, setCode] = useState("");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [generating, startCodeGeneration] = useTransition();

  useEffect(() => {
    if (state.error === "STEP_UP_REQUIRED" || state.error === "MFA_REQUIRED") {
      setStepUpOpen(true);
    }
  }, [state.error]);

  useEffect(() => {
    if (state.generatedCode) setCode(state.generatedCode);
  }, [state.generatedCode]);

  const generateCode = () => {
    setGenerationError(null);
    startCodeGeneration(async () => {
      const result = await generatePromotionCodeAction();
      if (result.generatedCode) {
        setCode(result.generatedCode);
        return;
      }
      setGenerationError(result.error || "Could not generate a unique code. Please try again.");
    });
  };

  const authRequired = state.error === "STEP_UP_REQUIRED" || state.error === "MFA_REQUIRED";

  return (
    <>
      <form action={action} className="space-y-3">
        <input type="hidden" name="intent" value={promotionId ? "stop" : "create"} />
        {promotionId ? (
          <input type="hidden" name="promotionId" value={promotionId} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Promotion Name / Reason
              <input className={input} name="name" required minLength={5} maxLength={150} placeholder="e.g. Early Partner Chemist" />
            </label>
            <div className="text-sm font-medium">
              <label htmlFor="promotion-code">Promo Code / Coupon</label>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                <input
                  id="promotion-code"
                  className={`${input} mt-0 min-w-0 flex-1 uppercase font-mono tracking-wider`}
                  name="code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="Auto-generated when created"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={pending || generating}
                />
                <button
                  type="button"
                  onClick={generateCode}
                  disabled={pending || generating}
                  className="btn-ghost min-h-12 shrink-0 justify-center gap-2 px-4 sm:w-auto"
                >
                  <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} aria-hidden />
                  <span>{generating ? "Generating…" : code ? "New Code" : "Generate Code"}</span>
                </button>
              </div>
              <p className="mt-1.5 text-xs font-normal text-[var(--muted)]">
                A generated value is only a preview until the promotion is created. If left blank, Afyvia generates and saves a unique code automatically.
              </p>
              {generationError ? (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                  {generationError}
                </p>
              ) : null}
            </div>
            <label className="text-sm font-medium">
              Redemption Capacity
              <input className={input} name="capacity" type="number" min={1} max={100000} defaultValue={50} required />
            </label>
            <label className="text-sm font-medium">
              Waive Scope
              <select className={input} name="scope">
                <option value="both">Both (Verification KES 100 + Monthly Service)</option>
                <option value="verification">Verification fee only (KES 100)</option>
                <option value="recurring">Monthly service only (KES 500/mo)</option>
              </select>
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Free Service Months
              <input className={input} name="months" type="number" min={1} max={120} defaultValue={3} required />
            </label>
            <label className="text-sm font-medium">
              Verification Subsidy (KES 0–100)
              <input className={input} name="verificationAmount" type="number" min={0} max={100} defaultValue={100} required />
            </label>
            <label className="text-sm font-medium">
              Monthly Subsidy (KES 0–500)
              <input className={input} name="monthlyAmount" type="number" min={0} max={500} defaultValue={500} required />
            </label>
          </div>
        )}
        <button ref={submitRef} className="btn-primary min-h-11" disabled={pending || generating}>
          {pending
            ? "Saving…"
            : promotionId
              ? "Stop new allocations"
              : "Create Promotion & Activate Code"}
        </button>

        {authRequired ? (
          <p role="status" className="text-sm text-amber-800 dark:text-amber-200">
            Fresh identity verification is required. Complete the secure prompt and this action will retry automatically.
          </p>
        ) : (
          <p
            role={state.error ? "alert" : "status"}
            className={state.error ? "text-sm text-rose-700 dark:text-rose-300" : "text-sm text-emerald-700 dark:text-emerald-300"}
          >
            {state.error || state.success}
          </p>
        )}
      </form>

      {stepUpOpen ? (
        <PromotionStepUpDialog
          onClose={() => setStepUpOpen(false)}
          onVerified={() => {
            setStepUpOpen(false);
            window.setTimeout(() => submitRef.current?.click(), 0);
          }}
        />
      ) : null}
    </>
  );
}

export function WaiverDecisionForm({ requestId }: { requestId: string }) {
  const approveRef = useRef<HTMLButtonElement>(null);
  const rejectRef = useRef<HTMLButtonElement>(null);
  const lastIntent = useRef<"approve" | "reject">("approve");
  const [state, action, pending] = useActionState(waiverDecisionAction, {});
  const [dismissedAuthError, setDismissedAuthError] = useState<string | null>(null);
  const authRequired = state.error === "STEP_UP_REQUIRED" || state.error === "MFA_REQUIRED";
  const stepUpOpen = authRequired && dismissedAuthError !== state.error;

  return (
    <>
      <form action={action} className="mt-3 grid gap-2 sm:grid-cols-4">
        <input type="hidden" name="requestId" value={requestId} />
        <label className="text-xs font-medium">Verification (KES)<input className={input} name="verificationAmount" type="number" min={0} max={100} defaultValue={100} required /></label>
        <label className="text-xs font-medium">Monthly (KES)<input className={input} name="monthlyAmount" type="number" min={0} max={500} defaultValue={500} required /></label>
        <label className="text-xs font-medium">Months<input className={input} name="months" type="number" min={1} max={120} defaultValue={1} required /></label>
        <label className="text-xs font-medium sm:col-span-4">Decision note<input className={input} name="decisionNote" maxLength={500} placeholder="Optional note shown to the pharmacy" /></label>
        <div className="flex flex-wrap gap-2 sm:col-span-4">
          <button ref={approveRef} onClick={() => { lastIntent.current = "approve"; }} className="btn-primary min-h-10" name="intent" value="approve" disabled={pending}>{pending ? "Saving…" : "Approve & apply"}</button>
          <button ref={rejectRef} onClick={() => { lastIntent.current = "reject"; }} className="btn-ghost min-h-10" name="intent" value="reject" disabled={pending}>Decline</button>
        </div>
        {!authRequired ? <p role={state.error ? "alert" : "status"} className={`text-xs sm:col-span-4 ${state.error ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>{state.error || state.success}</p> : null}
      </form>
      {stepUpOpen ? (
        <PromotionStepUpDialog
          onClose={() => setDismissedAuthError(state.error ?? null)}
          onVerified={() => {
            setDismissedAuthError(state.error ?? null);
            window.setTimeout(() => (lastIntent.current === "reject" ? rejectRef : approveRef).current?.click(), 0);
          }}
        />
      ) : null}
    </>
  );
}

export function CancelServiceForm({ pharmacyId }: { pharmacyId: string }) {
  const [state, action, pending] = useActionState(pharmacyBillingAction, {});
  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="pharmacyId" value={pharmacyId} />
      <input type="hidden" name="intent" value="cancel" />
      <button className="btn-ghost min-h-11" disabled={pending}>
        {pending ? "Stopping auto-renewal…" : "Cancel auto-renewal"}
      </button>
      <p
        role={state.error ? "alert" : "status"}
        className={state.error ? "text-sm text-rose-700 dark:text-rose-300" : "text-sm text-emerald-700 dark:text-emerald-300"}
      >
        {state.error || state.success}
      </p>
    </form>
  );
}

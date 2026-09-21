"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Tag,
  X,
} from "lucide-react";
import {
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
  pharmacyId, grant, verificationPaid = false, subscriptionActive = false, paymentAvailable = true,
}: {
  pharmacyId: string;
  grant?: { verification: boolean; verificationDiscountKes?: number | { toString(): string }; recurringMonths: number; recurringDiscountKes?: number | { toString(): string } } | null;
  verificationPaid?: boolean;
  subscriptionActive?: boolean;
  defaultPhone?: string | null;
  paymentAvailable?: boolean;
}) {
  const [state, action, pending] = useActionState(pharmacyBillingAction, {});
  const router = useRouter();
  useEffect(() => {
    if (state.checkoutUrl) window.location.href = state.checkoutUrl;
    if (state.settled) router.refresh();
  }, [state.checkoutUrl, state.settled, router]);
  const discount = verificationPaid
    ? Number(grant?.recurringDiscountKes ?? 0) || (grant?.recurringMonths ? 500 : 0)
    : Number(grant?.verificationDiscountKes ?? 0) || (grant?.verification ? 100 : 0);
  const amount = Math.max(0, (verificationPaid ? 500 : 100) - discount);
  return <section className="space-y-4 rounded-2xl border border-[var(--line-2)] p-5">
    <h3 className="font-semibold">{verificationPaid ? "Free plan included · Premium is optional" : "One-time verification fee"}</h3>
    <p className="text-sm">Launch with 5 public medicine listings and 2 active services, reservations, bookings and your own M-Pesa connection. No monthly fee is required.</p>
    {verificationPaid && <p className="text-sm">Premium costs KES 500/month and unlocks more listings, AI-assisted imports, advanced analytics and POS synchronization.</p>}
    {subscriptionActive ? <p role="status">Premium is active.</p> : <form action={action}>
      <input type="hidden" name="pharmacyId" value={pharmacyId} />
      <input type="hidden" name="intent" value={verificationPaid ? "activate" : "verification_checkout"} />
      <button type="submit" disabled={pending || (!paymentAvailable && amount > 0)} className="btn-primary">
        {pending ? "Preparing checkout…" : verificationPaid ? `Upgrade to Premium · KES ${amount}/month` : `Pay verification · KES ${amount}`}
      </button>
      {!paymentAvailable && amount > 0 && <p role="status" className="mt-2 text-sm">Online checkout is temporarily unavailable. Please try again later.</p>}
    </form>}
    {state.error && <p role="alert" className="text-sm text-rose-700">{state.error}</p>}
    {state.success && <p role="status" className="text-sm">{state.success}</p>}
  </section>;
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
  const [stepUpOpen, setStepUpOpen] = useState(false);

  useEffect(() => {
    if (state.error === "STEP_UP_REQUIRED" || state.error === "MFA_REQUIRED") {
      setStepUpOpen(true);
    }
  }, [state.error]);

  const authRequired = state.error === "STEP_UP_REQUIRED" || state.error === "MFA_REQUIRED";

  return (
    <>
      <form action={action} className="space-y-3">
        <input type="hidden" name="intent" value={promotionId ? "stop" : "create"} />
        {promotionId ? (
          <input type="hidden" name="promotionId" value={promotionId} />
        ) : (
          <>
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3">
              <div className="flex items-start gap-2">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Code is generated and activated atomically</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    When you create the promotion, Afyvia generates a unique AFY-XXXX-XXXX code and saves it to the database in the same transaction. No preview or unsaved voucher can be issued.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Promotion Name / Reason
                <input className={input} name="name" required minLength={5} maxLength={150} placeholder="e.g. Early Partner Chemist" />
              </label>
              <label className="text-sm font-medium">
                Custom Voucher Code (Optional)
                <input className={input} name="code" placeholder="e.g. WELCOME2026 (Leave blank to auto-generate)" />
              </label>
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
              <label className="text-sm font-medium">
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
          </>
        )}

        <button ref={submitRef} className="btn-primary min-h-11" disabled={pending}>
          {pending
            ? "Saving…"
            : promotionId
              ? "Stop new allocations"
              : "Create Promotion & Generate Active Code"}
        </button>

        {!promotionId && state.generatedCode && !state.error ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3" role="status">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-200">Active voucher code</p>
            <p className="mt-1 font-mono text-lg font-bold tracking-wider text-[var(--foreground)]">{state.generatedCode}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">This code is saved and can be redeemed immediately during pharmacy onboarding.</p>
          </div>
        ) : null}

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
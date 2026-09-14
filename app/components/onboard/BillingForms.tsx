"use client";

import { useActionState, useEffect } from "react";
import { CreditCard, RefreshCw, ShieldCheck, Settings2 } from "lucide-react";
import { pharmacyBillingAction, promotionAction } from "@/app/actions/pharmacy-billing";

const input =
  "mt-1 min-h-12 w-full rounded-xl border border-[var(--line-2)] bg-[var(--card-elev)] px-3.5 text-base text-[var(--foreground)] sm:text-sm";

function RedirectOnSuccess({ redirectUrl }: { redirectUrl?: string }) {
  useEffect(() => {
    if (redirectUrl) window.location.assign(redirectUrl);
  }, [redirectUrl]);
  return null;
}

export function PharmacyPaymentForm({
  pharmacyId,
  invoiceId,
  invoiceNumber,
  checkoutAvailable = false,
}: {
  pharmacyId: string;
  invoiceId?: string;
  invoiceNumber?: string;
  checkoutAvailable?: boolean;
}) {
  const [state, action, pending] = useActionState(pharmacyBillingAction, {});

  if (!invoiceId) {
    return (
      <form action={action} className="space-y-3" aria-busy={pending}>
        <RedirectOnSuccess redirectUrl={state.redirectUrl} />
        <input type="hidden" name="pharmacyId" value={pharmacyId} />
        <input type="hidden" name="intent" value="activate" />
        <button disabled={pending} className="btn-primary min-h-11 w-full justify-center" type="submit">
          <CreditCard className="h-4 w-4" aria-hidden />
          {pending ? "Preparing Paystack…" : "Set up monthly card billing"}
        </button>
        <p className="text-xs leading-5 text-[var(--muted)]">
          Paystack handles the card authorization and recurring KES 500 monthly charge. Aether never stores the full card number or CVV.
        </p>
        <p role={state.error ? "alert" : "status"} className="text-sm text-[var(--muted)]">
          {state.error || state.success}
        </p>
      </form>
    );
  }

  return (
    <form action={action} className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-4" aria-busy={pending}>
      <RedirectOnSuccess redirectUrl={state.redirectUrl} />
      <input type="hidden" name="pharmacyId" value={pharmacyId} />
      <input type="hidden" name="invoiceId" value={invoiceId} />
      {invoiceNumber ? <input type="hidden" name="invoiceNumber" value={invoiceNumber} /> : null}
      <input type="hidden" name="intent" value="checkout" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
            <CreditCard className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-semibold">Secure card payment</h3>
            <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">
              One-time platform charges open Paystack&apos;s hosted checkout.
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--line-2)] px-2 py-1 text-[10px] font-semibold text-[var(--muted)]">Paystack</span>
      </div>

      {checkoutAvailable ? (
        <button disabled={pending} className="btn-primary mt-4 min-h-11 w-full justify-center" type="submit">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          {pending ? "Opening checkout…" : "Pay securely by card"}
        </button>
      ) : (
        <p className="mt-4 rounded-xl border border-[var(--line-2)] p-3 text-xs leading-5 text-[var(--muted)]">
          Card checkout is not configured yet. Add PAYSTACK_SECRET_KEY before accepting this payment.
        </p>
      )}

      <p role={state.error ? "alert" : "status"} className="mt-2 text-sm text-[var(--muted)]">{state.error || state.success}</p>
    </form>
  );
}

export function RecurringCardSetupForm({ pharmacyId, active = false }: { pharmacyId: string; active?: boolean }) {
  const [state, action, pending] = useActionState(pharmacyBillingAction, {});
  return (
    <form action={action} className="space-y-3" aria-busy={pending}>
      <RedirectOnSuccess redirectUrl={state.redirectUrl} />
      <input type="hidden" name="pharmacyId" value={pharmacyId} />
      <input type="hidden" name="intent" value="subscription_setup" />
      <button disabled={pending || active} className="btn-ghost min-h-11 w-full justify-center" type="submit">
        <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} aria-hidden />
        {active ? "Recurring card active" : pending ? "Checking Paystack…" : "Continue card setup"}
      </button>
      <p role={state.error ? "alert" : "status"} className="text-sm text-[var(--muted)]">{state.error || state.success}</p>
    </form>
  );
}

export function ManageCardForm({ pharmacyId }: { pharmacyId: string }) {
  const [state, action, pending] = useActionState(pharmacyBillingAction, {});
  return (
    <form action={action} className="mt-3 space-y-2" aria-busy={pending}>
      <RedirectOnSuccess redirectUrl={state.redirectUrl} />
      <input type="hidden" name="pharmacyId" value={pharmacyId} />
      <input type="hidden" name="intent" value="manage_card" />
      <button className="btn-ghost min-h-11" disabled={pending} type="submit">
        <Settings2 className="h-4 w-4" aria-hidden />
        {pending ? "Opening…" : "Manage payment card"}
      </button>
      <p role={state.error ? "alert" : "status"} className="text-sm text-[var(--muted)]">{state.error || state.success}</p>
    </form>
  );
}

export function PromotionForm({ promotionId }: { promotionId?: string }) {
  const [state, action, pending] = useActionState(promotionAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="intent" value={promotionId ? "stop" : "create"} />
      {promotionId ? (
        <input type="hidden" name="promotionId" value={promotionId} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label>Promotion name / reason<input className={input} name="name" required minLength={5} maxLength={150} /></label>
          <label>Number of joining pharmacies<input className={input} name="capacity" type="number" min={1} max={100000} required /></label>
          <label>Waive<select className={input} name="scope"><option value="both">Both fees</option><option value="verification">Verification fee only</option><option value="recurring">Monthly service only</option></select></label>
          <label>Free service months<input className={input} name="months" type="number" min={1} max={120} defaultValue={1} required /></label>
        </div>
      )}
      <button className="btn-primary min-h-11" disabled={pending}>{pending ? "Saving…" : promotionId ? "Stop new allocations" : "Create capped promotion"}</button>
      <p role="status">{state.error || state.success}</p>
    </form>
  );
}

export function CancelServiceForm({ pharmacyId }: { pharmacyId: string }) {
  const [state, action, pending] = useActionState(pharmacyBillingAction, {});
  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="pharmacyId" value={pharmacyId} />
      <input type="hidden" name="intent" value="cancel" />
      <button className="btn-ghost min-h-11" disabled={pending}>{pending ? "Stopping auto-renewal…" : "Cancel auto-renewal"}</button>
      <p role="status" className="text-sm text-[var(--muted)]">{state.error || state.success}</p>
    </form>
  );
}

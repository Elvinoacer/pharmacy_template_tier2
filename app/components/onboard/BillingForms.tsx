"use client";

import { useActionState } from "react";
import { Phone, RefreshCw, ShieldCheck } from "lucide-react";
import { pharmacyBillingAction, promotionAction } from "@/app/actions/pharmacy-billing";

const input =
  "mt-1 min-h-12 w-full rounded-xl border border-[var(--line-2)] bg-[var(--card-elev)] px-3.5 text-base text-[var(--foreground)] sm:text-sm";

function MpesaPhoneField({ defaultPhone }: { defaultPhone?: string | null }) {
  return (
    <label className="block text-sm font-medium text-[var(--foreground)]">
      Safaricom M-PESA number
      <input
        className={input}
        name="mpesaPhone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="07XX XXX XXX"
        defaultValue={defaultPhone || ""}
        required
      />
      <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
        The payment or Ratiba authorization prompt is sent to this number.
      </span>
    </label>
  );
}

export function PharmacyPaymentForm({
  pharmacyId,
  invoiceId,
  invoiceNumber,
  checkoutAvailable = false,
  defaultPhone,
}: {
  pharmacyId: string;
  invoiceId?: string;
  invoiceNumber?: string;
  checkoutAvailable?: boolean;
  defaultPhone?: string | null;
}) {
  const [state, action, pending] = useActionState(pharmacyBillingAction, {});
  const activation = !invoiceId;

  return (
    <form
      action={action}
      className={activation ? "space-y-3" : "rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-4"}
      aria-busy={pending}
    >
      <input type="hidden" name="pharmacyId" value={pharmacyId} />
      {invoiceId ? <input type="hidden" name="invoiceId" value={invoiceId} /> : null}
      {invoiceNumber ? <input type="hidden" name="invoiceNumber" value={invoiceNumber} /> : null}
      <input type="hidden" name="intent" value={activation ? "activate" : "checkout"} />

      {!activation ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
              <Phone className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Pay with M-PESA</h3>
              <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">
                We send an STK Push and confirm the transaction directly with Safaricom.
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-[var(--line-2)] px-2 py-1 text-[10px] font-semibold text-[var(--muted)]">
            Daraja
          </span>
        </div>
      ) : null}

      <MpesaPhoneField defaultPhone={defaultPhone} />

      {checkoutAvailable ? (
        <button disabled={pending} className="btn-primary mt-4 min-h-11 w-full justify-center" type="submit">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          {pending ? "Sending M-PESA prompt…" : activation ? "Start service with M-PESA" : "Send M-PESA prompt"}
        </button>
      ) : (
        <p className="mt-4 rounded-xl border border-[var(--line-2)] p-3 text-xs leading-5 text-[var(--muted)]">
          M-PESA payments are temporarily unavailable because the platform Daraja connection is not configured.
        </p>
      )}

      <p role={state.error ? "alert" : "status"} className="mt-2 text-sm text-[var(--muted)]">
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
      {!active && !authorising ? <MpesaPhoneField defaultPhone={defaultPhone} /> : null}
      <button
        disabled={pending || active || authorising}
        className="btn-ghost min-h-11 w-full justify-center"
        type="submit"
      >
        <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} aria-hidden />
        {active
          ? "Automatic M-PESA active"
          : authorising
            ? "Waiting for Ratiba authorization"
            : pending
              ? "Requesting Ratiba…"
              : "Authorize automatic monthly M-PESA"}
      </button>
      {!active ? (
        <p className="text-xs leading-5 text-[var(--muted)]">
          M-PESA Ratiba creates a standing order on your phone. Future monthly fees are collected by Safaricom according to that authorization; Aether never sees your M-PESA PIN.
        </p>
      ) : null}
      <p role={state.error ? "alert" : "status"} className="text-sm text-[var(--muted)]">
        {state.error || state.success}
      </p>
    </form>
  );
}

export function RetryOverdueForm({
  pharmacyId,
  defaultPhone,
  suspended = false,
}: {
  pharmacyId: string;
  defaultPhone?: string | null;
  suspended?: boolean;
}) {
  const [state, action, pending] = useActionState(pharmacyBillingAction, {});
  return (
    <form action={action} className="mt-3 space-y-3" aria-busy={pending}>
      <input type="hidden" name="pharmacyId" value={pharmacyId} />
      <input type="hidden" name="intent" value="retry_overdue" />
      <MpesaPhoneField defaultPhone={defaultPhone} />
      <button className="btn-primary min-h-11 w-full justify-center" disabled={pending} type="submit">
        <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} aria-hidden />
        {pending ? "Sending M-PESA prompt…" : suspended ? "Pay with M-PESA & restore pharmacy" : "Pay invoice with M-PESA"}
      </button>
      <p role={state.error ? "alert" : "status"} className="text-sm text-[var(--muted)]">
        {state.error || state.success}
      </p>
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
      <button className="btn-ghost min-h-11" disabled={pending}>
        {pending ? "Stopping auto-renewal…" : "Cancel auto-renewal"}
      </button>
      <p role="status" className="text-sm text-[var(--muted)]">{state.error || state.success}</p>
    </form>
  );
}

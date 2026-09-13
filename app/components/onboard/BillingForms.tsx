"use client";

import { useActionState, useEffect } from "react";
import { CreditCard, ShieldCheck, Smartphone } from "lucide-react";
import { pharmacyBillingAction, promotionAction } from "@/app/actions/pharmacy-billing";

const input =
  "mt-1 min-h-12 w-full rounded-xl border border-[var(--line-2)] bg-[var(--card-elev)] px-3.5 text-base text-[var(--foreground)] sm:text-sm";

export function PharmacyPaymentForm({
  pharmacyId,
  invoiceId,
  stkAvailable = true,
  checkoutAvailable = false,
}: {
  pharmacyId: string;
  invoiceId?: string;
  stkAvailable?: boolean;
  checkoutAvailable?: boolean;
}) {
  const [activateState, activateAction, activating] = useActionState(pharmacyBillingAction, {});
  const [stkState, stkAction, stkPending] = useActionState(pharmacyBillingAction, {});
  const [checkoutState, checkoutAction, checkoutPending] = useActionState(pharmacyBillingAction, {});

  useEffect(() => {
    if (checkoutState.redirectUrl) window.location.assign(checkoutState.redirectUrl);
  }, [checkoutState.redirectUrl]);

  if (!invoiceId) {
    return (
      <form action={activateAction} className="space-y-3" aria-busy={activating}>
        <input type="hidden" name="pharmacyId" value={pharmacyId} />
        <input type="hidden" name="intent" value="activate" />
        <button disabled={activating} className="btn-primary min-h-11" type="submit">
          {activating ? "Preparing…" : "Start monthly service"}
        </button>
        <p role={activateState.error ? "alert" : "status"} className="text-sm text-[var(--muted)]">
          {activateState.error || activateState.success}
        </p>
      </form>
    );
  }

  return (
    <div className="grid gap-3">
      <form
        action={stkAction}
        className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-4"
        aria-busy={stkPending}
      >
        <input type="hidden" name="pharmacyId" value={pharmacyId} />
        <input type="hidden" name="invoiceId" value={invoiceId} />
        <input type="hidden" name="intent" value="pay" />
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
              <Smartphone className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-semibold">M-Pesa prompt</h3>
              <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">
                Sent directly through Safaricom Daraja. IntaSend is never used for STK Push.
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-[var(--line-2)] px-2 py-1 text-[10px] font-semibold text-[var(--muted)]">
            Daraja
          </span>
        </div>

        {stkAvailable ? (
          <>
            <label className="mt-4 block text-sm font-medium">
              M-Pesa number
              <input
                className={input}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0712 345 678"
                required
              />
            </label>
            <button disabled={stkPending} className="btn-primary mt-3 min-h-11 w-full justify-center" type="submit">
              {stkPending ? "Sending prompt…" : "Send M-Pesa prompt"}
            </button>
            <p className="mt-2 text-xs text-[var(--muted)]">Approve the prompt on your phone with your M-Pesa PIN.</p>
          </>
        ) : (
          <p className="mt-4 rounded-xl border border-[var(--line-2)] p-3 text-xs leading-5 text-[var(--muted)]">
            Direct M-Pesa prompt is temporarily unavailable because live platform Daraja credentials are not ready.
          </p>
        )}

        <p role={stkState.error ? "alert" : "status"} className="mt-2 text-sm text-[var(--muted)]">
          {stkState.error || stkState.success}
        </p>
      </form>

      {checkoutAvailable ? (
        <form
          action={checkoutAction}
          className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-4"
          aria-busy={checkoutPending}
        >
          <input type="hidden" name="pharmacyId" value={pharmacyId} />
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <input type="hidden" name="intent" value="checkout" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
                <CreditCard className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <h3 className="text-sm font-semibold">Secure card checkout</h3>
                <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">
                  Opens IntaSend&apos;s hosted checkout. This route is card-only so all M-Pesa STK prompts remain on Daraja.
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-[var(--line-2)] px-2 py-1 text-[10px] font-semibold text-[var(--muted)]">
              IntaSend
            </span>
          </div>
          <button disabled={checkoutPending} className="btn-ghost mt-4 min-h-11 w-full justify-center" type="submit">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {checkoutPending ? "Opening checkout…" : "Pay by secure checkout"}
          </button>
          <p role={checkoutState.error ? "alert" : "status"} className="mt-2 text-sm text-[var(--muted)]">
            {checkoutState.error || checkoutState.success}
          </p>
        </form>
      ) : null}

      {!stkAvailable && !checkoutAvailable ? (
        <p className="rounded-xl border border-[var(--line-2)] p-3 text-sm text-[var(--muted)]">
          No live payment rail is configured for platform billing yet. Your invoice remains safe and unpaid until a verified payment succeeds.
        </p>
      ) : null}
    </div>
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
          <label>
            Promotion name / reason
            <input className={input} name="name" required minLength={5} maxLength={150} />
          </label>
          <label>
            Number of joining pharmacies
            <input className={input} name="capacity" type="number" min={1} max={100000} required />
          </label>
          <label>
            Waive
            <select className={input} name="scope">
              <option value="both">Both fees</option>
              <option value="verification">Verification fee only</option>
              <option value="recurring">Monthly service only</option>
            </select>
          </label>
          <label>
            Free service months
            <input className={input} name="months" type="number" min={1} max={120} defaultValue={1} required />
          </label>
        </div>
      )}
      <button className="btn-primary min-h-11" disabled={pending}>
        {pending ? "Saving…" : promotionId ? "Stop new allocations" : "Create capped promotion"}
      </button>
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
        {pending ? "Saving…" : "Cancel at period end"}
      </button>
      <p role="status" className="text-sm text-[var(--muted)]">
        {state.error || state.success}
      </p>
    </form>
  );
}

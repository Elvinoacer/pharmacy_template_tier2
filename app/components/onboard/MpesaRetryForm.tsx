"use client";

import { useActionState } from "react";
import { RotateCcw } from "lucide-react";
import { pharmacyBillingAction } from "@/app/actions/pharmacy-billing";

const input =
  "mt-1 min-h-11 w-full rounded-xl border border-[var(--line-2)] bg-[var(--card-elev)] px-3.5 text-base text-[var(--foreground)] sm:text-sm";

export default function MpesaRetryForm({
  pharmacyId,
  invoiceId,
  invoiceNumber,
  phone,
}: {
  pharmacyId: string;
  invoiceId: string;
  invoiceNumber: string;
  phone?: string | null;
}) {
  const [state, action, pending] = useActionState(pharmacyBillingAction, {});

  return (
    <form
      action={action}
      className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-4"
      aria-busy={pending}
    >
      <input type="hidden" name="pharmacyId" value={pharmacyId} />
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <input type="hidden" name="invoiceNumber" value={invoiceNumber} />
      <input type="hidden" name="intent" value="pay" />

      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
          <RotateCcw className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">Try M-Pesa again</h3>
          <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">
            No page refresh needed. We verify the previous Daraja request before sending another prompt, so you cannot accidentally duplicate an active payment.
          </p>
        </div>
      </div>

      <label className="mt-3 block text-sm font-medium">
        M-Pesa number
        <input
          className={input}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={phone || ""}
          placeholder="0712 345 678"
          required
        />
      </label>

      <button
        disabled={pending}
        className="btn-primary mt-3 min-h-11 w-full justify-center"
        type="submit"
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
        {pending ? "Checking previous request…" : "Send another M-Pesa prompt"}
      </button>

      <p role={state.error ? "alert" : "status"} className="mt-2 text-sm text-[var(--muted)]">
        {state.error || state.success}
      </p>
    </form>
  );
}

"use client";

import { useActionState, useEffect } from "react";
import { adminRefundOrderAction, adminConfirmManualRefundAction } from "@/app/actions/admin";
import type { ActionState } from "@/app/actions/admin";
import { toast } from "@/app/components/Toaster";

type PaymentOption = {
  id: string;
  amount: number;
  provider: string;
  status: string;
  providerRef: string | null;
  createdAt: Date;
};

export function RefundOrderForm({
  orderId,
  payments,
}: {
  orderId: string;
  payments: PaymentOption[];
}) {
  const completed = payments.filter((p) => p.status === "completed");

  const [state, formAction, pending] = useActionState(
    adminRefundOrderAction,
    {} as ActionState,
  );

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  if (completed.length === 0) {
    return (
      <p className="text-xs admin-muted">
        No completed payments to refund. Use Cancel + auto-refund for unpaid orders.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="space-y-1">
        <label className="text-xs font-medium admin-muted">Payment</label>
        <select
          name="paymentId"
          required
          className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-input-bg,white)] px-3 py-2 text-sm admin-text"
        >
          {completed.map((p) => (
            <option key={p.id} value={p.id}>
              {p.provider.toUpperCase()} · KES {Number(p.amount).toFixed(0)}
              {p.providerRef ? ` · ${p.providerRef}` : ""} ·{" "}
              {new Date(p.createdAt).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium admin-muted">Amount (KES)</label>
          <input
            name="amount"
            type="number"
            min="1"
            step="1"
            required
            placeholder="0"
            className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-input-bg,white)] px-3 py-2 text-sm admin-text"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium admin-muted">Refund method</label>
          <select
            name="provider"
            defaultValue="cash"
            className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-input-bg,white)] px-3 py-2 text-sm admin-text"
          >
            <option value="cash">Cash (drawer)</option>
            <option value="daraja">M-Pesa reversal (pending provider confirmation)</option>
            <option value="card">Card refund request (manual confirmation)</option>
            <option value="other">Other refund request (manual confirmation)</option>
          </select>
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm admin-text">
        <input type="checkbox" name="cashReturned" className="mt-1" />
        I handed cash to the customer. Required only when choosing Cash; other refund methods remain pending until confirmed.
      </label>

      <div className="space-y-1">
        <label className="text-xs font-medium admin-muted">Reason</label>
        <input
          name="reason"
          type="text"
          placeholder="Customer return / wrong item / overcharge / etc."
          className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-input-bg,white)] px-3 py-2 text-sm admin-text"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-rose-600 disabled:opacity-50"
      >
        {pending ? "Processing…" : "Record refund request"}
      </button>
    </form>
  );
}

export function ManualRefundList({ orderId, refunds }: {
  orderId: string;
  refunds: { id: string; amount: number; provider: string; status: string; providerRef: string | null }[];
}) {
  const pending = refunds.filter((refund) => refund.status === "pending" || refund.status === "approved");
  if (!pending.length) return null;
  return <div className="space-y-3">
    <p className="text-sm font-semibold admin-text">Refunds awaiting actual payout</p>
    {pending.map((refund) => <ManualRefundRow key={refund.id} orderId={orderId} refund={refund} />)}
  </div>;
}

function ManualRefundRow({ orderId, refund }: {
  orderId: string;
  refund: { id: string; amount: number; provider: string; status: string; providerRef: string | null };
}) {
  const [state, action, pending] = useActionState(adminConfirmManualRefundAction, {} as ActionState);
  return <form action={action} className="space-y-2 rounded-xl border border-[var(--admin-border)] p-3">
    <input type="hidden" name="orderId" value={orderId} />
    <input type="hidden" name="refundId" value={refund.id} />
    <p className="text-sm admin-text">{refund.provider.toUpperCase()} · KES {refund.amount.toFixed(2)} · {refund.providerRef === "manual_reversal_required" ? "Merchant reversal required" : "Pending confirmation"}</p>
    <label className="block text-sm admin-text">Actual payout receipt or reference
      <input name="evidenceRef" required minLength={5} maxLength={100} className="mt-1 w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-input-bg,white)] p-2 text-sm admin-text" />
    </label>
    <label className="flex items-start gap-2 text-sm admin-text"><input name="payoutConfirmed" type="checkbox" required className="mt-1" />I verified that the customer actually received this refund.</label>
    <button type="submit" disabled={pending} className="min-h-11 rounded-xl border border-[var(--admin-border)] px-3 py-2 text-sm font-semibold admin-text disabled:opacity-60">{pending ? "Recording…" : "Confirm actual payout"}</button>
    {state.error ? <p role="alert" className="text-sm text-rose-700">{state.error}</p> : null}
    {state.success ? <p role="status" className="text-sm text-emerald-700">{state.success}</p> : null}
  </form>;
}

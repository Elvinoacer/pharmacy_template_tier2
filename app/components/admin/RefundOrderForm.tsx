"use client";

import { useActionState, useEffect } from "react";
import { adminRefundOrderAction } from "@/app/actions/admin";
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
            <option value="daraja">M-Pesa (B2C)</option>
            <option value="card">Card reversal</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

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
        {pending ? "Processing…" : "Record refund"}
      </button>
    </form>
  );
}

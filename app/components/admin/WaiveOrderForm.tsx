"use client";

import { useState } from "react";
import {
  adminWaiveOrderAction,
  adminMarkOrderPaidAction,
  adminDispatchOrderAction,
  adminUndispatchOrderAction,
} from "@/app/actions/admin";
import ConfirmSubmitButton from "@/app/components/admin/ConfirmSubmitButton";
import { toast } from "@/app/components/Toaster";
import { MpesaStkPanel } from "@/app/components/payments/MpesaStkPanel";

export function OrderSettleActions({
  orderId,
  status,
  guestPhone,
  dispatched,
  defaultPhone,
}: {
  orderId: string;
  status: string;
  guestPhone?: string | null;
  dispatched?: boolean;
  defaultPhone?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [stkOpen, setStkOpen] = useState(false);
  const [scope, setScope] = useState<"one_time" | "recurring_until" | "recurring_permanent">(
    "one_time",
  );
  const [reason, setReason] = useState("");
  const [until, setUntil] = useState("");

  async function markPaid(autoDispatch: boolean) {
    const fd = new FormData();
    fd.set("id", orderId);
    fd.set("provider", "cash");
    fd.set("autoDispatch", autoDispatch ? "on" : "off");
    const result = await adminMarkOrderPaidAction(fd);
    if (result?.error) toast.error(result.error);
    else {
      toast.success(result?.success || "Marked paid.");
      window.location.reload();
    }
  }

  async function dispatch() {
    const fd = new FormData();
    fd.set("id", orderId);
    const result = await adminDispatchOrderAction(fd);
    if (result?.error) toast.error(result.error);
    else {
      toast.success(result?.success || "Dispatched.");
      window.location.reload();
    }
  }

  async function undispatch() {
    const fd = new FormData();
    fd.set("id", orderId);
    const result = await adminUndispatchOrderAction(fd);
    if (result?.error) toast.error(result.error);
    else {
      toast.success(result?.success || "Dispatch cleared.");
      window.location.reload();
    }
  }

  const pending = status === "pending";
  const paidHeld = (status === "paid" || status === "fulfilled") && !dispatched;
  const isDispatched = Boolean(dispatched) || status === "fulfilled";

  return (
    <div className="mt-1 space-y-1 text-right">
      {pending && (
        <>
          <button
            type="button"
            onClick={() => setStkOpen((v) => !v)}
            className="block w-full text-[10px] font-semibold text-teal-700 hover:underline"
          >
            {stkOpen ? "Hide M-Pesa" : "M-Pesa STK…"}
          </button>
          {stkOpen && (
            <div className="mt-1 text-left">
              <MpesaStkPanel
                orderId={orderId}
                defaultPhone={defaultPhone || guestPhone || ""}
                staffMode
                compact
                onSuccess={() => setTimeout(() => window.location.reload(), 600)}
                onClose={() => setStkOpen(false)}
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => markPaid(true)}
            className="block w-full text-[10px] font-semibold text-emerald-700 hover:underline"
          >
            Mark paid + dispatch
          </button>
          <button
            type="button"
            onClick={() => markPaid(false)}
            className="block w-full text-[10px] font-semibold text-emerald-700/80 hover:underline"
          >
            Mark paid (hold)
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="block w-full text-[10px] font-semibold text-amber-700 hover:underline"
          >
            {open ? "Cancel waive" : "Waive…"}
          </button>
        </>
      )}

      {paidHeld && (
        <button
          type="button"
          onClick={dispatch}
          className="block w-full text-[10px] font-semibold text-blue-700 hover:underline"
        >
          Mark dispatched
        </button>
      )}

      {isDispatched && status !== "waived" && status !== "cancelled" && (
        <button
          type="button"
          onClick={undispatch}
          className="block w-full text-[10px] font-semibold text-slate-600 hover:underline"
        >
          Undo dispatch
        </button>
      )}

      {open && pending && (
        <form
          action={adminWaiveOrderAction}
          className="mt-2 space-y-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-inset)] p-2 text-left"
        >
          <input type="hidden" name="id" value={orderId} />
          <label className="block text-[10px] admin-soft">Scope</label>
          <select
            name="scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as typeof scope)}
            className="w-full rounded border border-[var(--admin-border)] bg-[var(--admin-bg)] px-1.5 py-1 text-[10px] admin-text"
          >
            <option value="one_time">One-time</option>
            <option value="recurring_until">Recurring until date</option>
            <option value="recurring_permanent">Recurring permanent</option>
          </select>
          {scope === "recurring_until" && (
            <input
              type="date"
              name="until"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              className="w-full rounded border border-[var(--admin-border)] bg-[var(--admin-bg)] px-1.5 py-1 text-[10px] admin-text"
            />
          )}
          <input
            name="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="w-full rounded border border-[var(--admin-border)] bg-[var(--admin-bg)] px-1.5 py-1 text-[10px] admin-text"
          />
          <ConfirmSubmitButton
            message="Waive this payment?"
            className="w-full rounded bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-700"
          >
            Confirm waive
          </ConfirmSubmitButton>
        </form>
      )}
    </div>
  );
}

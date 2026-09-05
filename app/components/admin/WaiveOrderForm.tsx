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
import { ReceiptModal } from "@/app/components/admin/ReceiptModal";
import { Printer } from "lucide-react";

export function OrderSettleActions({
  orderId,
  status,
  guestPhone,
  dispatched,
  defaultPhone,
  hasRxItem = false,
  existingDispenserNote = null,
  customerReason = null,
}: {
  orderId: string;
  status: string;
  guestPhone?: string | null;
  dispatched?: boolean;
  defaultPhone?: string | null;
  /** True when any line item is Rx-required — forces dispenser note before dispatch. */
  hasRxItem?: boolean;
  existingDispenserNote?: string | null;
  customerReason?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [stkOpen, setStkOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [scope, setScope] = useState<"one_time" | "recurring_until" | "recurring_permanent">(
    "one_time",
  );
  const [reason, setReason] = useState("");
  const [until, setUntil] = useState("");
  const [dispenserNote, setDispenserNote] = useState(existingDispenserNote || "");
  const [busy, setBusy] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  async function markPaid(autoDispatch: boolean) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("id", orderId);
      fd.set("provider", "cash");
      fd.set("autoDispatch", autoDispatch ? "on" : "off");
      // If auto-dispatching an Rx order, require a note here too.
      if (autoDispatch && hasRxItem) {
        if (!dispenserNote.trim() && !existingDispenserNote) {
          toast.error("Add a dispenser note before paid+dispatch on Rx items.");
          setDispatchOpen(true);
          return;
        }
        if (dispenserNote.trim()) fd.set("dispenserNote", dispenserNote.trim());
      }
      const result = await adminMarkOrderPaidAction(fd);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(result?.success || "Marked paid.");
        window.location.reload();
      }
    } finally {
      setBusy(false);
    }
  }

  async function dispatch() {
    if (hasRxItem && !dispenserNote.trim() && !existingDispenserNote) {
      toast.error("Dispenser note required for Rx medication before dispatch.");
      setDispatchOpen(true);
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("id", orderId);
      if (dispenserNote.trim()) fd.set("dispenserNote", dispenserNote.trim());
      const result = await adminDispatchOrderAction(fd);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(result?.success || "Dispatched.");
        window.location.reload();
      }
    } finally {
      setBusy(false);
    }
  }

  async function undispatch() {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("id", orderId);
      const result = await adminUndispatchOrderAction(fd);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(result?.success || "Dispatch cleared.");
        window.location.reload();
      }
    } finally {
      setBusy(false);
    }
  }

  const pending = status === "pending";
  const paidHeld = (status === "paid" || status === "fulfilled") && !dispatched;
  const isDispatched = Boolean(dispatched) || status === "fulfilled";
  const needsNote = hasRxItem && !existingDispenserNote;

  return (
    <div className="mt-1 space-y-1 text-right">
      {customerReason && (
        <p className="text-left text-xs admin-soft">
          <span className="font-semibold admin-muted">Reason:</span> {customerReason}
        </p>
      )}
      {existingDispenserNote && (
        <p className="text-left text-xs text-emerald-700/90">
          <span className="font-semibold">Dispenser note:</span> {existingDispenserNote}
        </p>
      )}

      {pending && (
        <>
          <button
            type="button"
            onClick={() => setStkOpen((v) => !v)}
            className="block w-full text-xs font-semibold text-teal-700 hover:underline"
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
            disabled={busy}
            onClick={() => {
              if (hasRxItem && needsNote) {
                setDispatchOpen(true);
                toast.info("Add dispenser note, then confirm paid + dispatch.");
                return;
              }
              void markPaid(true);
            }}
            className="block w-full text-xs font-semibold text-emerald-700 hover:underline disabled:opacity-50"
          >
            Mark paid + dispatch
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => markPaid(false)}
            className="block w-full text-xs font-semibold text-emerald-700/80 hover:underline disabled:opacity-50"
          >
            Mark paid (hold)
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="block w-full text-xs font-semibold text-amber-700 hover:underline"
          >
            {open ? "Cancel waive" : "Waive…"}
          </button>
        </>
      )}

      {paidHeld && (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (needsNote || hasRxItem) {
                setDispatchOpen((v) => !v);
                return;
              }
              void dispatch();
            }}
            className="block w-full text-xs font-semibold text-blue-700 hover:underline disabled:opacity-50"
          >
            {dispatchOpen ? "Hide dispatch form" : "Mark dispatched"}
          </button>
        </>
      )}

      {/* Dispenser note capture — shown when Rx gate needs it, or staff opens dispatch form. */}
      {(dispatchOpen || (paidHeld && hasRxItem)) && !isDispatched && (
        <div className="mt-1 space-y-1 rounded-lg border border-blue-500/30 bg-blue-500/5 p-2 text-left">
          <label className="block text-xs font-semibold text-blue-800">
            Dispenser note{hasRxItem ? " *" : ""}
          </label>
          <textarea
            value={dispenserNote}
            onChange={(e) => setDispenserNote(e.target.value)}
            rows={2}
            placeholder="Condition observed, counselling, validity…"
            className="w-full rounded border border-[var(--admin-border)] bg-[var(--admin-bg)] px-1.5 py-1 text-xs admin-text"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (pending) void markPaid(true);
              else void dispatch();
            }}
            className="w-full rounded bg-blue-600/15 px-2 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-600/25 disabled:opacity-50"
          >
            {pending ? "Confirm paid + dispatch" : "Confirm dispatch"}
          </button>
        </div>
      )}

      {isDispatched && status !== "waived" && status !== "cancelled" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => undispatch()}
          className="block w-full text-xs font-semibold text-slate-600 hover:underline disabled:opacity-50"
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
          <label className="block text-xs admin-soft">Scope</label>
          <select
            name="scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as typeof scope)}
            className="w-full rounded border border-[var(--admin-border)] bg-[var(--admin-bg)] px-1.5 py-1 text-xs admin-text"
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
              className="w-full rounded border border-[var(--admin-border)] bg-[var(--admin-bg)] px-1.5 py-1 text-xs admin-text"
            />
          )}
          <input
            name="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Waive reason (optional)"
            className="w-full rounded border border-[var(--admin-border)] bg-[var(--admin-bg)] px-1.5 py-1 text-xs admin-text"
          />
          <ConfirmSubmitButton
            message="Waive this payment?"
            className="w-full rounded bg-amber-500/15 px-2 py-1 text-xs font-semibold text-amber-700"
          >
            Confirm waive
          </ConfirmSubmitButton>
        </form>
      )}

      {/* Official Receipt & Dispensing Slip Modal */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setReceiptOpen(true)}
          className="inline-flex items-center gap-1 rounded bg-[var(--admin-accent-soft)] px-2 py-0.5 text-xs font-bold admin-accent-text hover:brightness-110"
        >
          <Printer className="h-2.5 w-2.5" />
          <span>Receipt</span>
        </button>
      </div>

      <ReceiptModal
        orderId={orderId}
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
      />
    </div>
  );
}

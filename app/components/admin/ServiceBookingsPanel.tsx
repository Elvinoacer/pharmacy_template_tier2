"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import {
  recordBookingPaymentAction,
  updateBookingStatusAction,
  type BookingAdminState,
} from "@/app/actions/admin-services";
import { toast } from "@/app/components/Toaster";
import { formatDateTime } from "@/app/lib/time";
import {
  Banknote,
  Check,
  Loader2,
  Phone,
  Calendar,
  XCircle,
} from "lucide-react";

export type BookingRow = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  notes: string | null;
  preferredDate: string | null;
  preferredTime: string | null;
  status: string;
  paymentStatus: string;
  amount: number | null;
  orderId: string | null;
  paidVia: string | null;
  paymentRef: string | null;
  staffNotes: string | null;
  createdAt: string;
  service: { id: string; title: string; slug: string };
};

function statusBadge(status: string) {
  const map: Record<string, string> = {
    awaiting_payment: "bg-amber-500/15 text-amber-700",
    confirmed: "bg-emerald-500/15 text-emerald-700",
    completed: "bg-sky-500/15 text-sky-700",
    cancelled: "bg-red-500/15 text-red-700",
  };
  return map[status] || "bg-[var(--admin-inset-2)] admin-muted";
}

function payBadge(ps: string) {
  const map: Record<string, string> = {
    none: "bg-[var(--admin-inset-2)] admin-muted",
    unpaid: "bg-amber-500/15 text-amber-700",
    pending: "bg-amber-500/15 text-amber-700",
    paid: "bg-emerald-500/15 text-emerald-700",
    cash: "bg-emerald-500/15 text-emerald-700",
    waived: "bg-violet-500/15 text-violet-700",
  };
  return map[ps] || "bg-[var(--admin-inset-2)] admin-muted";
}

export function ServiceBookingsPanel({
  bookings,
  statusFilter,
}: {
  bookings: BookingRow[];
  statusFilter: string;
}) {
  const [payState, payAction, payPending] = useActionState(
    recordBookingPaymentAction,
    {} as BookingAdminState,
  );
  const [stState, stAction, stPending] = useActionState(
    updateBookingStatusAction,
    {} as BookingAdminState,
  );

  useEffect(() => {
    if (payState?.success) toast.success(payState.success);
    if (payState?.error) toast.error(payState.error);
  }, [payState]);

  useEffect(() => {
    if (stState?.success) {
      toast.success(stState.success);
      // Reload to reflect new status cleanly.
      window.location.reload();
    }
    if (stState?.error) toast.error(stState.error);
  }, [stState]);

  const pending = payPending || stPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["all", "awaiting_payment", "confirmed", "completed", "cancelled"].map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/admin/services/bookings" : `/admin/services/bookings?status=${s}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === s
                ? "bg-[var(--admin-accent)] text-[var(--admin-btn-fg)]"
                : "bg-[var(--admin-inset)] admin-muted hover:bg-[var(--admin-inset-2)]"
            }`}
          >
            {s === "all" ? "All" : s.replace(/_/g, " ")}
          </Link>
        ))}
      </div>

      {bookings.length === 0 ? (
        <div className="admin-empty py-12">
          <p className="text-sm font-semibold admin-text">No bookings yet</p>
          <p className="mt-1 text-xs admin-muted">
            Public service forms will land here when customers book.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => (
            <li
              key={b.id}
              className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold admin-text">{b.fullName}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusBadge(b.status)}`}
                    >
                      {b.status.replace(/_/g, " ")}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${payBadge(b.paymentStatus)}`}
                    >
                      {b.paymentStatus}
                    </span>
                  </div>
                  <p className="mt-1 text-sm admin-muted">
                    <Link
                      href={`/services/${b.service.slug}`}
                      className="font-medium admin-accent-text hover:underline"
                    >
                      {b.service.title}
                    </Link>
                    {b.amount != null && b.amount > 0 && (
                      <span className="ml-2 font-semibold text-emerald-700">
                        KES {b.amount.toLocaleString()}
                      </span>
                    )}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs admin-soft">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {b.phone}
                    </span>
                    {b.email && <span>{b.email}</span>}
                    {(b.preferredDate || b.preferredTime) && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {[b.preferredDate, b.preferredTime].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    <span className="font-mono">
                      {b.id.slice(0, 8).toUpperCase()} ·{" "}
                      {formatDateTime(b.createdAt)}
                    </span>
                  </div>
                  {b.notes && (
                    <p className="mt-2 rounded-lg bg-[var(--admin-inset)] px-2.5 py-1.5 text-xs admin-muted">
                      {b.notes}
                    </p>
                  )}
                  {b.paidVia && (
                    <p className="mt-1 text-xs admin-soft">
                      Paid via {b.paidVia}
                      {b.paymentRef ? ` · ref ${b.paymentRef}` : ""}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 sm:items-end">
                  {/* Record payment for unpaid priced bookings */}
                  {(b.status === "awaiting_payment" || b.paymentStatus === "unpaid") &&
                    b.amount != null &&
                    b.amount > 0 && (
                      <form action={payAction} className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="bookingId" value={b.id} />
                        <div>
                          <label className="label-admin !text-xs">Record payment</label>
                          <select name="paidVia" className="input-admin !py-1.5 text-xs" defaultValue="cash">
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                            <option value="other">Other</option>
                            <option value="waive">Waive</option>
                          </select>
                        </div>
                        <div>
                          <label className="label-admin !text-xs">Ref (optional)</label>
                          <input
                            name="paymentRef"
                            placeholder="Receipt #"
                            className="input-admin !py-1.5 text-xs"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={pending}
                          className="btn-admin inline-flex items-center gap-1 !rounded-xl px-2.5 py-1.5 text-xs disabled:opacity-50"
                        >
                          {payPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Banknote className="h-3 w-3" />
                          )}
                          Confirm paid
                        </button>
                      </form>
                    )}

                  <div className="flex flex-wrap gap-1.5">
                    {b.status === "awaiting_payment" && (
                      <form action={stAction}>
                        <input type="hidden" name="bookingId" value={b.id} />
                        <input type="hidden" name="status" value="confirmed" />
                        <button
                          type="submit"
                          disabled={pending}
                          className="btn-admin-ghost inline-flex items-center gap-1 text-xs"
                          title="Confirm without payment (staff override)"
                        >
                          <Check className="h-3 w-3" /> Force confirm
                        </button>
                      </form>
                    )}
                    {b.status === "confirmed" && (
                      <form action={stAction}>
                        <input type="hidden" name="bookingId" value={b.id} />
                        <input type="hidden" name="status" value="completed" />
                        <button
                          type="submit"
                          disabled={pending}
                          className="btn-admin-ghost inline-flex items-center gap-1 text-xs"
                        >
                          <Check className="h-3 w-3" /> Complete
                        </button>
                      </form>
                    )}
                    {b.status !== "cancelled" && b.status !== "completed" && (
                      <form action={stAction}>
                        <input type="hidden" name="bookingId" value={b.id} />
                        <input type="hidden" name="status" value="cancelled" />
                        <button
                          type="submit"
                          disabled={pending}
                          className="btn-admin-ghost inline-flex items-center gap-1 text-xs !text-red-600"
                        >
                          <XCircle className="h-3 w-3" /> Cancel
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

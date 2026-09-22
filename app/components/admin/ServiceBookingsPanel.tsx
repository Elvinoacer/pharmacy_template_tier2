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
    requested: "bg-blue-500/15 text-blue-700",
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
      <div className="flex max-w-full flex-wrap gap-2">
        {["all", "requested", "awaiting_payment", "confirmed", "completed", "cancelled"].map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/admin/services/bookings" : `/admin/services/bookings?status=${s}`}
            className={`inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
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
          <p className="mt-1 text-sm admin-muted">
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
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold admin-text">{b.fullName}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-sm font-semibold capitalize ${statusBadge(b.status)}`}
                    >
                      {b.status.replace(/_/g, " ")}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-sm font-semibold capitalize ${payBadge(b.paymentStatus)}`}
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
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm admin-soft">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {b.phone}
                    </span>
                    {b.email && <span className="break-all">{b.email}</span>}
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
                    <p className="mt-2 rounded-lg bg-[var(--admin-inset)] px-3 py-2 text-sm admin-muted">
                      {b.notes}
                    </p>
                  )}
                  {b.paidVia && (
                    <p className="mt-1 text-sm admin-soft">
                      Paid via {b.paidVia}
                      {b.paymentRef ? ` · ref ${b.paymentRef}` : ""}
                    </p>
                  )}
                </div>

                <div className="flex w-full flex-col gap-3 lg:w-auto lg:items-end">
                  {/* Record payment for unpaid priced bookings */}
                  {(b.status === "awaiting_payment" || b.paymentStatus === "unpaid") &&
                    b.amount != null &&
                    b.amount > 0 && (
                      <form action={payAction} className="grid w-full gap-3 sm:grid-cols-2 lg:flex lg:w-auto lg:flex-wrap lg:items-end">
                        <input type="hidden" name="bookingId" value={b.id} />
                        <div>
                          <label className="label-admin !text-sm">Record payment</label>
                          <select name="paidVia" className="input-admin min-h-11 !py-2 text-base sm:text-sm" defaultValue="cash">
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                            <option value="other">Other</option>
                            <option value="waive">Waive</option>
                          </select>
                        </div>
                        <div>
                          <label className="label-admin !text-sm">Ref (optional)</label>
                          <input
                            name="paymentRef"
                            placeholder="Receipt #"
                            className="input-admin min-h-11 !py-2 text-base sm:text-sm"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={pending}
                          className="btn-admin inline-flex min-h-11 w-full items-center justify-center gap-2 !rounded-xl px-4 py-2 !text-sm disabled:opacity-50 sm:col-span-2 lg:w-auto"
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

                  <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:w-auto lg:flex-wrap">
                    {b.status === "requested" && (
                      <form action={stAction} className="w-full lg:w-auto">
                        <input type="hidden" name="bookingId" value={b.id} />
                        <input type="hidden" name="status" value="confirmed" />
                        <button
                          type="submit"
                          disabled={pending}
                          className="btn-admin inline-flex min-h-11 w-full items-center justify-center gap-2 !rounded-xl px-4 py-2 !text-sm lg:w-auto"
                          title="Confirm appointment request"
                        >
                          <Check className="h-3 w-3" /> Confirm request
                        </button>
                      </form>
                    )}
                    {b.status === "awaiting_payment" && (
                      <form action={stAction} className="w-full lg:w-auto">
                        <input type="hidden" name="bookingId" value={b.id} />
                        <input type="hidden" name="status" value="confirmed" />
                        <button
                          type="submit"
                          disabled={pending}
                          className="btn-admin-ghost inline-flex min-h-11 w-full items-center justify-center gap-2 !text-sm lg:w-auto"
                          title="Confirm without payment (staff override)"
                        >
                          <Check className="h-3 w-3" /> Force confirm
                        </button>
                      </form>
                    )}
                    {b.status === "confirmed" && (
                      <form action={stAction} className="w-full lg:w-auto">
                        <input type="hidden" name="bookingId" value={b.id} />
                        <input type="hidden" name="status" value="completed" />
                        <button
                          type="submit"
                          disabled={pending}
                          className="btn-admin-ghost inline-flex min-h-11 w-full items-center justify-center gap-2 !text-sm lg:w-auto"
                        >
                          <Check className="h-3 w-3" /> Complete
                        </button>
                      </form>
                    )}
                    {b.status !== "cancelled" && b.status !== "completed" && (
                      <form action={stAction} className="w-full lg:w-auto">
                        <input type="hidden" name="bookingId" value={b.id} />
                        <input type="hidden" name="status" value="cancelled" />
                        <button
                          type="submit"
                          disabled={pending}
                          className="btn-admin-ghost inline-flex min-h-11 w-full items-center justify-center gap-2 !text-sm !text-red-600 lg:w-auto"
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

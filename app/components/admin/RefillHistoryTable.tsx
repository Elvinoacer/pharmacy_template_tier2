"use client";

import Link from "next/link";
import {
  Clock,
  Pill,
  User,
  CheckCircle2,
  XCircle,
  Truck,
  Package,
  Receipt,
  Search,
  ChevronRight,
  ExternalLink,
  Download,
  Timer,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/app/lib/time";
import { refillStatusMeta } from "@/app/lib/types";

export type RefillHistoryRow = {
  id: string;
  medicineName: string;
  rxReference: string | null;
  customerName: string | null;
  customerFullName: string | null;
  customerId: string | null;
  phone: string | null;
  email: string | null;
  pickupPreference: "pickup" | "delivery";
  status: string;
  source: string;
  createdAt: Date | string;
  statusUpdatedAt: Date | string;
  prescriptionFill?: {
    id: string;
    fillNumber: number;
    filledAt: Date | string | null;
    dispatchedAt: Date | string | null;
    netAmount: number;
    quantity: number;
    dispensedBy?: { email: string } | null;
    order?: {
      id: string;
      status: string;
      total: number;
      amountPaid: number;
      amountDue: number;
      payments: Array<{ provider: string; status: string; providerRef?: string | null }>;
    } | null;
  } | null;
};

export function RefillHistoryTable({
  history,
  searchQuery,
  onSearchChange,
}: {
  history: RefillHistoryRow[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  const filtered = history.filter((h) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      h.medicineName.toLowerCase().includes(q) ||
      (h.rxReference && h.rxReference.toLowerCase().includes(q)) ||
      (h.customerName && h.customerName.toLowerCase().includes(q)) ||
      (h.customerFullName && h.customerFullName.toLowerCase().includes(q)) ||
      (h.phone && h.phone.includes(q))
    );
  });

  function exportCSV() {
    const headers = [
      "ID",
      "Patient Name",
      "Phone",
      "Medicine",
      "Rx Reference",
      "Fill Number",
      "Source",
      "Requested Date",
      "Completed Date",
      "Status",
      "Order ID",
      "Order Total",
      "Amount Paid",
      "Dispensed By",
    ];

    const rows = filtered.map((r) => [
      r.id,
      `"${(r.customerFullName || r.customerName || "Guest").replace(/"/g, '""')}"`,
      r.phone || "",
      `"${r.medicineName.replace(/"/g, '""')}"`,
      r.rxReference || "",
      r.prescriptionFill?.fillNumber || 1,
      r.source,
      new Date(r.createdAt).toISOString(),
      new Date(r.statusUpdatedAt).toISOString(),
      r.status,
      r.prescriptionFill?.order?.id || "",
      r.prescriptionFill?.order?.total || "",
      r.prescriptionFill?.order?.amountPaid || "",
      r.prescriptionFill?.dispensedBy?.email || "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `refill-dispense-history-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function getTurnaround(created: Date | string, completed: Date | string) {
    const diffMs = new Date(completed).getTime() - new Date(created).getTime();
    if (diffMs <= 0) return "< 1 min";
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins} mins`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hours < 24) return `${hours}h ${remMins}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  return (
    <div className="space-y-4">
      {/* Search & Export Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search completed refills, medicines, customers, Rx #…"
            className="input-admin pl-9 text-xs w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs admin-soft font-bold">{filtered.length} records</span>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-3.5 py-1.5 text-xs font-bold admin-text hover:bg-[var(--admin-inset)] shadow-sm transition"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600" /> Export CSV
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-8 text-center space-y-2">
          <Clock className="h-8 w-8 mx-auto text-emerald-600/60" />
          <h4 className="text-sm font-bold admin-text">No refill history records found</h4>
          <p className="text-xs admin-soft">Completed and cancelled refill records will appear here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto scroll-admin rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-sm">
          <table className="table-admin text-xs">
            <thead>
              <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-inset)]/60 text-[11px] font-bold uppercase tracking-wider admin-soft">
                <th>Customer / Patient</th>
                <th>Medicine &amp; Rx #</th>
                <th>Fill Sequence</th>
                <th>Turnaround</th>
                <th>Intake Source</th>
                <th>Commercial Order</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const meta = refillStatusMeta(r.status);
                const fill = r.prescriptionFill;
                const order = fill?.order;
                const payment = order?.payments?.[0];
                const turnaround = getTurnaround(r.createdAt, r.statusUpdatedAt);

                return (
                  <tr key={r.id} className="hover:bg-[var(--admin-hover)] transition">
                    {/* Patient */}
                    <td>
                      <div className="space-y-0.5">
                        {r.customerId ? (
                          <Link
                            href={`/admin/customers/${r.customerId}`}
                            className="font-bold text-xs admin-text hover:admin-accent-text hover:underline block"
                          >
                            {r.customerFullName || r.customerName || "Customer"}
                          </Link>
                        ) : (
                          <span className="font-bold text-xs admin-text block">{r.customerName || "Guest"}</span>
                        )}
                        <p className="text-[10px] admin-soft font-mono">{r.phone || r.email || "—"}</p>
                      </div>
                    </td>

                    {/* Medicine */}
                    <td>
                      <div className="space-y-0.5">
                        <p className="font-bold text-xs admin-text">{r.medicineName}</p>
                        <p className="text-[10px] admin-soft font-mono">Rx: {r.rxReference || "—"}</p>
                      </div>
                    </td>

                    {/* Fill Sequence */}
                    <td>
                      {fill ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
                            Fill #{fill.fillNumber}
                          </span>
                          {fill.dispensedBy && (
                            <p className="text-[10px] admin-soft">by {fill.dispensedBy.email.split("@")[0]}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs admin-soft">Fill #1 (Standard)</span>
                      )}
                    </td>

                    {/* Turnaround */}
                    <td>
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <Timer className="h-3 w-3" /> {turnaround}
                        </span>
                        <p className="text-[9px] admin-soft">{formatDateTime(r.statusUpdatedAt)}</p>
                      </div>
                    </td>

                    {/* Source */}
                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-black/5 dark:bg-white/10 px-2 py-0.5 text-[10px] font-bold capitalize admin-text">
                          {r.source}
                        </span>
                        <span className="text-[10px] admin-soft">
                          {r.pickupPreference === "delivery" ? "🚚 Delivery" : "🏢 Pickup"}
                        </span>
                      </div>
                    </td>

                    {/* Order & Payment */}
                    <td>
                      {order ? (
                        <div className="space-y-0.5">
                          <Link
                            href={`/admin/orders?search=${order.id}`}
                            className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                          >
                            Kes {Number(order.total).toLocaleString()}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                          <div className="flex items-center gap-1 text-[10px]">
                            <span
                              className={`font-bold ${
                                order.amountPaid >= order.total ? "text-emerald-600" : "text-amber-600"
                              }`}
                            >
                              {order.amountPaid >= order.total
                                ? "Paid in full"
                                : `Due Kes ${Number(order.amountDue).toLocaleString()}`}
                            </span>
                            {payment && (
                              <span className="admin-soft font-mono">({payment.provider})</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs admin-soft">No linked order</span>
                      )}
                    </td>

                    {/* Status */}
                    <td>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                          r.status === "collected"
                            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                            : r.status === "cancelled"
                              ? "bg-rose-500/15 text-rose-800 dark:text-rose-300"
                              : "bg-blue-500/15 text-blue-800 dark:text-blue-300"
                        }`}
                      >
                        {r.status === "collected" && <CheckCircle2 className="h-3 w-3" />}
                        {r.status === "cancelled" && <XCircle className="h-3 w-3" />}
                        {meta.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

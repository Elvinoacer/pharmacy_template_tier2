"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Printer,
  Download,
  Search,
  Filter,
  Lock,
  RefreshCw,
  Calendar,
  User,
  Pill,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Stethoscope,
  Sparkles,
} from "lucide-react";
import type { DispensingRecord } from "@/app/lib/services/dispensing";
import { ReceiptModal } from "@/app/components/admin/ReceiptModal";

export function DispensingRegisterTable({
  initialRecords,
  metrics,
  total,
  initialPage,
  pageSize,
}: {
  initialRecords: DispensingRecord[];
  metrics: {
    totalDispensed: number;
    rxFillsCount: number;
    controlledCount: number;
    substitutionsCount: number;
    totalValueKes: number;
  };
  total: number;
  initialPage: number;
  pageSize: number;
}) {
  const [records, setRecords] = useState<DispensingRecord[]>(initialRecords);
  const [filterType, setFilterType] = useState<"all" | "controlled" | "substitutions" | "rx">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(initialPage);
  const [totalCount, setTotalCount] = useState(total);
  const [loading, setLoading] = useState(false);
  
  // Selected order for receipt modal
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  async function fetchFiltered(newPage = 1, currentFilter = filterType, q = searchQuery, start = startDate, end = endDate) {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(newPage));
    params.set("pageSize", String(pageSize));
    if (q) params.set("q", q);
    if (start) params.set("startDate", start);
    if (end) params.set("endDate", end);
    if (currentFilter === "controlled") params.set("controlledOnly", "true");
    if (currentFilter === "substitutions") params.set("substitutionsOnly", "true");

    try {
      const res = await fetch(`/api/admin/dispensing?${params.toString()}`);
      const data = await res.json();
      if (data.ok && data.records) {
        setRecords(data.records);
        setTotalCount(data.total || data.records.length);
        setPage(newPage);
      }
    } catch (err) {
      console.error("Error fetching dispensing register:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterClick(type: "all" | "controlled" | "substitutions" | "rx") {
    setFilterType(type);
    fetchFiltered(1, type, searchQuery, startDate, endDate);
  }

  function handleQuickDate(days: number | "today" | "all") {
    if (days === "all") {
      setStartDate("");
      setEndDate("");
      fetchFiltered(1, filterType, searchQuery, "", "");
      return;
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (days === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
      fetchFiltered(1, filterType, searchQuery, todayStr, todayStr);
      return;
    }

    const past = new Date();
    past.setDate(now.getDate() - days);
    const pastStr = past.toISOString().slice(0, 10);

    setStartDate(pastStr);
    setEndDate(todayStr);
    fetchFiltered(1, filterType, searchQuery, pastStr, todayStr);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchFiltered(1, filterType, searchQuery, startDate, endDate);
  }

  function handleExportCsv() {
    const params = new URLSearchParams();
    params.set("format", "csv");
    if (searchQuery) params.set("q", searchQuery);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (filterType === "controlled") params.set("controlledOnly", "true");
    if (filterType === "substitutions") params.set("substitutionsOnly", "true");

    window.open(`/api/admin/dispensing?${params.toString()}`, "_blank");
  }

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-4">
      {/* ── Interactive KPI Stat Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <button
          type="button"
          onClick={() => handleFilterClick("all")}
          className={`admin-stat p-3.5 text-left transition ${
            filterType === "all" ? "ring-2 ring-[var(--admin-accent)] shadow-md" : "hover:border-[var(--admin-border-2)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider admin-muted">Total Dispensed</p>
            <ShieldCheck className="h-3.5 w-3.5 admin-accent-text" />
          </div>
          <p className="mt-1 text-2xl font-black admin-text">{metrics.totalDispensed}</p>
          <p className="text-[10px] admin-soft mt-0.5">All customer handoffs</p>
        </button>

        <button
          type="button"
          onClick={() => handleFilterClick("rx")}
          className={`admin-stat p-3.5 text-left transition ${
            filterType === "rx" ? "ring-2 ring-blue-500 shadow-md" : "hover:border-[var(--admin-border-2)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Rx Prescriptions</p>
            <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <p className="mt-1 text-2xl font-black text-blue-600 dark:text-blue-400">{metrics.rxFillsCount}</p>
          <p className="text-[10px] admin-soft mt-0.5">Valid doctor scripts</p>
        </button>

        <button
          type="button"
          onClick={() => handleFilterClick("controlled")}
          className={`admin-stat p-3.5 text-left transition ${
            filterType === "controlled" ? "ring-2 ring-purple-500 shadow-md" : "hover:border-[var(--admin-border-2)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Controlled (DDA)</p>
            <Lock className="h-3.5 w-3.5 text-purple-600" />
          </div>
          <p className="mt-1 text-2xl font-black text-purple-700 dark:text-purple-400">{metrics.controlledCount}</p>
          <p className="text-[10px] admin-soft mt-0.5">Schedule 1-5 substances</p>
        </button>

        <button
          type="button"
          onClick={() => handleFilterClick("substitutions")}
          className={`admin-stat p-3.5 text-left transition ${
            filterType === "substitutions" ? "ring-2 ring-emerald-500 shadow-md" : "hover:border-[var(--admin-border-2)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Substitutions</p>
            <RefreshCw className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <p className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-400">{metrics.substitutionsCount}</p>
          <p className="text-[10px] admin-soft mt-0.5">Bioequivalent generic switches</p>
        </button>

        <div className="admin-stat p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider admin-muted">Dispensed Value</p>
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <p className="mt-1 text-xl font-bold admin-text">KES {metrics.totalValueKes.toLocaleString()}</p>
          <p className="text-[10px] admin-soft mt-0.5">Total realized revenue</p>
        </div>
      </div>

      {/* ── Toolbar: Category Filters, Date Presets & CSV Export ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleFilterClick("all")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              filterType === "all"
                ? "bg-[var(--admin-accent)] text-white shadow-sm"
                : "bg-[var(--admin-inset)] admin-text hover:bg-[var(--admin-hover)]"
            }`}
          >
            All Logs ({metrics.totalDispensed})
          </button>
          <button
            type="button"
            onClick={() => handleFilterClick("controlled")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              filterType === "controlled"
                ? "bg-purple-700 text-white shadow-sm"
                : "bg-purple-500/10 text-purple-800 dark:text-purple-300 hover:bg-purple-500/20"
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Controlled Drugs Register ({metrics.controlledCount})</span>
          </button>
          <button
            type="button"
            onClick={() => handleFilterClick("substitutions")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              filterType === "substitutions"
                ? "bg-emerald-700 text-white shadow-sm"
                : "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20"
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Generic Substitutions ({metrics.substitutionsCount})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg bg-[var(--admin-inset)] p-1 text-[11px] font-semibold admin-muted">
            <button
              type="button"
              onClick={() => handleQuickDate("today")}
              className="rounded px-2 py-0.5 hover:text-[var(--admin-text)] hover:bg-[var(--admin-card)]"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleQuickDate(7)}
              className="rounded px-2 py-0.5 hover:text-[var(--admin-text)] hover:bg-[var(--admin-card)]"
            >
              7d
            </button>
            <button
              type="button"
              onClick={() => handleQuickDate(30)}
              className="rounded px-2 py-0.5 hover:text-[var(--admin-text)] hover:bg-[var(--admin-card)]"
            >
              30d
            </button>
            <button
              type="button"
              onClick={() => handleQuickDate("all")}
              className="rounded px-2 py-0.5 hover:text-[var(--admin-text)] hover:bg-[var(--admin-card)]"
            >
              All
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="btn-admin-secondary inline-flex items-center gap-1.5 text-xs font-bold"
            title="Download Kenya PPB compliant regulatory audit register"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export PPB Register</span>
          </button>
        </div>
      </div>

      {/* ── Search & Date Range Form ── */}
      <form onSubmit={handleSearchSubmit} className="grid gap-3 sm:grid-cols-12">
        <div className="relative sm:col-span-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input
            type="text"
            placeholder="Search patient, medicine, active ingredient, batch number, prescriber…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-admin pl-9 text-xs"
          />
        </div>
        <div className="sm:col-span-3">
          <input
            type="date"
            placeholder="From date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input-admin text-xs"
          />
        </div>
        <div className="flex items-center gap-2 sm:col-span-3">
          <input
            type="date"
            placeholder="To date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input-admin text-xs"
          />
          <button type="submit" className="btn-admin-primary px-4 py-2 text-xs font-bold shrink-0">
            Filter
          </button>
        </div>
      </form>

      {/* ── Dispensing Ledger Table ── */}
      <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-sm">
        <div className="overflow-x-auto scroll-admin">
          <table className="table-admin text-xs">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Patient / Customer</th>
                <th>Medicine Dispensed</th>
                <th>Batch / Expiry</th>
                <th>Prescriber / Directions</th>
                <th>Dispensed By</th>
                <th className="text-right">Total (KES)</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border-2)]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center admin-soft">
                    <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--admin-accent)] border-t-transparent" />
                    <p className="mt-2 text-xs font-medium">Filtering regulatory dispensing ledger…</p>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center admin-soft">
                    <FileText className="mx-auto h-10 w-10 opacity-30 mb-2" />
                    <p className="font-bold text-sm admin-text">No dispensing records found.</p>
                    <p className="text-xs admin-soft mt-1">Try broadening your search query or selecting a different date range.</p>
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--admin-hover)] transition">
                    <td className="whitespace-nowrap">
                      <p className="font-bold admin-text">{r.date.slice(0, 10)}</p>
                      <p className="font-mono text-[10px] admin-soft">{r.date.slice(11)}</p>
                    </td>

                    <td>
                      <div className="flex items-center gap-1.5">
                        {r.patientId ? (
                          <Link
                            href={`/admin/customers/${r.patientId}`}
                            className="font-bold admin-text hover:admin-accent-text hover:underline inline-flex items-center gap-1"
                          >
                            <span>{r.patientName}</span>
                            <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                          </Link>
                        ) : (
                          <span className="font-bold admin-text">{r.patientName}</span>
                        )}
                        {r.isWalkIn && (
                          <span className="rounded bg-[var(--admin-inset)] px-1.5 py-0.5 text-[9px] admin-muted">
                            Walk-In
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] admin-soft">
                        {r.patientPhone || r.patientEmail || "—"}
                      </p>
                    </td>

                    <td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold admin-text text-sm">{r.medicineName}</span>
                        {r.isControlled && (
                          <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[9px] font-black text-purple-700 dark:text-purple-400 uppercase tracking-wide">
                            {r.controlledSchedule?.replace("_", " ") || "DDA"}
                          </span>
                        )}
                        {r.isSubstituted && (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-400">
                            Generic Substituted
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] admin-soft mt-0.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {r.quantity} {r.billingUnit}
                        </span>{" "}
                        · {r.genericName}
                        {r.strengthDisplay ? ` · ${r.strengthDisplay}` : ""}
                      </p>
                      {r.isSubstituted && r.originalMedicineName && (
                        <p className="text-[10px] text-amber-800 dark:text-amber-300 font-medium">
                          Prescribed: {r.originalMedicineName}
                        </p>
                      )}
                    </td>

                    <td className="whitespace-nowrap font-mono text-[11px]">
                      {r.batchNumber ? (
                        <div>
                          <p className="font-bold text-emerald-800 dark:text-emerald-400">{r.batchNumber}</p>
                          <p className="text-[10px] admin-soft">Exp: {r.expiryDate || "—"}</p>
                        </div>
                      ) : (
                        <span className="admin-soft">—</span>
                      )}
                    </td>

                    <td>
                      {r.prescriber ? (
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{r.prescriber}</p>
                          <p className="text-[10px] admin-soft italic">{r.dosageInstructions || "As directed"}</p>
                        </div>
                      ) : (
                        <div>
                          <span className="rounded bg-[var(--admin-inset)] px-1.5 py-0.5 text-[9px] font-semibold admin-muted">OTC Counter Sale</span>
                          {r.dosageInstructions && (
                            <p className="text-[10px] admin-soft italic mt-0.5">{r.dosageInstructions}</p>
                          )}
                        </div>
                      )}
                    </td>

                    <td>
                      <p className="font-semibold admin-text">{r.dispensedByName}</p>
                      <p className="text-[10px] admin-soft capitalize">{r.dispensedByRole || "Pharmacist"}</p>
                      {r.dispenserNote && (
                        <p className="mt-0.5 line-clamp-1 text-[10px] text-emerald-800 dark:text-emerald-300" title={r.dispenserNote}>
                          Note: {r.dispenserNote}
                        </p>
                      )}
                    </td>

                    <td className="text-right whitespace-nowrap">
                      <p className="font-bold admin-text text-sm">KES {r.totalPrice.toLocaleString()}</p>
                      <p className="text-[10px] admin-soft uppercase">{r.paymentMethod}</p>
                    </td>

                    <td className="text-right whitespace-nowrap">
                      {r.orderId && (
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(r.orderId!)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--admin-accent-soft)] px-3 py-1 text-[11px] font-bold admin-accent-text transition hover:brightness-110 shadow-2xs"
                        >
                          <Printer className="h-3 w-3" />
                          <span>Receipt</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer & Pagination ── */}
        <div className="flex items-center justify-between border-t border-[var(--admin-border)] bg-[var(--admin-inset)] px-5 py-3 text-xs">
          <span className="admin-soft">
            Showing <strong>{records.length}</strong> of <strong>{totalCount}</strong> dispensing entries
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => fetchFiltered(page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] px-2.5 py-1 text-xs font-semibold admin-text disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
            <span className="font-semibold admin-text">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => fetchFiltered(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] px-2.5 py-1 text-xs font-semibold admin-text disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Printable Receipt & Container Label Modal ── */}
      <ReceiptModal
        orderId={selectedOrderId}
        isOpen={Boolean(selectedOrderId)}
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  );
}

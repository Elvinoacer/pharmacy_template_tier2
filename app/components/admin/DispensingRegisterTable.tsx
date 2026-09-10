"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Printer,
  Download,
  Search,
  Lock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Stethoscope,
  Sparkles,
} from "lucide-react";
import type { DispensingRecord } from "@/app/lib/services/dispensing";
import { ReceiptModal } from "@/app/components/admin/ReceiptModal";

type RegisterFilter = "all" | "controlled" | "substitutions";

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
  const [filterType, setFilterType] = useState<RegisterFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(initialPage);
  const [totalCount, setTotalCount] = useState(total);
  const [loading, setLoading] = useState(false);
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

  function handleFilterClick(type: RegisterFilter) {
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <button
          type="button"
          onClick={() => handleFilterClick("all")}
          className={`admin-stat min-h-28 p-3.5 text-left transition-[border-color,box-shadow] ${
            filterType === "all" ? "ring-2 ring-[var(--admin-accent)] shadow-sm" : "hover:border-[var(--admin-border-2)] hover:shadow-sm"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider admin-muted sm:text-xs">Total dispensed</p>
            <ShieldCheck className="h-4 w-4 shrink-0 admin-accent-text" />
          </div>
          <p className="mt-2 text-2xl font-black admin-text">{metrics.totalDispensed}</p>
          <p className="mt-1 text-xs leading-4 admin-soft">All customer handoffs</p>
        </button>

        <div className="admin-stat min-h-28 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 sm:text-xs">Rx prescriptions</p>
            <Stethoscope className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />
          </div>
          <p className="mt-2 text-2xl font-black text-blue-700 dark:text-blue-300">{metrics.rxFillsCount}</p>
          <p className="mt-1 text-xs leading-4 admin-soft">Valid doctor scripts</p>
        </div>

        <button
          type="button"
          onClick={() => handleFilterClick("controlled")}
          className={`admin-stat min-h-28 p-3.5 text-left transition-[border-color,box-shadow] ${
            filterType === "controlled" ? "ring-2 ring-purple-500 shadow-sm" : "hover:border-[var(--admin-border-2)] hover:shadow-sm"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 sm:text-xs">Controlled</p>
            <Lock className="h-4 w-4 shrink-0 text-purple-700 dark:text-purple-300" />
          </div>
          <p className="mt-2 text-2xl font-black text-purple-700 dark:text-purple-300">{metrics.controlledCount}</p>
          <p className="mt-1 text-xs leading-4 admin-soft">DDA schedule records</p>
        </button>

        <button
          type="button"
          onClick={() => handleFilterClick("substitutions")}
          className={`admin-stat min-h-28 p-3.5 text-left transition-[border-color,box-shadow] ${
            filterType === "substitutions" ? "ring-2 ring-emerald-500 shadow-sm" : "hover:border-[var(--admin-border-2)] hover:shadow-sm"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 sm:text-xs">Substitutions</p>
            <RefreshCw className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">{metrics.substitutionsCount}</p>
          <p className="mt-1 text-xs leading-4 admin-soft">Generic switches</p>
        </button>

        <div className="admin-stat col-span-2 min-h-28 p-3.5 md:col-span-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider admin-muted sm:text-xs">Dispensed value</p>
            <Sparkles className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
          </div>
          <p className="mt-2 break-words text-xl font-bold admin-text">KES {metrics.totalValueKes.toLocaleString()}</p>
          <p className="mt-1 text-xs leading-4 admin-soft">Realized revenue</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-3 shadow-sm sm:p-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scroll-admin" aria-label="Dispensing register filters">
          <button
            type="button"
            onClick={() => handleFilterClick("all")}
            className={`min-h-10 shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              filterType === "all"
                ? "bg-[var(--admin-accent)] text-[var(--admin-btn-fg)] shadow-sm"
                : "bg-[var(--admin-inset)] admin-text hover:bg-[var(--admin-hover)]"
            }`}
          >
            All logs ({metrics.totalDispensed})
          </button>
          <button
            type="button"
            onClick={() => handleFilterClick("controlled")}
            className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              filterType === "controlled"
                ? "bg-purple-700 text-white shadow-sm dark:bg-purple-500 dark:text-slate-950"
                : "bg-purple-500/10 text-purple-800 hover:bg-purple-500/20 dark:text-purple-300"
            }`}
          >
            <Lock className="h-3.5 w-3.5" /> Controlled ({metrics.controlledCount})
          </button>
          <button
            type="button"
            onClick={() => handleFilterClick("substitutions")}
            className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              filterType === "substitutions"
                ? "bg-emerald-700 text-white shadow-sm dark:bg-emerald-400 dark:text-slate-950"
                : "bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/20 dark:text-emerald-300"
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Substitutions ({metrics.substitutionsCount})
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-3 border-t border-[var(--admin-border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-4 rounded-xl bg-[var(--admin-inset)] p-1 text-xs font-semibold admin-muted sm:flex">
            {[
              { label: "Today", value: "today" as const },
              { label: "7d", value: 7 as const },
              { label: "30d", value: 30 as const },
              { label: "All", value: "all" as const },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleQuickDate(preset.value)}
                className="min-h-9 rounded-lg px-2 py-1 transition hover:bg-[var(--admin-card)] hover:text-[var(--admin-text)]"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="btn-admin-secondary inline-flex w-full items-center justify-center gap-1.5 text-xs font-bold sm:w-auto"
            title="Download Kenya PPB compliant regulatory audit register"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export PPB register</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSearchSubmit} className="grid gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-3 shadow-sm sm:p-4 md:grid-cols-12 md:items-end">
        <div className="relative md:col-span-6">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide admin-soft">Search ledger</label>
          <Search className="pointer-events-none absolute left-3 top-[36px] h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input
            type="text"
            placeholder="Patient, medicine, batch, prescriber…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-admin w-full pl-9 text-xs"
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide admin-soft">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input-admin w-full text-xs"
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide admin-soft">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input-admin w-full text-xs"
          />
        </div>
        <button type="submit" className="btn-admin-primary w-full px-4 py-2 text-xs font-bold md:col-span-2">
          Filter records
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-sm">
        <div className="md:hidden">
          {loading ? (
            <div className="px-4 py-16 text-center admin-soft">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--admin-accent)] border-t-transparent" />
              <p className="mt-2 text-xs font-medium">Filtering dispensing ledger…</p>
            </div>
          ) : records.length === 0 ? (
            <div className="px-4 py-16 text-center admin-soft">
              <FileText className="mx-auto mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm font-bold admin-text">No dispensing records found.</p>
              <p className="mt-1 text-xs admin-soft">Try a broader search or date range.</p>
            </div>
          ) : (
            <div className="space-y-3 p-3">
              {records.map((r) => (
                <article key={r.id} className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide admin-soft">{r.date.slice(0, 10)} · {r.date.slice(11)}</p>
                      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                        {r.patientId ? (
                          <Link
                            href={`/admin/customers/${r.patientId}`}
                            className="inline-flex min-w-0 items-center gap-1 break-words text-sm font-bold admin-text hover:admin-accent-text"
                          >
                            {r.patientName}
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                          </Link>
                        ) : (
                          <span className="break-words text-sm font-bold admin-text">{r.patientName}</span>
                        )}
                        {r.isWalkIn && (
                          <span className="rounded-full bg-[var(--admin-card)] px-2 py-0.5 text-[10px] admin-muted">Walk-in</span>
                        )}
                      </div>
                      <p className="mt-0.5 break-all text-xs admin-soft">{r.patientPhone || r.patientEmail || "No contact"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold admin-text">KES {r.totalPrice.toLocaleString()}</p>
                      <p className="text-[10px] uppercase admin-soft">{r.paymentMethod}</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-[var(--admin-card)] p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="break-words text-sm font-bold admin-text">{r.medicineName}</p>
                      {r.isControlled && (
                        <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                          {r.controlledSchedule?.replace("_", " ") || "DDA"}
                        </span>
                      )}
                      {r.isSubstituted && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                          Substituted
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-5 admin-muted">
                      <strong className="admin-text">{r.quantity} {r.billingUnit}</strong> · {r.genericName}{r.strengthDisplay ? ` · ${r.strengthDisplay}` : ""}
                    </p>
                    {r.isSubstituted && r.originalMedicineName && (
                      <p className="mt-1 text-xs font-medium text-amber-800 dark:text-amber-300">Prescribed: {r.originalMedicineName}</p>
                    )}
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div>
                      <dt className="admin-soft">Batch / expiry</dt>
                      <dd className="mt-0.5 break-words font-medium admin-text">{r.batchNumber || "—"}{r.batchNumber ? ` · ${r.expiryDate || "No expiry"}` : ""}</dd>
                    </div>
                    <div>
                      <dt className="admin-soft">Dispensed by</dt>
                      <dd className="mt-0.5 break-words font-medium admin-text">{r.dispensedByName}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="admin-soft">Prescriber / directions</dt>
                      <dd className="mt-0.5 break-words font-medium admin-text">{r.prescriber || "OTC counter sale"}</dd>
                      {r.dosageInstructions && <p className="mt-0.5 italic admin-muted">{r.dosageInstructions}</p>}
                    </div>
                  </dl>

                  {r.dispenserNote && (
                    <p className="mt-3 rounded-xl bg-[var(--admin-card)] px-3 py-2 text-xs leading-5 text-emerald-800 dark:text-emerald-300">
                      Note: {r.dispenserNote}
                    </p>
                  )}

                  {r.orderId && (
                    <button
                      type="button"
                      onClick={() => setSelectedOrderId(r.orderId!)}
                      className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--admin-accent-soft)] px-3 py-2 text-xs font-bold admin-accent-text transition hover:brightness-105"
                    >
                      <Printer className="h-3.5 w-3.5" /> Receipt
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        <div tabIndex={0} role="region" aria-label="Scrollable dispensing records" className="admin-table-region hidden overflow-x-auto scroll-admin md:block">
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
                    <FileText className="mx-auto mb-2 h-10 w-10 opacity-30" />
                    <p className="text-sm font-bold admin-text">No dispensing records found.</p>
                    <p className="mt-1 text-xs admin-soft">Try broadening your search query or selecting a different date range.</p>
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="transition hover:bg-[var(--admin-hover)]">
                    <td className="whitespace-nowrap">
                      <p className="font-bold admin-text">{r.date.slice(0, 10)}</p>
                      <p className="font-mono text-xs admin-soft">{r.date.slice(11)}</p>
                    </td>

                    <td>
                      <div className="flex items-center gap-1.5">
                        {r.patientId ? (
                          <Link
                            href={`/admin/customers/${r.patientId}`}
                            className="inline-flex items-center gap-1 font-bold admin-text hover:admin-accent-text hover:underline"
                          >
                            <span>{r.patientName}</span>
                            <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                          </Link>
                        ) : (
                          <span className="font-bold admin-text">{r.patientName}</span>
                        )}
                        {r.isWalkIn && (
                          <span className="rounded bg-[var(--admin-inset)] px-1.5 py-0.5 text-xs admin-muted">Walk-In</span>
                        )}
                      </div>
                      <p className="text-xs admin-soft">{r.patientPhone || r.patientEmail || "—"}</p>
                    </td>

                    <td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-bold admin-text">{r.medicineName}</span>
                        {r.isControlled && (
                          <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-xs font-black uppercase tracking-wide text-purple-700 dark:text-purple-300">
                            {r.controlledSchedule?.replace("_", " ") || "DDA"}
                          </span>
                        )}
                        {r.isSubstituted && (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">Generic substituted</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs admin-soft">
                        <span className="font-bold admin-text">{r.quantity} {r.billingUnit}</span> · {r.genericName}{r.strengthDisplay ? ` · ${r.strengthDisplay}` : ""}
                      </p>
                      {r.isSubstituted && r.originalMedicineName && (
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Prescribed: {r.originalMedicineName}</p>
                      )}
                    </td>

                    <td className="whitespace-nowrap font-mono text-xs">
                      {r.batchNumber ? (
                        <div>
                          <p className="font-bold text-emerald-800 dark:text-emerald-300">{r.batchNumber}</p>
                          <p className="text-xs admin-soft">Exp: {r.expiryDate || "—"}</p>
                        </div>
                      ) : (
                        <span className="admin-soft">—</span>
                      )}
                    </td>

                    <td>
                      {r.prescriber ? (
                        <div>
                          <p className="font-bold admin-text">{r.prescriber}</p>
                          <p className="text-xs italic admin-soft">{r.dosageInstructions || "As directed"}</p>
                        </div>
                      ) : (
                        <div>
                          <span className="rounded bg-[var(--admin-inset)] px-1.5 py-0.5 text-xs font-semibold admin-muted">OTC counter sale</span>
                          {r.dosageInstructions && <p className="mt-0.5 text-xs italic admin-soft">{r.dosageInstructions}</p>}
                        </div>
                      )}
                    </td>

                    <td>
                      <p className="font-semibold admin-text">{r.dispensedByName}</p>
                      <p className="text-xs capitalize admin-soft">{r.dispensedByRole || "Pharmacist"}</p>
                      {r.dispenserNote && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-emerald-800 dark:text-emerald-300" title={r.dispenserNote}>Note: {r.dispenserNote}</p>
                      )}
                    </td>

                    <td className="whitespace-nowrap text-right">
                      <p className="text-sm font-bold admin-text">KES {r.totalPrice.toLocaleString()}</p>
                      <p className="text-xs uppercase admin-soft">{r.paymentMethod}</p>
                    </td>

                    <td className="whitespace-nowrap text-right">
                      {r.orderId && (
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(r.orderId!)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--admin-accent-soft)] px-3 py-1 text-xs font-bold admin-accent-text transition hover:brightness-110"
                        >
                          <Printer className="h-3 w-3" /> Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--admin-border)] bg-[var(--admin-inset)] px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span className="admin-soft">
            Showing <strong className="admin-text">{records.length}</strong> of <strong className="admin-text">{totalCount}</strong> entries
          </span>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => fetchFiltered(page - 1)}
              className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] px-2.5 py-1 text-xs font-semibold admin-text disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Previous</span>
            </button>
            <span className="whitespace-nowrap font-semibold admin-text">{page} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => fetchFiltered(page + 1)}
              className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] px-2.5 py-1 text-xs font-semibold admin-text disabled:opacity-40"
            >
              <span className="hidden xs:inline">Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <ReceiptModal
        orderId={selectedOrderId}
        isOpen={Boolean(selectedOrderId)}
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  );
}

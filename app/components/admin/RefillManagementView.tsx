"use client";

import { useState } from "react";
import {
  Pill,
  Calendar,
  ShieldAlert,
  Clock,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  Search,
  ListChecks,
} from "lucide-react";
import { RefillRow, type RefillRowData } from "./RefillRow";
import { RefillFilter } from "./RefillFilter";
import { RefillSchedulesTable } from "./RefillSchedulesTable";
import { RefillMissingPatientsTable } from "./RefillMissingPatientsTable";
import { RefillHistoryTable, type RefillHistoryRow } from "./RefillHistoryTable";
import { NewRefillModal } from "./NewRefillModal";
import { RefillReviewCockpit } from "./RefillReviewCockpit";
import type { RefillScheduleItem, MissingRefillPatientItem } from "@/app/lib/services/refills";

export type RefillDashboardStats = {
  activeRequestsCount: number;
  submittedCount: number;
  underReviewCount: number;
  approvedCount: number;
  preparingCount: number;
  readyForPickupCount: number;
  totalPrescriptionsOnRefill: number;
  dueInNext7DaysCount: number;
  overdueRefillsCount: number;
  severelyLapsedCount: number;
  completed30dCount: number;
  unpaidOrdersCount: number;
};

export function RefillManagementView({
  stats,
  activeRefills,
  refillCounts,
  currentStatusFilter,
  searchQuery,
  schedules,
  missingPatients,
  historyRows,
}: {
  stats: RefillDashboardStats;
  activeRefills: RefillRowData[];
  refillCounts: Record<string, number>;
  currentStatusFilter: string;
  searchQuery?: string;
  schedules: RefillScheduleItem[];
  missingPatients: MissingRefillPatientItem[];
  historyRows: RefillHistoryRow[];
}) {
  const [activeTab, setActiveTab] = useState<"queue" | "schedules" | "missing" | "history">("queue");
  const [showNewRefillModal, setShowNewRefillModal] = useState(false);
  const [reviewCockpitId, setReviewCockpitId] = useState<string | null>(null);

  const [scheduleFilter, setScheduleFilter] = useState("all");
  const [scheduleSearch, setScheduleSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  return (
    <div className="space-y-6">
      {/* ── Top KPI Stat Grid ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Queue */}
        <button
          type="button"
          onClick={() => setActiveTab("queue")}
          className={`text-left rounded-2xl border p-4 shadow-sm transition ${
            activeTab === "queue"
              ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
              : "border-[var(--admin-border)] bg-[var(--admin-card)] hover:border-emerald-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold admin-soft">Refill Queue</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
              <RefreshCw className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-extrabold admin-text">{stats.activeRequestsCount}</p>
          <span className="text-sm text-emerald-700 dark:text-emerald-400 font-semibold">
            {stats.submittedCount} new · {stats.underReviewCount} in review
          </span>
        </button>

        {/* Due Next 7 Days */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("schedules");
            setScheduleFilter("due_soon");
          }}
          className={`text-left rounded-2xl border p-4 shadow-sm transition ${
            activeTab === "schedules" && (scheduleFilter === "due_soon" || scheduleFilter === "due_today")
              ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20"
              : "border-[var(--admin-border)] bg-[var(--admin-card)] hover:border-blue-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Due (Next 7 Days)</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-extrabold text-blue-900 dark:text-blue-200">{stats.dueInNext7DaysCount}</p>
          <span className="text-sm text-blue-700/80 dark:text-blue-300/80 font-medium">
            Active maintenance schedules
          </span>
        </button>

        {/* Overdue Refills */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("schedules");
            setScheduleFilter("overdue");
          }}
          className={`text-left rounded-2xl border p-4 shadow-sm transition ${
            activeTab === "schedules" && scheduleFilter === "overdue"
              ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20"
              : "border-[var(--admin-border)] bg-[var(--admin-card)] hover:border-amber-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Overdue Refills</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-extrabold text-amber-900 dark:text-amber-200">{stats.overdueRefillsCount}</p>
          <span className="text-sm text-amber-700/80 dark:text-amber-300/80 font-medium">
            Supply run out · Needs reminder
          </span>
        </button>

        {/* Severely Missing / Non-Adherence */}
        <button
          type="button"
          onClick={() => setActiveTab("missing")}
          className={`text-left rounded-2xl border p-4 shadow-sm transition ${
            activeTab === "missing"
              ? "border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/20"
              : "border-[var(--admin-border)] bg-[var(--admin-card)] hover:border-rose-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">Missing Refills (&gt;14d)</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-extrabold text-rose-900 dark:text-rose-200">{missingPatients.length}</p>
          <span className="text-sm text-rose-700/80 dark:text-rose-300/80 font-semibold">
            High non-adherence risk
          </span>
        </button>
      </div>

      {/* ── Main Tab Navigation & Record Refill Button ── */}
      <div className="flex flex-col items-stretch gap-3 border-b border-[var(--admin-border)] pb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={() => setActiveTab("queue")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
              activeTab === "queue"
                ? "bg-[var(--admin-accent)] text-[var(--admin-btn-fg)] shadow-sm"
                : "bg-[var(--admin-inset)] admin-text hover:bg-[var(--admin-inset-2)]"
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Active Refill Queue
            <span className="rounded-full bg-black/15 px-1.5 py-0.2 text-sm">{stats.activeRequestsCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("schedules")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
              activeTab === "schedules"
                ? "bg-[var(--admin-accent)] text-[var(--admin-btn-fg)] shadow-sm"
                : "bg-[var(--admin-inset)] admin-text hover:bg-[var(--admin-inset-2)]"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Refill Schedules &amp; Due Patients
            <span className="rounded-full bg-black/15 px-1.5 py-0.2 text-sm">{schedules.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("missing")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
              activeTab === "missing"
                ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30"
                : "bg-rose-500/10 text-rose-800 dark:text-rose-300 hover:bg-rose-500/20"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Missing Refills &amp; Non-Adherence
            {missingPatients.length > 0 && (
              <span className="rounded-full bg-rose-700 text-white px-1.5 py-0.2 text-sm font-extrabold">
                {missingPatients.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
              activeTab === "history"
                ? "bg-[var(--admin-accent)] text-[var(--admin-btn-fg)] shadow-sm"
                : "bg-[var(--admin-inset)] admin-text hover:bg-[var(--admin-inset-2)]"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Refill History &amp; Dispense Ledgers
            <span className="rounded-full bg-black/15 px-1.5 py-0.2 text-sm">{historyRows.length}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowNewRefillModal(true)}
          className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-110 active:scale-95 sm:w-auto"
        >
          <Plus className="h-4 w-4" /> Record Inbound Refill
        </button>
      </div>

      {/* ── TAB 1: ACTIVE REQUESTS QUEUE ── */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          <RefillFilter counts={refillCounts} active={currentStatusFilter || "all"} search={searchQuery} />

          {activeRefills.length === 0 ? (
            <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-12 text-center space-y-3">
              <Pill className="h-10 w-10 mx-auto text-emerald-600/60" />
              <h3 className="text-sm font-bold admin-text">No active refill requests matching filter</h3>
              <p className="text-sm admin-soft">When customers submit refills online or staff record inbound requests, they appear here.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:hidden">
                {activeRefills.map((r) => (
                  <article
                    key={r.id}
                    className="min-w-0 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 shadow-sm"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-base font-bold admin-text">
                          {r.customerName || r.customerFullName || "Guest"}
                        </p>
                        <div className="mt-1 space-y-1 text-sm admin-soft">
                          {r.phone && <p className="break-all font-mono">{r.phone}</p>}
                          {r.email && <p className="break-all">{r.email}</p>}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-[var(--admin-inset)] px-2.5 py-1 text-sm font-bold capitalize admin-text">
                        {r.status.replaceAll("_", " ")}
                      </span>
                    </div>

                    <div className="mt-4 rounded-xl bg-[var(--admin-inset)] p-3">
                      <p className="text-sm font-semibold uppercase tracking-wide admin-soft">
                        Medication
                      </p>
                      <p className="mt-1 break-words text-base font-bold admin-text">
                        {r.medicineName}
                      </p>
                      <p className="mt-1 break-words text-sm admin-muted">
                        Rx {r.rxReference || "on file"} · {r.source.replaceAll("_", " ")}
                      </p>
                    </div>

                    <div className="mt-3 text-sm admin-soft">
                      Submitted{" "}
                      <span className="font-semibold admin-text">
                        {new Date(r.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {r.notes && (
                      <p className="mt-3 whitespace-normal break-words rounded-xl bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
                        {r.notes}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => setReviewCockpitId(r.id)}
                      className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98]"
                    >
                      <ShieldAlert className="h-4 w-4" /> Review refill request
                    </button>
                  </article>
                ))}
              </div>

              <div
                tabIndex={0}
                role="region"
                aria-label="Scrollable refill records"
                className="admin-table-region hidden overflow-x-auto scroll-admin rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-sm sm:block"
              >
                <table className="table-admin">
                <thead>
                  <tr>
                    <th>Customer / Patient</th>
                    <th>Prescribed Medicine</th>
                    <th>Source</th>
                    <th>Requested Time</th>
                    <th>Status</th>
                    <th>Pharmacist Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRefills.map((r) => (
                    <RefillRow
                      key={r.id}
                      refill={r}
                      onReview={(id) => setReviewCockpitId(id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB 2: REFILL SCHEDULES & DUE PATIENTS ── */}
      {activeTab === "schedules" && (
        <RefillSchedulesTable
          schedules={schedules}
          activeFilter={scheduleFilter}
          onFilterChange={(f) => setScheduleFilter(f)}
          searchQuery={scheduleSearch}
          onSearchChange={(q) => setScheduleSearch(q)}
        />
      )}

      {/* ── TAB 3: MISSING REFILLS & NON-ADHERENCE ── */}
      {activeTab === "missing" && (
        <RefillMissingPatientsTable patients={missingPatients} />
      )}

      {/* ── TAB 4: REFILL HISTORY & DISPENSE LEDGER ── */}
      {activeTab === "history" && (
        <RefillHistoryTable
          history={historyRows}
          searchQuery={historySearch}
          onSearchChange={(q) => setHistorySearch(q)}
        />
      )}

      {/* ── Modals ── */}
      {showNewRefillModal && (
        <NewRefillModal onClose={() => setShowNewRefillModal(false)} />
      )}

      {reviewCockpitId && (
        <RefillReviewCockpit
          refillId={reviewCockpitId}
          onClose={() => setReviewCockpitId(null)}
        />
      )}
    </div>
  );
}

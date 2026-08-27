"use client";

import { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  Pill,
  Send,
  Phone,
  Stethoscope,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowUpDown,
  MessageSquare,
  CheckSquare,
  Square,
  PlusCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "@/app/components/Toaster";
import { formatDate } from "@/app/lib/time";
import {
  PatientContactModal,
  PrescriberContactModal,
  type PatientContactTarget,
  type PrescriberContactTarget,
} from "./RefillContactModal";
import type { RefillScheduleItem } from "@/app/lib/services/refills";

export function RefillSchedulesTable({
  schedules,
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  onInitiateRefill,
}: {
  schedules: RefillScheduleItem[];
  activeFilter?: string;
  onFilterChange?: (filter: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onInitiateRefill?: (sch: RefillScheduleItem) => void;
}) {
  const [internalSearch, setInternalSearch] = useState("");
  const [internalFilter, setInternalFilter] = useState("all");
  const [sortKey, setSortKey] = useState<"daysRemaining" | "name" | "refills">("daysRemaining");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const search = searchQuery !== undefined ? searchQuery : internalSearch;
  const filterStatus = activeFilter !== undefined ? activeFilter : internalFilter;

  function setFilter(f: string) {
    if (onFilterChange) onFilterChange(f);
    else setInternalFilter(f);
  }

  function setSearch(q: string) {
    if (onSearchChange) onSearchChange(q);
    else setInternalSearch(q);
  }

  // Modals state
  const [patientContact, setPatientContact] = useState<PatientContactTarget | null>(null);
  const [prescriberContact, setPrescriberContact] = useState<PrescriberContactTarget | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);

  // Filtered & Sorted rows
  const filtered = useMemo(() => {
    return schedules
      .filter((s) => {
        // Status filter
        if (filterStatus === "due_soon" && s.scheduleStatus !== "due_soon") return false;
        if (filterStatus === "due_today" && s.scheduleStatus !== "due_today") return false;
        if (filterStatus === "overdue" && s.scheduleStatus !== "overdue" && s.scheduleStatus !== "severely_lapsed") return false;
        if (filterStatus === "exhausted" && s.refillsRemaining > 0) return false;
        if (filterStatus === "healthy" && s.scheduleStatus !== "healthy") return false;

        // Search text
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          s.customerName.toLowerCase().includes(q) ||
          s.medicineName.toLowerCase().includes(q) ||
          (s.phone && s.phone.includes(q)) ||
          (s.rxReference && s.rxReference.toLowerCase().includes(q)) ||
          (s.prescriber && s.prescriber.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortKey === "daysRemaining") {
          diff = a.daysRemaining - b.daysRemaining;
        } else if (sortKey === "name") {
          diff = a.customerName.localeCompare(b.customerName);
        } else if (sortKey === "refills") {
          diff = a.refillsRemaining - b.refillsRemaining;
        }
        return sortAsc ? diff : -diff;
      });
  }, [schedules, filterStatus, search, sortKey, sortAsc]);

  function toggleSort(key: "daysRemaining" | "name" | "refills") {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.prescriptionId)));
    }
  }

  function toggleSelectOne(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  async function handleBulkSendReminders() {
    if (selectedIds.size === 0) return;
    const selectedSchedules = schedules.filter((s) => selectedIds.has(s.prescriptionId));
    setBulkSending(true);
    let successCount = 0;

    for (const sch of selectedSchedules) {
      try {
        await fetch("/api/admin/refills/reminder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: sch.customerId,
            prescriptionId: sch.prescriptionId,
            channel: "whatsapp",
            subject: `Prescription Refill Reminder: ${sch.medicineName}`,
            body: `Hello ${sch.customerName.split(" ")[0]}, this is a refill reminder from Aether Pharmacy for ${sch.medicineName}. Your next refill is due soon. Tap here to order: https://aetherpharmacy.com/portal/refills`,
          }),
        });
        successCount++;
      } catch (err) {
        console.error(err);
      }
    }

    setBulkSending(false);
    toast.success(`Successfully dispatched ${successCount} WhatsApp reminders.`);
    setSelectedIds(new Set());
  }

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Chips */}
          {[
            { id: "all", label: "All Schedules", count: schedules.length },
            { id: "due_today", label: "Due Today", count: schedules.filter((s) => s.scheduleStatus === "due_today").length, color: "text-amber-700 bg-amber-500/15" },
            { id: "due_soon", label: "Due Soon (7d)", count: schedules.filter((s) => s.scheduleStatus === "due_soon").length, color: "text-blue-700 bg-blue-500/15" },
            { id: "overdue", label: "Overdue", count: schedules.filter((s) => s.scheduleStatus === "overdue" || s.scheduleStatus === "severely_lapsed").length, color: "text-rose-700 bg-rose-500/15" },
            { id: "exhausted", label: "0 Refills Left", count: schedules.filter((s) => s.refillsRemaining === 0).length, color: "text-purple-700 bg-purple-500/15" },
          ].map((chip) => {
            const active = filterStatus === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setFilter(chip.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  active
                    ? "bg-[var(--admin-accent)] text-[var(--admin-btn-fg)] shadow-sm"
                    : "border border-[var(--admin-border)] bg-[var(--admin-card)] admin-muted hover:bg-[var(--admin-inset)]"
                }`}
              >
                <span>{chip.label}</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${active ? "bg-white/20 text-white" : chip.color || "bg-black/5 admin-soft"}`}>
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, medicine, phone…"
            className="input-admin pl-9 text-xs w-full"
          />
        </div>
      </div>

      {/* Bulk Action Banner */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
              {selectedIds.size} patient {selectedIds.size === 1 ? "schedule" : "schedules"} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs admin-soft hover:underline font-bold px-2"
            >
              Clear
            </button>
            <button
              disabled={bulkSending}
              onClick={handleBulkSendReminders}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {bulkSending ? "Sending…" : `Send WhatsApp Reminders (${selectedIds.size})`}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-inset)]/60 text-[11px] font-bold uppercase tracking-wider admin-soft">
                <th className="py-3 px-3.5 w-8">
                  <button onClick={toggleSelectAll} className="flex items-center">
                    {selectedIds.size > 0 && selectedIds.size === filtered.length ? (
                      <CheckSquare className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Square className="h-4 w-4 admin-soft" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3 cursor-pointer select-none" onClick={() => toggleSort("name")}>
                  <span className="flex items-center gap-1">
                    Patient &amp; Contact <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </span>
                </th>
                <th className="py-3 px-3">Medication &amp; Regimen</th>
                <th className="py-3 px-3 cursor-pointer select-none" onClick={() => toggleSort("refills")}>
                  <span className="flex items-center gap-1">
                    Refills Left <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </span>
                </th>
                <th className="py-3 px-3 cursor-pointer select-none" onClick={() => toggleSort("daysRemaining")}>
                  <span className="flex items-center gap-1">
                    Supply Countdown &amp; Due Date <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </span>
                </th>
                <th className="py-3 px-3">Stock Buffer</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center admin-soft">
                    <Pill className="mx-auto h-8 w-8 opacity-40 mb-2" />
                    <p className="font-bold text-xs">No refill schedules matching criteria</p>
                    <p className="text-[11px] mt-0.5">Try changing filters or search terms</p>
                  </td>
                </tr>
              ) : (
                filtered.map((sch) => {
                  const isSelected = selectedIds.has(sch.prescriptionId);
                  const daysRem = sch.daysRemaining;
                  const totalDays = sch.daysSupply || 30;
                  const supplyPercent = Math.max(0, Math.min(100, Math.round((daysRem / totalDays) * 100)));

                  const barColor =
                    daysRem > 7
                      ? "bg-emerald-500"
                      : daysRem > 3
                        ? "bg-blue-500"
                        : daysRem >= 0
                          ? "bg-amber-500"
                          : "bg-rose-500";

                  return (
                    <tr
                      key={sch.prescriptionId}
                      className={`group transition hover:bg-[var(--admin-hover)] ${
                        isSelected ? "bg-emerald-500/5" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3.5">
                        <button onClick={() => toggleSelectOne(sch.prescriptionId)} className="flex items-center">
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Square className="h-4 w-4 admin-soft group-hover:text-emerald-500" />
                          )}
                        </button>
                      </td>

                      {/* Patient */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-inset)] font-bold text-xs admin-text border border-[var(--admin-border)]">
                            {sch.customerName.charAt(0)}
                          </div>
                          <div>
                            <strong className="admin-text font-bold block">{sch.customerName}</strong>
                            <span className="font-mono text-[10px] admin-soft block">
                              {sch.phone || sch.email || "No direct phone"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Medication */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <strong className="admin-text font-bold text-xs">{sch.medicineName}</strong>
                          <div className="flex items-center gap-1.5 text-[10px] admin-soft">
                            <span>{sch.dosage || "Standard Dose"}</span>
                            <span>•</span>
                            <span className="font-mono">Rx {sch.rxReference || "On File"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Refills remaining */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              sch.refillsRemaining > 2
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : sch.refillsRemaining > 0
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                  : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                            }`}
                          >
                            {sch.refillsRemaining} remaining
                          </span>
                        </div>
                        {sch.refillsRemaining === 0 && (
                          <span className="text-[9px] font-bold text-rose-600 block mt-0.5">
                            Prescriber renewal required
                          </span>
                        )}
                      </td>

                      {/* Supply Countdown */}
                      <td className="py-3 px-3">
                        <div className="space-y-1 min-w-[140px]">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className={`font-bold ${
                              daysRem < 0 ? "text-rose-600" : daysRem <= 3 ? "text-amber-600" : "text-emerald-700"
                            }`}>
                              {sch.statusLabel}
                            </span>
                            <span className="admin-soft font-mono">
                              {formatDate(sch.nextRefillDue || sch.projectedRunOutDate)}
                            </span>
                          </div>
                          {/* Visual Bar */}
                          <div className="h-1.5 w-full rounded-full bg-[var(--admin-inset)] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${barColor}`}
                              style={{ width: `${daysRem < 0 ? 100 : supplyPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Stock Buffer */}
                      <td className="py-3 px-3">
                        {sch.currentStock !== null ? (
                          <div className="text-[10px] space-y-0.5">
                            <span className={`font-bold ${sch.currentStock > 10 ? "text-emerald-700" : "text-amber-700"}`}>
                              {sch.currentStock} units on hand
                            </span>
                            <span className="block text-[9px] admin-soft">FEFO Verified</span>
                          </div>
                        ) : (
                          <span className="text-[10px] admin-soft">Unlinked item</span>
                        )}
                      </td>

                      {/* Action Triggers */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* 💬 Patient Contact */}
                          <button
                            title="Contact Patient (WhatsApp/SMS)"
                            onClick={() =>
                              setPatientContact({
                                customerId: sch.customerId,
                                customerName: sch.customerName,
                                phone: sch.phone,
                                email: sch.email,
                                medicineName: sch.medicineName,
                                prescriptionId: sch.prescriptionId,
                                dueDateStr: formatDate(sch.nextRefillDue || sch.projectedRunOutDate) || undefined,
                              })
                            }
                            className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-inset)] p-1.5 admin-muted hover:border-emerald-500 hover:text-emerald-600 transition"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>

                          {/* 🩺 Prescriber Auth */}
                          <button
                            title="Contact Prescriber for Authorization"
                            onClick={() =>
                              setPrescriberContact({
                                prescriptionId: sch.prescriptionId,
                                customerName: sch.customerName,
                                medicineName: sch.medicineName,
                                dosage: sch.dosage,
                                rxReference: sch.rxReference,
                                lastFilledDateStr: formatDate(sch.lastFilledAt) || undefined,
                                prescriber: sch.prescriber,
                                prescriberPhone: sch.prescriberPhone,
                                prescriberEmail: sch.prescriberEmail,
                                prescriberFacility: sch.prescriberFacility,
                                prescriberLicense: sch.prescriberLicense,
                              })
                            }
                            className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-inset)] p-1.5 admin-muted hover:border-blue-500 hover:text-blue-600 transition"
                          >
                            <Stethoscope className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Contact Modal */}
      {patientContact && (
        <PatientContactModal
          target={patientContact}
          onClose={() => setPatientContact(null)}
        />
      )}

      {/* Prescriber Contact Modal */}
      {prescriberContact && (
        <PrescriberContactModal
          target={prescriberContact}
          onClose={() => setPrescriberContact(null)}
        />
      )}
    </div>
  );
}

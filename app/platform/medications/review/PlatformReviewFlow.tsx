"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  GitMerge,
  HelpCircle,
  Layers,
  Loader2,
  Pill,
  RefreshCw,
  Search,
  ShieldAlert,
  Store,
  X,
} from "lucide-react";
import { toast } from "@/app/components/Toaster";
import ConfirmDialog from "@/app/components/admin/ConfirmDialog";

export type ReviewItem = {
  id: string;
  name: string;
  genericName: string;
  brandName: string | null;
  strengthDisplay: string | null;
  packSize: string | null;
  category: string;
  barcode: string | null;
  imageUrl: string | null;
  status: string;
  controlledDrug: boolean;
  controlledDrugSchedule: string | null;
  enrichmentStatus: string;
  enrichmentScore: number;
  acquisitionMethod: string;
  createdAt: string;
  updatedAt: string;
  dosageForm: { id: string; value: string } | null;
  manufacturer: { id: string; name: string } | null;
  activeIngredients: Array<{
    amount: string | null;
    unit: string | null;
    activeIngredient: { name: string };
  }>;
  _count: { pharmacyInventory: number };
  candidateMatches: Array<{
    id: string;
    name: string;
    genericName: string;
    brandName: string | null;
    strengthDisplay: string | null;
    dosageForm: { value: string } | null;
    manufacturer: { name: string } | null;
    barcode: string | null;
    imageUrl: string | null;
    status: string;
    pharmacyCount: number;
  }>;
};

type Props = {
  items: ReviewItem[];
  total: number;
};

export function PlatformReviewFlow({ items, total }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string } | null>(null);

  // Merge modal state
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [activeDuplicate, setActiveDuplicate] = useState<ReviewItem | null>(null);
  const [selectedSurvivorId, setSelectedSurvivorId] = useState<string>("");
  const [mergeReason, setMergeReason] = useState<string>("Duplicate canonical entry consolidated via review queue");

  const filteredItems = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.genericName.toLowerCase().includes(q) ||
      (item.barcode && item.barcode.includes(q)) ||
      (item.brandName && item.brandName.toLowerCase().includes(q))
    );
  });

  async function handleApprove(id: string, name: string) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/platform/medications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to approve medication.");
      }

      toast.success(`"${name}" is now Active.`);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error(err.message || "Approval failed.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleArchive(id: string, name: string) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/platform/medications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to archive medication.");
      }

      toast.success(`"${name}" archived.`);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error(err.message || "Archive failed.");
    } finally {
      setActionLoading(null);
    }
  }

  function openMergeModal(duplicate: ReviewItem, defaultSurvivorId?: string) {
    setActiveDuplicate(duplicate);
    setSelectedSurvivorId(defaultSurvivorId || duplicate.candidateMatches[0]?.id || "");
    setMergeReason("Consolidated duplicate medication master");
    setMergeModalOpen(true);
  }

  async function handleExecuteMerge() {
    if (!activeDuplicate || !selectedSurvivorId) {
      toast.error("Please select a survivor medication record.");
      return;
    }

    setActionLoading("merging");
    try {
      const res = await fetch("/api/platform/medications/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          survivorId: selectedSurvivorId,
          duplicateId: activeDuplicate.id,
          reason: mergeReason,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to execute duplicate merge.");
      }

      await res.json();
      toast.success("Duplicate successfully merged into survivor record.");
      setMergeModalOpen(false);
      setActiveDuplicate(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error(err.message || "Merge execution failed.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--admin-text)]">
              {total} Medication{total === 1 ? "" : "s"} Requiring Review
            </h3>
            <p className="text-xs text-[var(--admin-muted)]">
              Entries flagged during CSV onboarding due to ambiguous names, potential duplicates, or incomplete clinical metadata.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--admin-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter review queue..."
              className="h-9 w-64 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] pl-9 pr-3 text-xs text-[var(--admin-text)] outline-none transition focus:border-[var(--admin-accent)]"
            />
          </div>
        </div>
      </div>

      {/* Review Queue Items List */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-card)] py-16 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <h4 className="mt-3 text-sm font-semibold text-[var(--admin-text)]">Review Queue Clear</h4>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            {search ? "No review items match your search filter." : "There are currently no medications flagged for review."}
          </p>
          <Link
            href="/platform/medications"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-3.5 py-2 text-xs font-semibold text-[var(--admin-text)] transition hover:bg-[var(--admin-hover)]"
          >
            Return to Registry
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const hasCandidates = item.candidateMatches.length > 0;
            const isProcessing = actionLoading === item.id;

            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-xs transition hover:border-[var(--admin-border-strong,var(--admin-border))]"
              >
                {/* Header & Main Info */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <Link
                        href={`/platform/medications/${item.id}`}
                        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-bg)]"
                        aria-label={`Open ${item.name}`}
                      >
                        {item.imageUrl ? (
                          <Image unoptimized src={item.imageUrl} alt={item.name} fill sizes="80px" className="object-contain p-2" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center"><Pill className="h-5 w-5 text-[var(--admin-muted)]" /></span>
                        )}
                      </Link>
                      <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                          Needs Review
                        </span>
                        {item.controlledDrug && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                            Controlled ({item.controlledDrugSchedule || "CD"})
                          </span>
                        )}
                        <span className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-bg)] px-2 py-0.5 text-[11px] text-[var(--admin-muted)] font-mono">
                          {item.category}
                        </span>
                      </div>

                      <h4 className="text-base font-semibold text-[var(--admin-text)]">
                        {item.name}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--admin-muted)]">
                        <div>
                          <span className="font-medium text-[var(--admin-text)]">Generic:</span> {item.genericName}
                        </div>
                        {item.brandName && (
                          <div>
                            <span className="font-medium text-[var(--admin-text)]">Brand:</span> {item.brandName}
                          </div>
                        )}
                        {item.strengthDisplay && (
                          <div>
                            <span className="font-medium text-[var(--admin-text)]">Strength:</span> {item.strengthDisplay}
                          </div>
                        )}
                        {item.dosageForm && (
                          <div>
                            <span className="font-medium text-[var(--admin-text)]">Form:</span> {item.dosageForm.value}
                          </div>
                        )}
                        {item.manufacturer && (
                          <div>
                            <span className="font-medium text-[var(--admin-text)]">Mfr:</span> {item.manufacturer.name}
                          </div>
                        )}
                        {item.barcode && (
                          <div>
                            <span className="font-medium text-[var(--admin-text)]">Barcode:</span>{" "}
                            <code className="font-mono text-[11px]">{item.barcode}</code>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Store className="h-3.5 w-3.5" />
                          <span>Used by {item._count.pharmacyInventory} pharmacies</span>
                        </div>
                      </div>

                      {item.activeIngredients.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
                          <span className="text-[var(--admin-muted)]">Active Ingredients:</span>
                          {item.activeIngredients.map((ai, idx) => (
                            <span
                              key={idx}
                              className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-bg)] px-1.5 py-0.5 text-[11px] text-[var(--admin-text)]"
                            >
                              {ai.activeIngredient.name} {ai.amount} {ai.unit}
                            </span>
                          ))}
                        </div>
                      )}
                      </div>
                    </div>

                    {/* Actions toolbar */}
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href={`/platform/medications/${item.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-text)] transition hover:bg-[var(--admin-hover)]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => openMergeModal(item)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-500/20 dark:text-indigo-300"
                      >
                        <GitMerge className="h-3.5 w-3.5" />
                        <span>Merge...</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleApprove(item.id, item.name)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        <span>Approve</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setArchiveTarget({ id: item.id, name: item.name })}
                        className="inline-flex items-center rounded-xl p-1.5 text-[var(--admin-muted)] transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 disabled:opacity-50"
                        title="Archive record"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Candidate Duplicates Box */}
                {hasCandidates && (
                  <div className="border-t border-[var(--admin-border)] bg-[var(--admin-bg)]/50 p-4 sm:px-5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                      <GitMerge className="h-4 w-4" />
                      <span>Potential Existing Canonical Matches Detected:</span>
                    </div>

                    <div className="mt-2.5 space-y-2">
                      {item.candidateMatches.map((cand) => (
                        <div
                          key={cand.id}
                          className="flex flex-col gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-start gap-2.5 text-xs">
                            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)]">
                              {cand.imageUrl ? (
                                <Image unoptimized src={cand.imageUrl} alt={cand.name} fill sizes="48px" className="object-contain p-1" />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center"><Pill className="h-4 w-4 text-[var(--admin-muted)]" /></span>
                              )}
                            </span>
                            <div className="min-w-0">
                            <div className="flex items-center gap-2 font-medium text-[var(--admin-text)]">
                              <span>{cand.name}</span>
                              <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                                {cand.status}
                              </span>
                              {cand.pharmacyCount > 0 && (
                                <span className="text-[11px] text-[var(--admin-muted)]">
                                  ({cand.pharmacyCount} pharmacies)
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-[var(--admin-muted)]">
                              <span>Generic: {cand.genericName}</span>
                              {cand.strengthDisplay && <span>Strength: {cand.strengthDisplay}</span>}
                              {cand.dosageForm && <span>Form: {cand.dosageForm.value}</span>}
                              {cand.manufacturer && <span>Mfr: {cand.manufacturer.name}</span>}
                              {cand.barcode && <span>Barcode: {cand.barcode}</span>}
                            </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => openMergeModal(item, cand.id)}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-500"
                          >
                            <GitMerge className="h-3.5 w-3.5" />
                            <span>Merge into this</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => {
          const target = archiveTarget;
          if (!target) return;
          setArchiveTarget(null);
          void handleArchive(target.id, target.name);
        }}
        title="Archive medication"
        message={archiveTarget ? `Archive “${archiveTarget.name}”? It will leave the active registry but remain available for audit history.` : ""}
        confirmLabel="Archive medication"
        busy={Boolean(archiveTarget && actionLoading === archiveTarget.id)}
        tone="warning"
      />

      {/* Merge Modal */}
      {mergeModalOpen && activeDuplicate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <GitMerge className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--admin-text)]">Consolidate Duplicate Canonical Master</h3>
                  <p className="text-xs text-[var(--admin-muted)]">
                    Safely relinks inventory and archives the duplicate without breaking pharmacy records.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMergeModalOpen(false)}
                className="rounded-lg p-1.5 text-[var(--admin-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5 text-xs">
              {/* Duplicate summary */}
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                <div className="font-semibold text-rose-800 dark:text-rose-200">
                  Duplicate Record to be Archived:
                </div>
                <div className="mt-1 font-medium text-[var(--admin-text)]">{activeDuplicate.name}</div>
                <div className="mt-0.5 text-[var(--admin-muted)]">
                  Generic: {activeDuplicate.genericName} | Strength: {activeDuplicate.strengthDisplay || "N/A"} | ID:{" "}
                  <code className="font-mono text-[10px]">{activeDuplicate.id}</code>
                </div>
              </div>

              {/* Survivor selection */}
              <div>
                <label className="block font-semibold text-[var(--admin-text)]">
                  Select Surviving Canonical Master:
                </label>
                <div className="mt-2 space-y-2">
                  {activeDuplicate.candidateMatches.map((cand) => (
                    <label
                      key={cand.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                        selectedSurvivorId === cand.id
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-[var(--admin-border)] hover:bg-[var(--admin-hover)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="survivor"
                        value={cand.id}
                        checked={selectedSurvivorId === cand.id}
                        onChange={() => setSelectedSurvivorId(cand.id)}
                        className="mt-0.5 text-indigo-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-medium text-[var(--admin-text)]">
                          <span>{cand.name}</span>
                          <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                            {cand.status}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--admin-muted)]">
                          Generic: {cand.genericName} | Mfr: {cand.manufacturer?.name || "N/A"} | Stocked by{" "}
                          {cand.pharmacyCount} pharmacies
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Merge Reason */}
              <div>
                <label className="block font-semibold text-[var(--admin-text)]">Merge Justification / Audit Note:</label>
                <input
                  type="text"
                  value={mergeReason}
                  onChange={(e) => setMergeReason(e.target.value)}
                  placeholder="e.g. Duplicate generic variant imported from supplier list"
                  className="mt-1 h-9 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 text-xs text-[var(--admin-text)] outline-none focus:border-[var(--admin-accent)]"
                />
              </div>

              {/* Safety notice */}
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-amber-800 dark:text-amber-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  All pharmacy inventory rows, active ingredients, and clinical tags linked to the duplicate will be
                  safely repointed to the survivor master. The duplicate record will be marked archived with its
                  mergedIntoId set.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-[var(--admin-border)] bg-[var(--admin-bg)]/50 px-5 py-3.5">
              <button
                type="button"
                onClick={() => setMergeModalOpen(false)}
                className="rounded-xl border border-[var(--admin-border)] px-3.5 py-2 text-xs font-semibold text-[var(--admin-text)] transition hover:bg-[var(--admin-hover)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedSurvivorId || actionLoading === "merging"}
                onClick={handleExecuteMerge}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {actionLoading === "merging" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GitMerge className="h-4 w-4" />
                )}
                <span>Confirm & Execute Merge</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

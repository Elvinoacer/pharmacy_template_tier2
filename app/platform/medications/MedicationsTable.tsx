"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Archive,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  Layers,
  MoreVertical,
  Pill,
  Search,
  SlidersHorizontal,
  Store,
} from "lucide-react";
import { toast } from "@/app/components/Toaster";
import type { PlatformMedicationStatus } from "@/app/lib/services/platform-medication-library";

type MedicationItem = {
  id: string;
  name: string;
  slug: string;
  genericName: string;
  brandName: string | null;
  strengthDisplay: string | null;
  packSize: string | null;
  category: string;
  barcode: string | null;
  status: string;
  controlledDrug: boolean;
  controlledDrugSchedule: string | null;
  enrichmentStatus: string;
  enrichmentScore: number;
  acquisitionMethod: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  dosageForm: { id: string; value: string } | null;
  manufacturer: { id: string; name: string } | null;
  _count: { pharmacyInventory: number };
};

type Props = {
  items: MedicationItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  categories: Array<{ slug: string; name: string }>;
  dosageForms: Array<{ id: string; value: string }>;
  manufacturers: Array<{ id: string; name: string }>;
};

export function MedicationsTable({
  items,
  total,
  page,
  pageSize,
  totalPages,
  categories,
  dosageForms,
  manufacturers,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<PlatformMedicationStatus | "">("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");

  function updateQuery(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    // reset to page 1 on filter changes unless page was explicitly set
    if (!("page" in updates)) {
      params.set("page", "1");
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateQuery({ search: searchQuery });
  }

  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  }

  function toggleSelectRow(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  async function handleBulkApply() {
    if (!bulkAction || selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/platform/medications/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          status: bulkAction,
          reason: `Platform admin bulk status change to ${bulkAction}`,
        }),
      });
      if (!res.ok) throw new Error("Bulk update failed.");
      const payload = await res.json();
      toast.success(`Updated status of ${payload.count} medications to ${bulkAction}.`);
      setSelectedIds(new Set());
      setBulkAction("");
      router.refresh();
    } catch (err) {
      toast.error("Failed to apply bulk action.");
    } finally {
      setBulkLoading(false);
    }
  }

  function statusBadge(status: string) {
    switch (status) {
      case "active":
        return <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" /> active</span>;
      case "needs_review":
        return <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400"><AlertCircle className="h-3 w-3" /> needs review</span>;
      case "deprecated":
        return <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:text-orange-400"><Clock className="h-3 w-3" /> deprecated</span>;
      case "archived":
        return <span className="inline-flex items-center gap-1 rounded-md bg-slate-500/10 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-400"><Archive className="h-3 w-3" /> archived</span>;
      default:
        return <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{status}</span>;
    }
  }

  function enrichmentBadge(score: number, status: string) {
    const color =
      status === "complete"
        ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
        : status === "partial"
          ? "border-amber-500/30 text-amber-700 dark:text-amber-300"
          : "border-slate-500/30 text-slate-600 dark:text-slate-400";
    return (
      <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${color}`}>
        {score}% {status}
      </span>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 shadow-[var(--admin-shadow)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--admin-text-soft)]" />
            <input
              type="text"
              placeholder="Search by name, generic, brand, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] pl-9 pr-20 py-2 text-sm text-[var(--admin-text)] placeholder-[var(--admin-text-soft)] focus:border-[var(--admin-accent)] focus:outline-none"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 rounded-lg bg-[var(--admin-accent)] px-2.5 py-1 text-xs font-medium text-white shadow-sm hover:brightness-105"
            >
              Search
            </button>
          </form>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={searchParams.get("status") || "all"}
              onChange={(e) => updateQuery({ status: e.target.value })}
              className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-2.5 py-2 text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="needs_review">Needs review</option>
              <option value="deprecated">Deprecated</option>
              <option value="archived">Archived</option>
            </select>

            <select
              value={searchParams.get("category") || "all"}
              onChange={(e) => updateQuery({ category: e.target.value })}
              className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-2.5 py-2 text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={searchParams.get("dosageFormId") || "all"}
              onChange={(e) => updateQuery({ dosageFormId: e.target.value })}
              className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-2.5 py-2 text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            >
              <option value="all">All dosage forms</option>
              {dosageForms.map((df) => (
                <option key={df.id} value={df.id}>
                  {df.value}
                </option>
              ))}
            </select>

            <select
              value={searchParams.get("missingData") || "all"}
              onChange={(e) => updateQuery({ missingData: e.target.value })}
              className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-2.5 py-2 text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            >
              <option value="all">Any data completeness</option>
              <option value="barcode">Missing barcode</option>
              <option value="manufacturer">Missing manufacturer</option>
              <option value="route">Missing route</option>
              <option value="images">Missing image</option>
              <option value="strength">Missing strength</option>
              <option value="incomplete">Incomplete / Minimal</option>
            </select>

            <select
              value={searchParams.get("controlledDrug") || "all"}
              onChange={(e) => updateQuery({ controlledDrug: e.target.value })}
              className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-2.5 py-2 text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            >
              <option value="all">All drug types</option>
              <option value="true">Controlled drugs only</option>
              <option value="false">Non-controlled only</option>
            </select>

            <select
              value={searchParams.get("enrichmentStatus") || "all"}
              onChange={(e) => updateQuery({ enrichmentStatus: e.target.value })}
              className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-2.5 py-2 text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            >
              <option value="all">All enrichment</option>
              <option value="complete">Complete (80%+)</option>
              <option value="partial">Partial (40-79%)</option>
              <option value="minimal">Minimal (&lt;40%)</option>
            </select>

            <select
              value={searchParams.get("manufacturerId") || "all"}
              onChange={(e) => updateQuery({ manufacturerId: e.target.value })}
              className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-2.5 py-2 text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            >
              <option value="all">All manufacturers</option>
              {manufacturers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <select
              value={searchParams.get("acquisitionMethod") || "all"}
              onChange={(e) => updateQuery({ acquisitionMethod: e.target.value })}
              className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-2.5 py-2 text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            >
              <option value="all">All acquisition methods</option>
              <option value="platform_csv_import">CSV Import</option>
              <option value="manual">Manual Entry</option>
              <option value="seed">Initial Seed</option>
              <option value="unknown">Unknown</option>
            </select>

            <select
              value={searchParams.get("createdFrom") ? "range" : "all"}
              onChange={(e) => {
                if (e.target.value === "today") {
                  const d = new Date();
                  d.setHours(0, 0, 0, 0);
                  updateQuery({ createdFrom: d.toISOString(), createdTo: null });
                } else if (e.target.value === "week") {
                  const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                  updateQuery({ createdFrom: d.toISOString(), createdTo: null });
                } else if (e.target.value === "month") {
                  const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                  updateQuery({ createdFrom: d.toISOString(), createdTo: null });
                } else {
                  updateQuery({ createdFrom: null, createdTo: null });
                }
              }}
              className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-2.5 py-2 text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            >
              <option value="all">Any time created</option>
              <option value="today">Created today</option>
              <option value="week">Created past 7 days</option>
              <option value="month">Created past 30 days</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Toolbar */}
        {selectedIds.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--admin-accent)]/30 bg-[var(--admin-accent)]/5 p-2.5">
            <span className="text-xs font-semibold text-[var(--admin-accent)]">
              {selectedIds.size} selected
            </span>
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value as PlatformMedicationStatus)}
              className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-panel)] px-2.5 py-1 text-xs text-[var(--admin-text)]"
            >
              <option value="">Choose bulk status action...</option>
              <option value="active">Mark Active</option>
              <option value="needs_review">Mark Needs Review</option>
              <option value="deprecated">Mark Deprecated</option>
              <option value="archived">Mark Archived</option>
            </select>
            <button
              type="button"
              disabled={!bulkAction || bulkLoading}
              onClick={handleBulkApply}
              className="rounded-lg bg-[var(--admin-accent)] px-3 py-1 text-xs font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
            >
              {bulkLoading ? "Applying..." : "Apply to selected"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-[var(--admin-text-muted)] hover:underline"
            >
              Deselect all
            </button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-[var(--admin-shadow)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-panel)] text-[var(--admin-text-soft)]">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all on this page"
                    className="rounded border-[var(--admin-border)]"
                  />
                </th>
                <th className="px-3 py-3 font-semibold uppercase tracking-wider">
                  <button
                    onClick={() => updateQuery({ sort: "name", sortDir: searchParams.get("sortDir") === "asc" ? "desc" : "asc" })}
                    className="inline-flex items-center gap-1 hover:text-[var(--admin-text)]"
                  >
                    Medicine Name <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-3 py-3 font-semibold uppercase tracking-wider">Generic & Strength</th>
                <th className="px-3 py-3 font-semibold uppercase tracking-wider">Form / Category</th>
                <th className="px-3 py-3 font-semibold uppercase tracking-wider">Barcode</th>
                <th className="px-3 py-3 font-semibold uppercase tracking-wider">Status</th>
                <th className="px-3 py-3 font-semibold uppercase tracking-wider">Enrichment</th>
                <th className="px-3 py-3 font-semibold uppercase tracking-wider">Adoption</th>
                <th className="px-3 py-3 text-right font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-[var(--admin-text-muted)]">
                    <Pill className="mx-auto h-8 w-8 opacity-30 mb-2" />
                    <p className="font-semibold text-sm">No medications match your filters</p>
                    <p className="mt-1 text-xs">Try broadening your search query or clearing some filters.</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isChecked = selectedIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-[var(--admin-hover)] ${
                        isChecked ? "bg-[var(--admin-accent)]/5" : ""
                      }`}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectRow(item.id)}
                          aria-label={`Select ${item.name}`}
                          className="rounded border-[var(--admin-border)]"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/platform/medications/${item.id}`}
                          className="font-semibold text-[var(--admin-text)] hover:text-[var(--admin-accent)] hover:underline"
                        >
                          {item.name}
                        </Link>
                        {item.brandName && (
                          <span className="block text-[11px] text-[var(--admin-text-soft)]">
                            Brand: {item.brandName}
                          </span>
                        )}
                        {item.manufacturer && (
                          <span className="block text-[10px] text-[var(--admin-text-soft)]">
                            Mfg: {item.manufacturer.name}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-medium text-[var(--admin-text)]">{item.genericName}</span>
                        {item.strengthDisplay && (
                          <span className="block text-[11px] text-[var(--admin-text-muted)]">
                            {item.strengthDisplay}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded bg-[var(--admin-panel)] px-1.5 py-0.5 font-medium text-[var(--admin-text)]">
                          {item.dosageForm?.value || "—"}
                        </span>
                        <span className="block mt-0.5 text-[10px] text-[var(--admin-text-soft)]">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {item.barcode ? (
                          <code className="rounded bg-[var(--admin-panel)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--admin-text)]">
                            {item.barcode}
                          </code>
                        ) : (
                          <span className="text-[11px] text-[var(--admin-text-soft)] italic">Missing</span>
                        )}
                      </td>
                      <td className="px-3 py-3">{statusBadge(item.status)}</td>
                      <td className="px-3 py-3">{enrichmentBadge(item.enrichmentScore, item.enrichmentStatus)}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                            item._count.pharmacyInventory > 0
                              ? "bg-teal-500/10 text-teal-700 dark:text-teal-300"
                              : "bg-slate-500/10 text-slate-500"
                          }`}
                        >
                          <Store className="h-3 w-3" />
                          {item._count.pharmacyInventory} {item._count.pharmacyInventory === 1 ? "pharmacy" : "pharmacies"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/platform/medications/${item.id}`}
                            className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-panel)] px-2.5 py-1 text-xs font-medium text-[var(--admin-text)] hover:bg-[var(--admin-hover)]"
                          >
                            Edit
                          </Link>
                          {item.status === "needs_review" && (
                            <Link
                              href={`/platform/medications/review?duplicateId=${item.id}`}
                              className="rounded-lg bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
                            >
                              Review
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--admin-border)] bg-[var(--admin-panel)] px-4 py-3 sm:flex-row">
          <div className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)]">
            <span>
              Showing {total > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(page * pageSize, total)} of {total.toLocaleString()} medications
            </span>
            <span className="text-[var(--admin-text-soft)]">|</span>
            <label className="flex items-center gap-1">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => updateQuery({ pageSize: e.target.value, page: "1" })}
                className="rounded border border-[var(--admin-border)] bg-[var(--admin-card)] px-1.5 py-0.5 text-xs text-[var(--admin-text)]"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </label>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || isPending}
              onClick={() => updateQuery({ page: String(page - 1) })}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] px-2.5 py-1 text-xs font-medium text-[var(--admin-text)] hover:bg-[var(--admin-hover)] disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <span className="px-2 text-xs font-semibold text-[var(--admin-text)]">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || isPending}
              onClick={() => updateQuery({ page: String(page + 1) })}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] px-2.5 py-1 text-xs font-medium text-[var(--admin-text)] hover:bg-[var(--admin-hover)] disabled:opacity-40"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

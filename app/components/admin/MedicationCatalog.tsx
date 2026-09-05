"use client";

/**
 * Medication catalog browser — table (default) + card views with images,
 * stock signals, Rx/OTC badges, prescription counts, and bulk actions.
 *
 * View preference is stored in localStorage so list-oriented staff stay on
 * the dense table, while visual shoppers can flip to cards.
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Archive,
  Boxes,
  CheckSquare,
  Eye,
  EyeOff,
  FileText,
  LayoutGrid,
  List,
  Package,
  Pencil,
  Pill,
  Shield,
  Snowflake,
  Square,
  Tag,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "@/app/components/Toaster";
import ConfirmSubmitButton from "@/app/components/admin/ConfirmSubmitButton";
import { formatPrice } from "@/app/lib/format";

export type CatalogMed = {
  id: string;
  name: string;
  genericName: string;
  brandName: string | null;
  strengthDisplay: string | null;
  packSize: string | null;
  category: string;
  imageUrl: string | null;
  dosageForm: string | null;
  manufacturer: string | null;
  barcode: string | null;
  sku: string | null;
  shelfLocation: string | null;
  supplier: string | null;
  price: number;
  purchasePrice: number | null;
  currentStock: number;
  lowStockThreshold: number;
  overTheCounter: boolean;
  prescriptionRequired: boolean;
  publicListing: boolean;
  active: boolean;
  controlledDrug: boolean;
  controlledDrugSchedule: string | null;
  pediatricUse: boolean;
  requiresRefrigeration: boolean;
  enrichmentStatus: string;
  enrichmentScore: number;
  prescriptionCount: number;
  orderItemCount: number;
};

type ViewMode = "table" | "cards";
const VIEW_KEY = "admin.medications.view";

type Props = {
  rows: CatalogMed[];
  deleteAction: (formData: FormData) => Promise<void>;
};

function stockTone(stock: number, threshold: number): {
  label: string;
  className: string;
  bar: string;
} {
  if (stock <= 0) {
    return {
      label: "Out of stock",
      className: "text-rose-600 dark:text-rose-400",
      bar: "bg-rose-500",
    };
  }
  if (stock <= threshold) {
    return {
      label: "Low stock",
      className: "text-amber-600 dark:text-amber-400",
      bar: "bg-amber-500",
    };
  }
  return {
    label: "In stock",
    className: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
  };
}

function stockPct(stock: number, threshold: number): number {
  // Visual fill relative to a healthy buffer (2× threshold), capped at 100%.
  const healthy = Math.max(threshold * 2, 20);
  return Math.max(0, Math.min(100, Math.round((stock / healthy) * 100)));
}

function MedThumb({
  src,
  name,
  size = "md",
  fill = false,
}: {
  src: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  /** Fill parent (used for card hero images). */
  fill?: boolean;
}) {
  if (fill) {
    if (src) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      );
    }
    return (
      <div
        className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-500/15 via-[var(--admin-inset)] to-teal-500/10"
        aria-hidden
      >
        <Pill className="h-10 w-10 admin-soft opacity-60" />
      </div>
    );
  }

  const dim = size === "sm" ? "h-10 w-10" : size === "lg" ? "h-16 w-16" : "h-12 w-12";

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={`${dim} shrink-0 rounded-lg object-cover bg-[var(--admin-inset)] ring-1 ring-[var(--admin-border-2)]`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/10 ring-1 ring-[var(--admin-border-2)]`}
      aria-hidden
    >
      <Pill className="h-4 w-4 admin-soft" />
    </div>
  );
}

function StatusBadges({ m }: { m: CatalogMed }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {m.overTheCounter ? (
        <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <Boxes className="h-2.5 w-2.5" /> OTC
        </span>
      ) : m.prescriptionRequired ? (
        <span className="inline-flex items-center gap-0.5 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-400">
          <FileText className="h-2.5 w-2.5" /> Rx
        </span>
      ) : null}
      {m.controlledDrug && (
        <span
          className="inline-flex items-center gap-0.5 rounded-md bg-rose-500/10 px-1.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-400"
          title={m.controlledDrugSchedule || "Controlled"}
        >
          <Shield className="h-2.5 w-2.5" />
          {m.controlledDrugSchedule
            ? m.controlledDrugSchedule.replace("schedule_", "S")
            : "CD"}
        </span>
      )}
      {m.publicListing && (
        <span className="inline-flex items-center gap-0.5 rounded-md bg-blue-500/10 px-1.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
          <Tag className="h-2.5 w-2.5" /> Public
        </span>
      )}
      {m.requiresRefrigeration && (
        <span className="inline-flex items-center gap-0.5 rounded-md bg-sky-500/10 px-1.5 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-400">
          <Snowflake className="h-2.5 w-2.5" /> Cold
        </span>
      )}
      {!m.active && (
        <span className="inline-flex items-center rounded-md bg-slate-500/10 px-1.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
          Inactive
        </span>
      )}
      {m.enrichmentStatus !== "complete" && m.enrichmentScore < 70 && (
        <span
          className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400"
          title={`Enrichment ${m.enrichmentScore}% · ${m.enrichmentStatus}`}
        >
          <AlertTriangle className="h-2.5 w-2.5" /> {m.enrichmentScore}%
        </span>
      )}
    </div>
  );
}

function StockCell({ m }: { m: CatalogMed }) {
  const tone = stockTone(m.currentStock, m.lowStockThreshold);
  const pct = stockPct(m.currentStock, m.lowStockThreshold);
  return (
    <div className="min-w-[7rem]">
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-sm font-bold tabular-nums ${tone.className}`}>
          {m.currentStock}
        </span>
        <span className="text-xs admin-soft">≤{m.lowStockThreshold}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--admin-inset)]">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`mt-0.5 text-xs font-medium ${tone.className}`}>{tone.label}</p>
    </div>
  );
}

export function MedicationCatalog({ rows, deleteAction }: Props) {
  const [view, setView] = useState<ViewMode>("table");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "table" || saved === "cards") setView(saved);
    } catch {
      /* ignore */
    }
  }, []);

  function setViewMode(mode: ViewMode) {
    setView(mode);
    try {
      localStorage.setItem(VIEW_KEY, mode);
    } catch {
      /* ignore */
    }
  }

  // Drop selections that left the current page.
  useEffect(() => {
    const ids = new Set(rows.map((r) => r.id));
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const selectedCount = selected.size;

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runBulk(action: "deactivate" | "activate" | "unpublish" | "publish") {
    if (selected.size === 0) {
      toast.error("Select at least one medication.");
      return;
    }
    startTransition(async () => {
      try {
        const r = await fetch("/api/admin/medications/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: Array.from(selected), action }),
        });
        if (!r.ok) throw new Error();
        const j = (await r.json().catch(() => ({}))) as { message?: string };
        toast.success(j.message || `Updated ${selected.size} medication(s).`);
        window.location.reload();
      } catch {
        toast.error("Bulk update failed.");
      }
    });
  }

  const toolbar = useMemo(
    () => (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleAll}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset)] px-3 py-1.5 text-xs font-semibold admin-muted hover:text-[var(--admin-text)]"
          >
            {allSelected ? (
              <CheckSquare className="h-3.5 w-3.5" />
            ) : (
              <Square className="h-3.5 w-3.5" />
            )}
            {allSelected ? "Clear" : "Select page"}
          </button>
          {selectedCount > 0 && (
            <>
              <span className="text-xs font-semibold admin-soft">
                {selectedCount} selected
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => runBulk("deactivate")}
                className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-600 disabled:opacity-50"
              >
                <Archive className="h-3 w-3" /> Deactivate
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => runBulk("activate")}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-50"
              >
                <Eye className="h-3 w-3" /> Activate
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => runBulk("unpublish")}
                className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-1 text-xs font-semibold text-slate-600 disabled:opacity-50"
              >
                <EyeOff className="h-3 w-3" /> Hide public
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => runBulk("publish")}
                className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-700 disabled:opacity-50"
              >
                <Eye className="h-3 w-3" /> Show public
              </button>
            </>
          )}
        </div>

        <div
          className="inline-flex items-center rounded-xl border border-[var(--admin-border-2)] bg-[var(--admin-inset)] p-0.5"
          role="group"
          aria-label="Catalog view"
        >
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              view === "table"
                ? "bg-[var(--admin-card)] text-[var(--admin-text)] shadow-sm"
                : "admin-muted hover:text-[var(--admin-text)]"
            }`}
            title="Table view — dense, scannable list"
          >
            <List className="h-3.5 w-3.5" /> Table
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              view === "cards"
                ? "bg-[var(--admin-card)] text-[var(--admin-text)] shadow-sm"
                : "admin-muted hover:text-[var(--admin-text)]"
            }`}
            title="Card view — images first"
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Cards
          </button>
        </div>
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allSelected, selectedCount, pending, view, rows],
  );

  if (view === "cards") {
    return (
      <div className="space-y-4">
        {toolbar}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((m) => {
            const isSelected = selected.has(m.id);
            return (
              <li
                key={m.id}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white/50 shadow-sm ring-1 backdrop-blur-xl transition dark:bg-black/20 ${
                  isSelected
                    ? "border-emerald-500/50 ring-emerald-500/30"
                    : "border-gray-200/60 ring-black/5 hover:-translate-y-0.5 hover:shadow-lg hover:ring-emerald-500/20 dark:border-white/10 dark:ring-white/10"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleOne(m.id)}
                  className="absolute left-3 top-3 z-10 rounded-md bg-white/90 p-1 shadow-sm dark:bg-black/60"
                  aria-label={isSelected ? "Deselect" : "Select"}
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Square className="h-4 w-4 text-gray-400" />
                  )}
                </button>

                <div className="relative aspect-[4/3] bg-[var(--admin-inset)]">
                  <MedThumb src={m.imageUrl} name={m.name} fill />
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <Link
                      href={`/admin/medications/${m.id}`}
                      className="rounded-full bg-white/95 p-2 text-gray-700 shadow-sm hover:bg-emerald-50 hover:text-emerald-700 dark:bg-black/70 dark:text-gray-200"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <form action={deleteAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <ConfirmSubmitButton
                        message={`Delete ${m.name}?`}
                        title="Delete"
                        className="rounded-full bg-white/95 p-2 text-gray-700 shadow-sm hover:bg-rose-50 hover:text-rose-700 dark:bg-black/70 dark:text-gray-200"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div>
                    <Link
                      href={`/admin/medications/${m.id}`}
                      className="line-clamp-1 font-bold text-gray-900 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-400"
                    >
                      {m.name}
                    </Link>
                    <p className="mt-0.5 line-clamp-1 text-xs admin-soft">
                      {[m.genericName, m.strengthDisplay, m.dosageForm]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  <StatusBadges m={m} />

                  <div className="mt-auto space-y-2 pt-1">
                    <StockCell m={m} />
                    <div className="flex items-end justify-between gap-2 border-t border-[var(--admin-border-2)] pt-2">
                      <div>
                        <p className="text-base font-black tabular-nums text-gray-900 dark:text-white">
                          KES {formatPrice(m.price)}
                        </p>
                        {m.sku && (
                          <p className="font-mono text-xs admin-soft">SKU {m.sku}</p>
                        )}
                      </div>
                      <div className="text-right text-xs admin-soft">
                        {m.prescriptionCount > 0 && (
                          <p className="inline-flex items-center gap-0.5 font-semibold text-violet-600 dark:text-violet-400">
                            <FileText className="h-3 w-3" />
                            {m.prescriptionCount} Rx
                          </p>
                        )}
                        <p className="capitalize">{m.category.replace(/-/g, " ")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // ── Table view (default) ──────────────────────────────────────
  return (
    <div className="space-y-4">
      {toolbar}
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white/40 shadow-sm ring-1 ring-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-black/20 dark:ring-white/10">
        <div tabIndex={0} role="region" aria-label="Scrollable records" className="admin-table-region overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--admin-border-2)] bg-[var(--admin-inset)]/60 text-xs font-semibold uppercase tracking-wider admin-muted">
                <th className="w-10 px-3 py-3">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="admin-muted hover:text-[var(--admin-text)]"
                    aria-label="Select all"
                  >
                    {allSelected ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-3 py-3">Medication</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Flags</th>
                <th className="px-3 py-3">Stock</th>
                <th className="px-3 py-3 text-right">Price</th>
                <th className="px-3 py-3">Linked</th>
                <th className="px-3 py-3">Location</th>
                <th className="w-24 px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border-2)]">
              {rows.map((m) => {
                const isSelected = selected.has(m.id);
                return (
                  <tr
                    key={m.id}
                    className={`transition hover:bg-[var(--admin-hover)] ${
                      isSelected ? "bg-emerald-500/5" : ""
                    } ${!m.active ? "opacity-60" : ""}`}
                  >
                    <td className="px-3 py-3 align-middle">
                      <button
                        type="button"
                        onClick={() => toggleOne(m.id)}
                        className="admin-muted hover:text-[var(--admin-text)]"
                        aria-label={isSelected ? `Deselect ${m.name}` : `Select ${m.name}`}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <MedThumb src={m.imageUrl} name={m.name} size="sm" />
                        <div className="min-w-0">
                          <Link
                            href={`/admin/medications/${m.id}`}
                            className="block truncate font-semibold admin-text hover:admin-accent-text hover:underline"
                          >
                            {m.name}
                          </Link>
                          <p className="truncate text-xs admin-soft">
                            {[
                              m.genericName,
                              m.strengthDisplay,
                              m.dosageForm,
                              m.brandName ? `brands: ${m.brandName.split(",")[0]?.trim()}` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          <p className="mt-0.5 flex flex-wrap gap-x-2 font-mono text-xs admin-soft">
                            {m.sku && <span>SKU {m.sku}</span>}
                            {m.barcode && <span>EAN {m.barcode}</span>}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <span className="inline-flex rounded-md bg-[var(--admin-inset)] px-2 py-1 text-xs font-medium capitalize admin-muted">
                        {m.category.replace(/-/g, " ")}
                      </span>
                      {m.manufacturer && (
                        <p className="mt-1 max-w-[9rem] truncate text-xs admin-soft">
                          {m.manufacturer}
                        </p>
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <StatusBadges m={m} />
                    </td>

                    <td className="px-3 py-3">
                      <StockCell m={m} />
                    </td>

                    <td className="px-3 py-3 text-right">
                      <p className="font-bold tabular-nums admin-text">
                        {formatPrice(m.price)}
                      </p>
                      {m.purchasePrice != null && (
                        <p className="text-xs admin-soft">
                          cost {formatPrice(m.purchasePrice)}
                        </p>
                      )}
                      <p className="text-xs admin-soft">KES</p>
                    </td>

                    <td className="px-3 py-3">
                      <div className="space-y-0.5 text-xs">
                        {m.prescriptionCount > 0 ? (
                          <Link
                            href={`/admin/prescriptions?q=${encodeURIComponent(m.name)}`}
                            className="inline-flex items-center gap-1 font-semibold text-violet-600 hover:underline dark:text-violet-400"
                            title="Open linked prescriptions"
                          >
                            <FileText className="h-3 w-3" />
                            {m.prescriptionCount} Rx
                          </Link>
                        ) : (
                          <span className="admin-soft">No Rx</span>
                        )}
                        {m.orderItemCount > 0 && (
                          <p className="inline-flex items-center gap-1 admin-soft">
                            <Package className="h-3 w-3" />
                            {m.orderItemCount} orders
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <p className="max-w-[8rem] truncate text-xs admin-text">
                        {m.shelfLocation || "—"}
                      </p>
                      {m.supplier && (
                        <p className="max-w-[8rem] truncate text-xs admin-soft">
                          {m.supplier}
                        </p>
                      )}
                      {m.packSize && (
                        <p className="max-w-[8rem] truncate text-xs admin-soft">
                          {m.packSize}
                        </p>
                      )}
                    </td>

                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/admin/medications/${m.id}`}
                          className="rounded-full bg-[var(--admin-inset)] p-2 admin-muted transition hover:bg-emerald-500/10 hover:text-emerald-700"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <form action={deleteAction}>
                          <input type="hidden" name="id" value={m.id} />
                          <ConfirmSubmitButton
                            message={`Delete ${m.name}? This cannot be undone if nothing references it.`}
                            title="Delete"
                            className="rounded-full bg-[var(--admin-inset)] p-2 admin-muted transition hover:bg-rose-500/10 hover:text-rose-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

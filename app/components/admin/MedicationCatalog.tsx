"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
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
      className: "text-rose-700 dark:text-rose-300",
      bar: "bg-rose-500",
    };
  }
  if (stock <= threshold) {
    return {
      label: "Low stock",
      className: "text-amber-700 dark:text-amber-300",
      bar: "bg-amber-500",
    };
  }
  return {
    label: "In stock",
    className: "text-emerald-700 dark:text-emerald-300",
    bar: "bg-emerald-500",
  };
}

function stockPct(stock: number, threshold: number): number {
  const healthy = Math.max(threshold * 2, 20);
  return Math.max(0, Math.min(100, Math.round((stock / healthy) * 100)));
}

function MedThumb({
  src,
  name,
  size = "md",
}: {
  src: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "h-10 w-10" : size === "lg" ? "h-16 w-16" : "h-12 w-12";

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={`${dim} shrink-0 rounded-xl bg-[var(--admin-inset)] object-contain p-1 ring-1 ring-[var(--admin-border-2)]`}
        loading="lazy"
        onError={(event) => {
          const image = event.currentTarget;
          if (image.dataset.fallbackApplied === "true") return;
          image.dataset.fallbackApplied = "true";
          image.src = "/images/care/medicine-still-life.png";
          image.classList.remove("p-1");
          image.classList.add("object-cover");
        }}
      />
    );
  }

  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 ring-1 ring-[var(--admin-border-2)]`}
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
        <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <Boxes className="h-2.5 w-2.5" /> OTC
        </span>
      ) : m.prescriptionRequired ? (
        <span className="inline-flex items-center gap-0.5 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-sm font-semibold text-violet-700 dark:text-violet-300">
          <FileText className="h-2.5 w-2.5" /> Rx
        </span>
      ) : null}
      {m.controlledDrug && (
        <span
          className="inline-flex items-center gap-0.5 rounded-md bg-rose-500/10 px-1.5 py-0.5 text-sm font-semibold text-rose-700 dark:text-rose-300"
          title={m.controlledDrugSchedule || "Controlled"}
        >
          <Shield className="h-2.5 w-2.5" />
          {m.controlledDrugSchedule ? m.controlledDrugSchedule.replace("schedule_", "S") : "CD"}
        </span>
      )}
      {m.publicListing && (
        <span className="inline-flex items-center gap-0.5 rounded-md bg-blue-500/10 px-1.5 py-0.5 text-sm font-semibold text-blue-700 dark:text-blue-300">
          <Tag className="h-2.5 w-2.5" /> Public
        </span>
      )}
      {m.requiresRefrigeration && (
        <span className="inline-flex items-center gap-0.5 rounded-md bg-sky-500/10 px-1.5 py-0.5 text-sm font-semibold text-sky-700 dark:text-sky-300">
          <Snowflake className="h-2.5 w-2.5" /> Cold
        </span>
      )}
      {!m.active && (
        <span className="inline-flex items-center rounded-md bg-slate-500/10 px-1.5 py-0.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Inactive
        </span>
      )}
      {m.enrichmentStatus !== "complete" && m.enrichmentScore < 70 && (
        <span
          className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-sm font-semibold text-amber-700 dark:text-amber-300"
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
    <div className="min-w-0 sm:min-w-[7rem]">
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-sm font-black tabular-nums ${tone.className}`}>{m.currentStock}</span>
        <span className="text-sm admin-soft">reorder ≤{m.lowStockThreshold}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--admin-inset-2)]">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`mt-1 text-sm font-semibold ${tone.className}`}>{tone.label}</p>
    </div>
  );
}

export function MedicationCatalog({ rows, deleteAction }: Props) {
  const [view, setView] = useState<ViewMode>("cards");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const visibleIds = new Set(rows.map((row) => row.id));
  const selectedIds = Array.from(selected).filter((id) => visibleIds.has(id));
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));
  const selectedCount = selectedIds.length;

  function setViewMode(mode: ViewMode) {
    setView(mode);
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)));
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
    if (selectedIds.length === 0) {
      toast.error("Select at least one medication.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/medications/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedIds, action }),
        });
        if (!response.ok) throw new Error();
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        toast.success(payload.message || `Updated ${selectedIds.length} medication(s).`);
        window.location.reload();
      } catch {
        toast.error("Bulk update failed.");
      }
    });
  }

  const toolbar = (
    <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-2.5 sm:p-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={toggleAll}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--admin-inset)] px-3 text-sm font-semibold admin-muted transition hover:text-[var(--admin-text)]"
        >
          {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          {allSelected ? "Clear page" : "Select page"}
        </button>

        <div className="hidden items-center rounded-xl border border-[var(--admin-border-2)] bg-[var(--admin-inset)] p-0.5 lg:inline-flex" role="group" aria-label="Catalog view">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition ${view === "table" ? "bg-[var(--admin-card)] text-[var(--admin-text)] shadow-sm" : "admin-muted hover:text-[var(--admin-text)]"}`}
          >
            <List className="h-3.5 w-3.5" /> Table
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition ${view === "cards" ? "bg-[var(--admin-card)] text-[var(--admin-text)] shadow-sm" : "admin-muted hover:text-[var(--admin-text)]"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Cards
          </button>
        </div>

        <span className="text-sm font-bold admin-soft lg:hidden">Card view</span>
      </div>

      {selectedCount > 0 && (
        <div className="mt-2.5 border-t border-[var(--admin-border)] pt-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-bold admin-text">{selectedCount} selected</span>
            {pending && <span className="text-sm admin-soft">Updating…</span>}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button type="button" disabled={pending} onClick={() => runBulk("activate")} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 text-sm font-semibold text-emerald-700 disabled:opacity-50 dark:text-emerald-300">
              <Eye className="h-3.5 w-3.5" /> Activate
            </button>
            <button type="button" disabled={pending} onClick={() => runBulk("deactivate")} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-rose-500/10 px-3 text-sm font-semibold text-rose-700 disabled:opacity-50 dark:text-rose-300">
              <Archive className="h-3.5 w-3.5" /> Deactivate
            </button>
            <button type="button" disabled={pending} onClick={() => runBulk("publish")} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-blue-500/10 px-3 text-sm font-semibold text-blue-700 disabled:opacity-50 dark:text-blue-300">
              <Eye className="h-3.5 w-3.5" /> Show public
            </button>
            <button type="button" disabled={pending} onClick={() => runBulk("unpublish")} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-slate-500/10 px-3 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:text-slate-300">
              <EyeOff className="h-3.5 w-3.5" /> Hide public
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const cards = (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((m) => {
        const isSelected = selected.has(m.id);
        const tone = stockTone(m.currentStock, m.lowStockThreshold);

        return (
          <li
            key={m.id}
            className={`group rounded-2xl border bg-[var(--admin-card)] p-3 shadow-sm transition sm:p-4 ${isSelected ? "border-emerald-500/50 ring-2 ring-emerald-500/15" : "border-[var(--admin-border)] hover:border-[var(--admin-border-2)] hover:shadow-md"} ${!m.active ? "opacity-70" : ""}`}
          >
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => toggleOne(m.id)}
                className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-inset)] admin-muted transition hover:text-[var(--admin-text)]"
                aria-label={isSelected ? `Deselect ${m.name}` : `Select ${m.name}`}
              >
                {isSelected ? <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-300" /> : <Square className="h-4 w-4" />}
              </button>

              <MedThumb src={m.imageUrl} name={m.name} size="md" />

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/admin/medications/${m.id}`} className="block break-words text-sm font-bold admin-text hover:admin-accent-text hover:underline">
                      {m.name}
                    </Link>
                    <p className="mt-0.5 break-words text-sm leading-5 admin-soft">
                      {[m.genericName, m.strengthDisplay, m.dosageForm].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black tabular-nums admin-text">KES {formatPrice(m.price)}</p>
                    <p className={`mt-0.5 text-sm font-bold ${tone.className}`}>{tone.label}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3"><StatusBadges m={m} /></div>

            <div className="mt-3 rounded-xl bg-[var(--admin-inset)] p-3">
              <StockCell m={m} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-wide admin-soft">Category</p>
                <p className="mt-0.5 break-words capitalize admin-text">{m.category.replace(/-/g, " ")}</p>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-wide admin-soft">Shelf</p>
                <p className="mt-0.5 break-words admin-text">{m.shelfLocation || "Not set"}</p>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-wide admin-soft">SKU</p>
                <p className="mt-0.5 break-words font-mono admin-text">{m.sku || "—"}</p>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-wide admin-soft">Linked</p>
                <p className="mt-0.5 break-words admin-text">{m.prescriptionCount} Rx · {m.orderItemCount} orders</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-t border-[var(--admin-border)] pt-3">
              <Link
                href={`/admin/medications/${m.id}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--admin-inset)] px-3 text-sm font-semibold admin-text transition hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300"
              >
                <Pencil className="h-4 w-4" /> Edit medicine
              </Link>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={m.id} />
                <ConfirmSubmitButton
                  message={`Delete ${m.name}? This cannot be undone if nothing references it.`}
                  title="Delete"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-700 transition hover:bg-rose-500/15 dark:text-rose-300"
                >
                  <Trash2 className="h-4 w-4" />
                </ConfirmSubmitButton>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );

  const table = (
    <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-sm">
      <div tabIndex={0} role="region" aria-label="Scrollable medication records" className="admin-table-region overflow-x-auto">
        <table className="w-full min-w-[940px] text-left !text-sm">
          <thead>
            <tr className="border-b border-[var(--admin-border-2)] bg-[var(--admin-inset)] text-sm font-bold uppercase tracking-wider admin-muted">
              <th className="!text-sm w-10 px-3 py-3">
                <button type="button" onClick={toggleAll} className="inline-flex h-11 w-11 items-center justify-center rounded-lg admin-muted hover:text-[var(--admin-text)]" aria-label="Select all">
                  {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                </button>
              </th>
              <th className="!text-sm px-3 py-3">Medication</th>
              <th className="!text-sm px-3 py-3">Flags</th>
              <th className="!text-sm px-3 py-3">Stock</th>
              <th className="!text-sm px-3 py-3 text-right">Price</th>
              <th className="!text-sm px-3 py-3">Linked</th>
              <th className="!text-sm px-3 py-3">Location</th>
              <th className="!text-sm w-24 px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-border-2)]">
            {rows.map((m) => {
              const isSelected = selected.has(m.id);
              return (
                <tr key={m.id} className={`transition hover:bg-[var(--admin-hover)] ${isSelected ? "bg-emerald-500/5" : ""} ${!m.active ? "opacity-60" : ""}`}>
                  <td className="px-3 py-3 align-middle">
                    <button type="button" onClick={() => toggleOne(m.id)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg admin-muted hover:text-[var(--admin-text)]" aria-label={isSelected ? `Deselect ${m.name}` : `Select ${m.name}`}>
                      {isSelected ? <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-300" /> : <Square className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <MedThumb src={m.imageUrl} name={m.name} size="sm" />
                      <div className="min-w-0 max-w-[270px]">
                        <Link href={`/admin/medications/${m.id}`} className="block break-words font-bold admin-text hover:admin-accent-text hover:underline">{m.name}</Link>
                        <p className="break-words text-sm admin-soft">{[m.genericName, m.strengthDisplay, m.dosageForm].filter(Boolean).join(" · ")}</p>
                        <p className="mt-0.5 flex flex-wrap gap-x-2 font-mono text-sm admin-soft">{m.sku && <span>SKU {m.sku}</span>}{m.barcode && <span>EAN {m.barcode}</span>}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3"><StatusBadges m={m} /></td>
                  <td className="px-3 py-3"><StockCell m={m} /></td>
                  <td className="px-3 py-3 text-right">
                    <p className="font-black tabular-nums admin-text">{formatPrice(m.price)}</p>
                    {m.purchasePrice != null && <p className="text-sm admin-soft">cost {formatPrice(m.purchasePrice)}</p>}
                    <p className="text-sm admin-soft">KES</p>
                  </td>
                  <td className="px-3 py-3">
                    <div className="space-y-1 text-sm">
                      {m.prescriptionCount > 0 ? (
                        <Link href={`/admin/prescriptions?q=${encodeURIComponent(m.name)}`} className="inline-flex items-center gap-1 font-semibold text-violet-700 hover:underline dark:text-violet-300">
                          <FileText className="h-3 w-3" /> {m.prescriptionCount} Rx
                        </Link>
                      ) : <span className="admin-soft">No Rx</span>}
                      {m.orderItemCount > 0 && <p className="inline-flex items-center gap-1 admin-soft"><Package className="h-3 w-3" /> {m.orderItemCount} orders</p>}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <p className="max-w-[8rem] break-words text-sm admin-text">{m.shelfLocation || "—"}</p>
                    {m.supplier && <p className="max-w-[8rem] break-words text-sm admin-soft">{m.supplier}</p>}
                    {m.packSize && <p className="max-w-[8rem] break-words text-sm admin-soft">{m.packSize}</p>}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Link href={`/admin/medications/${m.id}`} className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--admin-inset)] admin-muted transition hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <form action={deleteAction}>
                        <input type="hidden" name="id" value={m.id} />
                        <ConfirmSubmitButton message={`Delete ${m.name}? This cannot be undone if nothing references it.`} title="Delete" className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--admin-inset)] admin-muted transition hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300">
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
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      {toolbar}
      <div className={view === "cards" ? "block" : "block lg:hidden"}>{cards}</div>
      {view === "table" && <div className="hidden lg:block">{table}</div>}
    </div>
  );
}

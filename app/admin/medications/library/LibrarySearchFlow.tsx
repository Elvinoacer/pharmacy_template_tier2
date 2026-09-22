"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle, Check, Loader2, PackagePlus, Pill, Plus, Search, X } from "lucide-react";
import { toast } from "@/app/components/Toaster";

type Result = {
  id: string;
  name: string;
  genericName: string;
  brandName: string | null;
  strengthDisplay: string | null;
  dosageForm: string | null;
  manufacturer: string | null;
  barcode: string | null;
  category: string;
  imageUrl: string | null;
  enrichmentScore: number;
  alreadyStocked: boolean;
  activeIngredients: Array<{ name: string; amount: string | null; unit: string | null }>;
};

const EMPTY_FORM = {
  price: "",
  currentStock: "",
  supplier: "",
  shelfLocation: "",
  sku: "",
  lowStockThreshold: "10",
  overTheCounter: false,
  publicListing: false,
  active: true,
};

export function LibrarySearchFlow() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<Record<string, string | boolean>>(EMPTY_FORM);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      // Clearing stale search results when the search box is emptied.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/admin/medications/library/search?q=${encodeURIComponent(query)}`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          setResults([]);
          return;
        }
        const payload = await response.json();
        setResults(payload.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function addToPharmacy(masterId: string) {
    if (!addForm.price || Number(addForm.price) < 0) {
      toast.error("Selling price is required.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/medications/library/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            medicationMasterId: masterId,
            price: Number(addForm.price),
            currentStock: Number(addForm.currentStock || 0),
            lowStockThreshold: Number(addForm.lowStockThreshold || 10),
            supplier: addForm.supplier || null,
            shelfLocation: addForm.shelfLocation || null,
            sku: addForm.sku || null,
            overTheCounter: addForm.overTheCounter,
            publicListing: addForm.publicListing,
            active: addForm.active,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || "Add failed.");
        }

        toast.success("Added to your pharmacy inventory.");
        setAdding(null);
        setAddForm(EMPTY_FORM);
        setResults((current) =>
          current.map((result) => (result.id === masterId ? { ...result, alreadyStocked: true } : result)),
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Add failed.");
      }
    });
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-3 sm:p-4">
        <label htmlFor="medication-library-search" className="mb-2 block text-xs font-semibold admin-text">Search the shared library</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 admin-soft" />
          <input
            id="medication-library-search"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Medicine name, generic, brand, or barcode…"
            className="input-admin min-h-12 w-full rounded-xl pl-10 pr-11 text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl admin-soft transition hover:bg-[var(--admin-inset)] hover:text-[var(--admin-text)]"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-2 text-[11px] leading-4 admin-muted">Results update as you type. Use a barcode for the most precise match when available.</p>
      </section>

      {loading && (
        <div className="flex min-h-32 items-center justify-center gap-2 rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] px-4 text-sm admin-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Searching the medicine library…
        </div>
      )}

      {!loading && !query.trim() && (
        <section className="rounded-2xl border border-dashed border-[var(--admin-border-2)] bg-[var(--admin-card)] px-5 py-10 text-center sm:py-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--admin-inset)] admin-accent-text">
            <Search className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm font-semibold admin-text">Start with the medicine you need</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 admin-muted">Searching first keeps the shared clinical record clean and avoids duplicate masters.</p>
        </section>
      )}

      {!loading && query.trim() && results.length === 0 && (
        <section className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-5 text-center sm:p-6">
          <AlertCircle className="mx-auto h-8 w-8 text-amber-600 dark:text-amber-300" />
          <p className="mt-3 text-sm font-semibold admin-text">No shared record matched “{query.trim()}”</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 admin-muted">Try a shorter name or barcode. If it truly is new, use another acquisition method.</p>
          <div className="mx-auto mt-4 grid max-w-xl gap-2 sm:grid-cols-3">
            <Link href="/admin/medications/import/ai" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--admin-inset)] px-3 text-xs font-semibold admin-text transition hover:bg-[var(--admin-inset-2)]">AI import</Link>
            <Link href="/admin/medications/import/csv" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--admin-inset)] px-3 text-xs font-semibold admin-text transition hover:bg-[var(--admin-inset-2)]">CSV import</Link>
            <Link href="/admin/medications/new" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--admin-inset)] px-3 text-xs font-semibold admin-text transition hover:bg-[var(--admin-inset-2)]">Manual entry</Link>
          </div>
        </section>
      )}

      {!loading && results.length > 0 && (
        <div>
          <div className="mb-2.5 flex items-center justify-between gap-3 px-1">
            <p className="text-xs font-semibold admin-text">{results.length} match{results.length === 1 ? "" : "es"}</p>
            <p className="text-[10px] admin-soft">Choose the closest clinical record</p>
          </div>
          <ul className="grid gap-3 xl:grid-cols-2">
            {results.map((medicine) => (
              <li key={medicine.id} className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-3.5 transition duration-200 hover:border-emerald-500/20 hover:shadow-sm sm:p-4">
                <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-4">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-[var(--admin-inset)] sm:h-16 sm:w-16">
                    {medicine.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={medicine.imageUrl}
                        alt={medicine.name}
                        className="h-full w-full object-contain p-1"
                        loading="lazy"
                        onError={(event) => {
                          const image = event.currentTarget;
                          if (image.dataset.fallbackApplied === "true") return;
                          image.dataset.fallbackApplied = "true";
                          image.src = "/images/care/medicine-still-life.png";
                          image.className = "h-full w-full object-cover";
                        }}
                      />
                    ) : (
                      <Pill className="h-6 w-6 admin-soft" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-bold admin-text">{medicine.name}</h3>
                    <p className="mt-0.5 text-xs leading-5 admin-muted">
                      {medicine.genericName}
                      {medicine.strengthDisplay ? ` · ${medicine.strengthDisplay}` : ""}
                      {medicine.dosageForm ? ` · ${medicine.dosageForm}` : ""}
                    </p>
                    {medicine.manufacturer && <p className="mt-1 text-[11px] admin-soft">{medicine.manufacturer}</p>}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {medicine.alreadyStocked && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                      <Check className="h-3 w-3" /> In inventory
                    </span>
                  )}
                  <span className="rounded-full bg-[var(--admin-inset)] px-2 py-1 text-[10px] font-semibold admin-muted">{medicine.enrichmentScore}% complete</span>
                  <span className="rounded-full bg-[var(--admin-inset)] px-2 py-1 text-[10px] capitalize admin-muted">{medicine.category.replace(/-/g, " ")}</span>
                </div>

                {medicine.activeIngredients.length > 0 && (
                  <div className="mt-3 rounded-xl bg-[var(--admin-inset)] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide admin-soft">Active ingredients</p>
                    <p className="mt-1 break-words text-[11px] leading-4 admin-muted">
                      {medicine.activeIngredients
                        .map((ingredient) => `${ingredient.name}${ingredient.amount ? ` ${ingredient.amount}${ingredient.unit || ""}` : ""}`)
                        .join(", ")}
                    </p>
                  </div>
                )}

                {medicine.barcode && <p className="mt-2 break-all text-[10px] font-mono admin-soft">Barcode {medicine.barcode}</p>}

                {!medicine.alreadyStocked && (
                  <div className="mt-4 border-t border-[var(--admin-border-2)] pt-3">
                    {adding === medicine.id ? (
                      <div className="space-y-3">
                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <PackagePlus className="h-4 w-4 admin-accent-text" />
                            <p className="text-xs font-semibold admin-text">Add your pharmacy details</p>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            <label className="grid gap-1 text-[10px] font-semibold admin-muted">
                              Selling price (KES) *
                              <input type="number" inputMode="decimal" placeholder="0.00" value={addForm.price as string} onChange={(event) => setAddForm({ ...addForm, price: event.target.value })} className="input-admin min-h-11" />
                            </label>
                            <label className="grid gap-1 text-[10px] font-semibold admin-muted">
                              Current stock
                              <input type="number" inputMode="numeric" placeholder="0" value={addForm.currentStock as string} onChange={(event) => setAddForm({ ...addForm, currentStock: event.target.value })} className="input-admin min-h-11" />
                            </label>
                            <label className="grid gap-1 text-[10px] font-semibold admin-muted sm:col-span-2 lg:col-span-1">
                              SKU
                              <input type="text" placeholder="Optional" value={addForm.sku as string} onChange={(event) => setAddForm({ ...addForm, sku: event.target.value })} className="input-admin min-h-11 font-mono" />
                            </label>
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <input type="text" placeholder="Supplier" value={addForm.supplier as string} onChange={(event) => setAddForm({ ...addForm, supplier: event.target.value })} className="input-admin min-h-11" />
                          <input type="text" placeholder="Shelf location" value={addForm.shelfLocation as string} onChange={(event) => setAddForm({ ...addForm, shelfLocation: event.target.value })} className="input-admin min-h-11" />
                        </div>

                        <div className="grid gap-2 rounded-xl bg-[var(--admin-inset)] p-3 sm:grid-cols-2">
                          <label className="flex min-h-10 items-center gap-2 text-xs admin-muted">
                            <input type="checkbox" checked={addForm.overTheCounter as boolean} onChange={(event) => setAddForm({ ...addForm, overTheCounter: event.target.checked })} className="h-4 w-4" />
                            Over the counter
                          </label>
                          <label className="flex min-h-10 items-center gap-2 text-xs admin-muted">
                            <input type="checkbox" checked={addForm.publicListing as boolean} onChange={(event) => setAddForm({ ...addForm, publicListing: event.target.checked })} className="h-4 w-4" />
                            Show on public storefront
                          </label>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                          <button type="button" onClick={() => addToPharmacy(medicine.id)} disabled={pending} className="btn-admin min-h-11 w-full !rounded-xl justify-center disabled:opacity-50">
                            {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding…</> : <><Plus className="h-4 w-4" /> Add to inventory</>}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAdding(null);
                              setAddForm(EMPTY_FORM);
                            }}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--admin-inset)] px-4 text-xs font-semibold admin-muted transition hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setAdding(medicine.id)} className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 px-4 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-300 sm:w-auto">
                        <Plus className="h-3.5 w-3.5" /> Add to my pharmacy
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Search, Pill, Plus, Check, AlertCircle, Loader2 } from "lucide-react";
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(
          `/api/admin/medications/library/search?q=${encodeURIComponent(query)}`,
          { cache: "no-store" },
        );
        if (!r.ok) {
          setResults([]);
          return;
        }
        const j = await r.json();
        setResults(j.results ?? []);
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
        const r = await fetch("/api/admin/medications/library/add", {
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
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.message || "Add failed.");
        }
        toast.success("Added to your pharmacy inventory.");
        setAdding(null);
        setAddForm(EMPTY_FORM);
        // Refresh results to show "already stocked".
        setResults((prev) =>
          prev.map((r) => (r.id === masterId ? { ...r, alreadyStocked: true } : r)),
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Add failed.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Paracetamol, Panadol, barcode…"
          className="w-full rounded-full border border-[var(--admin-border-2)] bg-[var(--admin-card)] py-3 pl-11 pr-4 text-sm admin-text outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm admin-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Searching the shared library…
        </div>
      )}

      {!loading && query.trim() && results.length === 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-amber-500" />
          <p className="text-sm font-semibold admin-text">No matches found in the shared library.</p>
          <p className="mt-1 text-xs admin-muted">Don&apos;t dead-end here — try another acquisition method:</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Link href="/admin/medications/import/ai" className="rounded-full bg-[var(--admin-inset)] px-3 py-1.5 text-xs font-semibold admin-text hover:bg-emerald-500/10">
              AI Import
            </Link>
            <Link href="/admin/medications/import/csv" className="rounded-full bg-[var(--admin-inset)] px-3 py-1.5 text-xs font-semibold admin-text hover:bg-emerald-500/10">
              CSV Import
            </Link>
            <Link href="/admin/medications/new" className="rounded-full bg-[var(--admin-inset)] px-3 py-1.5 text-xs font-semibold admin-text hover:bg-emerald-500/10">
              Manual Entry
            </Link>
          </div>
        </div>
      )}

      {!loading && results.length > 0 && (
        <ul className="space-y-3">
          {results.map((m) => (
            <li
              key={m.id}
              className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-4"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--admin-inset)]">
                  {m.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.imageUrl} alt={m.name} className="h-full w-full object-cover" />
                  ) : (
                    <Pill className="h-6 w-6 admin-soft" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold admin-text truncate">{m.name}</h3>
                    {m.alreadyStocked && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        <Check className="h-3 w-3" /> In your inventory
                      </span>
                    )}
                    <span className="ml-auto rounded-full bg-[var(--admin-inset)] px-2 py-0.5 text-xs font-semibold admin-muted">
                      {m.enrichmentScore}% complete
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs admin-muted">
                    {m.genericName}
                    {m.strengthDisplay ? ` · ${m.strengthDisplay}` : ""}
                    {m.dosageForm ? ` · ${m.dosageForm}` : ""}
                    {m.manufacturer ? ` · ${m.manufacturer}` : ""}
                  </p>
                  {m.activeIngredients.length > 0 && (
                    <p className="mt-1 text-xs admin-soft">
                      Active: {m.activeIngredients.map((ai) => `${ai.name}${ai.amount ? ` ${ai.amount}${ai.unit || ""}` : ""}`).join(", ")}
                    </p>
                  )}
                  {m.barcode && (
                    <p className="mt-0.5 text-xs font-mono admin-soft">Barcode: {m.barcode}</p>
                  )}
                </div>
              </div>

              {!m.alreadyStocked && (
                <div className="mt-3 border-t border-[var(--admin-border-2)] pt-3">
                  {adding === m.id ? (
                    <div className="space-y-3">
                      <div className="grid gap-2 sm:grid-cols-3">
                        <input
                          type="number"
                          placeholder="Selling price (KES) *"
                          value={addForm.price as string}
                          onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
                          className="input-admin"
                        />
                        <input
                          type="number"
                          placeholder="Stock qty"
                          value={addForm.currentStock as string}
                          onChange={(e) => setAddForm({ ...addForm, currentStock: e.target.value })}
                          className="input-admin"
                        />
                        <input
                          type="text"
                          placeholder="SKU"
                          value={addForm.sku as string}
                          onChange={(e) => setAddForm({ ...addForm, sku: e.target.value })}
                          className="input-admin font-mono"
                        />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          type="text"
                          placeholder="Supplier"
                          value={addForm.supplier as string}
                          onChange={(e) => setAddForm({ ...addForm, supplier: e.target.value })}
                          className="input-admin"
                        />
                        <input
                          type="text"
                          placeholder="Shelf location"
                          value={addForm.shelfLocation as string}
                          onChange={(e) => setAddForm({ ...addForm, shelfLocation: e.target.value })}
                          className="input-admin"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs admin-muted">
                          <input
                            type="checkbox"
                            checked={addForm.overTheCounter as boolean}
                            onChange={(e) => setAddForm({ ...addForm, overTheCounter: e.target.checked })}
                            className="h-3.5 w-3.5"
                          />
                          OTC
                        </label>
                        <label className="flex items-center gap-1.5 text-xs admin-muted">
                          <input
                            type="checkbox"
                            checked={addForm.publicListing as boolean}
                            onChange={(e) => setAddForm({ ...addForm, publicListing: e.target.checked })}
                            className="h-3.5 w-3.5"
                          />
                          Public listing
                        </label>
                        <button
                          type="button"
                          onClick={() => addToPharmacy(m.id)}
                          disabled={pending}
                          className="btn-admin ml-auto !rounded-full px-4 py-1.5 text-xs disabled:opacity-50"
                        >
                          {pending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Adding…</> : <><Plus className="h-3.5 w-3.5" /> Confirm Add</>}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAdding(null);
                            setAddForm(EMPTY_FORM);
                          }}
                          className="rounded-full px-3 py-1.5 text-xs admin-muted hover:bg-[var(--admin-inset)]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAdding(m.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add to my pharmacy
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

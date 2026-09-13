"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Pill, Plus, Search } from "lucide-react";

type Result = {
  id: string;
  name: string;
  genericName: string;
  brandName: string | null;
  strengthDisplay: string | null;
  dosageForm: string | null;
  alreadyStocked: boolean;
};

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 150);
}

export function SetupMedicineSearch({ remaining }: { remaining: number }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Result | null>(null);
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `/api/admin/medications/library/search?q=${encodeURIComponent(query.trim())}`,
          { cache: "no-store" },
        );
        const payload = await response.json().catch(() => ({}));
        if (active) setResults(response.ok ? payload.results ?? [] : []);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 260);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const visible = useMemo(() => results.slice(0, 6), [results]);

  async function addMedicine() {
    if (!selected) return;
    const numericPrice = Number(price);
    const numericStock = Number(stock);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setMessage("Add a selling price above KES 0.");
      return;
    }
    if (!Number.isInteger(numericStock) || numericStock <= 0) {
      setMessage("Add the stock currently available.");
      return;
    }

    setAdding(true);
    setMessage(null);
    try {
      const baseSlug = slugify(selected.name) || "medicine";
      const response = await fetch("/api/admin/medications/library/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationMasterId: selected.id,
          slug: `${baseSlug}-${selected.id.slice(0, 8)}`,
          price: numericPrice,
          currentStock: numericStock,
          lowStockThreshold: Math.min(10, numericStock),
          overTheCounter: false,
          prescriptionRequired: true,
          publicListing: true,
          active: true,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Could not add this medicine.");

      setMessage(`${selected.name} added.`);
      setSelected(null);
      setQuery("");
      setResults([]);
      setPrice("");
      setStock("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add this medicine.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
            setMessage(null);
          }}
          placeholder="Search medicine or barcode"
          className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
        />
        {searching ? <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-emerald-500" /> : null}
      </div>

      {query.trim() && !searching && visible.length === 0 ? (
        <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          No match. Try the generic name, brand, or barcode.
        </p>
      ) : null}

      {visible.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
          {visible.map((medicine) => (
            <button
              key={medicine.id}
              type="button"
              disabled={medicine.alreadyStocked}
              onClick={() => {
                setSelected(medicine);
                setMessage(null);
              }}
              className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left transition last:border-b-0 hover:bg-emerald-50 disabled:cursor-default disabled:opacity-55 dark:border-white/[0.06] dark:hover:bg-emerald-400/5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <Pill className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{medicine.name}</span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                  {[medicine.genericName, medicine.strengthDisplay, medicine.dosageForm].filter(Boolean).join(" · ")}
                </span>
              </span>
              {medicine.alreadyStocked ? (
                <span className="text-[10px] font-semibold text-slate-500">Already added</span>
              ) : (
                <Plus className="h-4 w-4 text-emerald-600" />
              )}
            </button>
          ))}
        </div>
      ) : null}

      {selected ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{selected.name}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Price + available stock</p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">Public</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Price (KES)
              <input
                type="number"
                min="1"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-black/20 dark:text-white"
              />
            </label>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Stock
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={stock}
                onChange={(event) => setStock(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-black/20 dark:text-white"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={addMedicine}
            disabled={adding}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {adding ? "Adding…" : "Add & make visible"}
          </button>
        </div>
      ) : null}

      {message ? (
        <p className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-white/[0.06] dark:text-slate-200">
          {message.endsWith("added.") ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}
          {message}
        </p>
      ) : null}

      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        {remaining > 0 ? `${remaining} more ready medicine${remaining === 1 ? "" : "s"} needed.` : "Starter catalogue ready."}
      </p>
    </div>
  );
}

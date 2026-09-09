"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  MapPin,
  PackageSearch,
  Search,
  Sparkles,
  Truck,
  X,
} from "lucide-react";

type Result = {
  name: string;
  slug: string;
  city: string | null;
  county: string | null;
  medicineMatch: boolean;
  medicineMatches: number;
  delivery: boolean;
  stockCount: number;
};

const SUGGESTIONS = [
  "Panadol near Westlands",
  "Delivery in Nairobi",
  "Pharmacy with visible stock",
];

export default function DirectoryAssistant() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  async function ask(raw = query) {
    const value = raw.trim();
    if (value.length < 2 || loading) return;

    setQuery(value);
    setLoading(true);
    setAnswer("");
    setResults([]);

    try {
      const response = await fetch("/api/directory-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Search failed");
      setAnswer(data.answer || "I found some public pharmacy matches.");
      setResults(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      setAnswer(error instanceof Error ? error.message : "I couldn't search the directory right now.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-busy={loading}
      className="relative overflow-hidden rounded-[26px] border border-[var(--line-2)] bg-[var(--card)] p-4 text-[var(--foreground)] shadow-sm sm:p-5"
    >
      <div className="pointer-events-none absolute -right-14 -top-16 h-36 w-36 rounded-full bg-[var(--brand-soft)] opacity-70 blur-3xl" aria-hidden />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.17em] text-[var(--brand)] sm:text-[10px]">
              <Sparkles className="h-3 w-3" aria-hidden /> Directory assistant
            </p>
            <h2 className="mt-1 text-lg font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-xl">Ask Aether</h2>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--brand-soft)] px-2.5 py-1 text-[9px] font-bold text-[var(--brand-deep)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" aria-hidden /> Live
          </span>
        </div>

        <p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--muted)] sm:text-sm">
          Describe what you need naturally. Aether checks public listings, visible stock and service signals.
        </p>
      </div>

      <div className="relative mt-4">
        <label htmlFor="aether-directory-query" className="sr-only">
          Ask Aether about pharmacies
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand)]" aria-hidden />
          <input
            id="aether-directory-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void ask();
            }}
            placeholder="Panadol near Westlands"
            autoComplete="off"
            className="block min-h-12 w-full appearance-none rounded-xl border border-[var(--line-2)] bg-[var(--background)] py-3 pl-10 pr-10 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-2)] focus:border-[var(--brand)] focus:bg-[var(--card-elev)] focus:ring-2 focus:ring-[var(--brand-soft)]"
          />
          {query && !loading && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setAnswer("");
                setResults([]);
              }}
              aria-label="Clear Aether search"
              className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--brand-soft)] hover:text-[var(--foreground)]"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => void ask()}
          disabled={loading || query.trim().length < 2}
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-bold text-[var(--background)] shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className={`h-4 w-4 ${loading ? "animate-pulse" : ""}`} aria-hidden />
          {loading ? "Checking the network…" : "Ask Aether"}
        </button>
      </div>

      {!answer && !loading && (
        <div className="relative mt-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--muted-2)]">Try asking</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void ask(suggestion)}
                className="rounded-full border border-[var(--line)] bg-[var(--card-elev)] px-2.5 py-1.5 text-left text-[10px] font-medium text-[var(--muted)] transition hover:border-[var(--brand)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-deep)]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="relative mt-4 rounded-2xl border border-[var(--line)] bg-[var(--card-elev)] p-3" aria-live="polite">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--success)]" aria-hidden />
            Looking across public listings
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--brand-soft)]">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-[var(--brand)]" />
          </div>
        </div>
      )}

      {answer && (
        <div
          aria-live="polite"
          className="relative mt-4 rounded-2xl border border-[var(--line)] bg-[var(--card-elev)] p-3.5"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand)]">Aether found</p>
          <p className="mt-1.5 text-xs leading-5 text-[var(--foreground)] sm:text-sm">{answer}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="relative mt-3 space-y-2" role="list" aria-label="Aether pharmacy matches">
          {results.slice(0, 6).map((result) => (
            <Link
              key={result.slug}
              href={`/p/${result.slug}`}
              role="listitem"
              className="group flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3 transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:bg-[var(--card-elev)] hover:shadow-sm"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                <MapPin className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-[var(--foreground)] sm:text-sm">
                  {result.name}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-[var(--muted)]">
                  {[result.city, result.county].filter(Boolean).join(", ") || "Kenya"}
                </span>
                <span className="mt-1 flex flex-wrap gap-1.5">
                  {result.medicineMatch && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[8px] font-bold text-blue-500">
                      <PackageSearch className="h-2.5 w-2.5" aria-hidden /> {result.medicineMatches} stock match{result.medicineMatches === 1 ? "" : "es"}
                    </span>
                  )}
                  {result.delivery && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold text-emerald-500">
                      <Truck className="h-2.5 w-2.5" aria-hidden /> Delivery
                    </span>
                  )}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[var(--muted-2)] transition group-hover:translate-x-0.5 group-hover:text-[var(--brand)]" aria-hidden />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

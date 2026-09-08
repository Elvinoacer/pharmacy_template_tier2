"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

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

export default function DirectoryAssistant() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  async function ask() {
    const value = query.trim();
    if (value.length < 2 || loading) return;

    setLoading(true);

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
      className="rounded-2xl border border-[var(--line-2)] bg-[var(--card)] p-4 text-[var(--foreground)] sm:p-5"
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)]">
          Directory assistant
        </p>
        <h2 className="mt-1 text-lg font-bold text-[var(--foreground)]">Ask Aether</h2>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--muted)] sm:text-sm">
          Search pharmacies by medicine, area, service or visible stock.
        </p>
      </div>

      <div className="mt-4">
        <label htmlFor="aether-directory-query" className="sr-only">
          Ask Aether about pharmacies
        </label>
        <input
          id="aether-directory-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void ask();
          }}
          placeholder="Panadol near Westlands"
          className="block h-12 w-full appearance-none rounded-xl border border-[var(--line-2)] bg-[var(--background)] px-4 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-2)] focus:border-[var(--brand)]"
        />

        <button
          type="button"
          onClick={() => void ask()}
          disabled={loading || query.trim().length < 2}
          className="mt-2 block h-12 w-full rounded-xl bg-[var(--brand)] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Searching…" : "Ask Aether"}
        </button>
      </div>

      {answer && (
        <p
          aria-live="polite"
          className="mt-4 border-t border-[var(--line)] pt-4 text-xs leading-5 text-[var(--foreground)] sm:text-sm"
        >
          {answer}
        </p>
      )}

      {results.length > 0 && (
        <div className="mt-3 divide-y divide-[var(--line)] border-t border-[var(--line)]">
          {results.slice(0, 6).map((result) => (
            <Link
              key={result.slug}
              href={`/p/${result.slug}`}
              className="flex min-w-0 items-center gap-3 py-3"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                  {result.name}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-[var(--muted)]">
                  {[result.city, result.county].filter(Boolean).join(", ") || "Kenya"}
                  {result.medicineMatch
                    ? ` · ${result.medicineMatches} stock match${result.medicineMatches === 1 ? "" : "es"}`
                    : result.delivery
                      ? " · Delivery available"
                      : ""}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[var(--muted-2)]" aria-hidden />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

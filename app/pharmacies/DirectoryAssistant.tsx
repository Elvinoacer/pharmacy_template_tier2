"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Loader2, Search, Sparkles } from "lucide-react";

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

const EXAMPLES = ["Panadol near Westlands", "delivery pharmacy in Nairobi", "diabetes supplies"];

export default function DirectoryAssistant() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  async function ask(valueOverride?: string) {
    const value = (valueOverride ?? query).trim();
    if (value.length < 2 || loading) return;

    if (valueOverride) setQuery(value);
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
      className="relative isolate overflow-hidden rounded-[24px] border border-[var(--line-2)] bg-[var(--card)] p-4 text-[var(--foreground)] shadow-sm sm:rounded-[28px] sm:p-5 lg:p-6"
      style={{ contain: "paint" }}
    >
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(240px,.65fr)_minmax(0,1.35fr)] lg:items-center lg:gap-8">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--brand-soft)]">
              <Sparkles className="h-4 w-4 text-amber-500" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[var(--foreground)]">Ask Aether</p>
              <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">
                Directory assistant
              </p>
            </div>
          </div>

          <p className="mt-3 max-w-md text-[12px] leading-[1.55] text-[var(--muted)] sm:text-[13px] sm:leading-5">
            Describe what you need naturally. Aether checks live public listings for pharmacies, areas,
            services and visible stock.
          </p>
        </div>

        <div className="min-w-0">
          <div className="grid min-w-0 gap-2.5 sm:grid-cols-[minmax(0,1fr)_132px]">
            <div className="relative min-w-0">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-2)]"
                aria-hidden
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void ask();
                }}
                placeholder="Who has Panadol near Westlands?"
                aria-label="Ask Aether about pharmacies"
                className="h-12 min-w-0 w-full rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] pl-10 pr-3 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--muted-2)] focus:border-[var(--brand)] focus:bg-[var(--card)]"
              />
            </div>

            <button
              type="button"
              onClick={() => void ask()}
              disabled={loading || query.trim().length < 2}
              className="inline-flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-[132px]"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
              )}
              <span>{loading ? "Searching" : "Ask Aether"}</span>
            </button>
          </div>

          <div className="mt-3 flex min-w-0 flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => void ask(example)}
                disabled={loading}
                className="max-w-full rounded-full border border-[var(--line)] bg-[var(--brand-tint)] px-3 py-1.5 text-left text-[10px] font-semibold leading-4 text-[var(--muted)] disabled:opacity-50"
              >
                <span className="block max-w-full break-words">{example}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div aria-live="polite" className="relative min-w-0">
        {answer && (
          <p className="mt-4 break-words rounded-2xl border border-[var(--line)] bg-[var(--brand-tint)] px-3.5 py-3 text-xs leading-5 text-[var(--foreground)]">
            {answer}
          </p>
        )}

        {results.length > 0 && (
          <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {results.slice(0, 6).map((result) => (
              <Link
                key={result.slug}
                href={`/p/${result.slug}`}
                className="group flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card-elev)] px-3 py-2.5 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-bold text-[var(--foreground)]">{result.name}</span>
                  <span className="mt-0.5 block truncate text-[9px] text-[var(--muted)]">
                    {[result.city, result.county].filter(Boolean).join(", ") || "Kenya"}
                    {result.medicineMatch
                      ? ` · ${result.medicineMatches} stock match${result.medicineMatches === 1 ? "" : "es"}`
                      : result.delivery
                        ? " · Delivery available"
                        : ""}
                  </span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--muted-2)]" aria-hidden />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

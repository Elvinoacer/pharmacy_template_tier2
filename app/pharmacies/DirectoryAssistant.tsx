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
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      className="relative isolate overflow-hidden rounded-[28px] border border-[var(--line-2)] bg-[var(--card)] p-4 text-[var(--foreground)] shadow-[var(--glass-shadow)] sm:p-5 lg:p-6"
      style={{ contain: "paint" }}
    >
      {/*
        Keep the ambient depth without CSS filter/backdrop-filter. Large blurred
        layers can corrupt compositing on some Android GPUs, especially inside
        clipped rounded containers. Plain radial gradients render in the normal
        paint pipeline and are much more reliable on mobile.
      */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(circle at 92% 8%, rgba(45, 212, 191, 0.10), transparent 34%), radial-gradient(circle at 22% 100%, rgba(201, 162, 39, 0.08), transparent 30%)",
        }}
      />

      <div className="relative grid gap-5 lg:grid-cols-[minmax(240px,.65fr)_minmax(0,1.35fr)] lg:items-center lg:gap-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] ring-1 ring-[var(--line)]">
              <Sparkles className="h-4 w-4 text-amber-500" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--foreground)]">Ask Aether</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">Directory assistant</p>
            </div>
          </div>
          <p className="mt-3 max-w-md text-xs leading-5 text-[var(--muted)] sm:text-[13px]">
            Describe what you need naturally. Aether checks live public listings for pharmacies, areas,
            services and visible stock.
          </p>
        </div>

        <div className="min-w-0">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-2)]" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void ask();
                }}
                placeholder="Who has Panadol near Westlands?"
                aria-label="Ask Aether about pharmacies"
                className="h-12 w-full rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] pl-10 pr-3 text-xs text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-2)] focus:border-[var(--brand)] focus:bg-[var(--card)]"
              />
            </div>
            <button
              onClick={() => void ask()}
              disabled={loading || query.trim().length < 2}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#0d6e5a] px-5 text-xs font-bold text-white transition hover:bg-[#084c3f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Sparkles className="h-3.5 w-3.5" aria-hidden />}
              {loading ? "Searching" : "Ask Aether"}
            </button>
          </div>

          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => void ask(example)}
                disabled={loading}
                className="shrink-0 rounded-full border border-[var(--line)] bg-[var(--brand-tint)] px-3 py-1.5 text-[10px] font-semibold text-[var(--muted)] transition hover:bg-[var(--brand-soft)] hover:text-[var(--foreground)] disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div aria-live="polite" className="relative">
        {answer && (
          <p className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--brand-tint)] px-3.5 py-3 text-xs leading-5 text-[var(--foreground)]">
            {answer}
          </p>
        )}

        {results.length > 0 && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {results.slice(0, 6).map((result) => (
              <Link
                key={result.slug}
                href={`/p/${result.slug}`}
                className="group flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card-elev)] px-3 py-2.5 text-left transition hover:border-[var(--line-2)] hover:bg-[var(--brand-tint)]"
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
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--muted-2)] transition group-hover:translate-x-0.5 group-hover:text-[var(--brand)]" aria-hidden />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

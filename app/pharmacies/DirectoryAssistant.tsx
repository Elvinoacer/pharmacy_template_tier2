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
    <section className="relative overflow-hidden rounded-[28px] border border-[#0b5c4b]/15 bg-[#073c34] p-4 text-white shadow-[0_18px_50px_rgba(8,76,63,0.16)] sm:p-5 lg:p-6">
      <div className="pointer-events-none absolute -right-14 -top-20 h-48 w-48 rounded-full bg-teal-300/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-20 left-1/4 h-40 w-40 rounded-full bg-amber-200/10 blur-3xl" aria-hidden />

      <div className="relative grid gap-5 lg:grid-cols-[minmax(240px,.65fr)_minmax(0,1.35fr)] lg:items-center lg:gap-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
              <Sparkles className="h-4 w-4 text-amber-300" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-bold">Ask Aether</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-200/70">Directory assistant</p>
            </div>
          </div>
          <p className="mt-3 max-w-md text-xs leading-5 text-teal-50/70 sm:text-[13px]">
            Describe what you need naturally. Aether checks live public listings for pharmacies, areas,
            services and visible stock.
          </p>
        </div>

        <div className="min-w-0">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-100/45" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void ask();
                }}
                placeholder="Who has Panadol near Westlands?"
                aria-label="Ask Aether about pharmacies"
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.07] pl-10 pr-3 text-xs text-white outline-none transition placeholder:text-teal-100/35 focus:border-teal-200/30 focus:bg-white/10"
              />
            </div>
            <button
              onClick={() => void ask()}
              disabled={loading || query.trim().length < 2}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-xs font-bold text-[#073c34] transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold text-teal-50/75 transition hover:bg-white/10 disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div aria-live="polite" className="relative">
        {answer && (
          <p className="mt-4 rounded-2xl border border-white/10 bg-black/10 px-3.5 py-3 text-xs leading-5 text-teal-50/90">
            {answer}
          </p>
        )}

        {results.length > 0 && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {results.slice(0, 6).map((result) => (
              <Link
                key={result.slug}
                href={`/p/${result.slug}`}
                className="group flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-left transition hover:bg-white/10"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-bold">{result.name}</span>
                  <span className="mt-0.5 block truncate text-[9px] text-teal-100/55">
                    {[result.city, result.county].filter(Boolean).join(", ") || "Kenya"}
                    {result.medicineMatch
                      ? ` · ${result.medicineMatches} stock match${result.medicineMatches === 1 ? "" : "es"}`
                      : result.delivery
                        ? " · Delivery available"
                        : ""}
                  </span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-teal-100/45 transition group-hover:translate-x-0.5 group-hover:text-white" aria-hidden />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

type Result = { name: string; slug: string; city: string | null; county: string | null; medicineMatch: boolean; medicineMatches: number; delivery: boolean; stockCount: number };

export default function DirectoryAssistant() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  async function ask() {
    const value = query.trim();
    if (value.length < 2 || loading) return;
    setLoading(true);
    setAnswer("");
    setResults([]);
    try {
      const response = await fetch("/api/directory-ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: value }) });
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
    <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-white shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-white/10 p-2.5"><Sparkles className="h-4 w-4 text-amber-300" /></div>
        <div><p className="text-xs font-bold">Ask Aether</p><p className="mt-1 text-[11px] leading-5 text-slate-400">Find public pharmacy stock, neighbourhoods and services. I only use live public listings.</p></div>
      </div>
      <div className="mt-4 flex gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void ask(); }} placeholder="e.g. Who has Panadol near Westlands?" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white outline-none placeholder:text-slate-500 focus:border-white/25" />
        <button onClick={() => void ask()} disabled={loading || query.trim().length < 2} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Ask</button>
      </div>
      {answer && <p className="mt-4 rounded-xl bg-white/5 px-3 py-2.5 text-xs leading-5 text-slate-200">{answer}</p>}
      {results.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{results.slice(0, 5).map((result) => <Link key={result.slug} href={`/p/${result.slug}`} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10"><span className="min-w-0"><span className="block truncate text-[11px] font-bold">{result.name}</span><span className="block text-[9px] text-slate-400">{[result.city, result.county].filter(Boolean).join(", ") || "Kenya"}{result.medicineMatch ? ` · ${result.medicineMatches} stock match${result.medicineMatches === 1 ? "" : "es"}` : ""}</span></span><ArrowRight className="h-3 w-3 shrink-0 text-slate-400" /></Link>)}</div>}
    </section>
  );
}

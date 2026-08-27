"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import AssistResultCards, {
  AssistSkeleton,
  isAssistPayload,
  type AssistPayload,
} from "./AssistResultCards";

/**
 * Zero-result rescue on the search page: when keyword search comes up empty,
 * the quick assistant interprets the query and shows where the user should go.
 * Auto-runs once for the failed query; the user can rephrase inline.
 */
export default function SearchAssistFallback({
  query,
  base,
}: {
  query: string;
  base: string;
}) {
  const [result, setResult] = useState<AssistPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [rephrase, setRephrase] = useState("");
  const lastQueryRef = useRef<string | null>(null);

  const askAssist = useCallback(
    async (q: string) => {
      const text = q.trim();
      if (text.length < 2) return;
      lastQueryRef.current = text;
      setLoading(true);
      setFailed(false);
      setResult(null);
      try {
        const res = await fetch("/api/assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: text, base }),
        });
        const data: unknown = await res.json();
        if (!res.ok || !isAssistPayload(data)) throw new Error("unavailable");
        setResult(data);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [base],
  );

  // Auto-run once per distinct query
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || q === lastQueryRef.current) return;
    void askAssist(q);
  }, [query, askAssist]);

  return (
    <div className="mt-8 rounded-3xl border border-emerald-600/15 bg-gradient-to-b from-[#f2fbf7] to-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] text-white shadow-sm">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0c1a14]">
            No keyword match — let&apos;s find where you actually need to go
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-[#5a6b62]">
            The quick assistant reads your request and points you to the right page: a refill, a
            pharmacy with stock, a service, or health guidance.
          </p>
        </div>
      </div>

      <div className="mt-4">
        {loading && <AssistSkeleton theme="light" />}
        {!loading && result && (
          <AssistResultCards result={result} theme="light" onFollowup={(q) => void askAssist(q)} />
        )}
        {!loading && !result && failed && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800" role="alert">
            Quick assist is unavailable right now. Try browsing the medicines catalogue or the
            pharmacy directory instead.
          </p>
        )}
        {!loading && !result && !failed && (
          <p className="text-xs text-[#5a6b62]">Reading your request…</p>
        )}
      </div>

      {/* Rephrase */}
      {!loading && (
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void askAssist(rephrase);
          }}
        >
          <input
            type="text"
            value={rephrase}
            onChange={(e) => setRephrase(e.target.value)}
            placeholder="Or describe what you need differently…"
            aria-label="Describe what you need"
            className="min-w-0 flex-1 rounded-xl border border-teal-900/15 bg-white px-3.5 py-2.5 text-sm text-[#0c1a14] outline-none placeholder:text-[#5a6b62]/60 focus:border-emerald-600/40 focus:ring-2 focus:ring-emerald-500/15"
          />
          <button
            type="submit"
            disabled={rephrase.trim().length < 2}
            className="shrink-0 rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition enabled:hover:shadow-md disabled:opacity-40"
          >
            Try again
          </button>
        </form>
      )}
    </div>
  );
}

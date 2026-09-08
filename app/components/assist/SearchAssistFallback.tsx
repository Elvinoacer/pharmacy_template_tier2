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

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || q === lastQueryRef.current) return;
    void askAssist(q);
  }, [query, askAssist]);

  return (
    <div className="mt-6 min-w-0 rounded-2xl border border-[var(--line-2)] bg-[var(--card)] p-4 shadow-sm sm:mt-8 sm:rounded-3xl sm:p-6">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-white shadow-sm">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold leading-5 text-[var(--foreground)]">
            No keyword match — let Aether interpret what you need
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            It can point you toward a refill, stock search, pharmacy service, or relevant health information.
          </p>
        </div>
      </div>

      <div className="mt-4 min-w-0">
        {loading && <AssistSkeleton theme="adaptive" />}
        {!loading && result && (
          <AssistResultCards result={result} theme="adaptive" onFollowup={(q) => void askAssist(q)} />
        )}
        {!loading && !result && failed && (
          <p className="rounded-xl border border-[var(--line-2)] bg-[var(--card-elev)] px-3 py-2.5 text-xs font-medium leading-5 text-[var(--muted)]" role="alert">
            Quick assist is unavailable right now. Try the medicines catalogue or pharmacy directory instead.
          </p>
        )}
        {!loading && !result && !failed && (
          <p className="text-xs text-[var(--muted)]">Reading your request…</p>
        )}
      </div>

      {!loading && (
        <form
          className="mt-4 flex min-w-0 flex-col gap-2.5 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void askAssist(rephrase);
          }}
        >
          <input
            type="text"
            value={rephrase}
            onChange={(e) => setRephrase(e.target.value)}
            placeholder="Describe what you need differently…"
            aria-label="Describe what you need"
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-[var(--line-2)] bg-[var(--card-elev)] px-3.5 py-3 text-base text-[var(--foreground)] outline-none placeholder:text-[var(--muted-2)] focus:border-[var(--brand)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_16%,transparent)] sm:text-sm"
          />
          <button
            type="submit"
            disabled={rephrase.trim().length < 2}
            className="min-h-12 w-full shrink-0 rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition enabled:hover:opacity-90 disabled:opacity-40 sm:w-auto"
          >
            Try again
          </button>
        </form>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowRight, MapPin, Search, Sparkles } from "lucide-react";
import {
  POPULAR_INTENT_IDS,
  getAssistIntent,
  type AssistIntent,
} from "@/app/lib/assist-catalog";
import AssistResultCards, {
  AssistSkeleton,
  isAssistPayload,
  type AssistPayload,
} from "./AssistResultCards";

/**
 * Smart search assist for the landing page.
 *
 * UX contract (non-disruptive by design):
 *  - The search bar keeps working exactly as before: Enter still runs the
 *    normal pharmacy-directory search.
 *  - While typing, the AI quietly reads the query and SHOWS what the user
 *    probably needs as tappable action cards — no chat, no page takeover.
 *  - Focus with an empty box reveals the most common needs as one-tap cards.
 *  - Escape or clicking outside dismisses instantly. Nothing auto-navigates.
 */

const MIN_QUERY = 3;
const DEBOUNCE_MS = 550;

const POPULAR_INTENTS: AssistIntent[] = POPULAR_INTENT_IDS.map(
  (id) => getAssistIntent(id)!,
).filter(Boolean);

export default function SmartSearchAssist({
  variant = "hero",
  placeholder = "Search for a pharmacy or service…",
  initialQuery = "",
  ariaLabel = "Search pharmacies",
}: {
  variant?: "hero" | "network";
  placeholder?: string;
  initialQuery?: string;
  ariaLabel?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<AssistPayload | null>(null);
  const [failed, setFailed] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, AssistPayload>>(new Map());
  const debounceRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);

  const panelId = useId();
  const trimmed = query.trim();

  const runAssist = useCallback(async (text: string) => {
    const q = text.trim();
    if (q.length < MIN_QUERY) return;

    const cached = cacheRef.current.get(q.toLowerCase());
    if (cached) {
      setResult(cached);
      setPending(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;
    setPending(true);
    setFailed(false);

    try {
      const res = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`assist failed: ${res.status}`);
      const data: unknown = await res.json();
      if (!isAssistPayload(data)) throw new Error("assist returned unexpected payload");
      if (requestId !== requestIdRef.current) return; // stale response
      cacheRef.current.set(q.toLowerCase(), data);
      setResult(data);
      setFailed(false);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      if (requestId !== requestIdRef.current) return;
      setFailed(true);
      setResult(null);
    } finally {
      if (requestId === requestIdRef.current) setPending(false);
    }
  }, []);

  // Debounced assist while typing — no state writes in the effect body;
  // pending/visibility is derived below instead.
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!open || trimmed.length < MIN_QUERY) return;
    debounceRef.current = window.setTimeout(() => void runAssist(trimmed), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [trimmed, open, runAssist]);

  // Keyboard: Escape closes (form submit on Enter stays native)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Close when focus/pointer leaves the whole search + panel island
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const showPopular = open && trimmed.length < MIN_QUERY;
  const showAssist = open && trimmed.length >= MIN_QUERY;
  const loading = pending && showAssist;

  const formClassName =
    variant === "hero"
      ? "travel-lab-hero-cta relative z-20 flex !visible !opacity-100 !translate-y-0 w-full max-w-lg items-center rounded-full border border-white/15 bg-black/40 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all focus-within:border-emerald-400/80 focus-within:ring-2 focus-within:ring-emerald-400/20 sm:p-2"
      : "flex w-full max-w-md items-center rounded-full border border-white/10 bg-black/40 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all focus-within:border-emerald-400/80 focus-within:ring-2 focus-within:ring-emerald-400/20 sm:p-2";

  const inputClassName =
    variant === "hero"
      ? "w-full !bg-transparent !text-white !opacity-100 pl-3 pr-2 text-sm placeholder:!text-slate-400 outline-none sm:text-base"
      : "w-full bg-transparent pl-3 pr-2 text-sm text-white placeholder:text-slate-400 outline-none";

  const popularCards = useMemo(
    () =>
      POPULAR_INTENTS.map((intent) => {
        const Icon = intent.icon;
        const primary = intent.actions[0];
        return (
          <Link
            key={intent.id}
            href={primary?.href ?? "/pharmacies"}
            className="group flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 transition hover:border-emerald-400/35 hover:bg-white/[0.08]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-400/25 bg-emerald-700/40 text-emerald-200">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-white">{intent.label}</span>
              <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                {intent.blurb}
              </span>
            </span>
            <ArrowRight
              className="h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-300"
              aria-hidden
            />
          </Link>
        );
      }),
    [],
  );

  return (
    <div
      ref={wrapperRef}
      className={`relative mt-8 w-full ${variant === "hero" ? "max-w-lg" : "max-w-md"}`}
    >
      <form action="/pharmacies" method="GET" className={formClassName}>
        <div className={variant === "hero" ? "flex min-w-0 flex-1 items-center pl-3 sm:pl-4" : "flex flex-1 items-center pl-3"}>
          <MapPin className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            name="q"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-controls={panelId}
            role="combobox"
            aria-autocomplete="list"
            autoComplete="off"
            className={inputClassName}
          />
        </div>
        <button
          type="submit"
          aria-label={ariaLabel}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0d825c] text-white shadow-md shadow-emerald-950/40 transition-all hover:bg-[#10a374] hover:scale-105 active:scale-95 sm:h-11 sm:w-11"
        >
          <Search className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
        </button>
      </form>

      {/* Quick-assist dropdown — never blocks the native search on Enter */}
      <div
        id={panelId}
        role="listbox"
        aria-label="Quick assist suggestions"
        className={`assist-panel absolute left-0 right-0 top-[calc(100%+10px)] z-40 rounded-2xl border border-white/10 bg-[#05130d]/95 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all duration-200 ${
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
        }`}
        style={{ visibility: open ? "visible" : "hidden" }}
      >
        {showPopular && (
          <div className="assist-enter">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              <Sparkles className="h-3 w-3 text-emerald-300" aria-hidden />
              What do you need? One tap and you&apos;re there
            </p>
            <div className="mt-3 grid gap-2">{popularCards}</div>
            <p className="mt-3 text-[10px] text-slate-500">
              Or keep typing — the assistant will read your request and point you the right way.
              Press Enter to search the pharmacy directory.
            </p>
          </div>
        )}

        {showAssist && (
          <div>
            {loading && <AssistSkeleton theme="dark" />}
            {!loading && result && (
              <AssistResultCards
                result={result}
                theme="dark"
                onFollowup={(q) => {
                  setQuery(q);
                  void runAssist(q);
                }}
              />
            )}
            {!loading && !result && !failed && (
              <p className="text-xs text-slate-400">
                Press <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-200">Enter</kbd>{" "}
                to search the directory for “{trimmed}”.
              </p>
            )}
            {!loading && failed && (
              <p className="text-xs text-slate-400">
                Quick assist is unavailable right now — press Enter to search the directory for
                “{trimmed}”.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

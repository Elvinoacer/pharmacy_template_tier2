"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowRight, LifeBuoy, MapPin, Search, X } from "lucide-react";
import { useTenantSlug } from "@/app/components/TenantLink";
import { getPageAssist } from "@/app/lib/assist-catalog";

type LiveMedicine = {
  slug: string;
  name: string;
  genericName: string;
  brandName: string | null;
  strength: string | null;
  priceKes: string;
  availability: "in_stock" | "low_stock" | "out_of_stock";
  pharmacies: Array<{ slug: string; name: string; location: string; href: string }>;
};

type LivePharmacy = {
  slug: string;
  name: string;
  location: string;
  href: string;
  delivery: boolean;
  stocksQuery: boolean;
};

type AssistAction = { label: string; href: string; description: string };

type AssistResult = {
  source: "ai" | "rules";
  intent: { id: string; label: string; blurb: string };
  message: string;
  actions: AssistAction[];
  followups: string[];
  live: { medicines: LiveMedicine[]; pharmacies: LivePharmacy[] };
};

function isAssistResult(value: unknown): value is AssistResult {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  const live = data.live;
  return (
    typeof data.message === "string" &&
    Array.isArray(data.actions) &&
    typeof live === "object" &&
    live !== null &&
    Array.isArray((live as Record<string, unknown>).medicines) &&
    Array.isArray((live as Record<string, unknown>).pharmacies)
  );
}

function availabilityLabel(value: LiveMedicine["availability"]) {
  return value === "in_stock" ? "In stock" : value === "low_stock" ? "Low stock" : "Check availability";
}

export default function QuickPageAssist() {
  const pathname = usePathname() || "/";
  const slug = useTenantSlug();
  const base = slug ? `/p/${slug}` : "";
  const content = getPageAssist(pathname);
  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AssistResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const close = useCallback(() => {
    abortRef.current?.abort();
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  const openPanel = useCallback((seed = "") => {
    setQuery(seed);
    setResult(null);
    setError(null);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousActive = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 60);

    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActive?.focus?.();
    };
  }, [close, open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const onShortcut = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (e.key === "?" && !typing && !open) {
        e.preventDefault();
        openPanel();
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [open, openPanel]);

  const ask = useCallback(async (raw: string) => {
    const next = raw.trim().slice(0, 200);
    if (next.length < 2 || loading) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setQuery(next);
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: next, base }),
        signal: controller.signal,
      });
      const payload: unknown = await response.json();
      if (!response.ok || !isAssistResult(payload)) throw new Error("Assistant unavailable");
      setResult(payload);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError("I couldn’t check the network right now. Try the pharmacy directory instead.");
    } finally {
      setLoading(false);
    }
  }, [base, loading]);

  const hasMedicineResults = Boolean(result?.live.medicines.length);
  const hasPharmacyResults = Boolean(result?.live.pharmacies.length);
  const suggestions = ["Find a pharmacy", "Find a medicine", "Refill a prescription", "Check delivery"];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close() : openPanel())}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={open ? "Close page help" : "Open page help"}
        title="Page help (Shift + /)"
        className="quick-assist-fab group fixed bottom-24 left-3 z-[55] flex min-h-11 items-center gap-2 rounded-full border border-emerald-300/25 bg-[#04130e]/80 px-3 pr-4 text-white shadow-[0_12px_34px_rgba(0,0,0,0.42)] backdrop-blur-2xl transition hover:border-emerald-300/50 hover:bg-[#071c15]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 sm:left-5 sm:bottom-6"
      >
        <span className="relative flex h-6 w-6 items-center justify-center">
          <LifeBuoy className="h-5 w-5 text-emerald-300" aria-hidden="true" />
          <span className="quick-assist-ping absolute inset-0 rounded-full" aria-hidden="true" />
        </span>
        <span className="text-xs font-semibold tracking-wide">Page help</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[150] flex items-end justify-center bg-[#020806]/70 p-3 backdrop-blur-md sm:items-center sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="relative flex max-h-[86dvh] w-full max-w-[36rem] flex-col overflow-hidden rounded-[1.7rem] border border-emerald-200/15 bg-[linear-gradient(145deg,rgba(7,28,21,0.965),rgba(2,13,9,0.985))] text-white shadow-[0_35px_120px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.055)] sm:max-h-[78dvh]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-16 top-8 h-48 w-48 rounded-full bg-lime-300/8 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/45 to-transparent" />

            <header className="relative shrink-0 border-b border-white/8 px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3.5">
                  <div className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_24px_rgba(16,185,129,0.12)]">
                    <LifeBuoy className="h-5 w-5" aria-hidden="true" />
                    <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-[#071c15] bg-emerald-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/90">Aether care assistant</p>
                    <h2 id={titleId} className="mt-1 text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl">How can we help?</h2>
                  </div>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={close}
                  aria-label="Close page help"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </header>

            <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
              <p id={descriptionId} className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-[15px]">
                Ask naturally. I can find medicines and pharmacies in the public network, or take you to the right place in Aether.
              </p>

              <form
                className="mt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void ask(query);
                }}
              >
                <label htmlFor={inputId} className="sr-only">What do you need?</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-200/70" aria-hidden="true" />
                  <input
                    ref={inputRef}
                    id={inputId}
                    type="search"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setResult(null);
                      setError(null);
                    }}
                    placeholder="e.g. Panadol near Westlands"
                    autoComplete="off"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.06] py-3.5 pl-11 pr-24 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300/40 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/10"
                  />
                  <button
                    type="submit"
                    disabled={loading || query.trim().length < 2}
                    className="absolute right-1.5 top-1/2 min-h-10 -translate-y-1/2 rounded-xl bg-emerald-400/15 px-3.5 text-xs font-semibold text-emerald-100 ring-1 ring-inset ring-emerald-300/15 transition hover:bg-emerald-400/25 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                  >
                    {loading ? "Searching" : "Search"}
                  </button>
                </div>
              </form>

              {!result && !loading && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void ask(suggestion)}
                      className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-emerald-300/25 hover:bg-emerald-300/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {loading && (
                <div className="mt-5 flex items-center gap-2 text-sm text-slate-300" aria-live="polite">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                  Looking across the Aether network…
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/10 px-3.5 py-3 text-sm text-amber-100" role="alert">
                  {error}
                </div>
              )}

              {!loading && result && (
                <div className="mt-5 space-y-3" aria-live="polite">
                  <p className="text-sm leading-6 text-slate-200">{result.message}</p>

                  {hasMedicineResults && (
                    <div className="space-y-2.5">
                      {result.live.medicines.slice(0, 3).map((medicine) => (
                        <article key={`${medicine.slug}-${medicine.strength ?? ""}`} className="rounded-2xl border border-white/8 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white">{medicine.name}</p>
                              <p className="mt-0.5 text-xs text-slate-400">{[medicine.strength, medicine.brandName || medicine.genericName].filter(Boolean).join(" · ")}</p>
                            </div>
                            <span className="shrink-0 rounded-full border border-emerald-300/10 bg-emerald-300/8 px-2 py-1 text-[10px] font-semibold text-emerald-200">
                              {availabilityLabel(medicine.availability)}
                            </span>
                          </div>
                          {medicine.pharmacies.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {medicine.pharmacies.slice(0, 3).map((pharmacy) => (
                                <Link
                                  key={pharmacy.slug}
                                  href={pharmacy.href}
                                  onClick={close}
                                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-emerald-300/10 bg-emerald-300/8 px-2.5 text-xs text-emerald-50 transition hover:border-emerald-300/25 hover:bg-emerald-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                                >
                                  <MapPin className="h-3 w-3 text-emerald-300" aria-hidden="true" />
                                  <span>{pharmacy.name}</span>
                                  <span className="text-emerald-200/50">· {pharmacy.location}</span>
                                </Link>
                              ))}
                              {medicine.pharmacies.length > 3 && (
                                <span className="inline-flex items-center px-1 text-[11px] text-slate-500">+{medicine.pharmacies.length - 3} more</span>
                              )}
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  )}

                  {!hasMedicineResults && hasPharmacyResults && (
                    <div className="space-y-2.5">
                      {result.live.pharmacies.slice(0, 4).map((pharmacy) => (
                        <Link
                          key={pharmacy.slug}
                          href={pharmacy.href}
                          onClick={close}
                          className="group flex min-h-16 items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.045] px-4 py-3.5 transition hover:border-emerald-300/20 hover:bg-white/[0.065] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-white">{pharmacy.name}</span>
                            <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-400"><MapPin className="h-3 w-3" aria-hidden="true" />{pharmacy.location}{pharmacy.stocksQuery ? " · matches your search" : ""}</span>
                          </span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-emerald-300/70" aria-hidden="true" />
                        </Link>
                      ))}
                    </div>
                  )}

                  {!hasMedicineResults && !hasPharmacyResults && result.actions.length > 0 && (
                    <div className="space-y-2.5">
                      {result.actions.slice(0, 2).map((action) => (
                        <Link
                          key={action.href}
                          href={action.href}
                          onClick={close}
                          className="group flex min-h-16 items-center justify-between gap-4 rounded-2xl border border-emerald-300/12 bg-emerald-300/8 px-4 py-3.5 transition hover:border-emerald-300/25 hover:bg-emerald-300/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                        >
                          <span className="min-w-0"><span className="block text-sm font-semibold text-white">{action.label}</span><span className="mt-0.5 block text-xs text-emerald-50/60">{action.description}</span></span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-emerald-200" aria-hidden="true" />
                        </Link>
                      ))}
                    </div>
                  )}

                  {(hasMedicineResults || hasPharmacyResults) && result.actions[0] && (
                    <Link
                      href={result.actions[0].href}
                      onClick={close}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 transition hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                    >
                      {result.actions[0].label}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              )}
            </div>

            <footer className="relative shrink-0 border-t border-white/8 px-5 py-3 sm:px-6">
              <p className="text-[10px] text-slate-500"><kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-slate-300">?</kbd> to open help · <span className="text-slate-600">live public network data</span></p>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

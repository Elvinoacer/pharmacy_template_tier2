"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowRight, LifeBuoy, MapPin, Search, X } from "lucide-react";
import { useTenantSlug } from "@/app/components/TenantLink";
import { getPageAssist } from "@/app/lib/assist-catalog";
import styles from "./QuickPageAssist.module.css";

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
        aria-label={open ? "Close Aether assistant" : "Open Aether AI assistant"}
        title={open ? "Close Aether AI assistant" : "Say hi to Aether AI assistant"}
        data-state={open ? "open" : loading ? "thinking" : "idle"}
        className={styles.robotLauncher}
      >
        <span className={styles.ambientRing} aria-hidden="true" />
        <span className={styles.greeting} aria-hidden="true">
          <span>Hi!</span>
        </span>
        <span className={styles.robot} aria-hidden="true">
          <span className={`${styles.arm} ${styles.leftArm}`}>
            <span className={styles.upperArm} />
            <span className={styles.forearm} />
            <span className={styles.hand}>
              <span className={styles.palm} />
              <span className={`${styles.finger} ${styles.fingerOne}`} />
              <span className={`${styles.finger} ${styles.fingerTwo}`} />
            </span>
          </span>
          <span className={`${styles.arm} ${styles.rightArm}`}>
            <span className={styles.upperArm} />
            <span className={styles.forearm} />
            <span className={styles.hand}>
              <span className={styles.palm} />
              <span className={`${styles.finger} ${styles.fingerOne}`} />
              <span className={`${styles.finger} ${styles.fingerTwo}`} />
            </span>
          </span>

          <span className={styles.antenna}>
            <span className={styles.antennaTip} />
          </span>
          <span className={styles.robotHead}>
            <span className={`${styles.ear} ${styles.leftEar}`} />
            <span className={`${styles.ear} ${styles.rightEar}`} />
            <span className={styles.faceGlow} />
            <span className={`${styles.eye} ${styles.leftEye}`}>
              <span className={styles.pupil} />
            </span>
            <span className={`${styles.eye} ${styles.rightEye}`}>
              <span className={styles.pupil} />
            </span>
            <span className={styles.nose} />
            <span className={styles.mouth}>
              <span className={styles.mouthLight} />
            </span>
          </span>
          <span className={styles.neck} />
          <span className={styles.robotBody}>
            <span className={styles.core} />
            <span className={styles.bodyLine} />
          </span>
        </span>
        <span className={styles.statusBadge} aria-hidden="true">AI</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[150] flex items-end justify-center bg-black/45 p-2 backdrop-blur-sm sm:items-center sm:p-6"
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
            className="relative flex max-h-[88dvh] w-full max-w-[36rem] flex-col overflow-hidden rounded-[1.5rem] border border-[var(--line-2)] bg-[var(--card)] text-[var(--foreground)] shadow-[0_28px_90px_rgba(0,0,0,0.34)] sm:max-h-[78dvh] sm:rounded-[1.75rem]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute -left-20 -top-24 h-52 w-52 rounded-full bg-[var(--brand-soft)] opacity-70 blur-3xl" />
            <div className="pointer-events-none absolute -right-20 top-10 h-44 w-44 rounded-full bg-[var(--brand-tint)] opacity-60 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand)] to-transparent opacity-50" />

            {/* Deliberately not a semantic <header>: landing-page theme rules target
                every descendant header and previously overrode this modal in light mode. */}
            <div className="relative shrink-0 border-b border-[var(--line)] bg-[var(--card)] px-4 py-3.5 sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="flex min-w-0 items-start gap-3 sm:gap-3.5">
                  <div className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--line-2)] bg-[var(--brand-soft)] text-[var(--brand-deep)] shadow-sm sm:h-11 sm:w-11 sm:rounded-2xl">
                    <LifeBuoy className="h-5 w-5" aria-hidden="true" />
                    <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-[var(--card)] bg-[var(--success)]" />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="truncate text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-[10px] sm:tracking-[0.2em]">
                      Aether care assistant
                    </p>
                    <h2 id={titleId} className="mt-1 text-[1.2rem] font-semibold leading-tight tracking-[-0.025em] text-[var(--foreground)] sm:text-2xl">
                      How can we help?
                    </h2>
                  </div>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={close}
                  aria-label="Close page help"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--line-2)] bg-[var(--background)] text-[var(--muted)] transition hover:border-[var(--brand)] hover:bg-[var(--brand-soft)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] sm:h-11 sm:w-11"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="relative min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain bg-[var(--card)] px-4 py-4 sm:px-6 sm:py-6">
              <p id={descriptionId} className="max-w-2xl text-[13px] leading-5 text-[var(--muted)] sm:text-[15px] sm:leading-6">
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
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="relative min-w-0">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand)]" aria-hidden="true" />
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
                      className="min-h-12 w-full rounded-xl border border-[var(--line-2)] bg-[var(--background)] py-3 pl-10 pr-3 text-[var(--foreground)] outline-none placeholder:text-[var(--muted-2)] transition focus:border-[var(--brand)] focus:bg-[var(--card-elev)] focus:ring-2 focus:ring-[var(--brand-soft)] sm:rounded-2xl sm:text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || query.trim().length < 2}
                    className="min-h-12 w-full rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-[var(--background)] shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)] sm:w-auto sm:min-w-24 sm:rounded-2xl"
                  >
                    {loading ? "Searching…" : "Search"}
                  </button>
                </div>
              </form>

              {!result && !loading && (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void ask(suggestion)}
                      className="min-h-10 rounded-xl border border-[var(--line-2)] bg-[var(--card-elev)] px-2.5 py-2 text-center text-[11px] font-medium leading-tight text-[var(--foreground)] transition hover:border-[var(--brand)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] sm:rounded-full sm:px-3 sm:text-xs"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {loading && (
                <div className="mt-5 flex items-center gap-2 text-sm text-[var(--muted)]" aria-live="polite">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--success)]" />
                  Looking across the Aether network…
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-sm text-[var(--foreground)]" role="alert">
                  {error}
                </div>
              )}

              {!loading && result && (
                <div className="mt-5 space-y-3" aria-live="polite">
                  <p className="text-sm leading-6 text-[var(--foreground)]">{result.message}</p>

                  {hasMedicineResults && (
                    <div className="space-y-2.5">
                      {result.live.medicines.slice(0, 3).map((medicine) => (
                        <article
                          key={`${medicine.slug}-${medicine.strength ?? ""}`}
                          className="rounded-2xl border border-[var(--line)] bg-[var(--card-elev)] p-3.5 shadow-sm sm:p-4"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[var(--foreground)]">{medicine.name}</p>
                              <p className="mt-0.5 text-xs text-[var(--muted)]">
                                {[medicine.strength, medicine.brandName || medicine.genericName].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                            <span className="w-fit shrink-0 rounded-full border border-[var(--line-2)] bg-[var(--brand-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--brand-deep)]">
                              {availabilityLabel(medicine.availability)}
                            </span>
                          </div>
                          {medicine.pharmacies.length > 0 && (
                            <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
                              {medicine.pharmacies.slice(0, 3).map((pharmacy) => (
                                <Link
                                  key={pharmacy.slug}
                                  href={pharmacy.href}
                                  onClick={close}
                                  className="flex min-h-10 min-w-0 items-center gap-1.5 rounded-xl border border-[var(--line-2)] bg-[var(--brand-soft)] px-2.5 text-xs text-[var(--foreground)] transition hover:border-[var(--brand)] hover:bg-[var(--brand-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] sm:inline-flex sm:w-auto sm:rounded-full"
                                >
                                  <MapPin className="h-3 w-3 shrink-0 text-[var(--brand)]" aria-hidden="true" />
                                  <span className="min-w-0 font-medium">{pharmacy.name}</span>
                                  <span className="min-w-0 truncate text-[var(--muted)]">· {pharmacy.location}</span>
                                </Link>
                              ))}
                              {medicine.pharmacies.length > 3 && (
                                <span className="inline-flex items-center px-1 text-[11px] text-[var(--muted-2)]">+{medicine.pharmacies.length - 3} more</span>
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
                          className="group flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card-elev)] px-3.5 py-3 transition hover:border-[var(--brand)] hover:bg-[var(--brand-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] sm:gap-4 sm:px-4 sm:py-3.5"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-[var(--foreground)]">{pharmacy.name}</span>
                            <span className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-[var(--muted)]">
                              <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                              <span className="truncate">{pharmacy.location}{pharmacy.stocksQuery ? " · matches your search" : ""}</span>
                            </span>
                          </span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
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
                          className="group flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-[var(--line-2)] bg-[var(--brand-soft)] px-3.5 py-3 transition hover:border-[var(--brand)] hover:bg-[var(--brand-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] sm:gap-4 sm:px-4 sm:py-3.5"
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-[var(--foreground)]">{action.label}</span>
                            <span className="mt-0.5 block text-xs text-[var(--muted)]">{action.description}</span>
                          </span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
                        </Link>
                      ))}
                    </div>
                  )}

                  {(hasMedicineResults || hasPharmacyResults) && result.actions[0] && (
                    <Link
                      href={result.actions[0].href}
                      onClick={close}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-deep)] transition hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                    >
                      {result.actions[0].label}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Also avoid a semantic <footer> so site-footer theme rules can never leak in. */}
            <div className="relative shrink-0 border-t border-[var(--line)] bg-[var(--card)] px-4 py-2.5 sm:px-6 sm:py-3">
              <p className="flex items-center justify-center gap-1.5 text-[10px] text-[var(--muted-2)] sm:justify-start">
                <span className="hidden sm:inline">
                  <kbd className="rounded border border-[var(--line-2)] bg-[var(--background)] px-1.5 py-0.5 text-[var(--muted)]">?</kbd>
                  <span className="ml-1.5">to open help ·</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" aria-hidden="true" />
                  live public network data
                </span>
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

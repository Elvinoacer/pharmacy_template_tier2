"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Compass,
  LifeBuoy,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {
  getPageAssist,
  type PageAssistContent,
} from "@/app/lib/assist-catalog";
import { tenantHref, useTenantSlug } from "@/app/components/TenantLink";
import AssistResultCards, {
  AssistSkeleton,
  isAssistPayload,
  type AssistPayload,
} from "./AssistResultCards";

const NUDGE_STORAGE_KEY = "aether.page-assist.nudged";
const NUDGE_DELAY_MS = 2200;
const NUDGE_AUTOHIDE_MS = 9000;

export default function QuickPageAssist() {
  const pathname = usePathname() || "/";
  const slug = useTenantSlug();
  const base = slug ? `/p/${slug}` : "";
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assistByPath, setAssistByPath] = useState<{
    path: string;
    input: string;
    result: AssistPayload | null;
    error: string | null;
  }>({ path: "", input: "", result: null, error: null });

  const assist =
    assistByPath.path === pathname
      ? assistByPath
      : { path: pathname, input: "", result: null, error: null };
  const input = assist.input;
  const result = assist.result;
  const assistError = assist.error;

  const abortRef = useRef<AbortController | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const formId = useId();
  const content: PageAssistContent = getPageAssist(pathname);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(NUDGE_STORAGE_KEY)) return;
    } catch {
      return;
    }

    const timer = window.setTimeout(() => setNudge(true), NUDGE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!nudge) return;
    const hide = window.setTimeout(() => {
      setNudge(false);
      try {
        sessionStorage.setItem(NUDGE_STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    }, NUDGE_AUTOHIDE_MS);
    return () => window.clearTimeout(hide);
  }, [nudge]);

  const dismissNudge = useCallback(() => {
    setNudge(false);
    try {
      sessionStorage.setItem(NUDGE_STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const closeDialog = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  const openDialog = useCallback(() => {
    dismissNudge();
    setOpen(true);
  }, [dismissNudge]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (e.key === "?" && !typing && !open) {
        e.preventDefault();
        openDialog();
      }

      if (e.key === "Escape" && open) {
        e.preventDefault();
        closeDialog();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeDialog, open, openDialog]);

  useEffect(() => {
    if (!open) return;

    const previousActive = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const askAssist = useCallback(
    async (raw: string) => {
      const query = raw.trim();
      if (query.length < 2 || loading) return;

      const currentPath = pathname;
      setAssistByPath({ path: currentPath, input: query, result: null, error: null });
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);

      try {
        const res = await fetch("/api/assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, base }),
          signal: controller.signal,
        });
        const data: unknown = await res.json();
        if (!res.ok || !isAssistPayload(data)) {
          throw new Error((data as { error?: string })?.error || "Assist unavailable");
        }
        setAssistByPath((prev) =>
          prev.path === currentPath
            ? { ...prev, result: data, error: null }
            : prev,
        );
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setAssistByPath((prev) =>
          prev.path === currentPath
            ? {
                ...prev,
                result: null,
                error: "Quick assist is unavailable right now. The shortcuts below still work.",
              }
            : prev,
        );
      } finally {
        setLoading(false);
      }
    },
    [base, loading, pathname],
  );

  return (
    <>
      <div className="pointer-events-none fixed bottom-24 left-3 z-[55] sm:bottom-24 sm:left-5 lg:bottom-6">
        <div className="pointer-events-auto relative">
          {nudge && !open && (
            <div
              className="assist-enter absolute bottom-[calc(100%+0.65rem)] left-0 w-64 overflow-hidden rounded-2xl border border-emerald-300/15 bg-[#04130e]/90 p-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
              role="status"
            >
              <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />
              <button
                type="button"
                onClick={dismissNudge}
                aria-label="Dismiss help introduction"
                className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-200">
                <Sparkles className="h-3 w-3" aria-hidden />
                Need a hand?
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                Get a quick explanation of this page, or ask what to do next.
              </p>
              <button
                type="button"
                onClick={openDialog}
                className="mt-3 min-h-10 w-full rounded-xl border border-emerald-300/15 bg-emerald-400/15 px-3 py-2 text-xs font-semibold text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-emerald-400/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                Open page help
              </button>
            </div>
          )}

          <button
            ref={triggerRef}
            type="button"
            onClick={() => {
              if (open) closeDialog();
              else openDialog();
            }}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-label={open ? "Close page help" : "Open page help"}
            title="Page help (Shift + /)"
            className="quick-assist-fab group flex min-h-11 items-center gap-2 rounded-full border border-emerald-300/25 bg-[#04130e]/85 pl-3 pr-4 text-white shadow-[0_12px_34px_rgba(0,0,0,0.4)] backdrop-blur-2xl transition hover:border-emerald-300/50 hover:bg-[#071c15]/90 hover:shadow-[0_14px_40px_rgba(16,185,129,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent active:scale-95"
          >
            <span className="relative flex h-6 w-6 items-center justify-center">
              <LifeBuoy className="h-5 w-5 text-emerald-300" aria-hidden />
              <span className="quick-assist-ping absolute inset-0 rounded-full" aria-hidden />
            </span>
            <span className="whitespace-nowrap text-xs font-semibold tracking-wide">Page help</span>
          </button>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-[#020806]/65 p-3 backdrop-blur-md sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${formId}-title`}
          aria-describedby={`${formId}-description`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeDialog();
          }}
        >
          <div
            ref={dialogRef}
            className="relative flex w-full max-w-[44rem] max-h-[min(88dvh,760px)] flex-col overflow-hidden rounded-[1.8rem] border border-emerald-200/15 bg-[linear-gradient(145deg,rgba(7,28,21,0.97),rgba(2,13,9,0.98))] text-white shadow-[0_35px_120px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.02),inset_0_1px_0_rgba(255,255,255,0.06)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute -left-20 -top-24 h-60 w-60 rounded-full bg-emerald-400/12 blur-3xl" />
            <div className="pointer-events-none absolute -right-16 top-20 h-52 w-52 rounded-full bg-lime-300/10 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/45 to-transparent" />

            <header className="relative shrink-0 border-b border-white/8 px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3.5">
                  <div className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_24px_rgba(16,185,129,0.12)]">
                    <Compass className="h-5 w-5" aria-hidden />
                    <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-[#071c15] bg-emerald-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/90">
                      {content.kicker} · help
                    </p>
                    <h2
                      id={`${formId}-title`}
                      className="mt-1 text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      {content.title}
                    </h2>
                  </div>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closeDialog}
                  aria-label="Close page help"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06170f]"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </header>

            <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
              <p
                id={`${formId}-description`}
                className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-[15px]"
              >
                {content.about}
              </p>

              <section className="relative mt-5 overflow-hidden rounded-2xl border border-emerald-300/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:p-5" aria-labelledby={`${formId}-what-you-can-do`}>
                <div className="pointer-events-none absolute -right-12 -top-12 h-24 w-24 rounded-full bg-emerald-300/10 blur-2xl" />
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
                  <h3 id={`${formId}-what-you-can-do`} className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-200">
                    What you can do here
                  </h3>
                </div>
                <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {content.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2.5 rounded-xl border border-white/6 bg-black/10 px-3 py-2.5 text-sm leading-5 text-slate-200">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-5" aria-labelledby={`${formId}-actions`}>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h3 id={`${formId}-actions`} className="text-sm font-semibold text-white">Quick actions</h3>
                    <p className="mt-0.5 text-xs text-slate-400">Jump straight to the next useful step.</p>
                  </div>
                  <span className="hidden rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-slate-400 sm:inline-flex">Tap any card</span>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {content.actions.map((action) => {
                    const href = tenantHref(slug, action.href);
                    return (
                      <Link
                        key={action.label}
                        href={href}
                        onClick={closeDialog}
                        className={
                          action.primary
                            ? "group relative overflow-hidden rounded-2xl border border-emerald-300/25 bg-emerald-400/12 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.16)] transition hover:border-emerald-200/35 hover:bg-emerald-300/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06170f]"
                            : "group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition hover:border-white/15 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06170f]"
                        }
                      >
                        {action.primary && <span className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-emerald-300/8 to-transparent" />}
                        <div className="relative flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <span className="block text-sm font-semibold text-white">{action.label}</span>
                            <span className="mt-1 block text-xs leading-5 text-slate-400">{action.description}</span>
                          </div>
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/5 text-slate-300 transition group-hover:border-emerald-300/20 group-hover:bg-emerald-300/10 group-hover:text-emerald-200">
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>

              <section className="relative mt-5 overflow-hidden rounded-[1.35rem] border border-emerald-200/12 bg-[linear-gradient(140deg,rgba(16,185,129,0.11),rgba(255,255,255,0.035))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] sm:p-5" aria-labelledby={`${formId}-assistant`}>
                <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-emerald-300/12 blur-3xl" />
                <div className="relative">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 id={`${formId}-assistant`} className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-200">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden />
                        Still not sure?
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">Ask in your own words and I’ll point you in the right direction.</p>
                    </div>
                    <span className="hidden rounded-full border border-emerald-300/10 bg-emerald-300/5 px-2.5 py-1 text-[10px] font-medium text-emerald-200/80 sm:inline-flex">Quick assist</span>
                  </div>

                  <form
                    className="mt-3 flex gap-2.5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void askAssist(input);
                    }}
                  >
                    <div className="relative min-w-0 flex-1">
                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) =>
                          setAssistByPath((prev) => ({
                            path: pathname,
                            input: e.target.value,
                            result: prev.path === pathname ? prev.result : null,
                            error: prev.path === pathname ? prev.error : null,
                          }))
                        }
                        placeholder="Tell me what you need…"
                        aria-label="Tell the quick assistant what you need"
                        className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300/35 focus:bg-black/25 focus:ring-2 focus:ring-emerald-300/10"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading || input.trim().length < 2}
                      aria-label={loading ? "Getting help" : "Ask the quick assistant"}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-400/15 text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition enabled:hover:border-emerald-300/30 enabled:hover:bg-emerald-300/20 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                    >
                      <Send className="h-4 w-4" aria-hidden />
                    </button>
                  </form>

                  {!result && !loading && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {content.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => void askAssist(suggestion)}
                          className="rounded-full border border-white/8 bg-white/[0.035] px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition hover:border-emerald-300/20 hover:bg-emerald-300/8 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}

                  {loading && (
                    <div className="mt-3 rounded-xl border border-white/6 bg-black/10 p-3">
                      <AssistSkeleton theme="dark" />
                    </div>
                  )}

                  {!loading && result && (
                    <div className="mt-3 rounded-xl border border-white/7 bg-black/10 p-3">
                      <AssistResultCards
                        result={result}
                        theme="dark"
                        onFollowup={(query) => void askAssist(query)}
                      />
                    </div>
                  )}

                  {assistError && (
                    <p className="mt-3 rounded-xl border border-amber-300/10 bg-amber-300/8 px-3 py-2.5 text-xs leading-5 text-amber-100" role="alert">
                      {assistError}
                    </p>
                  )}
                </div>
              </section>
            </div>

            <footer className="relative shrink-0 flex items-center justify-between gap-3 border-t border-white/8 bg-black/10 px-5 py-3 sm:px-6">
              <p className="text-[10px] text-slate-500">
                Press <kbd className="ml-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-slate-300">Shift + /</kbd> anytime to reopen
              </p>
              <button
                type="button"
                onClick={closeDialog}
                className="min-h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-semibold text-slate-200 transition hover:border-white/15 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

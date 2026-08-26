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

/**
 * QuickPageAssist — a small, familiar help dialog for explaining the current page.
 *
 * Accessibility contract:
 *  - clear dialog semantics with labelled title + description
 *  - visible focus states and 44px-ish touch targets
 *  - Escape closes, backdrop click closes
 *  - keyboard focus moves into the dialog and is trapped while open
 *  - focus is restored to the trigger after close
 *  - page scrolling is locked while the modal is open
 *
 * The dialog intentionally uses a classic light surface rather than the global
 * modal-card primitive, whose dark-mode rules are too opinionated for this
 * public help UI.
 */

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

  // Open with ? outside text-entry fields and close with Escape.
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
        setOpen(true);
        setNudge(false);
      }

      if (e.key === "Escape" && open) {
        e.preventDefault();
        closeDialog();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeDialog, open]);

  // Lock the page and implement a small, robust focus trap.
  useEffect(() => {
    if (!open) return;

    const previousActive = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("aria-hidden"));

      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

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
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
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
      {/* Floating page-help trigger */}
      <div className="pointer-events-none fixed bottom-24 left-3 z-[55] sm:bottom-24 sm:left-5 lg:bottom-6">
        <div className="pointer-events-auto relative">
          {nudge && !open && (
            <div
              className="assist-enter absolute bottom-[calc(100%+0.6rem)] left-0 w-60 rounded-2xl border border-emerald-400/25 bg-[#05130d]/95 p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl"
              role="status"
            >
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
                Open page help to see what you can do here and get quick guidance.
              </p>
              <button
                type="button"
                onClick={() => {
                  triggerRef.current?.focus();
                  setOpen(true);
                  dismissNudge();
                }}
                className="mt-3 min-h-10 w-full rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05130d]"
              >
                Open page help
              </button>
            </div>
          )}

          <button
            ref={triggerRef}
            type="button"
            onClick={() => {
              setOpen((v) => !v);
              dismissNudge();
            }}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-label="Open page help"
            title="Page help (Shift + /)"
            className="quick-assist-fab group flex min-h-11 items-center gap-2 rounded-full border border-emerald-300/25 bg-[#05130d]/95 pl-3 pr-4 text-white shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl transition hover:border-emerald-300/50 hover:shadow-[0_10px_36px_rgba(16,185,129,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent active:scale-95"
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
          className="modal-backdrop !items-center !justify-center !bg-black/45"
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
            className="flex w-full max-w-2xl max-h-[min(90dvh,760px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-[#0c1a14] shadow-[0_24px_80px_rgba(0,0,0,0.24)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Classic dialog header */}
            <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f5f1] text-[#0d6e5a] ring-1 ring-[#cfe8df]">
                    <Compass className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0d6e5a]">
                      {content.kicker}
                    </p>
                    <h2
                      id={`${formId}-title`}
                      className="mt-1 text-lg font-semibold leading-tight text-[#0c1a14] sm:text-xl"
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
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d6e5a] focus-visible:ring-offset-2"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </header>

            {/* Scrollable content */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-5 py-5 sm:px-6 sm:py-6">
              <p
                id={`${formId}-description`}
                className="max-w-2xl text-sm leading-6 text-slate-700"
              >
                {content.about}
              </p>

              <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-labelledby={`${formId}-what-you-can-do`}>
                <h3 id={`${formId}-what-you-can-do`} className="text-sm font-semibold text-slate-900">
                  What you can do here
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {content.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2.5 text-sm leading-5 text-slate-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-5" aria-labelledby={`${formId}-actions`}>
                <h3 id={`${formId}-actions`} className="text-sm font-semibold text-slate-900">
                  Quick actions
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {content.actions.map((action) => {
                    const href = tenantHref(slug, action.href);
                    return action.primary ? (
                      <Link
                        key={action.label}
                        href={href}
                        onClick={closeDialog}
                        className="group flex min-h-16 items-center justify-between gap-3 rounded-xl border border-[#0d6e5a] bg-[#0d6e5a] px-4 py-3 text-white transition hover:bg-[#0b5f50] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d6e5a] focus-visible:ring-offset-2"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{action.label}</span>
                          <span className="mt-0.5 block text-xs leading-4 text-teal-50">{action.description}</span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-teal-100 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </Link>
                    ) : (
                      <Link
                        key={action.label}
                        href={href}
                        onClick={closeDialog}
                        className="group flex min-h-16 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition hover:bg-slate-50 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d6e5a] focus-visible:ring-offset-2"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{action.label}</span>
                          <span className="mt-0.5 block text-xs leading-4 text-slate-600">{action.description}</span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </Link>
                    );
                  })}
                </div>
              </section>

              <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4" aria-labelledby={`${formId}-assistant`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                    <Sparkles className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 id={`${formId}-assistant`} className="text-sm font-semibold text-slate-900">
                      Need more help?
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Describe what you are trying to do and the assistant will point you to the right action.
                    </p>
                  </div>
                </div>

                <form
                  className="mt-3 flex flex-col gap-2 sm:flex-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void askAssist(input);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`${formId}-input`} className="sr-only">
                      What do you need help with?
                    </label>
                    <input
                      id={`${formId}-input`}
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
                      placeholder="What do you need help with?"
                      autoComplete="off"
                      className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-[#0d6e5a] focus:ring-2 focus:ring-[#0d6e5a]/20"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || input.trim().length < 2}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0d6e5a] px-4 text-sm font-semibold text-white transition hover:bg-[#0b5f50] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d6e5a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 sm:min-w-11 sm:px-3"
                    aria-label={loading ? "Getting help" : "Ask for help"}
                  >
                    <Send className="h-4 w-4" aria-hidden />
                    <span className="sm:hidden">Ask</span>
                  </button>
                </form>

                {!result && !loading && content.suggestions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2" aria-label="Suggested questions">
                    {content.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => void askAssist(suggestion)}
                        className="min-h-10 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-[#0d6e5a]/40 hover:bg-emerald-50 hover:text-[#084c3f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d6e5a] focus-visible:ring-offset-2"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                {loading && (
                  <div className="mt-4" aria-live="polite" aria-busy="true">
                    <span className="sr-only">Getting help</span>
                    <AssistSkeleton theme="light" />
                  </div>
                )}

                {!loading && result && (
                  <div className="mt-4 border-t border-slate-200 pt-4" aria-live="polite">
                    <AssistResultCards
                      result={result}
                      theme="light"
                      onFollowup={(query) => void askAssist(query)}
                    />
                  </div>
                )}

                {assistError && (
                  <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-5 text-amber-900" role="alert">
                    {assistError}
                  </p>
                )}
              </section>
            </div>

            {/* Dialog actions / status bar */}
            <footer className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-slate-600">
                Press <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700">Shift + /</kbd> to open help anytime.
              </p>
              <button
                type="button"
                onClick={closeDialog}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d6e5a] focus-visible:ring-offset-2"
              >
                Close help
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

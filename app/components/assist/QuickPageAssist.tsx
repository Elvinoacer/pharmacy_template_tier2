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
 * QuickPageAssist — the non-disruptive "what is this page about?" helper.
 *
 * UX contract:
 *  - A quiet floating helper (bottom-left; the chatbot lives bottom-right).
 *    Never blocks content, never auto-opens a modal.
 *  - ONE gentle nudge per session (small popover, auto-dismisses) so first-time
 *    visitors discover it — then it stays out of the way.
 *  - Opens a modal that explains the current page in plain language and shows
 *    what can be done here, with an inline AI quick-assist box that returns
 *    action cards (not chat).
 *  - Shift + "/" opens it from the keyboard. Escape closes.
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

  /**
   * Inline-assist state is keyed by pathname so navigating to a new page
   * naturally shows a clean slate — no reset effect needed.
   */
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
  const formId = useId();

  // Route-aware content; recomputed on navigation
  const content: PageAssistContent = getPageAssist(pathname);

  // One-time nudge per session
  useEffect(() => {
    try {
      if (sessionStorage.getItem(NUDGE_STORAGE_KEY)) return;
    } catch {
      return; // storage unavailable — skip nudge entirely
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

  // Keyboard: Shift+/ opens, Escape closes
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (e.key === "?" && !typing) {
        e.preventDefault();
        setOpen(true);
        setNudge(false);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
      {/* Floating helper — bottom-left, away from the chatbot FAB */}
      <div className="pointer-events-none fixed bottom-24 left-3 z-[55] sm:bottom-24 sm:left-5 lg:bottom-6">
        <div className="pointer-events-auto relative">
          {/* First-visit nudge */}
          {nudge && !open && (
            <div
              className="assist-enter absolute bottom-[calc(100%+0.6rem)] left-0 w-60 rounded-2xl border border-emerald-400/25 bg-[#05130d]/95 p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl"
              role="status"
            >
              <button
                type="button"
                onClick={dismissNudge}
                aria-label="Dismiss"
                className="absolute right-2 top-2 rounded-full p-1 text-slate-500 transition hover:text-white"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-200">
                <Sparkles className="h-3 w-3" aria-hidden />
                New here?
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                Tap the helper to see what this page can do for you — in plain language.
              </p>
              <button
                type="button"
                onClick={() => {
                  setOpen(true);
                  dismissNudge();
                }}
                className="mt-2.5 w-full rounded-lg bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
              >
                Show me around
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setOpen((v) => !v);
              dismissNudge();
            }}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-label="Page help — what can I do on this page?"
            title="What can I do here? (Shift + /)"
            className="quick-assist-fab group flex h-11 items-center gap-2 rounded-full border border-emerald-300/25 bg-[#05130d]/90 pl-3 pr-4 text-white shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all hover:border-emerald-300/50 hover:shadow-[0_10px_36px_rgba(16,185,129,0.25)] active:scale-95"
          >
            <span className="relative flex h-6 w-6 items-center justify-center">
              <LifeBuoy className="h-5 w-5 text-emerald-300" aria-hidden />
              <span className="quick-assist-ping absolute inset-0 rounded-full" aria-hidden />
            </span>
            <span className="whitespace-nowrap text-xs font-semibold tracking-wide">
              Help me here
            </span>
          </button>
        </div>
      </div>

      {/* Page-assist modal */}
      {open && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${formId}-title`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="modal-card max-w-xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#e3ebe6] px-5 py-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] text-white shadow-sm">
                  <Compass className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">
                    {content.kicker} · quick assist
                  </p>
                  <h3
                    id={`${formId}-title`}
                    className="mt-0.5 truncate text-base font-semibold text-[#0c1a14]"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    {content.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-full p-1.5 text-[#8a9a92] transition hover:bg-[#f4f7f4] hover:text-[#0c1a14]"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* What this page is about */}
              <p className="text-sm leading-relaxed text-[#3b4a43]">{content.about}</p>

              {/* What you can do here */}
              <div className="mt-4 rounded-2xl border border-teal-900/10 bg-[#f6faf8] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-700">
                  What you can do here
                </p>
                <ul className="mt-2.5 space-y-2">
                  {content.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2.5 text-sm text-[#28362e]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quick actions */}
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {content.actions.map((action) => {
                  const href = tenantHref(slug, action.href);
                  return action.primary ? (
                    <Link
                      key={action.label}
                      href={href}
                      onClick={() => setOpen(false)}
                      className="group flex items-center justify-between gap-2 rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] px-4 py-3 text-white shadow-sm transition hover:shadow-md"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{action.label}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-teal-100/85">
                          {action.description}
                        </span>
                      </span>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-teal-200 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </Link>
                  ) : (
                    <Link
                      key={action.label}
                      href={href}
                      onClick={() => setOpen(false)}
                      className="group flex items-center justify-between gap-2 rounded-xl border border-teal-900/10 bg-white px-4 py-3 transition hover:border-teal-600/30"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-[#0c1a14]">
                          {action.label}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-[#5a6b62]">
                          {action.description}
                        </span>
                      </span>
                      <ArrowRight
                        className="h-3.5 w-3.5 shrink-0 text-[#8a9a92] transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </Link>
                  );
                })}
              </div>

              {/* Inline AI quick assist */}
              <div className="mt-5 rounded-2xl border border-emerald-600/15 bg-gradient-to-b from-[#f2fbf7] to-white p-4">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  Not sure where to start?
                </p>
                <form
                  className="mt-2.5 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void askAssist(input);
                  }}
                >
                  <input
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
                    placeholder="Tell me what you need, in your own words…"
                    aria-label="Tell the assistant what you need"
                    className="min-w-0 flex-1 rounded-xl border border-teal-900/15 bg-white px-3.5 py-2.5 text-sm text-[#0c1a14] outline-none placeholder:text-[#5a6b62]/60 focus:border-emerald-600/40 focus:ring-2 focus:ring-emerald-500/15"
                  />
                  <button
                    type="submit"
                    disabled={loading || input.trim().length < 2}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] text-white shadow-sm transition enabled:hover:scale-105 enabled:active:scale-95 disabled:opacity-40"
                    aria-label="Ask the quick assistant"
                  >
                    <Send className="h-4 w-4" aria-hidden />
                  </button>
                </form>

                {/* Suggestion chips */}
                {!result && !loading && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {content.suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => void askAssist(s)}
                        className="rounded-full border border-teal-900/10 bg-white px-2.5 py-1 text-[11px] font-medium text-[#33534a] transition hover:border-teal-600/30 hover:text-[#084c3f]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {loading && (
                  <div className="mt-3">
                    <AssistSkeleton theme="light" />
                  </div>
                )}

                {!loading && result && (
                  <div className="mt-3 border-t border-teal-900/10 pt-3">
                    <AssistResultCards
                      result={result}
                      theme="light"
                      onFollowup={(q) => void askAssist(q)}
                    />
                  </div>
                )}

                {assistError && (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800" role="alert">
                    {assistError}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#e3ebe6] px-5 py-3">
              <p className="text-[10px] text-[#5a6b62]">
                Press <kbd className="rounded border border-[#dbe5df] bg-[#f6faf8] px-1 py-0.5">Shift + /</kbd>{" "}
                anytime to reopen
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-teal-900/10 bg-white px-4 py-1.5 text-xs font-semibold text-[#084c3f] transition hover:border-teal-600/30"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

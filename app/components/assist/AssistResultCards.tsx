"use client";

import Link from "next/link";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { getAssistIntent } from "@/app/lib/assist-catalog";

/**
 * Shared "show, don't tell" result renderer for the quick-assist system.
 * Given an /api/assist response, renders the understood intent, a one-line
 * acknowledgement and direct action cards — NOT a chat wall of text.
 */

export type AssistPayload = {
  source: "ai" | "rules";
  intent: { id: string; label: string; blurb: string };
  message: string;
  actions: Array<{ label: string; href: string; description: string; primary?: boolean }>;
  followups: string[];
};

type AssistTheme = "dark" | "light" | "adaptive";

export function isAssistPayload(value: unknown): value is AssistPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.message === "string" &&
    Array.isArray(v.actions) &&
    typeof (v as { intent?: { id?: unknown } }).intent?.id === "string"
  );
}

export function AssistSkeleton({ theme = "dark" }: { theme?: AssistTheme }) {
  const bg =
    theme === "dark"
      ? "bg-white/[0.06]"
      : theme === "light"
        ? "bg-teal-900/[0.06]"
        : "bg-[var(--card-elev)]";
  const text =
    theme === "dark" ? "text-slate-300" : theme === "light" ? "text-[#5a6b62]" : "text-[var(--muted)]";

  return (
    <div className="assist-enter space-y-2.5" aria-live="polite" aria-label="Thinking">
      <div className={`flex items-center gap-2 text-[11px] font-medium ${text}`}>
        <Loader2 className="h-3 w-3 animate-spin" />
        Reading what you need…
      </div>
      {[0, 1].map((i) => (
        <div key={i} className={`h-12 animate-pulse rounded-xl ${bg}`} />
      ))}
    </div>
  );
}

export default function AssistResultCards({
  result,
  theme = "dark",
  onFollowup,
}: {
  result: AssistPayload;
  theme?: AssistTheme;
  onFollowup?: (query: string) => void;
}) {
  const icon = getAssistIntent(result.intent.id)?.icon ?? Sparkles;
  const Icon = icon;

  const shell =
    theme === "dark"
      ? "border border-white/10 bg-white/[0.04]"
      : theme === "light"
        ? "border border-teal-900/10 bg-white"
        : "border border-[var(--line-2)] bg-[var(--card)]";
  const pill =
    theme === "dark"
      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
      : theme === "light"
        ? "border-teal-600/20 bg-teal-50 text-[#084c3f]"
        : "border-[var(--line-2)] bg-[var(--brand-soft)] text-[var(--brand)]";
  const messageText =
    theme === "dark" ? "text-slate-200" : theme === "light" ? "text-[#28362e]" : "text-[var(--foreground)]";
  const titleText =
    theme === "dark" ? "text-white" : theme === "light" ? "text-[#0c1a14]" : "text-[var(--foreground)]";
  const descText =
    theme === "dark" ? "text-slate-400" : theme === "light" ? "text-[#5a6b62]" : "text-[var(--muted)]";
  const chip =
    theme === "dark"
      ? "border-white/10 bg-white/[0.05] text-slate-300 hover:border-emerald-400/30 hover:text-white"
      : theme === "light"
        ? "border-teal-900/10 bg-[#f7fbf9] text-[#33534a] hover:border-teal-600/30 hover:text-[#084c3f]"
        : "border-[var(--line-2)] bg-[var(--card-elev)] text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--foreground)]";
  const footNote =
    theme === "dark" ? "text-slate-500" : theme === "light" ? "text-[#5a6b62]/70" : "text-[var(--muted-2)]";
  const primaryShell =
    theme === "adaptive"
      ? "border border-[var(--brand)] bg-[var(--brand)] hover:opacity-90"
      : "border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 shadow-[0_4px_20px_rgba(16,185,129,0.15)] hover:border-emerald-300/50 hover:from-emerald-500/25";
  const primaryTitle = theme === "adaptive" ? "text-white" : "text-white";
  const primaryDesc = theme === "adaptive" ? "text-white/80" : "text-emerald-100/80";
  const primaryArrow = theme === "adaptive" ? "text-white/80" : "text-emerald-200";

  return (
    <div className="assist-enter min-w-0">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className={`inline-flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${pill}`}>
          <Icon className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{result.intent.label}</span>
        </span>
        {result.source === "ai" && (
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide ${footNote}`}>
            <Sparkles className="h-2.5 w-2.5" aria-hidden />
            AI-matched
          </span>
        )}
      </div>

      <p className={`mt-2.5 break-words text-sm leading-relaxed ${messageText}`}>{result.message}</p>

      <div className="mt-3 space-y-2">
        {result.actions.map((action) =>
          action.primary ? (
            <Link
              key={`${action.href}-${action.label}`}
              href={action.href}
              className={`group flex min-w-0 items-center justify-between gap-3 rounded-xl px-3.5 py-3 transition ${primaryShell}`}
            >
              <span className="min-w-0 flex-1">
                <span className={`block break-words text-sm font-semibold ${primaryTitle}`}>{action.label}</span>
                {action.description && (
                  <span className={`mt-0.5 block line-clamp-2 text-[11px] leading-4 ${primaryDesc}`}>
                    {action.description}
                  </span>
                )}
              </span>
              <ArrowRight className={`h-4 w-4 shrink-0 ${primaryArrow} transition-transform group-hover:translate-x-0.5`} aria-hidden />
            </Link>
          ) : (
            <Link
              key={`${action.href}-${action.label}`}
              href={action.href}
              className={`group flex min-w-0 items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 transition ${shell}`}
            >
              <span className="min-w-0 flex-1">
                <span className={`block break-words text-sm font-medium ${titleText}`}>{action.label}</span>
                {action.description && (
                  <span className={`mt-0.5 block line-clamp-2 text-[11px] leading-4 ${descText}`}>
                    {action.description}
                  </span>
                )}
              </span>
              <ArrowRight
                className={`h-3.5 w-3.5 shrink-0 ${descText} transition-transform group-hover:translate-x-0.5`}
                aria-hidden
              />
            </Link>
          ),
        )}
      </div>

      {result.followups.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className={`text-[10px] font-medium uppercase tracking-wide ${footNote}`}>Also try</span>
          {result.followups.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFollowup?.(f)}
              className={`max-w-full rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${chip}`}
            >
              <span className="line-clamp-1">{f}</span>
            </button>
          ))}
        </div>
      )}

      <p className={`mt-3 text-[10px] leading-relaxed ${footNote}`}>
        Guidance only — not medical advice. In an emergency call 999 or 112.
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, Info, ArrowRight } from "lucide-react";
import type {
  FeedbackAction,
  FeedbackTone,
  UploadFeedbackModel,
} from "@/app/lib/prescription-upload-feedback";

const TONE: Record<
  FeedbackTone,
  { wrap: string; icon: typeof Info; iconClass: string }
> = {
  info: {
    wrap: "border-[var(--line-2)] bg-[var(--brand-soft)] text-[var(--foreground)]",
    icon: Info,
    iconClass: "text-[var(--brand)]",
  },
  success: {
    wrap: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-100",
    icon: CheckCircle2,
    iconClass: "text-emerald-700 dark:text-emerald-300",
  },
  warning: {
    wrap: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100",
    icon: AlertCircle,
    iconClass: "text-amber-700 dark:text-amber-300",
  },
  error: {
    wrap: "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-100",
    icon: AlertCircle,
    iconClass: "text-rose-700 dark:text-rose-300",
  },
};

const BUTTON: Record<NonNullable<FeedbackAction["variant"]>, string> = {
  primary:
    "bg-[var(--foreground)] text-[var(--background)] hover:opacity-90",
  secondary:
    "border border-[var(--line-2)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--brand-soft)]",
  ghost:
    "text-[var(--brand)] underline-offset-2 hover:underline",
};

export function UploadFeedback({
  feedback,
  onAction,
  live = true,
}: {
  feedback: UploadFeedbackModel;
  onAction?: (id: string) => void;
  live?: boolean;
}) {
  const tone = TONE[feedback.tone];
  const Icon = tone.icon;
  const isAlert = feedback.tone === "error" || feedback.tone === "warning";

  return (
    <div
      className={`mt-5 rounded-2xl border px-4 py-4 sm:px-5 ${tone.wrap}`}
      role={isAlert ? "alert" : "status"}
      aria-live={live ? (isAlert ? "assertive" : "polite") : "off"}
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.iconClass}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-snug">{feedback.title}</p>
          <p className="mt-1 text-xs leading-6 opacity-90">{feedback.message}</p>
          {feedback.actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {feedback.actions.map((action) => {
                const className = `inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${BUTTON[action.variant || "secondary"]}`;
                if (action.href) {
                  return (
                    <Link key={action.id} href={action.href} className={className}>
                      {action.label}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  );
                }
                return (
                  <button
                    key={action.id}
                    type="button"
                    className={className}
                    onClick={() => onAction?.(action.id)}
                  >
                    {action.label}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

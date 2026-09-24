"use client";

/**
 * Lightweight global toast system. Other client components call
 * `toast.success("...")` / `toast.error("...")` / `toast.info("...")` /
 * `toast.urgent("...", { href })` and the Toaster renders them in a
 * top-right stack with auto-dismiss.
 *
 * No new dependencies — uses a simple in-memory event emitter.
 */

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X, HeartPulse } from "lucide-react";

type ToastKind = "success" | "error" | "info" | "urgent";

type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
  href?: string;
  durationMs: number;
};

type ToastOptions = {
  href?: string;
  /** Auto-dismiss ms. Urgent defaults to 12s; others 4s. */
  durationMs?: number;
};

type Listener = (toasts: ToastItem[]) => void;
let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(toasts);
}

function push(kind: ToastKind, message: string, opts?: ToastOptions) {
  if (kind === "error" && typeof window !== "undefined" && window.location.pathname.startsWith("/admin") && /Premium|FREE_.*LIMIT|upgrade_required/i.test(message)) {
    window.dispatchEvent(new CustomEvent("afyvia:premium-required", { detail: message }));
  }
  const id = nextId++;
  const durationMs =
    opts?.durationMs ?? (kind === "urgent" ? 12_000 : kind === "error" ? 6_000 : 4_000);
  toasts = [...toasts, { id, kind, message, href: opts?.href, durationMs }];
  emit();
  setTimeout(() => dismiss(id), durationMs);
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  success: (m: string, opts?: ToastOptions) => push("success", m, opts),
  error: (m: string, opts?: ToastOptions) => push("error", m, opts),
  info: (m: string, opts?: ToastOptions) => push("info", m, opts),
  /** High-priority clinical / safety alerts — longer dwell, assertive live region. */
  urgent: (m: string, opts?: ToastOptions) => push("urgent", m, opts),
  dismiss,
};

const ICON = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  urgent: HeartPulse,
};

const COLOR = {
  success: "text-emerald-600",
  error: "text-rose-600",
  info: "text-blue-600",
  urgent: "text-rose-700",
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const l: Listener = (next) => setItems(next);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  if (items.length === 0) return null;

  const hasUrgent = items.some((t) => t.kind === "urgent");

  return (
    <div
      className="toast-stack"
      role={hasUrgent ? "alert" : "status"}
      aria-live={hasUrgent ? "assertive" : "polite"}
    >
      {items.map((t) => {
        const Icon = ICON[t.kind];
        const body = (
          <>
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${COLOR[t.kind]}`} />
            <p className="flex-1">{t.message}</p>
          </>
        );
        return (
          <div key={t.id} className={`toast-item toast-${t.kind}`}>
            {t.href ? (
              <a
                href={t.href}
                className="flex min-w-0 flex-1 items-start gap-2.5 no-underline"
                onClick={() => dismiss(t.id)}
              >
                {body}
              </a>
            ) : (
              <div className="flex min-w-0 flex-1 items-start gap-2.5">{body}</div>
            )}
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-[#8a9a92] hover:bg-[#f4f7f4] hover:text-[#0c1a14]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

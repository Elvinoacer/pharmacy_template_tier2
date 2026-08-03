"use client";

/**
 * Lightweight global toast system. Other client components call
 * `toast.success("...")` / `toast.error("...")` / `toast.info("...")` and
 * the Toaster renders them in a top-right stack with auto-dismiss.
 *
 * No new dependencies — uses a simple in-memory event emitter.
 */

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; kind: ToastKind; message: string };

type Listener = (toasts: ToastItem[]) => void;
let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(toasts);
}

function push(kind: ToastKind, message: string) {
  const id = nextId++;
  toasts = [...toasts, { id, kind, message }];
  emit();
  // Auto-dismiss after 4s.
  setTimeout(() => dismiss(id), 4000);
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  success: (m: string) => push("success", m),
  error: (m: string) => push("error", m),
  info: (m: string) => push("info", m),
  dismiss,
};

const ICON = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const COLOR = {
  success: "text-emerald-600",
  error: "text-rose-600",
  info: "text-blue-600",
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

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {items.map((t) => {
        const Icon = ICON[t.kind];
        return (
          <div key={t.id} className={`toast-item toast-${t.kind}`}>
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${COLOR[t.kind]}`} />
            <p className="flex-1">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="rounded-full p-0.5 text-[#8a9a92] hover:bg-[#f4f7f4] hover:text-[#0c1a14]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

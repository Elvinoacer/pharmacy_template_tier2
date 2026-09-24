"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Modal } from "@/app/components/Modal";

type Tone = "danger" | "warning" | "neutral";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirm action",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  busy = false,
  tone = "neutral",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  tone?: Tone;
}) {
  const danger = tone === "danger";
  const warning = tone === "warning";

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={title}
      maxWidth="max-w-md"
      footer={
        <>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] px-4 text-sm font-semibold text-[var(--admin-text)] transition hover:bg-[var(--admin-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={
              danger
                ? "inline-flex min-h-11 items-center justify-center rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                : warning
                  ? "inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                  : "inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--admin-accent)] px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            }
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            danger
              ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-300"
              : warning
                ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300"
                : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
          }
        >
          {danger || warning ? (
            <AlertTriangle className="h-5 w-5" aria-hidden />
          ) : (
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm leading-6 text-[var(--admin-text-muted)]">{message}</p>
          {danger ? (
            <p className="mt-2 text-xs font-medium leading-5 text-rose-700 dark:text-rose-300">
              This action is intentionally protected so it cannot be triggered accidentally.
            </p>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

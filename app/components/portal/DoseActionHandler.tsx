"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X, Clock } from "lucide-react";
import { localTodayStr } from "@/app/lib/time";

type DoseAction = "taken" | "skip" | "snooze";

/**
 * Handles deep links from push notification action buttons, e.g.
 *   /portal/prescriptions?doseAction=taken&prescriptionId=…&scheduledTime=08:00
 *
 * Used when the service worker cannot POST adherence itself (cookie / SW
 * fetch quirks on some mobile browsers). Shows a full-width mobile sheet
 * with clear submitting / success feedback, then cleans the query string.
 */
export function DoseActionHandler() {
  const router = useRouter();
  const ran = useRef(false);
  const [state, setState] = useState<{
    action: DoseAction;
    medicineName?: string;
    phase: "submitting" | "done" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (ran.current) return;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const raw = (params.get("doseAction") || "").toLowerCase().trim();
    const action: DoseAction | null =
      raw === "taken" || raw === "confirm"
        ? "taken"
        : raw === "skip" || raw === "skipped"
          ? "skip"
          : raw === "snooze" || raw === "later"
            ? "snooze"
            : null;

    if (!action) return;
    ran.current = true;

    const prescriptionId = params.get("prescriptionId") || "";
    const scheduleId = params.get("scheduleId") || "";
    const scheduledTime = params.get("scheduledTime") || "";
    const takenOn = params.get("takenOn") || localTodayStr();
    const reminderId = params.get("reminderId") || "";
    const medicineName = params.get("medicineName") || "";

    // Strip query params immediately so refresh doesn't re-fire.
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, "", cleanUrl);

    const status = action === "taken" ? "taken" : action === "skip" ? "skipped" : "snooze";
    const submittingLabel =
      action === "taken"
        ? "Logging as taken…"
        : action === "skip"
          ? "Marking as skipped…"
          : "Snoozing reminder…";

    setState({
      action,
      medicineName: medicineName || undefined,
      phase: "submitting",
      message: submittingLabel,
    });

    void (async () => {
      try {
        const res = await fetch("/api/portal/adherence", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            prescriptionId: prescriptionId || undefined,
            status,
            takenOn,
            scheduledTime: scheduledTime || null,
            scheduleId: scheduleId || null,
            reminderId: reminderId || null,
            action: action === "snooze" ? "snooze" : undefined,
          }),
        });

        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
          const errMsg =
            action === "snooze" && res.status === 429
              ? "Snooze limit reached — please confirm Taken or Skip."
              : j.message || j.error || "Could not update dose";
          setState({
            action,
            medicineName: medicineName || undefined,
            phase: "error",
            message: errMsg,
          });
          return;
        }

        setState({
          action,
          medicineName: medicineName || undefined,
          phase: "done",
          message:
            action === "taken"
              ? "Dose logged · beautifully done"
              : action === "skip"
                ? "Dose skipped · noted"
                : "Snoozed · we'll nudge you in 10 min",
        });
        window.dispatchEvent(new Event("aether:attention-refresh"));
        // Refresh server components so Today's doses reflects the new log.
        setTimeout(() => {
          router.refresh();
          setState(null);
        }, 1800);
      } catch {
        setState({
          action,
          medicineName: medicineName || undefined,
          phase: "error",
          message: "Could not update dose. Try again from Today's doses.",
        });
      }
    })();
  }, [router]);

  // Also listen for SW postMessage when a background action succeeds while tab is open.
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "aether:dose-logged") {
        window.dispatchEvent(new Event("aether:attention-refresh"));
        router.refresh();
      }
      if (data.type === "aether:dose-navigate" && typeof data.url === "string") {
        try {
          const u = new URL(data.url, window.location.origin);
          if (u.origin === window.location.origin) {
            window.location.assign(u.pathname + u.search);
          }
        } catch {
          /* ignore */
        }
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router]);

  if (!state) return null;

  const Icon =
    state.phase === "submitting"
      ? Loader2
      : state.phase === "error"
        ? X
        : state.action === "taken"
          ? Check
          : state.action === "snooze"
            ? Clock
            : X;

  const tone =
    state.phase === "error"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : state.phase === "submitting"
        ? "border-[#0d6e5a]/20 bg-white text-[#0c1a14]"
        : state.action === "taken"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : state.action === "skip"
            ? "border-slate-200 bg-slate-50 text-slate-800"
            : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div
      className="pointer-events-auto fixed inset-x-3 bottom-3 z-[120] mx-auto w-[min(100%,420px)] sm:inset-x-auto sm:right-4 sm:bottom-4"
      role="status"
      aria-live="polite"
    >
      <div className={`flex items-start gap-3 rounded-2xl border p-4 shadow-xl ${tone}`}>
        <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm">
          <Icon className={`h-5 w-5 ${state.phase === "submitting" ? "animate-spin text-[#0d6e5a]" : ""}`} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold tracking-tight">
            {state.medicineName || "Dose reminder"}
          </p>
          <p className="mt-0.5 text-sm font-medium leading-snug opacity-90">{state.message}</p>
          {state.phase === "error" && (
            <button
              type="button"
              onClick={() => setState(null)}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-rose-800 shadow-sm ring-1 ring-rose-200"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check, X, AlertCircle, Zap, Smartphone } from "lucide-react";
import { usePushNotifications } from "@/app/lib/firebase/usePush";
import { localTodayStr } from "@/app/lib/time";

const DISMISS_KEY = "aether-push-banner-dismissed";

type Audience = "portal" | "admin";

/**
 * Mount once inside any authenticated layout (portal or admin). Handles:
 *   1. A dismissible "Enable notifications" banner for users who have not
 *      granted permission yet (and whose browser supports FCM).
 *   2. A foreground toast when a push arrives while the tab is open.
 */
export function PushNotificationCenter({ audience = "portal" }: { audience?: Audience }) {
  const { status, lastMessage, enable, clearMessage } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  // Auto-dismiss toast; dose toasts stay longer so action buttons remain usable.
  // Dose toasts pause auto-dismiss while an action is in flight (see PushToast
  // calling clearMessage only after success / explicit close).
  useEffect(() => {
    if (!lastMessage) return;
    window.dispatchEvent(new Event("aether:attention-refresh"));
    const isDose =
      lastMessage.data?.actions === "medication_dose" ||
      lastMessage.data?.type === "medication_dose";
    // Dose: long window; non-dose: short. PushToast cancels close while busy.
    const t = setTimeout(clearMessage, isDose ? 45000 : 8000);
    return () => clearTimeout(t);
  }, [lastMessage, clearMessage]);

  const dismissBanner = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const showBanner = status === "default" && !dismissed;

  return (
    <>
      {showBanner && (
        <EnableBanner
          audience={audience}
          onEnable={async () => {
            const ok = await enable();
            if (ok) dismissBanner();
            return ok;
          }}
          onDismiss={dismissBanner}
        />
      )}
      {lastMessage && (
        <PushToast
          audience={audience}
          title={lastMessage.title || "Notification"}
          body={lastMessage.body || ""}
          onClose={clearMessage}
          url={lastMessage.data?.url}
          data={lastMessage.data}
        />
      )}
    </>
  );
}

/**
 * Compact header control — always visible so both customers and staff have a
 * clear hotspot to register / re-register their device token.
 */
export function PushEnableChip({ audience = "portal" }: { audience?: Audience }) {
  const { status, enable, registered } = usePushNotifications();
  const [busy, setBusy] = useState(false);

  if (status === "unsupported") {
    return (
      <span
        className={
          audience === "admin"
            ? "hidden sm:inline-flex items-center gap-1 rounded-full border border-[var(--admin-border-2)] px-2.5 py-1 text-[11px] admin-soft"
            : "hidden sm:inline-flex items-center gap-1 rounded-full border border-[#e3ebe6] px-2.5 py-1 text-[11px] text-[#8a9a92]"
        }
        title="Push is not supported in this browser"
      >
        <BellOff className="h-3.5 w-3.5" />
        <span className="hidden md:inline">No push</span>
      </span>
    );
  }

  if (status === "granted" && registered) {
    return (
      <span
        className={
          audience === "admin"
            ? "hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600"
            : "hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700"
        }
        title="Push notifications enabled on this device"
      >
        <Check className="h-3.5 w-3.5" />
        <span className="hidden md:inline">Push on</span>
      </span>
    );
  }

  if (status === "denied") {
    return (
      <span
        className={
          audience === "admin"
            ? "hidden sm:inline-flex items-center gap-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-600"
            : "hidden sm:inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700"
        }
        title="Notifications blocked — enable them in browser settings"
      >
        <AlertCircle className="h-3.5 w-3.5" />
        <span className="hidden md:inline">Blocked</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={busy || status === "requesting"}
      onClick={async () => {
        setBusy(true);
        try {
          localStorage.removeItem(DISMISS_KEY);
        } catch {
          /* ignore */
        }
        await enable();
        setBusy(false);
      }}
      className={
        audience === "admin"
          ? "inline-flex items-center gap-1.5 rounded-full border border-teal-400/30 bg-teal-400/10 px-2.5 py-1 text-[11px] font-semibold admin-accent-text transition hover:bg-teal-400/20 disabled:opacity-60"
          : "inline-flex items-center gap-1.5 rounded-full border border-[#0d6e5a]/25 bg-[#e6f4ef] px-2.5 py-1 text-[11px] font-semibold text-[#0d6e5a] transition hover:bg-[#d5efe6] disabled:opacity-60"
      }
      title="Enable push notifications on this device"
      aria-label="Enable push notifications"
    >
      <Bell className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{busy || status === "requesting" ? "Enabling…" : "Enable push"}</span>
    </button>
  );
}

/**
 * Full card for preferences / settings pages — the explicit registration hotspot.
 */
export function PushEnablePanel({ audience = "portal" }: { audience?: Audience }) {
  const { status, enable, sendTest, registered } = usePushNotifications();
  const [busy, setBusy] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  const isAdmin = audience === "admin";
  const card = isAdmin
    ? "rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-5"
    : "rounded-2xl border border-[#e3ebe6] bg-white p-5";
  const titleCls = isAdmin ? "text-sm font-semibold admin-text" : "text-sm font-semibold text-[#0c1a14]";
  const bodyCls = isAdmin ? "text-xs admin-muted" : "text-xs text-[#5a6b62]";
  const iconWrap = isAdmin
    ? "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--admin-accent)] to-[var(--admin-accent-2)] text-[var(--admin-btn-fg)]"
    : "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] text-white";

  const copy =
    audience === "admin"
      ? {
          title: "Staff device alerts",
          body: "Register this browser for instant push on urgent How-do-you-feel alerts (feeling worse), pharmacist handoffs, refills, and Contact enquiries — including when the CRM tab is in the background.",
        }
      : {
          title: "Browser push notifications",
          body: "Register this device for refill updates, pickup reminders, and pharmacist replies on your How do you feel check-ins — even when the portal tab is closed.",
        };

  return (
    <div className={card}>
      <div className="flex items-start gap-3">
        <span className={iconWrap}>
          <Smartphone className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={titleCls}>{copy.title}</p>
            <PushStatusPill status={status} dark={isAdmin} />
          </div>
          <p className={`mt-1 ${bodyCls}`}>{copy.body}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {status !== "granted" && status !== "unsupported" && status !== "denied" && (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setTestMsg(null);
                  try {
                    localStorage.removeItem(DISMISS_KEY);
                  } catch {
                    /* ignore */
                  }
                  const ok = await enable();
                  setTestMsg(ok ? "This device is now registered for push." : "Could not enable push. Check browser permission.");
                  setBusy(false);
                }}
                className={
                  isAdmin
                    ? "btn-admin"
                    : "inline-flex items-center gap-1.5 rounded-full bg-[#0d6e5a] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#084c3f] disabled:opacity-60"
                }
              >
                <Bell className="h-3.5 w-3.5" />
                {busy ? "Enabling…" : "Enable on this device"}
              </button>
            )}

            {status === "granted" && (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setTestMsg(null);
                  // Re-register in case the token rotated.
                  await enable();
                  const r = await sendTest();
                  setBusy(false);
                  if (r && typeof r.sent === "number" && r.sent > 0) {
                    setTestMsg(`Test push sent to ${r.sent} device${r.sent === 1 ? "" : "s"}.`);
                  } else if (r?.error) {
                    setTestMsg(String(r.error));
                  } else {
                    setTestMsg(registered ? "No devices received the test. Try enabling again." : "Enable push first.");
                  }
                }}
                className={
                  isAdmin
                    ? "inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset-2)] px-3.5 py-1.5 text-xs font-semibold admin-text transition hover:bg-[var(--admin-inset-2)] disabled:opacity-60"
                    : "inline-flex items-center gap-1.5 rounded-full border border-[#e3ebe6] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0c1a14] transition hover:bg-[#f4f7f4] disabled:opacity-60"
                }
              >
                <Zap className="h-3.5 w-3.5" />
                {busy ? "Sending…" : "Send test"}
              </button>
            )}

            {status === "denied" && (
              <p className={bodyCls}>
                Notifications are blocked for this site. Open your browser site settings and allow notifications, then reload.
              </p>
            )}

            {status === "unsupported" && (
              <p className={bodyCls}>
                This browser or device does not support web push (or Firebase is not configured).
              </p>
            )}
          </div>

          {testMsg && (
            <p className={`mt-2 text-xs ${isAdmin ? "admin-accent-text" : "text-[#0d6e5a]"}`}>{testMsg}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function EnableBanner({
  audience,
  onEnable,
  onDismiss,
}: {
  audience: Audience;
  onEnable: () => Promise<boolean>;
  onDismiss: () => void;
}) {
  const isAdmin = audience === "admin";
  return (
    <div
      className={
        isAdmin
          ? "pointer-events-auto fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] items-start gap-3 rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-4 shadow-xl shadow-black/40 animate-fade-up"
          : "pointer-events-auto fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] items-start gap-3 rounded-2xl border border-teal-900/10 bg-white p-4 shadow-xl shadow-teal-900/10 animate-fade-up"
      }
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${isAdmin ? "from-[var(--admin-accent)] to-[var(--admin-accent-2)] text-[var(--admin-btn-fg)]" : "from-[#0d6e5a] to-[#084c3f] text-white"}`}>
        <Bell className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={isAdmin ? "text-sm font-semibold admin-text" : "text-sm font-semibold text-[#0c1a14]"}>
          {isAdmin ? "Enable staff alerts" : "Stay in the loop"}
        </p>
        <p className={isAdmin ? "mt-0.5 text-xs admin-muted" : "mt-0.5 text-xs text-[#5a6b62]"}>
          {isAdmin
            ? "Get push alerts for new refills, enquiries and AI escalations on this device."
            : "Get refill updates, pickup reminders and staff messages as push notifications."}
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => onEnable()}
            className={isAdmin ? "btn-admin-sm" : "inline-flex items-center gap-1 rounded-full bg-[#0d6e5a] px-3 py-1 text-xs font-semibold text-white hover:bg-[#084c3f]"}
          >
            <Check className="h-3.5 w-3.5" /> Enable
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className={
              isAdmin
                ? "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium admin-muted hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]"
                : "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-[#5a6b62] hover:bg-teal-50 hover:text-[#0c1a14]"
            }
          >
            Not now
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className={
          isAdmin
            ? "rounded-full p-1 admin-soft hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]"
            : "rounded-full p-1 text-[#8a9a92] hover:bg-teal-50 hover:text-[#0c1a14]"
        }
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function PushToast({
  title,
  body,
  url,
  onClose,
  audience,
  data,
}: {
  title: string;
  body: string;
  url?: string;
  onClose: () => void;
  audience: Audience;
  data?: Record<string, string>;
}) {
  const isAdmin = audience === "admin";
  const isDose =
    data?.actions === "medication_dose" || data?.type === "medication_dose";
  const drugImage = data?.image?.trim() || "";
  const [busy, setBusy] = useState<"taken" | "skip" | "snooze" | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDoseAction = async (action: "taken" | "skip" | "snooze") => {
    if (busy || done) return;
    setBusy(action);
    setError(null);
    try {
      // Explicit status map — never fall through to "skipped".
      const statusMap = {
        taken: "taken",
        skip: "skipped",
        snooze: "snooze",
      } as const;
      const status = statusMap[action];

      // Fall back to project-local today if push payload omitted takenOn.
      const takenOn =
        data?.takenOn && /^\d{4}-\d{2}-\d{2}$/.test(data.takenOn)
          ? data.takenOn
          : localTodayStr();

      const res = await fetch("/api/portal/adherence", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          prescriptionId: data?.prescriptionId || undefined,
          status,
          takenOn,
          scheduledTime: data?.scheduledTime || null,
          scheduleId: data?.scheduleId || null,
          reminderId: data?.reminderId || null,
          action: action === "snooze" ? "snooze" : undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        if (action === "snooze" && res.status === 429) {
          setError("Snooze limit reached — confirm Taken or Skip.");
        } else {
          setError(j.message || j.error || "Could not update dose");
        }
        return;
      }
      setDone(
        action === "taken"
          ? "Logged · beautifully done"
          : action === "skip"
            ? "Skipped · noted"
            : "Snoozed · 10 min",
      );
      window.dispatchEvent(new Event("aether:attention-refresh"));
      setTimeout(onClose, 1600);
    } catch {
      setError("Could not update dose. Check your connection.");
    } finally {
      setBusy(null);
    }
  };

  const busyLabel = (action: "taken" | "skip" | "snooze", idle: string) => {
    if (busy !== action) return idle;
    if (action === "taken") return "Submitting…";
    if (action === "skip") return "Skipping…";
    return "Snoozing…";
  };

  return (
    <div
      className={
        isAdmin
          ? "pointer-events-auto fixed bottom-3 right-3 left-3 z-[100] mx-auto w-auto max-w-[420px] overflow-hidden rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] shadow-xl shadow-black/40 animate-fade-up sm:left-auto sm:bottom-4 sm:right-4 sm:w-[min(92vw,400px)]"
          : "pointer-events-auto fixed bottom-3 right-3 left-3 z-[100] mx-auto w-auto max-w-[420px] overflow-hidden rounded-2xl border border-[#d4af37]/25 bg-white shadow-[0_20px_50px_-20px_rgba(12,26,20,0.35)] animate-fade-up sm:left-auto sm:bottom-4 sm:right-4 sm:w-[min(92vw,400px)]"
      }
      role="alertdialog"
      aria-label={title}
      aria-busy={!!busy}
    >
      {/* Luxury gold accent bar */}
      {!isAdmin && <div className="h-0.5 w-full bg-gradient-to-r from-[#0d6e5a] via-[#c9a227] to-[#0d6e5a]" />}

      {drugImage && !isAdmin && (
        <div className="relative h-28 w-full overflow-hidden bg-gradient-to-br from-[#e6f4ef] to-[#f7f3e8]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={drugImage}
            alt=""
            className="h-full w-full object-contain p-3"
          />
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent" />
        </div>
      )}

      <div className="flex items-start gap-3 p-4 pb-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl ${
            isAdmin
              ? "bg-gradient-to-br from-[var(--admin-accent)] to-[var(--admin-accent-2)] text-[var(--admin-btn-fg)]"
              : "bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] text-white ring-1 ring-[#c9a227]/40"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={
              isAdmin
                ? "text-sm font-semibold tracking-tight admin-text"
                : "text-sm font-semibold tracking-tight text-[#0c1a14]"
            }
          >
            {title}
          </p>
          <p
            className={
              isAdmin
                ? "mt-0.5 line-clamp-3 text-xs admin-muted"
                : "mt-0.5 line-clamp-3 text-sm leading-relaxed text-[#5a6b62]"
            }
          >
            {done || error || body}
          </p>

          {!isDose && url && (
            <a
              href={url}
              onClick={onClose}
              className={
                isAdmin
                  ? "mt-2 inline-flex items-center gap-1 text-xs font-semibold admin-accent-text hover:underline"
                  : "mt-2 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-[#0d6e5a] hover:underline"
              }
            >
              Open <Zap className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={!!busy}
          aria-label="Dismiss"
          className={
            isAdmin
              ? "rounded-full p-2 admin-soft hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)] disabled:opacity-40"
              : "rounded-full p-2 text-[#8a9a92] hover:bg-teal-50 hover:text-[#0c1a14] disabled:opacity-40"
          }
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Dose actions — full-width, thumb-friendly targets on mobile */}
      {isDose && !isAdmin && !done && (
        <div className="space-y-2 border-t border-[#e3ebe6]/80 bg-[#f8fbf9] px-3 py-3">
          <button
            type="button"
            disabled={!!busy}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void runDoseAction("taken");
            }}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0d6e5a] to-[#0a5c4b] px-4 text-base font-bold tracking-wide text-white shadow-md shadow-teal-900/15 transition active:scale-[0.98] hover:from-[#0a5c4b] hover:to-[#084c3f] disabled:cursor-wait disabled:opacity-70 sm:min-h-11 sm:text-sm"
          >
            <Check className="h-5 w-5 shrink-0" />
            {busyLabel("taken", "Taken")}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!!busy}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void runDoseAction("skip");
              }}
              className="inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-[#e3ebe6] bg-white px-3 text-sm font-bold tracking-wide text-[#5a6b62] shadow-sm transition active:scale-[0.98] hover:border-slate-300 hover:text-[#0c1a14] disabled:cursor-wait disabled:opacity-70 sm:min-h-11"
            >
              <X className="h-4 w-4 shrink-0" />
              {busyLabel("skip", "Skip")}
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void runDoseAction("snooze");
              }}
              className="inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-[#c9a227]/45 bg-gradient-to-r from-[#faf6eb] to-white px-3 text-sm font-bold tracking-wide text-[#8a6d1a] shadow-sm transition active:scale-[0.98] hover:border-[#c9a227] hover:text-[#6b5410] disabled:cursor-wait disabled:opacity-70 sm:min-h-11"
            >
              {busyLabel("snooze", "Later")}
            </button>
          </div>
          {error && (
            <p className="px-1 text-center text-xs font-medium text-rose-600">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}

/** A small status badge used on settings panels. */
export function PushStatusPill({
  status,
  dark = false,
}: {
  status: "unsupported" | "default" | "granted" | "denied" | "requesting";
  dark?: boolean;
}) {
  if (status === "unsupported") {
    return (
      <span
        className={
          dark
            ? "inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset-2)] px-2.5 py-1 text-xs font-medium admin-muted"
            : "inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
        }
      >
        <BellOff className="h-3.5 w-3.5" /> Not supported
      </span>
    );
  }
  if (status === "granted") {
    return (
      <span
        className={
          dark
            ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300"
            : "inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700"
        }
      >
        <Check className="h-3.5 w-3.5" /> Push enabled
      </span>
    );
  }
  if (status === "denied") {
    return (
      <span
        className={
          dark
            ? "inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-medium text-rose-300"
            : "inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700"
        }
      >
        <AlertCircle className="h-3.5 w-3.5" /> Blocked
      </span>
    );
  }
  if (status === "requesting") {
    return (
      <span
        className={
          dark
            ? "inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-200"
            : "inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700"
        }
      >
        <Bell className="h-3.5 w-3.5" /> Requesting…
      </span>
    );
  }
  return (
    <span
      className={
        dark
          ? "inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset-2)] px-2.5 py-1 text-xs font-medium admin-muted"
          : "inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
      }
    >
      <Bell className="h-3.5 w-3.5" /> Not yet enabled
    </span>
  );
}

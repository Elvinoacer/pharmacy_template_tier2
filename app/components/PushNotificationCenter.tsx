"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check, X, AlertCircle, Zap, Smartphone } from "lucide-react";
import { usePushNotifications } from "@/app/lib/firebase/usePush";

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

  // Auto-dismiss toast after 8s
  useEffect(() => {
    if (!lastMessage) return;
    const t = setTimeout(clearMessage, 8000);
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
          body: "Register this browser to get instant push alerts for new refills, enquiries, and AI escalations — even when the CRM tab is in the background.",
        }
      : {
          title: "Browser push notifications",
          body: "Register this device to get refill status updates, pickup reminders, and pharmacy messages as push notifications.",
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
}: {
  title: string;
  body: string;
  url?: string;
  onClose: () => void;
  audience: Audience;
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
        <p className={isAdmin ? "text-sm font-semibold admin-text" : "text-sm font-semibold text-[#0c1a14]"}>{title}</p>
        <p className={isAdmin ? "mt-0.5 line-clamp-3 text-xs admin-muted" : "mt-0.5 line-clamp-3 text-xs text-[#5a6b62]"}>
          {body}
        </p>
        {url && (
          <a
            href={url}
            onClick={onClose}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold admin-accent-text hover:underline"
          >
            View <Zap className="h-3 w-3" />
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
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

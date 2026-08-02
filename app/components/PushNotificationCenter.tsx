"use client";

import { useEffect } from "react";
import { Bell, BellOff, Check, X, AlertCircle, Zap } from "lucide-react";
import { usePushNotifications } from "@/app/lib/firebase/usePush";

/**
 * Mount once inside any authenticated layout (portal or admin). Handles:
 *   1. A dismissible "Enable notifications" banner — only shown to users who
 *      have not yet granted permission and whose browser supports FCM.
 *   2. A foreground toast when a push arrives while the tab is open.
 *   3. (Optional) a "Send test" button inside the notifications page.
 */
export function PushNotificationCenter() {
  const { status, lastMessage, enable, clearMessage } = usePushNotifications();

  // Auto-dismiss toast after 8s
  useEffect(() => {
    if (!lastMessage) return;
    const t = setTimeout(clearMessage, 8000);
    return () => clearTimeout(t);
  }, [lastMessage, clearMessage]);

  return (
    <>
      {status === "default" && <EnableBanner onEnable={enable} />}
      {lastMessage && (
        <PushToast
          title={lastMessage.title || "Notification"}
          body={lastMessage.body || ""}
          onClose={clearMessage}
          url={lastMessage.data?.url}
        />
      )}
    </>
  );
}

function EnableBanner({ onEnable }: { onEnable: () => Promise<boolean> }) {
  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] items-start gap-3 rounded-2xl border border-teal-900/10 bg-white p-4 shadow-xl shadow-teal-900/10 animate-fade-up">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] text-white">
        <Bell className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#0c1a14]">Stay in the loop</p>
        <p className="mt-0.5 text-xs text-[#5a6b62]">
          Get refill updates, pickup reminders and staff messages as push notifications.
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => onEnable()}
            className="inline-flex items-center gap-1 rounded-full bg-[#0d6e5a] px-3 py-1 text-xs font-semibold text-white hover:bg-[#084c3f]"
          >
            <Check className="h-3.5 w-3.5" /> Enable
          </button>
        </div>
      </div>
    </div>
  );
}

function PushToast({
  title,
  body,
  url,
  onClose,
}: {
  title: string;
  body: string;
  url?: string;
  onClose: () => void;
}) {
  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] items-start gap-3 rounded-2xl border border-teal-900/10 bg-white p-4 shadow-xl shadow-teal-900/10 animate-fade-up">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] text-white">
        <Bell className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#0c1a14]">{title}</p>
        <p className="mt-0.5 line-clamp-3 text-xs text-[#5a6b62]">{body}</p>
        {url && (
          <a
            href={url}
            onClick={onClose}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#0d6e5a] hover:underline"
          >
            View <Zap className="h-3 w-3" />
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="rounded-full p-1 text-[#8a9a92] hover:bg-teal-50 hover:text-[#0c1a14]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** A small status badge used on the notifications page. */
export function PushStatusPill({ status }: { status: "unsupported" | "default" | "granted" | "denied" | "requesting" }) {
  if (status === "unsupported") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
        <BellOff className="h-3.5 w-3.5" /> Not supported on this device
      </span>
    );
  }
  if (status === "granted") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <Check className="h-3.5 w-3.5" /> Push enabled
      </span>
    );
  }
  if (status === "denied") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
        <AlertCircle className="h-3.5 w-3.5" /> Blocked — enable in browser settings
      </span>
    );
  }
  if (status === "requesting") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
        <Bell className="h-3.5 w-3.5" /> Requesting…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
      <Bell className="h-3.5 w-3.5" /> Not yet enabled
    </span>
  );
}

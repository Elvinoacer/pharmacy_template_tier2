"use client";

/**
 * Polls /api/feel/alerts and surfaces new How-do-you-feel events as toasts.
 * Covers staff (feeling worse / escalation), customers (pharmacist reply),
 * and guests (pharmacist reply via guestKey) — including people who have not
 * enabled browser push.
 *
 * Mount inside AdminShell, PortalShell, and public AppChrome.
 */

import { useEffect, useRef } from "react";
import { toast } from "@/app/components/Toaster";

const SEEN_KEY = "aether-feel-alert-seen";
const SINCE_KEY = "aether-feel-alert-since";
const GUEST_KEY_STORAGE = "aether-feel-guest-key";

type FeelAlert = {
  id: string;
  kind: string;
  title: string;
  body: string;
  severity?: string;
  url?: string;
  createdAt: string;
};

type Audience = "admin" | "portal" | "public";

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr.slice(-80) : []);
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-80)));
  } catch {
    /* ignore */
  }
}

function getSince(): string | null {
  try {
    return localStorage.getItem(SINCE_KEY);
  } catch {
    return null;
  }
}

function setSince(iso: string) {
  try {
    localStorage.setItem(SINCE_KEY, iso);
  } catch {
    /* ignore */
  }
}

function getGuestKey(): string | null {
  try {
    return localStorage.getItem(GUEST_KEY_STORAGE);
  } catch {
    return null;
  }
}

function maybeBrowserNotify(alert: FeelAlert) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  // Skip if document is focused and visible — toast is enough in-app.
  if (!document.hidden) return;
  try {
    const n = new Notification(alert.title, {
      body: alert.body,
      tag: `feel-${alert.id}`,
    });
    n.onclick = () => {
      window.focus();
      if (alert.url) window.location.href = alert.url;
      n.close();
    };
  } catch {
    /* ignore */
  }
}

export function LiveAlertCenter({ audience }: { audience: Audience }) {
  const bootstrapped = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const seen = loadSeen();

    const poll = async () => {
      if (typeof document !== "undefined" && document.hidden) return;

      try {
        const params = new URLSearchParams();
        const since = getSince();
        // First paint: seed "since" so we don't toast the entire backlog.
        if (!bootstrapped.current && !since) {
          setSince(new Date().toISOString());
          bootstrapped.current = true;
          // Still fetch counts for badge refresh, but don't toast historical items.
          const seedUrl =
            audience === "public"
              ? (() => {
                  const gk = getGuestKey();
                  return gk
                    ? `/api/feel/alerts?guestKey=${encodeURIComponent(gk)}`
                    : null;
                })()
              : "/api/feel/alerts";
          if (seedUrl) {
            await fetch(seedUrl, { cache: "no-store" }).catch(() => undefined);
          }
          window.dispatchEvent(new Event("aether:attention-refresh"));
          return;
        }
        bootstrapped.current = true;

        if (since) params.set("since", since);
        if (audience === "public") {
          const gk = getGuestKey();
          if (!gk) return;
          params.set("guestKey", gk);
        }

        const res = await fetch(`/api/feel/alerts?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const alerts = (data.alerts || []) as FeelAlert[];

        let newest = since ? new Date(since).getTime() : 0;
        let toasted = false;

        const path = typeof window !== "undefined" ? window.location.pathname : "";

        for (const alert of alerts) {
          const t = new Date(alert.createdAt).getTime();
          if (!Number.isNaN(t) && t > newest) newest = t;
          if (seen.has(alert.id)) continue;
          seen.add(alert.id);

          // Already viewing this thread — live chat UI handles the update; skip duplicate toast.
          if (alert.url && (path === alert.url || path.startsWith(`${alert.url}/`))) {
            continue;
          }

          const isUrgent =
            alert.kind === "feeling_worse" ||
            alert.kind === "escalation" ||
            alert.severity === "critical";

          const message = alert.body
            ? `${alert.title}: ${alert.body}`
            : alert.title;

          if (isUrgent) {
            toast.urgent(message, { href: alert.url, durationMs: 14_000 });
          } else {
            toast.info(message, { href: alert.url, durationMs: 10_000 });
          }
          maybeBrowserNotify(alert);
          toasted = true;
        }

        if (toasted || alerts.length > 0) {
          saveSeen(seen);
          window.dispatchEvent(new Event("aether:attention-refresh"));
        }
        if (newest > 0) {
          setSince(new Date(newest).toISOString());
        } else if (data.serverTime) {
          // Keep clock moving so we don't re-fetch ancient rows.
          const cur = getSince();
          if (!cur) setSince(data.serverTime);
        }
      } catch {
        /* best-effort */
      }
    };

    // Slight delay so shells finish paint first.
    const boot = window.setTimeout(poll, 1200);
    // Clinical path: poll more often than generic unread.
    const interval = window.setInterval(poll, 15_000);

    const onVisibility = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearTimeout(boot);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [audience]);

  return null;
}

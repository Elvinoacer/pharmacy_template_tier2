"use client";

import { useCallback, useEffect, useState } from "react";
import { isPushSupported, onForegroundPush, requestFcmToken } from "@/app/lib/firebase/client";

type Status = "unsupported" | "default" | "granted" | "denied" | "requesting";

/**
 * React hook that manages FCM token lifecycle for the signed-in user.
 * - Auto-registers the token on mount if permission was previously granted.
 * - Exposes `enable()` to request permission + register the token.
 * - Exposes `lastMessage` for the in-app toast UI when a push arrives in the foreground.
 */
export function usePushNotifications() {
  const [status, setStatus] = useState<Status>("default");
  const [lastMessage, setLastMessage] = useState<{
    title?: string;
    body?: string;
    data?: Record<string, string>;
  } | null>(null);
  const [registered, setRegistered] = useState(false);

  const registerToken = useCallback(async (token: string) => {
    const res = await fetch("/api/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      throw new Error(`register_failed_${res.status}`);
    }
    setRegistered(true);
  }, []);

  useEffect(() => {
    // Defer state updates to a microtask so we don't call setState synchronously
    // inside the effect body (which React lint flags as a cascading render).
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    queueMicrotask(() => {
      if (cancelled) return;
      if (!isPushSupported()) {
        setStatus("unsupported");
        return;
      }

      const perm = Notification.permission;
      setStatus(perm === "granted" ? "granted" : perm === "denied" ? "denied" : "default");

      if (perm !== "granted") return;

      // Permission already granted — refresh/register the token quietly.
      requestFcmToken()
        .then(async (token) => {
          if (cancelled || !token) return;
          try {
            await registerToken(token);
          } catch {
            /* best-effort — user can retry via enable() */
          }
        })
        .catch(() => {
          /* swallow */
        });

      onForegroundPush((payload) => {
        if (!cancelled) setLastMessage(payload);
      }).then((un) => {
        unsubscribe = un;
      });
    });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [registerToken]);

  const enable = useCallback(async () => {
    if (!isPushSupported()) return false;
    setStatus("requesting");
    const token = await requestFcmToken();
    if (!token) {
      setStatus(Notification.permission === "denied" ? "denied" : "default");
      return false;
    }
    try {
      await registerToken(token);
      setStatus("granted");
      return true;
    } catch {
      setStatus(Notification.permission === "granted" ? "granted" : "default");
      return false;
    }
  }, [registerToken]);

  const sendTest = useCallback(async () => {
    try {
      const r = await fetch("/api/push/test", { method: "POST" });
      const j = await r.json();
      return j as { sent?: number; failed?: number; error?: string };
    } catch {
      return { error: "request_failed" };
    }
  }, []);

  const clearMessage = useCallback(() => setLastMessage(null), []);

  return { status, registered, lastMessage, enable, sendTest, clearMessage };
}

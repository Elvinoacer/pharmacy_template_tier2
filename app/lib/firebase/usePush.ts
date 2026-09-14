"use client";

import { useCallback, useEffect, useState } from "react";
import { isPushSupported, onForegroundPush, requestFcmToken } from "@/app/lib/firebase/client";

type Status = "unsupported" | "default" | "granted" | "denied" | "requesting";

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
      throw new Error("push_registration_failed");
    }
    setRegistered(true);
  }, []);

  useEffect(() => {
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

      requestFcmToken()
        .then(async (token) => {
          if (cancelled || !token) return;
          try {
            await registerToken(token);
          } catch {
            /* best effort */
          }
        })
        .catch(() => {});

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
      const j = (await r.json().catch(() => ({}))) as { sent?: number; failed?: number; error?: string };
      if (!r.ok || j.error) {
        return { sent: j.sent, failed: j.failed, error: "Test notification could not be delivered. Please try again." };
      }
      return { sent: j.sent, failed: j.failed };
    } catch {
      return { error: "Test notification could not be delivered. Check your connection and try again." };
    }
  }, []);

  const clearMessage = useCallback(() => setLastMessage(null), []);

  return { status, registered, lastMessage, enable, sendTest, clearMessage };
}

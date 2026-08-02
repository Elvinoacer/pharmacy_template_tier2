"use client";

// Lazy Firebase client initialisation. We only import the SDK when the user
// actually interacts with push — this keeps the main bundle lean for the many
// visitors who never enable notifications.

let messagingPromise: Promise<import("firebase/messaging").Messaging | null> | null = null;
let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

function isClientConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  );
}

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    isClientConfigured()
  );
}

/** Register (or reuse) the FCM service worker at the site root. */
export async function getPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;

  if (!swRegistrationPromise) {
    swRegistrationPromise = (async () => {
      try {
        // Prefer an existing registration for this script if the browser already has one.
        const existing = await navigator.serviceWorker.getRegistration("/");
        if (existing?.active?.scriptURL?.includes("firebase-messaging-sw")) {
          return existing;
        }

        const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
          scope: "/",
        });
        // Wait until the SW is ready so getToken can attach to it.
        await navigator.serviceWorker.ready;
        return registration;
      } catch (err) {
        console.error("[firebase/client] Service worker registration failed:", err);
        return null;
      }
    })();
  }

  return swRegistrationPromise;
}

export async function getMessaging(): Promise<import("firebase/messaging").Messaging | null> {
  if (!isClientConfigured()) return null;
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;

  if (!messagingPromise) {
    messagingPromise = (async () => {
      try {
        // Ensure SW is registered before messaging initialises.
        await getPushServiceWorker();

        const { initializeApp, getApps } = await import("firebase/app");
        const { getMessaging: _getMessaging } = await import("firebase/messaging");

        const apps = getApps();
        const app =
          apps[0] ||
          initializeApp({
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
          });

        return _getMessaging(app);
      } catch (err) {
        console.error("[firebase/client] Failed to initialise messaging:", err);
        return null;
      }
    })();
  }

  return messagingPromise;
}

export async function requestFcmToken(): Promise<string | null> {
  if (!isPushSupported()) return null;

  const messaging = await getMessaging();
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const registration = await getPushServiceWorker();
    const { getToken } = await import("firebase/messaging");
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!,
      ...(registration ? { serviceWorkerRegistration: registration } : {}),
    });
    return token || null;
  } catch (err) {
    console.error("[firebase/client] Failed to get FCM token:", err);
    return null;
  }
}

export async function onForegroundPush(
  cb: (payload: { title?: string; body?: string; data: Record<string, string> }) => void,
): Promise<() => void> {
  const messaging = await getMessaging();
  if (!messaging) return () => {};

  const { onMessage } = await import("firebase/messaging");
  const unsubscribe = onMessage(messaging, (payload) => {
    cb({
      title: payload.notification?.title,
      body: payload.notification?.body,
      data: (payload.data || {}) as Record<string, string>,
    });
  });
  return unsubscribe;
}

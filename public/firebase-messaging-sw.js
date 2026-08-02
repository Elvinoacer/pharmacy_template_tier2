// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Only initialise if config is present (avoids errors in environments without FCM).
if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId) {
  try {
    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    // Handle background messages. Notifications with a `notification` payload
    // are auto-displayed by the browser; this is for data-only messages.
    onBackgroundMessage(messaging, (payload) => {
      console.log("[firebase-messaging-sw] Received background message:", payload);
    });
  } catch (err) {
    console.error("[firebase-messaging-sw] init failed:", err);
  }
}

// Standard service-worker lifecycle hooks.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// When the user clicks a notification, focus/open the app and navigate to the URL.
self.addEventListener("notificationclick", (event) => {
  const data = event.notification.data || {};
  const targetUrl = data.url || "/";
  event.notification.close();

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Re-use an existing tab if one is open.
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(targetUrl);
          }
          return;
        }
      }

      // Otherwise open a new tab.
      if ("openWindow" in self.clients) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});

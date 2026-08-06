import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves the Firebase messaging service worker with env config injected.
 * Static files in /public cannot read NEXT_PUBLIC_* at runtime — this route
 * is rewritten from /firebase-messaging-sw.js via next.config.
 *
 * Medication-dose notifications expose Taken / Skip / Snooze action buttons
 * so the patient can confirm without opening the portal page.
 */
export async function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };

  const body = `
/* firebase-messaging-sw.js — generated with runtime Firebase config */
importScripts("https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js");

const firebaseConfig = ${JSON.stringify(config)};

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function isDoseNotification(data) {
  return data && (data.actions === "medication_dose" || data.type === "medication_dose");
}

function doseNotificationOptions(title, body, data, url) {
  const options = {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { ...(data || {}), url },
    tag: (data && data.tag) || "aether-pharmacy",
    renotify: true,
    requireInteraction: true,
  };
  if (isDoseNotification(data)) {
    options.actions = [
      { action: "taken", title: "Taken" },
      { action: "skip", title: "Skip" },
      { action: "snooze", title: "Snooze" },
    ];
  }
  return options;
}

if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId) {
  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const title =
        (payload.notification && payload.notification.title) ||
        (payload.data && payload.data.title) ||
        "Aether Pharmacy";
      const body =
        (payload.notification && payload.notification.body) ||
        (payload.data && payload.data.body) ||
        "";
      const url =
        (payload.data && payload.data.url) ||
        (payload.fcmOptions && payload.fcmOptions.link) ||
        "/";
      const options = doseNotificationOptions(title, body, payload.data || {}, url);
      return self.registration.showNotification(title, options);
    });
  } catch (err) {
    console.error("[firebase-messaging-sw] init failed:", err);
  }
}

async function postAdherence(payload) {
  try {
    const res = await fetch("/api/portal/adherence", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.error("[firebase-messaging-sw] adherence post failed:", err);
    return false;
  }
}

self.addEventListener("notificationclick", (event) => {
  const data = event.notification.data || {};
  const targetUrl = data.url || "/portal/prescriptions";
  const action = event.action || "";
  event.notification.close();

  // In-notification dose actions — Taken / Skip / Snooze — hit the adherence API
  // directly so the patient does not need to open the portal page.
  if (action === "taken" || action === "skip" || action === "snooze") {
    const status = action === "taken" ? "taken" : action === "skip" ? "skipped" : "snooze";
    const today =
      data.takenOn ||
      new Date().toISOString().slice(0, 10);

    event.waitUntil(
      (async () => {
        const ok = await postAdherence({
          prescriptionId: data.prescriptionId,
          status,
          takenOn: today,
          scheduledTime: data.scheduledTime || null,
          scheduleId: data.scheduleId || null,
          reminderId: data.reminderId || null,
          action: status === "snooze" ? "snooze" : undefined,
        });

        // Brief confirmation toast-style notification (no actions).
        const confirmTitle = ok
          ? status === "taken"
            ? "Dose confirmed"
            : status === "skipped"
              ? "Dose skipped"
              : "Snoozed 10 min"
          : status === "snooze"
            ? "Snooze limit reached"
            : "Could not update dose";
        const confirmBody = ok
          ? status === "snooze"
            ? "We'll remind you once more shortly (max 2 snoozes)."
            : "Your adherence log was updated. No more reminders for this dose."
          : status === "snooze"
            ? "Open Prescriptions and confirm Taken, Late, or Skip."
            : "Open the app and try again from Prescriptions.";
        await self.registration.showNotification(confirmTitle, {
          body: confirmBody,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: (data.tag || "aether-pharmacy") + "-ack",
          data: { url: targetUrl },
        });

        // If auth failed, open the portal so the user can sign in and log.
        if (!ok && self.clients.openWindow) {
          await self.clients.openWindow(targetUrl);
        }
      })(),
    );
    return;
  }

  // Default: focus/open the target URL.
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(targetUrl);
            } catch {
              /* ignore navigate errors on older browsers */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
`.trim();

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // SW must be controlled carefully; short cache so config updates pick up.
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}

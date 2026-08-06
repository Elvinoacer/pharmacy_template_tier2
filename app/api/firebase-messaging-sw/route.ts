import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves the Firebase messaging service worker with env config injected.
 * Static files in /public cannot read NEXT_PUBLIC_* at runtime — this route
 * is rewritten from /firebase-messaging-sw.js via next.config.
 *
 * Medication-dose notifications expose polished Taken / Skip / Later action
 * buttons so the patient can confirm without opening the portal page.
 * Brand logo is the icon; drug photo is the large rich-notification image.
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
  // Injected so the SW never uses UTC calendar days for dose logs.
  const projectTimezone = process.env.TIMEZONE || "Africa/Nairobi";
  const appOrigin = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const brandIcon = appOrigin ? `${appOrigin}/icon-192.png` : "/icon-192.png";

  const body = `
/* firebase-messaging-sw.js — generated with runtime Firebase config */
importScripts("https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js");

const firebaseConfig = ${JSON.stringify(config)};
const PROJECT_TIMEZONE = ${JSON.stringify(projectTimezone)};
const BRAND_ICON = ${JSON.stringify(brandIcon)};

function localTodayStr(at) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: PROJECT_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(at || new Date());
    const get = (t) => parts.find((p) => p.type === t)?.value || "00";
    return get("year") + "-" + get("month") + "-" + get("day");
  } catch (e) {
    return new Date().toISOString().slice(0, 10);
  }
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function isDoseNotification(data) {
  return data && (data.actions === "medication_dose" || data.type === "medication_dose");
}

function resolveAsset(url) {
  if (!url) return BRAND_ICON;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  try {
    return new URL(url, self.registration.scope).href;
  } catch (e) {
    return url;
  }
}

function doseNotificationOptions(title, body, data, url) {
  const icon = resolveAsset((data && data.icon) || BRAND_ICON);
  const image = data && data.image ? resolveAsset(data.image) : undefined;
  const options = {
    body: body || "",
    icon,
    badge: BRAND_ICON,
    data: { ...(data || {}), url, icon, image: image || "" },
    tag: (data && data.tag) || "aether-pharmacy",
    renotify: true,
    requireInteraction: isDoseNotification(data),
    silent: false,
  };
  if (image) options.image = image;
  if (isDoseNotification(data)) {
    // Short, scannable action labels. Browsers do not allow CSS on these —
    // symbols + tight wording are the only styling levers we have.
    options.actions = [
      { action: "taken", title: "✓ Taken" },
      { action: "skip", title: "Skip" },
      { action: "snooze", title: "Later" },
    ];
  }
  return options;
}

if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId) {
  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const data = payload.data || {};
      const title =
        (payload.notification && payload.notification.title) ||
        data.title ||
        "Aether Pharmacy";
      const body =
        (payload.notification && payload.notification.body) ||
        data.body ||
        "";
      const url =
        data.url ||
        (payload.fcmOptions && payload.fcmOptions.link) ||
        "/";
      // Prefer the large image from FCM notification.image when present.
      if (!data.image && payload.notification && payload.notification.image) {
        data.image = payload.notification.image;
      }
      const options = doseNotificationOptions(title, body, data, url);
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

  // In-notification dose actions — Taken / Skip / Later — hit the adherence API
  // directly so the patient does not need to open the portal page.
  if (action === "taken" || action === "skip" || action === "snooze") {
    const status = action === "taken" ? "taken" : action === "skip" ? "skipped" : "snooze";
    const today = data.takenOn || localTodayStr();
    const med = (data.medicineName || "").trim();

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

        // Brief, luxury confirmation — short copy, brand icon, optional drug image.
        const confirmTitle = ok
          ? status === "taken"
            ? med ? med + " · logged" : "Dose logged"
            : status === "skipped"
              ? med ? med + " · skipped" : "Dose skipped"
              : "Reminder snoozed"
          : status === "snooze"
            ? "Snooze limit reached"
            : "Could not update";
        const confirmBody = ok
          ? status === "snooze"
            ? "We'll nudge you again in 10 minutes."
            : status === "taken"
              ? "Beautifully done. No more alerts for this dose."
              : "Noted. No more alerts for this dose."
          : status === "snooze"
            ? "Open Prescriptions to confirm or skip."
            : "Open the app and try again.";
        const ackOpts = {
          body: confirmBody,
          icon: resolveAsset(data.icon || BRAND_ICON),
          badge: BRAND_ICON,
          tag: (data.tag || "aether-pharmacy") + "-ack",
          data: { url: targetUrl },
        };
        if (data.image) ackOpts.image = resolveAsset(data.image);
        await self.registration.showNotification(confirmTitle, ackOpts);

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

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
 *
 * Dose pushes are sent as data-only FCM messages so this SW fully owns
 * showNotification (actions + flat data). Auto-displayed FCM notifications
 * often lose action IDs / nest data under FCM_MSG, which made every click
 * fall through or log the wrong status.
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
const APP_ORIGIN = ${JSON.stringify(appOrigin)};

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

/**
 * Flatten FCM / Notification data. Auto-displayed FCM payloads nest fields
 * under FCM_MSG.data; SW-shown notifications keep a flat map.
 */
function normalizeNotificationData(raw) {
  const base = raw && typeof raw === "object" ? raw : {};
  let data = Object.assign({}, base);

  // FCM wrapper from browser-auto-displayed notifications
  if (base.FCM_MSG && typeof base.FCM_MSG === "object") {
    const fcm = base.FCM_MSG;
    if (fcm.data && typeof fcm.data === "object") {
      data = Object.assign({}, data, fcm.data);
    }
    if (fcm.notification && typeof fcm.notification === "object") {
      if (!data.title && fcm.notification.title) data.title = fcm.notification.title;
      if (!data.body && fcm.notification.body) data.body = fcm.notification.body;
      if (!data.image && fcm.notification.image) data.image = fcm.notification.image;
    }
    if (fcm.fcmOptions && fcm.fcmOptions.link && !data.url) {
      data.url = fcm.fcmOptions.link;
    }
  }

  // Some SDK builds nest under "data"
  if (base.data && typeof base.data === "object" && !Array.isArray(base.data)) {
    data = Object.assign({}, data, base.data);
  }

  // Coerce every value to string (FCM requirement / defensive)
  const out = {};
  Object.keys(data).forEach(function (k) {
    if (k === "FCM_MSG") return;
    const v = data[k];
    if (v == null) return;
    if (typeof v === "object") return;
    out[k] = String(v);
  });
  return out;
}

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

function absoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return APP_ORIGIN || self.registration.scope;
  if (/^https?:/i.test(pathOrUrl)) return pathOrUrl;
  try {
    return new URL(pathOrUrl, APP_ORIGIN || self.registration.scope).href;
  } catch (e) {
    return pathOrUrl;
  }
}

function doseNotificationOptions(title, body, data, url) {
  const icon = resolveAsset((data && data.icon) || BRAND_ICON);
  const image = data && data.image ? resolveAsset(data.image) : undefined;
  const options = {
    body: body || "",
    icon: icon,
    badge: BRAND_ICON,
    data: Object.assign({}, data || {}, { url: url, icon: icon, image: image || "" }),
    tag: (data && data.tag) || "afyvia-pharmacy",
    renotify: true,
    requireInteraction: isDoseNotification(data),
    silent: false,
  };
  if (image) options.image = image;
  if (isDoseNotification(data)) {
    // Chrome Android only reliably surfaces ~2 actions; keep labels short.
    // Action *ids* must stay stable — never put the label text in "action".
    options.actions = [
      { action: "taken", title: "Taken" },
      { action: "skip", title: "Skip" },
      { action: "snooze", title: "Later" },
    ];
  }
  return options;
}

/**
 * Map notificationclick action id (and common label fallbacks) to a dose status.
 * Returns null when the click was on the notification body (no action button).
 */
function resolveDoseAction(rawAction) {
  const a = String(rawAction || "").toLowerCase().trim();
  if (!a) return null;
  // Canonical ids
  if (a === "taken" || a === "confirm" || a === "yes") return "taken";
  if (a === "skip" || a === "skipped" || a === "no") return "skipped";
  if (a === "snooze" || a === "later" || a === "remind") return "snooze";
  // Title-text fallbacks (some WebViews pass the button title as action)
  if (a.indexOf("taken") !== -1 || a.indexOf("✓") !== -1) return "taken";
  if (a.indexOf("skip") !== -1) return "skipped";
  if (a.indexOf("later") !== -1 || a.indexOf("snooze") !== -1) return "snooze";
  return null;
}

if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId) {
  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage(function (payload) {
      const raw = payload && payload.data ? payload.data : {};
      const data = normalizeNotificationData(raw);
      const title =
        (payload.notification && payload.notification.title) ||
        data.title ||
        "Afyvia Pharmacy";
      const body =
        (payload.notification && payload.notification.body) ||
        data.body ||
        "";
      const url =
        data.url ||
        (payload.fcmOptions && payload.fcmOptions.link) ||
        "/portal/prescriptions";
      if (!data.image && payload.notification && payload.notification.image) {
        data.image = payload.notification.image;
      }
      // Ensure dose markers survive even if only type was set server-side.
      if (data.type === "medication_dose" && !data.actions) {
        data.actions = "medication_dose";
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
    const endpoint = absoluteUrl("/api/portal/adherence");
    const res = await fetch(endpoint, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(function () { return ""; });
      console.error("[firebase-messaging-sw] adherence HTTP", res.status, text.slice(0, 200));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[firebase-messaging-sw] adherence post failed:", err);
    return false;
  }
}

function buildDoseDeepLink(data, doseStatus) {
  const params = new URLSearchParams();
  // Map internal status back to button action for the portal handler.
  const action =
    doseStatus === "taken" ? "taken" : doseStatus === "skipped" ? "skip" : "snooze";
  params.set("doseAction", action);
  if (data.prescriptionId) params.set("prescriptionId", data.prescriptionId);
  if (data.scheduleId) params.set("scheduleId", data.scheduleId);
  if (data.scheduledTime) params.set("scheduledTime", data.scheduledTime);
  if (data.takenOn) params.set("takenOn", data.takenOn);
  if (data.reminderId) params.set("reminderId", data.reminderId);
  if (data.medicineName) params.set("medicineName", data.medicineName);
  return absoluteUrl("/portal/prescriptions?" + params.toString());
}

async function focusOrOpen(url) {
  const target = absoluteUrl(url || "/portal/prescriptions");
  const allClients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  for (let i = 0; i < allClients.length; i++) {
    const client = allClients[i];
    if ("focus" in client) {
      await client.focus();
      if ("navigate" in client) {
        try {
          await client.navigate(target);
          return client;
        } catch (e) {
          /* older browsers */
        }
      }
      // Fallback: post message so the open tab can route itself.
      try {
        client.postMessage({ type: "afyvia:dose-navigate", url: target });
      } catch (e) { /* ignore */ }
      return client;
    }
  }
  if (self.clients.openWindow) {
    return self.clients.openWindow(target);
  }
  return null;
}

self.addEventListener("notificationclick", function (event) {
  const data = normalizeNotificationData(event.notification.data || {});
  const targetUrl = data.url || "/portal/prescriptions";
  const rawAction = event.action || "";
  event.notification.close();

  const doseStatus = isDoseNotification(data) ? resolveDoseAction(rawAction) : null;

  // In-notification dose actions — Taken / Skip / Later
  if (doseStatus) {
    const today = data.takenOn || localTodayStr();
    const med = (data.medicineName || "").trim();
    const deepLink = buildDoseDeepLink(
      Object.assign({}, data, { takenOn: today }),
      doseStatus,
    );

    event.waitUntil(
      (async function () {
        // Prefer direct API when we have the required fields + session cookies.
        // If that fails (common on some mobile browsers from SW context), open
        // the portal deep-link so the page can complete the action with full auth.
        let ok = false;
        const canPost =
          doseStatus === "snooze"
            ? Boolean(data.reminderId)
            : Boolean(data.prescriptionId && today);

        if (canPost) {
          ok = await postAdherence({
            prescriptionId: data.prescriptionId || undefined,
            status: doseStatus,
            takenOn: today,
            scheduledTime: data.scheduledTime || null,
            scheduleId: data.scheduleId || null,
            reminderId: data.reminderId || null,
            action: doseStatus === "snooze" ? "snooze" : undefined,
          });
        }

        if (ok) {
          const confirmTitle =
            doseStatus === "taken"
              ? med ? med + " · logged" : "Dose logged"
              : doseStatus === "skipped"
                ? med ? med + " · skipped" : "Dose skipped"
                : "Reminder snoozed";
          const confirmBody =
            doseStatus === "snooze"
              ? "We'll nudge you again in 10 minutes."
              : doseStatus === "taken"
                ? "Beautifully done. No more alerts for this dose."
                : "Noted. No more alerts for this dose.";
          const ackOpts = {
            body: confirmBody,
            icon: resolveAsset(data.icon || BRAND_ICON),
            badge: BRAND_ICON,
            tag: (data.tag || "afyvia-pharmacy") + "-ack",
            data: { url: targetUrl },
          };
          if (data.image) ackOpts.image = resolveAsset(data.image);
          await self.registration.showNotification(confirmTitle, ackOpts);

          // Refresh any open portal tabs so Today's doses updates.
          try {
            const clients = await self.clients.matchAll({
              type: "window",
              includeUncontrolled: true,
            });
            clients.forEach(function (c) {
              try {
                c.postMessage({
                  type: "afyvia:dose-logged",
                  status: doseStatus,
                  prescriptionId: data.prescriptionId || "",
                });
              } catch (e) { /* ignore */ }
            });
          } catch (e) { /* ignore */ }
          return;
        }

        // API failed or missing fields — open portal with the intended action.
        const failTitle =
          doseStatus === "snooze" ? "Opening to snooze…" : "Opening to confirm…";
        await self.registration.showNotification(failTitle, {
          body: "Complete the dose update in the app.",
          icon: resolveAsset(data.icon || BRAND_ICON),
          badge: BRAND_ICON,
          tag: (data.tag || "afyvia-pharmacy") + "-ack",
          data: { url: deepLink },
        });
        await focusOrOpen(deepLink);
      })(),
    );
    return;
  }

  // Default: focus/open the target URL (notification body click).
  // For dose reminders without an action button, open prescriptions so the
  // patient can confirm with large in-app buttons.
  const openUrl = isDoseNotification(data)
    ? data.url || "/portal/prescriptions"
    : targetUrl;

  event.waitUntil(focusOrOpen(openUrl));
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

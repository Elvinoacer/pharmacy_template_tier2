import "server-only";

import admin, { type ServiceAccount } from "firebase-admin";
import type { messaging } from "firebase-admin";

let initialised = false;
let messagingInstance: messaging.Messaging | null = null;

function resolveServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    try {
      return JSON.parse(raw) as ServiceAccount;
    } catch (err) {
      console.error("[push/admin] service-account configuration is invalid.", err);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  let privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

  if (projectId && clientEmail && privateKey) {
    if (privateKey.includes("\\n")) privateKey = privateKey.replace(/\\n/g, "\n");
    return {
      projectId,
      clientEmail,
      privateKey,
    };
  }

  return null;
}

function ensureInitialised() {
  if (initialised) return;
  if (admin.apps.length > 0) {
    messagingInstance = admin.messaging();
    initialised = true;
    return;
  }

  const creds = resolveServiceAccount();
  if (!creds) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[push/admin] push delivery configuration is unavailable.");
    }
    initialised = true;
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(creds),
      projectId: creds.projectId,
    });
    messagingInstance = admin.messaging();
  } catch (err) {
    console.error("[push/admin] Failed to initialise push delivery:", err);
  }
  initialised = true;
}

export function isFirebaseConfigured(): boolean {
  return resolveServiceAccount() !== null;
}

export type PushPayload = {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  url?: string;
  icon?: string;
  image?: string;
};

type PushResult = {
  success: boolean;
  messageId?: string;
  error?: string;
  /** Internal classification only; never render this field to users. */
  invalidToken?: boolean;
};

function isDoseActions(data?: Record<string, string>): boolean {
  return data?.actions === "medication_dose" || data?.type === "medication_dose";
}

function isInvalidPushToken(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("registration-token-not-registered") ||
    lower.includes("invalid-registration-token") ||
    lower.includes("mismatched-credential") ||
    lower.includes("requested-entity-not-found")
  );
}

export async function sendPush(payload: PushPayload): Promise<PushResult> {
  ensureInitialised();
  if (!messagingInstance) {
    return { success: false, error: "Push notifications are temporarily unavailable." };
  }

  const icon = payload.icon || payload.data?.icon || "/icon-192.png";
  const image = payload.image || payload.data?.image || undefined;
  const tag = payload.data?.tag || "aether-pharmacy";
  const dose = isDoseActions(payload.data);

  const data: Record<string, string> = {
    ...(payload.data || {}),
    title: payload.title,
    body: payload.body,
    icon,
    ...(image ? { image } : {}),
    ...(payload.url ? { url: payload.url } : {}),
  };
  if (dose) {
    data.actions = data.actions || "medication_dose";
    data.type = data.type || "medication_dose";
  }

  try {
    if (dose) {
      const messageId = await messagingInstance.send({
        token: payload.token,
        data,
        webpush: {
          headers: {
            Urgency: "high",
            TTL: "3600",
          },
        },
      });
      return { success: true, messageId };
    }

    const webNotification: Record<string, unknown> = {
      title: payload.title,
      body: payload.body,
      icon,
      badge: icon,
      tag,
      renotify: true,
      requireInteraction: false,
    };
    if (image) webNotification.image = image;

    const messageId = await messagingInstance.send({
      token: payload.token,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(image ? { imageUrl: image } : {}),
      },
      data,
      webpush: {
        notification: webNotification,
        fcmOptions: payload.url ? { link: payload.url } : undefined,
        headers: {
          Urgency: "normal",
        },
      },
    });
    return { success: true, messageId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[push/admin] delivery failed", err);
    return {
      success: false,
      error: "Push notification could not be delivered.",
      invalidToken: isInvalidPushToken(message),
    };
  }
}

export async function sendMulticastPush(
  tokens: string[],
  payload: Omit<PushPayload, "token">,
): Promise<{ sent: number; failed: number; invalidTokens: string[] }> {
  ensureInitialised();
  if (!messagingInstance || tokens.length === 0) {
    return { sent: 0, failed: 0, invalidTokens: [] };
  }

  const concurrency = 8;
  const jobs = tokens.map((token) => ({ token, promise: () => sendPush({ ...payload, token }) }));

  const results: { token: string; res: Awaited<ReturnType<typeof sendPush>> }[] = [];
  for (let i = 0; i < jobs.length; i += concurrency) {
    const batch = jobs.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (job) => ({ token: job.token, res: await job.promise() })),
    );
    results.push(...batchResults);
  }

  let sent = 0;
  let failed = 0;
  const invalidTokens: string[] = [];
  for (const { token, res } of results) {
    if (res.success) {
      sent++;
    } else {
      failed++;
      if (res.invalidToken) invalidTokens.push(token);
    }
  }

  return { sent, failed, invalidTokens };
}

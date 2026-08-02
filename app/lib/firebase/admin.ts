import "server-only";

import admin, { type ServiceAccount } from "firebase-admin";
import type { messaging } from "firebase-admin";

let initialised = false;
let messagingInstance: messaging.Messaging | null = null;

function resolveServiceAccount(): ServiceAccount | null {
  // 1) Preferred: full JSON blob pasted into one env var.
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    try {
      return JSON.parse(raw) as ServiceAccount;
    } catch (err) {
      console.error("[firebase/admin] FIREBASE_SERVICE_ACCOUNT_JSON is set but not valid JSON.", err);
    }
  }

  // 2) Three-piece config (project_id + client_email + private_key).
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  let privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

  if (projectId && clientEmail && privateKey) {
    // Allow pasting the key with literal "\n" sequences (common when stored in .env).
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
    // Soft-fail: app still works, pushes are silently skipped.
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[firebase/admin] No Firebase service-account credentials found. Push notifications will be skipped.",
      );
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
    console.error("[firebase/admin] Failed to initialise firebase-admin:", err);
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
};

export async function sendPush(payload: PushPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
  ensureInitialised();
  if (!messagingInstance) return { success: false, error: "Firebase not initialised" };

  try {
    const messageId = await messagingInstance.send({
      token: payload.token,
      notification: { title: payload.title, body: payload.body },
      data: {
        ...(payload.data || {}),
        ...(payload.url ? { url: payload.url } : {}),
      },
      webpush: payload.url
        ? {
            notification: {
              title: payload.title,
              body: payload.body,
              icon: "/icon-192.png",
              badge: "/icon-192.png",
              tag: payload.data?.tag || "aether-pharmacy",
            },
            fcmOptions: { link: payload.url },
          }
        : undefined,
    });
    return { success: true, messageId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
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
      const err = (res.error || "").toLowerCase();
      if (
        err.includes("registration-token-not-registered") ||
        err.includes("invalid-registration-token") ||
        err.includes("mismatched-credential") ||
        err.includes("requested-entity-not-found")
      ) {
        invalidTokens.push(token);
      }
    }
  }

  return { sent, failed, invalidTokens };
}

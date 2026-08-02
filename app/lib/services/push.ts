import "server-only";

import { prisma } from "@/app/lib/db";
import { sendMulticastPush, isFirebaseConfigured } from "@/app/lib/firebase/admin";

/**
 * Dispatch a Firebase Cloud Messaging push notification to every device the
 * given user has registered. Soft-fails when FCM is not configured or the
 * user has no devices — callers should not need to handle errors.
 *
 * Returns a summary so callers (e.g. campaign launches) can log delivery stats.
 */
export async function dispatchPushToUser(
  userId: string,
  payload: {
    title: string;
    body: string;
    url?: string;
    data?: Record<string, string>;
  },
): Promise<{ sent: number; failed: number; pruned: number }> {
  if (!isFirebaseConfigured()) {
    return { sent: 0, failed: 0, pruned: 0 };
  }

  const devices = await prisma.pushDevice.findMany({
    where: { userId },
    select: { id: true, token: true },
  });
  if (devices.length === 0) {
    return { sent: 0, failed: 0, pruned: 0 };
  }

  const result = await sendMulticastPush(
    devices.map((d) => d.token),
    payload,
  );

  if (result.invalidTokens.length > 0) {
    const stale = devices.filter((d) => result.invalidTokens.includes(d.token)).map((d) => d.id);
    if (stale.length > 0) {
      await prisma.pushDevice.deleteMany({ where: { id: { in: stale } } });
    }
  }

  return { sent: result.sent, failed: result.failed, pruned: result.invalidTokens.length };
}

/**
 * Convenience: dispatch a push to every staff user (used when a customer
 * submits a new refill / enquiry that needs staff attention).
 */
export async function dispatchPushToStaff(payload: {
  title: string;
  body: string;
  url?: string;
  data?: Record<string, string>;
}): Promise<{ sent: number; failed: number; pruned: number }> {
  if (!isFirebaseConfigured()) {
    return { sent: 0, failed: 0, pruned: 0 };
  }

  const staffUsers = await prisma.user.findMany({
    where: { role: { in: ["pharmacist", "staff", "manager"] }, status: "active" },
    select: { id: true },
  });

  let sent = 0;
  let failed = 0;
  let pruned = 0;
  for (const u of staffUsers) {
    const r = await dispatchPushToUser(u.id, payload);
    sent += r.sent;
    failed += r.failed;
    pruned += r.pruned;
  }
  return { sent, failed, pruned };
}

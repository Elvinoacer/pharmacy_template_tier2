import "server-only";

import { cookies } from "next/headers";
import { prismaUnscoped } from "@/app/lib/db";
import { STAFF_PHARMACY_COOKIE } from "@/app/lib/tenant-context";
import { recordAuditRequired } from "@/app/lib/platform/audit";
import { getRequestMeta } from "@/app/lib/env";

export const SUPPORT_SESSION_COOKIE = "aether_support_session";
export const IMPERSONATION_COOKIE = "aether_impersonation";

export async function startSupportSession(opts: {
  adminId: string;
  pharmacyId: string;
  reason: string;
  ticketRef?: string | null;
  mode: "read_only" | "act_as_tenant";
  hours?: number;
}) {
  if (!opts.reason.trim()) throw new Error("Support reason is required");
  const meta = await getRequestMeta();
  const hours = opts.hours ?? 2;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  const session = await prismaUnscoped.supportSession.create({
    data: {
      pharmacyId: opts.pharmacyId,
      platformAdminId: opts.adminId,
      mode: opts.mode,
      reason: opts.reason.trim(),
      ticketRef: opts.ticketRef?.trim() || null,
      expiresAt,
      ipAddress: meta.ip,
      userAgent: meta.userAgent ?? null,
    },
  });
  await recordAuditRequired({
    actorId: opts.adminId,
    action: "support.session.start",
    resource: "pharmacy",
    resourceId: opts.pharmacyId,
    tenantId: opts.pharmacyId,
    reason: opts.reason,
    details: { mode: opts.mode, ticketRef: opts.ticketRef, sessionId: session.id },
  });
  const jar = await cookies();
  jar.set(STAFF_PHARMACY_COOKIE, opts.pharmacyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  jar.set(IMPERSONATION_COOKIE, opts.pharmacyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  jar.set(SUPPORT_SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return session;
}

export async function endSupportSession(adminId: string) {
  const jar = await cookies();
  const id = jar.get(SUPPORT_SESSION_COOKIE)?.value;
  if (id) {
    await prismaUnscoped.supportSession.updateMany({
      where: { id, endedAt: null },
      data: { endedAt: new Date() },
    });
    await recordAuditRequired({
      actorId: adminId,
      action: "support.session.end",
      resource: "support_session",
      resourceId: id,
    });
  }
  jar.delete(STAFF_PHARMACY_COOKIE);
  jar.delete(IMPERSONATION_COOKIE);
  jar.delete(SUPPORT_SESSION_COOKIE);
}

export async function activeSupportSession() {
  const jar = await cookies();
  const id = jar.get(SUPPORT_SESSION_COOKIE)?.value;
  if (!id) return null;
  const row = await prismaUnscoped.supportSession.findUnique({ where: { id } });
  if (!row || row.endedAt || row.expiresAt < new Date()) return null;
  return row;
}

export function supportIsReadOnly(session: { mode: string } | null): boolean {
  return session?.mode === "read_only";
}

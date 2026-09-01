import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import type { PharmacyLifecycleStatus } from "@/app/generated/prisma/client";

export async function recordLifecycle(
  pharmacyId: string,
  type: string,
  opts?: { fromStatus?: string; toStatus?: string; reason?: string; actorId?: string; meta?: Record<string, unknown> },
) {
  await prismaUnscoped.pharmacyLifecycleEvent.create({
    data: {
      pharmacyId,
      type,
      fromStatus: opts?.fromStatus ?? null,
      toStatus: opts?.toStatus ?? null,
      reason: opts?.reason ?? null,
      actorId: opts?.actorId ?? null,
      meta: (opts?.meta ?? {}) as object,
    },
  });
}

export async function setLifecycle(
  pharmacyId: string,
  status: PharmacyLifecycleStatus,
  opts?: { reason?: string; actorId?: string },
) {
  const current = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId } });
  if (!current) throw new Error("pharmacy_not_found");

  const data: Record<string, unknown> = { lifecycleStatus: status };
  const now = new Date();
  if (status === "restricted") data.restrictedAt = now;
  if (status === "suspended") {
    data.suspendedAt = now;
    data.listed = false;
  }
  if (status === "archived") data.archivedAt = now;
  if (status === "pending_deletion") data.deletionRequestedAt = now;
  if (status === "deleted") data.deletedAt = now;
  if (status === "active") {
    data.restrictedAt = null;
    data.suspendedAt = null;
  }

  await prismaUnscoped.pharmacy.update({ where: { id: pharmacyId }, data });
  await recordLifecycle(pharmacyId, status, {
    fromStatus: current.lifecycleStatus,
    toStatus: status,
    reason: opts?.reason,
    actorId: opts?.actorId,
  });
}

export function tenantIsOperable(lifecycle: string, onboarding: string): boolean {
  if (["suspended", "archived", "pending_deletion", "deleted", "regulatory_hold"].includes(lifecycle)) {
    return false;
  }
  return onboarding === "active" || onboarding === "approved";
}

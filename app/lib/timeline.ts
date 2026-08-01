import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/app/lib/db";

/** Record a CRM timeline event (server-only). */
export async function addTimelineEvent(
  customerId: string | null,
  userId: string | null,
  eventType: string,
  title: string,
  description?: string,
  metadata?: Record<string, unknown>,
  createdBy?: string,
) {
  await prisma.timelineEvent.create({
    data: {
      customerId: customerId ?? undefined,
      userId: userId ?? undefined,
      eventType,
      title,
      description: description ?? null,
      metadata: (metadata ?? {}) as Prisma.InputJsonValue,
      createdById: createdBy ?? userId ?? undefined,
    },
  });
}

export async function writeAuditLog(
  actorId: string | null,
  action: string,
  entityType?: string,
  entityId?: string,
  details?: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: {
      actorId: actorId ?? undefined,
      action,
      entityType: entityType ?? null,
      entityId: entityId ?? undefined,
      details: (details ?? {}) as Prisma.InputJsonValue,
    },
  });
}

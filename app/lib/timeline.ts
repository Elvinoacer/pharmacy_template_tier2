import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/app/lib/db";
import { withPlatformBypass, peekTenant } from "@/app/lib/tenant-context";

/** Loose UUID check — AuditLog.entityId is @db.Uuid, so non-UUIDs must not be written there. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asUuidOrUndefined(value?: string | null): string | undefined {
  if (!value) return undefined;
  return UUID_RE.test(value) ? value : undefined;
}

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
      customerId: customerId ?? null,
      userId: userId ?? null,
      eventType,
      title,
      description: description ?? null,
      metadata: (metadata ?? {}) as Prisma.InputJsonValue,
      createdById: createdBy ?? userId ?? null,
    },
  });
}

/**
 * Write an audit log row.
 *
 * `entityId` must be a UUID when provided — the column is `@db.Uuid`.
 * Non-UUID identifiers (R2 keys, slugs, free-text refs) belong in `details`.
 */
export async function writeAuditLog(
  actorId: string | null,
  action: string,
  entityType?: string,
  entityId?: string,
  details?: Record<string, unknown>,
) {
  const safeEntityId = asUuidOrUndefined(entityId);
  const safeDetails: Record<string, unknown> = { ...(details ?? {}) };
  // If a non-UUID was passed as entityId, keep it in details so nothing is lost.
  if (entityId && !safeEntityId && safeDetails.entityRef == null) {
    safeDetails.entityRef = entityId;
  }

  const run = () =>
    prisma.auditLog.create({
      data: {
        actorId: asUuidOrUndefined(actorId) ?? null,
        action,
        entityType: entityType ?? null,
        entityId: safeEntityId ?? null,
        details: safeDetails as Prisma.InputJsonValue,
      },
    });

  const tenant = peekTenant();
  if (!tenant?.pharmacyId && !tenant?.bypass) {
    await withPlatformBypass(run);
  } else {
    await run();
  }
}

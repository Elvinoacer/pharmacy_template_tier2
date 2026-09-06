import "server-only";

import { Prisma } from "@/app/generated/prisma/client";
import { prisma, prismaUnscoped } from "@/app/lib/db";
import { peekTenant, withPlatformBypass } from "@/app/lib/tenant-context";
import { getRequestMeta } from "@/app/lib/env";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asUuid(value?: string | null): string | undefined {
  if (!value) return undefined;
  return UUID_RE.test(value) ? value : undefined;
}

export type AuditInput = {
  actorId?: string | null;
  actorType?: string;
  action: string;
  resource?: string;
  resourceId?: string | null;
  tenantId?: string | null;
  branchId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  details?: Record<string, unknown>;
  requestId?: string | null;
  correlationId?: string | null;
};

async function write(input: AuditInput, required: boolean) {
  const meta = await getRequestMeta().catch(() => ({ ip: undefined, userAgent: undefined }));
  const tenant = peekTenant();
  const pharmacyId = input.tenantId || tenant?.pharmacyId || null;
  const data = {
    actorId: asUuid(input.actorId) ?? null,
    actorType: input.actorType ?? "user",
    action: input.action,
    entityType: input.resource ?? null,
    entityId: asUuid(input.resourceId) ?? null,
    details: (input.details ?? {}) as Prisma.InputJsonValue,
    before: (input.before ?? undefined) as Prisma.InputJsonValue | undefined,
    after: (input.after ?? undefined) as Prisma.InputJsonValue | undefined,
    reason: input.reason ?? null,
    requestId: input.requestId ?? null,
    correlationId: input.correlationId ?? null,
    branchId: asUuid(input.branchId) ?? null,
    ipAddress: meta.ip ?? null,
    userAgent: meta.userAgent ?? null,
    ...(pharmacyId ? { pharmacyId } : {}),
  };

  const client = pharmacyId && !tenant?.bypass ? prisma : prismaUnscoped;
  try {
    if (pharmacyId) {
      await client.auditLog.create({ data: { ...data, pharmacyId } });
    } else {
      await withPlatformBypass(async () => prismaUnscoped.auditLog.create({
        data: { ...data, pharmacyId: null },
      }));
    }
  } catch (err) {
    if (required) throw err;
    console.error("[audit] write failed", input.action, err);
  }
}

/** Best-effort audit for routine operations. */
export async function recordAudit(input: AuditInput): Promise<void> {
  await write(input, false);
}

/** Sensitive operations must not succeed if the audit row cannot be written. */
export async function recordAuditRequired(input: AuditInput): Promise<void> {
  await write(input, true);
}

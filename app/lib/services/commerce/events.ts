import "server-only";

import { prisma } from "@/app/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";
import type { CommerceEventType } from "@/app/generated/prisma/client";

/**
 * Immutable commerce event ledger (audit §38, §41.E).
 *
 * Every money-changing or stock-changing operation writes a row here.
 * This is the single source of truth for analytics: financial metrics
 * are computed from these events, never from order.status/updatedAt.
 *
 * Keep writes inside the calling transaction so the ledger is consistent
 * with the rest of the mutation. Best-effort: never throw out of here.
 */
export type CommerceEventInput = {
  eventType: CommerceEventType;
  entityType: string;
  entityId: string;
  orderId?: string | null;
  customerId?: string | null;
  actorId?: string | null;
  amount?: number | null;
  currency?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
};

export async function recordCommerceEvent(
  tx: Prisma.TransactionClient,
  input: CommerceEventInput,
): Promise<void> {
  try {
    await tx.commerceEvent.create({
      data: {
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId,
        orderId: input.orderId ?? null,
        customerId: input.customerId ?? null,
        actorId: input.actorId ?? null,
        amount: input.amount != null ? input.amount : null,
        currency: input.currency ?? "KES",
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        occurredAt: input.occurredAt ?? new Date(),
      },
    });
  } catch (err) {
    // Ledger is best-effort within the transaction — log + continue.
    console.error("[recordCommerceEvent] failed:", err);
  }
}

/** Standalone (non-tx) wrapper for callers that aren't in a transaction. */
export async function recordCommerceEventStandalone(input: CommerceEventInput): Promise<void> {
  try {
    await prisma.commerceEvent.create({
      data: {
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId,
        orderId: input.orderId ?? null,
        customerId: input.customerId ?? null,
        actorId: input.actorId ?? null,
        amount: input.amount != null ? input.amount : null,
        currency: input.currency ?? "KES",
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        occurredAt: input.occurredAt ?? new Date(),
      },
    });
  } catch (err) {
    console.error("[recordCommerceEventStandalone] failed:", err);
  }
}

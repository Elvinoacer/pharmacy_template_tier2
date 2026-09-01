import "server-only";

import { prismaUnscoped } from "@/app/lib/db";

function periodKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const MESSAGE_METRICS = ["sms", "whatsapp", "email", "push", "messages"] as const;

export async function recordUsage(
  pharmacyId: string,
  metric: string,
  quantity = 1,
  opts: { eventId: string; billable?: boolean; unit?: string; meta?: Record<string, unknown> },
) {
  const eventId = opts.eventId;
  const existing = await prismaUnscoped.usageRecord.findFirst({
    where: { pharmacyId, eventId },
  });
  if (existing) return existing;
  try {
    return await prismaUnscoped.usageRecord.create({
      data: {
        pharmacyId,
        metric,
        quantity,
        period: periodKey(),
        eventId,
        billable: opts.billable ?? true,
        unit: opts.unit ?? "count",
        meta: (opts.meta ?? {}) as object,
      },
    });
  } catch (err) {
    const again = await prismaUnscoped.usageRecord.findFirst({ where: { pharmacyId, eventId } });
    if (again) return again;
    throw err;
  }
}

/** Non-billable aggregates — no idempotency key, not used for plan limits. */
export async function recordNonBillableUsage(
  pharmacyId: string,
  metric: string,
  quantity = 1,
  meta?: Record<string, unknown>,
) {
  return prismaUnscoped.usageRecord.create({
    data: {
      pharmacyId,
      metric,
      quantity,
      period: periodKey(),
      eventId: null,
      billable: false,
      unit: "count",
      meta: (meta ?? {}) as object,
    },
  });
}

export async function usageTotal(pharmacyId: string, metric: string, period = periodKey()) {
  const agg = await prismaUnscoped.usageRecord.aggregate({
    where: { pharmacyId, metric, period, billable: true },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

/** Shared plan limit `messages` covers every billable messaging channel. */
export async function usageTotalMessages(pharmacyId: string, period = periodKey()) {
  const agg = await prismaUnscoped.usageRecord.aggregate({
    where: {
      pharmacyId,
      period,
      billable: true,
      metric: { in: [...MESSAGE_METRICS] },
    },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

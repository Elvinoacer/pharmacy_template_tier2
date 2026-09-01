import "server-only";

import { prismaUnscoped } from "@/app/lib/db";

function periodKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function recordUsage(
  pharmacyId: string,
  metric: string,
  quantity = 1,
  opts?: { eventId?: string; billable?: boolean; unit?: string; meta?: Record<string, unknown> },
) {
  const eventId = opts?.eventId ?? null;
  if (eventId) {
    const existing = await prismaUnscoped.usageRecord.findFirst({
      where: { pharmacyId, eventId },
    });
    if (existing) return existing;
  }
  try {
    return await prismaUnscoped.usageRecord.create({
      data: {
        pharmacyId,
        metric,
        quantity,
        period: periodKey(),
        eventId,
        billable: opts?.billable ?? true,
        unit: opts?.unit ?? "count",
        meta: (opts?.meta ?? {}) as object,
      },
    });
  } catch (err) {
    if (eventId) {
      const again = await prismaUnscoped.usageRecord.findFirst({ where: { pharmacyId, eventId } });
      if (again) return again;
    }
    throw err;
  }
}

export async function usageTotal(pharmacyId: string, metric: string, period = periodKey()) {
  const agg = await prismaUnscoped.usageRecord.aggregate({
    where: { pharmacyId, metric, period },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

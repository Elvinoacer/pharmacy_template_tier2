import "server-only";

import { prismaUnscoped } from "@/app/lib/db";

function periodKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function recordUsage(pharmacyId: string, metric: string, quantity = 1, meta: Record<string, unknown> = {}) {
  await prismaUnscoped.usageRecord.create({
    data: { pharmacyId, metric, quantity, period: periodKey(), meta: meta as object },
  });
}

export async function usageTotal(pharmacyId: string, metric: string, period = periodKey()) {
  const agg = await prismaUnscoped.usageRecord.aggregate({
    where: { pharmacyId, metric, period },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

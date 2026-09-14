import "server-only";

import { prismaUnscoped as db } from "@/app/lib/db";
import { applyDunning } from "@/app/lib/platform/billing";

export const SUBSCRIPTION_GRACE_DAYS = 14;

export async function processSubscriptionDunningInvoice(invoiceId: string) {
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || !invoice.subscriptionId || invoice.status !== "open") {
    return { ok: false as const, note: "invoice_not_collectible" };
  }
  const dunning = await applyDunning(invoice.id);
  return { ok: true as const, note: dunning ? "updated" : "not_due", dunning };
}

export async function processSubscriptionDunning(limit = 50) {
  const invoices = await db.invoice.findMany({
    where: {
      subscriptionId: { not: null },
      status: "open",
      totalKes: { gt: 0 },
      dueAt: { lte: new Date() },
    },
    orderBy: { dueAt: "asc" },
    take: limit,
  });

  let processed = 0;
  for (const invoice of invoices) {
    const result = await processSubscriptionDunningInvoice(invoice.id);
    if (result.ok) processed++;
  }
  return { scanned: invoices.length, processed };
}

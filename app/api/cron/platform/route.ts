import type { NextRequest } from "next/server";
import { withPlatformBypass } from "@/app/lib/tenant-context";
import { processJobBatch } from "@/app/lib/platform/jobs";
import { processOutboxBatch } from "@/app/lib/platform/outbox";
import { processQueuedDeliveries } from "@/app/lib/platform/notifications";
import { processWebhookDeliveryBatch } from "@/app/lib/platform/webhooks";
import { recoverStaleJobs } from "@/app/lib/platform/jobs";
import { applyDunning, processSubscriptionCycle } from "@/app/lib/platform/billing";
import { prismaUnscoped } from "@/app/lib/db";
import { isCronAuthorized } from "@/app/lib/cron-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await withPlatformBypass(async () => {
    const stale = await recoverStaleJobs();
    const jobs = await processJobBatch(40);
    const outbox = await processOutboxBatch(50);
    const deliveries = await processQueuedDeliveries(null, 40);
    const webhooks = await processWebhookDeliveryBatch(40);
    const billing = await processSubscriptionCycle();

    const overdue = await prismaUnscoped.invoice.findMany({
      where: { status: "open", dueAt: { lt: new Date() } },
      take: 50,
      select: { id: true },
    });
    let dunning = 0;
    for (const inv of overdue) {
      await applyDunning(inv.id);
      dunning++;
    }
    return { stale, jobs, outbox, deliveries, webhooks, billing, dunning };
  });

  return Response.json({ ok: true, ...result });
}

export async function POST(request: NextRequest) {
  return GET(request);
}

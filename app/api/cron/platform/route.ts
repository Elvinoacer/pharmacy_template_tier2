import type { NextRequest } from "next/server";
import { withPlatformBypass } from "@/app/lib/tenant-context";
import { processJobBatch } from "@/app/lib/platform/jobs";
import { processOutboxBatch } from "@/app/lib/platform/outbox";
import { processQueuedDeliveries } from "@/app/lib/platform/notifications";
import { applyDunning } from "@/app/lib/platform/billing";
import { prismaUnscoped } from "@/app/lib/db";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const authHeader = request.headers.get("authorization");
  const querySecret = request.nextUrl.searchParams.get("secret");
  return authHeader === `Bearer ${secret}` || querySecret === secret;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const result = await withPlatformBypass(async () => {
    const jobs = await processJobBatch(40);
    const outbox = await processOutboxBatch(50);
    const deliveries = await processQueuedDeliveries(null, 40);

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
    return { jobs, outbox, deliveries, dunning };
  });

  return Response.json({ ok: true, ...result });
}

export async function POST(request: NextRequest) {
  return GET(request);
}

import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/db";
import { processDueReminders, launchCampaign, interpolateTemplate } from "@/app/lib/services/crm";
import { sendDelivery } from "@/app/lib/services/delivery";
import { writeAuditLog } from "@/app/lib/auth";
import { recordAdminNotification } from "@/app/lib/services/admin-notifications";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Hourly cron — runs three jobs:
 *
 * 1. processDueReminders — fires any reminder whose scheduledFor has passed.
 * 2. processScheduledCampaigns — launches any scheduled campaign whose time has come.
 * 3. processScheduledMessages — sends any message whose scheduledFor has passed.
 *
 * Call via: `curl -H "Authorization: Bearer $CRON_SECRET" https://…/api/cron/reminders`
 * Configure a system cron (Vercel cron, systemd timer, etc.) to hit this every hour.
 */

async function processScheduledCampaigns(): Promise<number> {
  const due = await prisma.campaign.findMany({
    where: { status: "scheduled", scheduledFor: { lte: new Date() } },
    take: 10,
  });
  let launched = 0;
  for (const c of due) {
    try {
      await launchCampaign(c.id, c.createdById ?? "system");
      launched++;
    } catch (err) {
      await recordAdminNotification({
        type: "campaign_failed",
        title: `Scheduled campaign failed to launch`,
        body: `Campaign "${c.name}" could not be launched: ${err instanceof Error ? err.message : "unknown error"}`,
        severity: "critical",
        relatedType: "campaign",
        relatedId: c.id,
      });
    }
  }
  return launched;
}

async function processScheduledMessages(): Promise<number> {
  // Find messages with status=scheduled whose scheduledFor has passed.
  const due = await prisma.message.findMany({
    where: { status: "scheduled", scheduledFor: { lte: new Date() } },
    include: {
      conversation: {
        include: {
          customer: {
            include: {
              user: { select: { id: true, email: true } },
              loyaltyAccount: { select: { points: true, tier: true } },
            },
          },
        },
      },
    },
    take: 25,
  });

  let sent = 0;
  for (const m of due) {
    const customer = m.conversation?.customer;
    if (!customer) {
      await prisma.message.update({
        where: { id: m.id },
        data: { status: "failed", metadata: { error: "Customer not found" } as object },
      });
      continue;
    }
    const vars = {
      name: customer.fullName,
      fullName: customer.fullName,
      email: customer.user.email,
      points: customer.loyaltyAccount?.points ?? 0,
      tier: customer.loyaltyAccount?.tier ?? "bronze",
    };
    const body = interpolateTemplate(m.body, vars);
    const subject = m.subject ? interpolateTemplate(m.subject, vars) : undefined;
    const channel = m.channel as "email" | "sms" | "whatsapp" | "portal";
    const delivery = await sendDelivery({
      channel,
      recipient: { email: customer.user.email, phone: customer.phone },
      subject,
      body,
    });

    await prisma.message.update({
      where: { id: m.id },
      data: {
        status: delivery.status === "delivered" ? "delivered" : delivery.status === "failed" ? "failed" : "sent",
        metadata: {
          provider: delivery.provider,
          providerMessageId: delivery.providerMessageId,
          deliveryError: delivery.error,
        } as object,
      },
    });

    // Update the related notification to "sent".
    if (m.conversationId) {
      await prisma.notification.updateMany({
        where: { relatedType: "conversation", relatedId: m.conversationId, status: "pending" },
        data: { status: delivery.status, sentAt: delivery.status === "sent" || delivery.status === "delivered" ? new Date() : null },
      });
    }

    if (delivery.status === "sent" || delivery.status === "delivered") sent++;
  }
  return sent;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [reminders, campaigns, messages] = await Promise.all([
    processDueReminders(),
    processScheduledCampaigns(),
    processScheduledMessages(),
  ]);

  await writeAuditLog(null, "cron_reminders_processed", "reminder", undefined, {
    reminders,
    campaigns,
    messages,
  });
  return Response.json({ reminders, campaigns, messages });
}

export async function POST(request: NextRequest) {
  return GET(request);
}

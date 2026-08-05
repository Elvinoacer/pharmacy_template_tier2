import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/db";
import { processDueReminders, launchCampaign, interpolateTemplate } from "@/app/lib/services/crm";
import { sendDelivery } from "@/app/lib/services/delivery";
import { writeAuditLog } from "@/app/lib/auth";
import { recordAdminNotification } from "@/app/lib/services/admin-notifications";
import { processAutoMissedDoses } from "@/app/lib/services/medication-schedule";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * 5-minute cron — runs three jobs:
 *
 * 1. processDueReminders — fires any reminder whose scheduledFor has passed.
 * 2. processScheduledCampaigns — launches any scheduled campaign whose time has come.
 * 3. processScheduledMessages — sends any message whose scheduledFor has passed.
 *
 * Call via: `curl -H "Authorization: Bearer $CRON_SECRET" https://…/api/cron/reminders`
 * Configure a system cron (Vercel cron, systemd timer, etc.) to hit this every 5 minutes.
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

/**
 * Proactively alert pharmacists when adherence drops below 70% over the last
 * 14 logged days. Rate-limited to one AdminNotification per prescription per 7 days.
 */
async function processLowAdherenceAlerts(): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - 14);

  const activeRx = await prisma.prescription.findMany({
    where: { status: "active" },
    select: {
      id: true,
      medicineName: true,
      customerId: true,
      customer: { select: { fullName: true } },
      adherence: {
        where: { takenOn: { gte: since } },
        select: { status: true },
      },
    },
    take: 200,
  });

  let alerted = 0;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  for (const rx of activeRx) {
    if (rx.adherence.length < 5) continue; // need enough data
    const ok = rx.adherence.filter((a) => a.status === "taken" || a.status === "late").length;
    const rate = Math.round((ok / rx.adherence.length) * 100);
    if (rate >= 70) continue;

    const existing = await prisma.adminNotification.findFirst({
      where: {
        type: "adherence_low",
        relatedId: rx.id,
        createdAt: { gte: weekAgo },
      },
    });
    if (existing) continue;

    await recordAdminNotification({
      type: "adherence_low",
      title: `Low adherence: ${rx.medicineName}`,
      body: `${rx.customer?.fullName || "Customer"} is at ${rate}% adherence over the last ${rx.adherence.length} logged days for ${rx.medicineName}. Review the prescription detail page.`,
      severity: rate < 50 ? "critical" : "warning",
      relatedType: "prescription",
      relatedId: rx.id,
    });
    alerted += 1;
  }
  return alerted;
}

/**
 * Escalate unconfirmed dose reminders.
 *
 * For each medication_dose reminder that was sent but not answered:
 *   - After 15 minutes with no response → send a follow-up reminder.
 *   - After 30 minutes with no response → mark the dose as "unknown" in the
 *     DoseLog and notify the patient's active caregivers (if any).
 *
 * This closes the loop: reminder → no response → escalate → caregiver sees it.
 */
async function processAdherenceEscalations(): Promise<number> {
  const now = new Date();
  const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);

  // Step 2 escalations: reminders sent >15 min ago, not answered, no follow-up yet.
  const step2Candidates = await prisma.reminder.findMany({
    where: {
      type: "medication_dose",
      status: "sent",
      sentAt: { lte: fifteenMinAgo },
      scheduledFor: { gte: thirtyMinAgo }, // don't escalate ancient reminders
    },
    take: 50,
  });

  let escalated = 0;
  for (const r of step2Candidates) {
    // Check if we already recorded a follow-up_sent escalation.
    const existingFollowUp = await prisma.adherenceEscalation.findFirst({
      where: { reminderId: r.id, action: "follow_up_sent" },
    });
    if (existingFollowUp) continue;

    // Send a follow-up reminder notification (in-app + push).
    await prisma.notification.create({
      data: {
        customerId: r.customerId,
        channel: "in_app",
        type: "reminder",
        title: `Reminder: ${r.title}`,
        body: r.body || "Your medication dose is still pending. Tap to confirm.",
        status: "delivered",
        sentAt: new Date(),
        relatedType: "reminder",
        relatedId: r.id,
      },
    });

    await prisma.adherenceEscalation.create({
      data: {
        prescriptionId: r.relatedId || "00000000-0000-0000-0000-000000000000",
        customerId: r.customerId,
        reminderId: r.id,
        scheduledDate: new Date(r.scheduledFor.toISOString().slice(0, 10) + "T00:00:00Z"),
        scheduledTime: r.scheduledFor.toISOString().slice(11, 16),
        step: 2,
        action: "follow_up_sent",
      },
    });

    escalated += 1;
  }

  // Step 3 escalations: reminders sent >30 min ago, still not answered.
  const step3Candidates = await prisma.reminder.findMany({
    where: {
      type: "medication_dose",
      status: "sent",
      sentAt: { lte: thirtyMinAgo },
      scheduledFor: { gte: thirtyMinAgo },
    },
    take: 50,
  });

  for (const r of step3Candidates) {
    const existingMarked = await prisma.adherenceEscalation.findFirst({
      where: { reminderId: r.id, action: "marked_unknown" },
    });
    if (existingMarked) continue;

    // Mark the corresponding DoseLog as "unknown".
    const scheduledDate = new Date(r.scheduledFor.toISOString().slice(0, 10) + "T00:00:00Z");
    const scheduledTime = r.scheduledFor.toISOString().slice(11, 16);

    // Try to find a DoseLog for this reminder's prescription + date + time.
    if (r.relatedId) {
      const doseLog = await prisma.doseLog.findUnique({
        where: {
          prescriptionId_scheduledDate_scheduledTime: {
            prescriptionId: r.relatedId,
            scheduledDate,
            scheduledTime,
          },
        },
      }).catch(() => null);

      if (doseLog && doseLog.status !== "taken" && doseLog.status !== "late") {
        await prisma.doseLog.update({
          where: { id: doseLog.id },
          data: { status: "unknown", recordedBy: "system" },
        });
      }
    }

    await prisma.reminder.update({
      where: { id: r.id },
      data: { status: "escalated" },
    });

    await prisma.adherenceEscalation.create({
      data: {
        prescriptionId: r.relatedId || "00000000-0000-0000-0000-000000000000",
        customerId: r.customerId,
        reminderId: r.id,
        scheduledDate,
        scheduledTime,
        step: 3,
        action: "marked_unknown",
      },
    });

    // Notify the patient's active caregivers (those with canLogAdherence or canReceivePickupNotifications).
    const caregivers = await prisma.caregiver.findMany({
      where: {
        customerId: r.customerId,
        status: "active",
        OR: [{ canLogAdherence: true }, { canReceivePickupNotifications: true }],
      },
      include: { caregiverUser: { select: { id: true } } },
    });

    for (const cg of caregivers) {
      if (cg.caregiverUser) {
        await prisma.notification.create({
          data: {
            userId: cg.caregiverUser.id,
            channel: "in_app",
            type: "reminder",
            title: `Missed dose: ${r.title}`,
            body: `${r.customerId ? "" : ""}A scheduled dose was not confirmed in time. Please check on the patient.`,
            status: "delivered",
            sentAt: new Date(),
            relatedType: "reminder",
            relatedId: r.id,
          },
        });
      }
    }

    await prisma.adherenceEscalation.create({
      data: {
        prescriptionId: r.relatedId || "00000000-0000-0000-0000-000000000000",
        customerId: r.customerId,
        reminderId: r.id,
        scheduledDate,
        scheduledTime,
        step: 3,
        action: "caregiver_notified",
      },
    });

    escalated += 1;
  }

  return escalated;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [reminders, campaigns, messages, adherenceAlerts, escalations, autoMissed] = await Promise.all([
    processDueReminders(),
    processScheduledCampaigns(),
    processScheduledMessages(),
    processLowAdherenceAlerts(),
    processAdherenceEscalations(),
    processAutoMissedDoses(),
  ]);

  await writeAuditLog(null, "cron_reminders_processed", "reminder", undefined, {
    reminders,
    campaigns,
    messages,
    adherenceAlerts,
    escalations,
    autoMissed,
  });
  return Response.json({ reminders, campaigns, messages, adherenceAlerts, escalations, autoMissed });
}

export async function POST(request: NextRequest) {
  return GET(request);
}

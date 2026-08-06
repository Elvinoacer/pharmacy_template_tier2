import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/db";
import { processDueReminders, launchCampaign, interpolateTemplate } from "@/app/lib/services/crm";
import { sendDelivery } from "@/app/lib/services/delivery";
import { writeAuditLog } from "@/app/lib/auth";
import { recordAdminNotification } from "@/app/lib/services/admin-notifications";
import {
  processAutoMissedDoses,
  createDailyDoseReminders,
} from "@/app/lib/services/medication-schedule";
import { formatTime, toLocalDateInputValue } from "@/app/lib/time";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const authHeader = request.headers.get("authorization");
  const querySecret = request.nextUrl.searchParams.get("secret");
  return authHeader === `Bearer ${secret}` || querySecret === secret;
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
 * Resolve intended slot HH:mm from a dose reminder (title survives snooze).
 */
function doseSlotFromReminder(r: { title: string; scheduledFor: Date }): {
  scheduledDate: Date;
  scheduledTime: string;
} {
  const fromTitle = r.title.match(/\bDose\s+(\d{2}:\d{2})\b/i);
  const scheduledTime = fromTitle?.[1] ?? formatTime(r.scheduledFor);

  // Use local calendar day of the original send intent. For heavily snoozed
  // reminders scheduledFor may have rolled; prefer sentAt/created day via
  // scheduledFor still — createDaily uses local day of the slot.
  const dateStr = toLocalDateInputValue(r.scheduledFor);

  return {
    scheduledDate: new Date(dateStr + "T00:00:00Z"),
    scheduledTime,
  };
}

async function doseResolvedForReminder(r: {
  relatedId: string | null;
  title: string;
  scheduledFor: Date;
}): Promise<boolean> {
  if (!r.relatedId) return false;
  const { scheduledDate, scheduledTime } = doseSlotFromReminder(r);
  const log = await prisma.doseLog
    .findUnique({
      where: {
        prescriptionId_scheduledDate_scheduledTime: {
          prescriptionId: r.relatedId,
          scheduledDate,
          scheduledTime,
        },
      },
      select: { status: true },
    })
    .catch(() => null);
  return Boolean(
    log &&
      (log.status === "taken" ||
        log.status === "late" ||
        log.status === "skipped" ||
        log.status === "missed"),
  );
}

/**
 * Escalate unconfirmed dose reminders — status-aware, once per step.
 *
 * For each medication_dose reminder that was sent but not answered:
 *   - Skip entirely if the dose was already logged (taken/late/skipped/missed).
 *   - After 15 minutes with no response → one follow-up notification.
 *   - After 45 minutes with no response → mark escalated + notify caregivers.
 *     (Grace window widened so patients aren't hammered; auto-miss cron
 *     still handles the dose log at T+30.)
 *
 * Lifecycle: due → sent → (optional follow-up) → answered | escalated.
 * Never re-notifies after the dose is resolved.
 */
async function processAdherenceEscalations(): Promise<number> {
  const now = new Date();
  const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const fortyFiveMinAgo = new Date(now.getTime() - 45 * 60 * 1000);
  // Only consider reminders whose original intent is still "today-ish"
  // (avoid escalating yesterday's leftover sent rows forever).
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

  const openSent = await prisma.reminder.findMany({
    where: {
      type: "medication_dose",
      status: "sent",
      sentAt: { gte: sixHoursAgo, lte: fifteenMinAgo },
    },
    take: 50,
  });

  let escalated = 0;

  for (const r of openSent) {
    // Already confirmed in the portal / push action → settle, no more noise.
    if (await doseResolvedForReminder(r)) {
      await prisma.reminder.update({
        where: { id: r.id },
        data: { status: "answered" },
      });
      continue;
    }

    const sentAt = r.sentAt ?? r.scheduledFor;
    const { scheduledDate, scheduledTime } = doseSlotFromReminder(r);
    const prescriptionId = r.relatedId || "00000000-0000-0000-0000-000000000000";

    // Step 2: single follow-up after 15 min.
    if (sentAt <= fifteenMinAgo) {
      const existingFollowUp = await prisma.adherenceEscalation.findFirst({
        where: { reminderId: r.id, action: "follow_up_sent" },
      });
      if (!existingFollowUp) {
        await prisma.notification.create({
          data: {
            customerId: r.customerId,
            channel: "in_app",
            type: "reminder",
            title: `Still pending: ${r.title}`,
            body:
              r.body ||
              "Your medication dose is still pending. Confirm Taken, Late, or Skip in Prescriptions.",
            status: "delivered",
            sentAt: new Date(),
            relatedType: "reminder",
            relatedId: r.id,
          },
        });

        await prisma.adherenceEscalation.create({
          data: {
            prescriptionId,
            customerId: r.customerId,
            reminderId: r.id,
            scheduledDate,
            scheduledTime,
            step: 2,
            action: "follow_up_sent",
          },
        });
        escalated += 1;
      }
    }

    // Step 3: after 45 min still open → escalate once, notify caregivers.
    if (sentAt <= fortyFiveMinAgo) {
      const existingMarked = await prisma.adherenceEscalation.findFirst({
        where: { reminderId: r.id, action: "marked_unknown" },
      });
      if (existingMarked) continue;

      // Leave dose log alone if auto-miss already wrote missed; only stamp unknown
      // when nothing definitive exists yet.
      if (r.relatedId) {
        const doseLog = await prisma.doseLog
          .findUnique({
            where: {
              prescriptionId_scheduledDate_scheduledTime: {
                prescriptionId: r.relatedId,
                scheduledDate,
                scheduledTime,
              },
            },
          })
          .catch(() => null);

        if (!doseLog) {
          await prisma.doseLog.create({
            data: {
              prescriptionId: r.relatedId,
              customerId: r.customerId,
              scheduledDate,
              scheduledTime,
              status: "unknown",
              recordedBy: "system",
              notes: "Unconfirmed after reminder escalation",
            },
          }).catch(() => null);
        } else if (doseLog.status === "unknown" || !doseLog.status) {
          // leave as-is
        } else if (
          doseLog.status !== "taken" &&
          doseLog.status !== "late" &&
          doseLog.status !== "skipped" &&
          doseLog.status !== "missed"
        ) {
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
          prescriptionId,
          customerId: r.customerId,
          reminderId: r.id,
          scheduledDate,
          scheduledTime,
          step: 3,
          action: "marked_unknown",
        },
      });

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
              title: `Unconfirmed dose: ${r.title}`,
              body: "A scheduled dose was not confirmed in time. Please check on the patient.",
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
          prescriptionId,
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
  }

  return escalated;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Dose reminders must exist *before* processDueReminders fires them.
  // Sequential: generate today's slots → fire due → escalate unanswered → auto-miss.
  const doseRemindersCreated = await createDailyDoseReminders();
  const [reminders, campaigns, messages, adherenceAlerts, escalations, autoMissed] = await Promise.all([
    processDueReminders(),
    processScheduledCampaigns(),
    processScheduledMessages(),
    processLowAdherenceAlerts(),
    processAdherenceEscalations(),
    processAutoMissedDoses(),
  ]);

  await writeAuditLog(null, "cron_reminders_processed", "reminder", undefined, {
    doseRemindersCreated,
    reminders,
    campaigns,
    messages,
    adherenceAlerts,
    escalations,
    autoMissed,
  });
  return Response.json({
    doseRemindersCreated,
    reminders,
    campaigns,
    messages,
    adherenceAlerts,
    escalations,
    autoMissed,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}

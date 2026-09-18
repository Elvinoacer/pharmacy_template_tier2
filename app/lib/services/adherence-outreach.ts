import "server-only";

import { prisma } from "@/app/lib/db";
import { addTimelineEvent } from "@/app/lib/auth";
import { computeRefillScheduleMetrics } from "@/app/lib/services/refills";
import { getAdherenceStatsForCustomer } from "@/app/lib/services/adherence";
import { formatDate } from "@/app/lib/time";
import { sendDelivery } from "@/app/lib/services/delivery";

export type FollowUpCallReason =
  | "low_adherence"
  | "missed_dose"
  | "refill_lapse"
  | "med_sync"
  | "side_effects"
  | "routine_checkin";

export type FollowUpCallOutcome =
  | "reached_patient"
  | "reached_caregiver"
  | "voicemail"
  | "busy_no_answer"
  | "wrong_number"
  | "refused";

export type AdherenceBarrier =
  | "side_effects"
  | "cost"
  | "regimen_complexity"
  | "forgetfulness"
  | "feeling_better"
  | "transport"
  | "none"
  | "other";

export type ClinicalAction =
  | "education"
  | "adjusted_schedule"
  | "enrolled_sync"
  | "prescriber_consult"
  | "generic_substitution"
  | "scheduled_followup"
  | "none";

export type PendingOutreachItem = {
  customerId: string;
  customerName: string;
  phone: string | null;
  email: string | null;
  preferredCommunication: string;
  adherenceRate: number; // 0-100
  streakDays: number;
  reason: FollowUpCallReason;
  urgency: "critical" | "high" | "medium" | "low";
  reasonDescription: string;
  prescriptionId?: string;
  medicineName?: string;
  lastFilledAt?: Date | null;
  nextRefillDue?: Date | null;
  gapDays?: number;
  lastCallDate?: Date | null;
  scheduledFollowUpDate?: Date | null;
  caregivers: Array<{ id: string; name: string; phone: string | null; email: string | null }>;
};

/**
 * Returns prioritized queue of patients requiring pharmacist clinical outreach & follow-up calls.
 */
export async function getPendingFollowUpOutreach(opts?: {
  reason?: string;
  urgency?: string;
  query?: string;
}): Promise<PendingOutreachItem[]> {
  const q = opts?.query?.trim() || "";
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);

  // Fetch active customers with active prescriptions
  const customers = await prisma.customerProfile.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { user: { email: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
      prescriptions: {
        some: { status: "active" },
      },
    },
    include: {
      user: { select: { email: true } },
      caregivers: {
        where: { status: "active" },
        select: { id: true, caregiverName: true, caregiverPhone: true, caregiverEmail: true },
      },
      prescriptions: {
        where: { status: "active" },
        include: {
          doseLogs: {
            where: { scheduledDate: { gte: fourteenDaysAgo } },
            select: { status: true, scheduledDate: true },
          },
          adherence: {
            where: { takenOn: { gte: fourteenDaysAgo } },
            select: { status: true, takenOn: true },
          },
        },
      },
      adherenceFollowUps: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    take: 100,
  });

  const outreachQueue: PendingOutreachItem[] = [];

  for (const c of customers) {
    const stats = await getAdherenceStatsForCustomer(c.id, 14);
    const lastFollowUp = c.adherenceFollowUps[0] || null;
    const lastCallDate = lastFollowUp?.createdAt || null;
    const scheduledFollowUpDate = lastFollowUp?.nextFollowUpDate || null;

    // Check 1: Scheduled future follow-up is due today or past
    if (scheduledFollowUpDate && scheduledFollowUpDate <= now) {
      outreachQueue.push({
        customerId: c.id,
        customerName: c.fullName,
        phone: c.phone,
        email: c.user.email,
        preferredCommunication: c.preferredCommunication,
        adherenceRate: stats.adherenceRate,
        streakDays: stats.currentStreakDays,
        reason: "routine_checkin",
        urgency: "medium",
        reasonDescription: `Scheduled follow-up due (${formatDate(scheduledFollowUpDate)})`,
        lastCallDate,
        scheduledFollowUpDate,
        caregivers: c.caregivers.map((cg) => ({
          id: cg.id,
          name: cg.caregiverName,
          phone: cg.caregiverPhone,
          email: cg.caregiverEmail,
        })),
      });
      continue;
    }

    // Check 2: Low adherence (<70% over last 14 days)
    if (stats.totalLogged >= 4 && stats.adherenceRate < 70) {
      outreachQueue.push({
        customerId: c.id,
        customerName: c.fullName,
        phone: c.phone,
        email: c.user.email,
        preferredCommunication: c.preferredCommunication,
        adherenceRate: stats.adherenceRate,
        streakDays: stats.currentStreakDays,
        reason: "low_adherence",
        urgency: stats.adherenceRate < 50 ? "critical" : "high",
        reasonDescription: `Adherence dropped to ${stats.adherenceRate}% (${stats.missedCount} missed doses in last 14d)`,
        lastCallDate,
        scheduledFollowUpDate,
        caregivers: c.caregivers.map((cg) => ({
          id: cg.id,
          name: cg.caregiverName,
          phone: cg.caregiverPhone,
          email: cg.caregiverEmail,
        })),
      });
      continue;
    }

    // Check 3: Prescriptions with severe refill lapse (>7 days past due)
    for (const rx of c.prescriptions) {
      const metrics = computeRefillScheduleMetrics(rx);
      const gapDays = Math.max(0, -metrics.daysRemaining);

      if (gapDays >= 7) {
        outreachQueue.push({
          customerId: c.id,
          customerName: c.fullName,
          phone: c.phone,
          email: c.user.email,
          preferredCommunication: c.preferredCommunication,
          adherenceRate: stats.adherenceRate,
          streakDays: stats.currentStreakDays,
          reason: "refill_lapse",
          urgency: gapDays >= 14 ? "critical" : "high",
          reasonDescription: `${rx.medicineName} is ${gapDays} days past due for refill`,
          prescriptionId: rx.id,
          medicineName: rx.medicineName,
          lastFilledAt: rx.lastFilledAt,
          nextRefillDue: rx.nextRefillDue,
          gapDays,
          lastCallDate,
          scheduledFollowUpDate,
          caregivers: c.caregivers.map((cg) => ({
            id: cg.id,
            name: cg.caregiverName,
            phone: cg.caregiverPhone,
            email: cg.caregiverEmail,
          })),
        });
        break;
      }
    }
  }

  // Priority sorting: critical > high > medium > low
  const urgencyWeight: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  return outreachQueue.sort((a, b) => urgencyWeight[b.urgency] - urgencyWeight[a.urgency]);
}

/**
 * Logs a completed pharmacist follow-up call with clinical notes and next action.
 */
export async function logFollowUpCall(input: {
  customerId: string;
  prescriptionId?: string;
  reason: FollowUpCallReason;
  callOutcome: FollowUpCallOutcome;
  barrierIdentified?: AdherenceBarrier;
  clinicalAction: ClinicalAction;
  notes?: string;
  nextFollowUpDate?: Date | null;
  sendSummaryNotification?: boolean;
  staffId: string;
}) {
  const customer = await prisma.customerProfile.findUnique({
    where: { id: input.customerId },
    include: {
      user: { select: { email: true } },
      preferences: true,
    },
  });
  if (!customer) throw new Error("Customer not found.");

  let rx = null;
  if (input.prescriptionId) {
    rx = await prisma.prescription.findUnique({ where: { id: input.prescriptionId } });
  }

  // 1. Create AdherenceFollowUp row
  const followUp = await prisma.adherenceFollowUp.create({
    data: {
      customerId: input.customerId,
      prescriptionId: input.prescriptionId || null,
      reason: input.reason,
      callOutcome: input.callOutcome,
      barrierIdentified: input.barrierIdentified || null,
      clinicalAction: input.clinicalAction,
      notes: input.notes || null,
      nextFollowUpDate: input.nextFollowUpDate || null,
      staffId: input.staffId,
    },
  });

  // 2. Add customer timeline event
  const outcomeLabels: Record<FollowUpCallOutcome, string> = {
    reached_patient: "Reached Patient",
    reached_caregiver: "Reached Caregiver",
    voicemail: "Left Voicemail",
    busy_no_answer: "Busy / No Answer",
    wrong_number: "Wrong Number",
    refused: "Declined Call",
  };

  const actionLabels: Record<ClinicalAction, string> = {
    education: "Provided medication & adherence education",
    adjusted_schedule: "Adjusted reminder / dosage schedule",
    enrolled_sync: "Enrolled in Refill Synchronization",
    prescriber_consult: "Prescriber consultation initiated",
    generic_substitution: "Generic/Affordable substitution arranged",
    scheduled_followup: "Follow-up scheduled",
    none: "Logged consultation",
  };

  await addTimelineEvent(
    input.customerId,
    input.staffId,
    "clinical_followup_call",
    `Clinical Follow-up: ${outcomeLabels[input.callOutcome] || input.callOutcome}`,
    `Reason: ${input.reason}. Action: ${actionLabels[input.clinicalAction] || input.clinicalAction}. Notes: ${input.notes || "None"}`,
    {
      followUpId: followUp.id,
      prescriptionId: input.prescriptionId,
      reason: input.reason,
      outcome: input.callOutcome,
      barrier: input.barrierIdentified,
      action: input.clinicalAction,
      nextFollowUpDate: input.nextFollowUpDate?.toISOString(),
    },
    input.staffId,
  );

  // 3. Optionally send summary message to patient / caregiver
  if (input.sendSummaryNotification && input.callOutcome.startsWith("reached")) {
    const medText = rx ? ` regarding your ${rx.medicineName}` : "";
    const subject = "Care Follow-up from Afyvia Pharmacy";
    const body = `Hello ${customer.fullName}, thank you for speaking with our pharmacy team${medText}. We are here to support your health journey. If you ever have questions or need a refill, reply here or access your portal at https://afyviapharmacy.com/portal.`;

    await sendDelivery({
      channel: customer.preferredCommunication === "whatsapp" ? "whatsapp" : "email",
      purpose: "reminder",
      recipient: {
        email: customer.user.email,
        phone: customer.phone,
        preferences: customer.preferences,
      },
      subject,
      body,
    }).catch(() => {});
  }

  return followUp;
}

/**
 * Retrieves follow-up call history with filters.
 */
export async function getFollowUpHistory(opts?: { customerId?: string; limit?: number }) {
  const rows = await prisma.adherenceFollowUp.findMany({
    where: {
      ...(opts?.customerId ? { customerId: opts.customerId } : {}),
    },
    include: {
      customer: { select: { fullName: true, phone: true } },
      prescription: { select: { medicineName: true } },
      staff: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: opts?.limit || 50,
  });

  return rows.map((r) => ({
    id: r.id,
    customerId: r.customerId,
    customerName: r.customer.fullName,
    customerPhone: r.customer.phone,
    medicineName: r.prescription?.medicineName || null,
    reason: r.reason,
    callOutcome: r.callOutcome,
    barrierIdentified: r.barrierIdentified,
    clinicalAction: r.clinicalAction,
    notes: r.notes,
    nextFollowUpDate: r.nextFollowUpDate,
    staffEmail: r.staff?.email || "Staff",
    createdAt: r.createdAt,
  }));
}

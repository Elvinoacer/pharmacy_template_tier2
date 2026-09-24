import { notifyCareRequest } from "./care-request-notifications";
import "server-only";

import { prisma } from "@/app/lib/db";
import type { RefillStatus, Prisma } from "@/app/generated/prisma/client";
import { addTimelineEvent, writeAuditLog } from "@/app/lib/auth";
import { sendDelivery } from "@/app/lib/services/delivery";
import { dispatchPushToUser, dispatchPushToStaff } from "@/app/lib/services/push";
import { recordAdminNotification } from "@/app/lib/services/admin-notifications";
import { screenClinicalSafety } from "@/app/lib/services/clinical-safety";
import { parseDosageFormula, calculatePrescriptionMetrics } from "@/app/lib/services/medication-schedule";
import { formatDate, formatDateTime, toLocalDateInputValue } from "@/app/lib/time";
import { createPrescriptionFill } from "@/app/lib/services/commerce/prescription-fills";

export type RefillScheduleStatus =
  | "healthy"
  | "due_soon"
  | "due_today"
  | "overdue"
  | "severely_lapsed"
  | "exhausted"
  | "discontinued";

export type RefillScheduleItem = {
  prescriptionId: string;
  customerId: string;
  customerName: string;
  phone: string | null;
  email: string | null;
  medicineName: string;
  dosage: string | null;
  schedule: string | null;
  rxReference: string | null;
  prescriber: string | null;
  prescriberPhone: string | null;
  prescriberEmail: string | null;
  prescriberFacility: string | null;
  prescriberLicense: string | null;
  prescriberVerified: boolean;
  quantity: number;
  daysSupply: number;
  refillsRemaining: number;
  unitPrice: number;
  lastFilledAt: Date | null;
  nextRefillDue: Date | null;
  effectiveDaysSupply: number;
  daysRemaining: number;
  projectedRunOutDate: Date | null;
  scheduleStatus: RefillScheduleStatus;
  statusLabel: string;
  adherenceRate: number;
  hasOpenRefillRequest: boolean;
  openRefillRequestId?: string | null;
  openRefillStatus?: string | null;
  medicationId: string | null;
  currentStock: number | null;
  isOutOfStock: boolean;
  caregiversCount: number;
};

export type MissingRefillPatientItem = {
  prescriptionId: string;
  customerId: string;
  customerName: string;
  phone: string | null;
  email: string | null;
  medicineName: string;
  dosage: string | null;
  rxReference: string | null;
  prescriber: string | null;
  prescriberPhone: string | null;
  daysSupply: number;
  refillsRemaining: number;
  lastFilledAt: Date | null;
  nextRefillDue: Date | null;
  gapDays: number; // Days past due
  riskLevel: "severe" | "moderate" | "mild";
  adherenceRate: number;
  caregivers: Array<{ id: string; name: string; phone: string | null; email: string | null }>;
  lastReminderSentAt: Date | null;
  hasOpenRefill: boolean;
};

/**
 * Computes live refill schedule metrics for a prescription.
 */
export function computeRefillScheduleMetrics(rx: {
  id: string;
  customerId: string;
  medicineName: string;
  dosage?: string | null;
  schedule?: string | null;
  quantity?: number | null;
  daysSupply?: number | null;
  refillsRemaining?: number | null;
  startDate?: Date | null;
  createdAt: Date;
  lastFilledAt?: Date | null;
  nextRefillDue?: Date | null;
  unitPrice?: Prisma.Decimal | number | null;
  status: string;
}): {
  effectiveDaysSupply: number;
  daysRemaining: number;
  projectedDueDate: Date;
  projectedRunOutDate: Date;
  scheduleStatus: RefillScheduleStatus;
  statusLabel: string;
} {
  const formula = parseDosageFormula(rx.dosage, rx.schedule);
  const unitsPerDose = Number.isFinite(formula.unitsPerDose) && formula.unitsPerDose > 0 ? formula.unitsPerDose : 1;
  const dosesPerDay = Number.isFinite(formula.dosesPerDay) && formula.dosesPerDay > 0 ? formula.dosesPerDay : 1;
  const dailyUnits = Math.max(1, unitsPerDose * dosesPerDay);

  const totalQuantity = rx.quantity && Number.isFinite(rx.quantity) && rx.quantity > 0 ? rx.quantity : 30;
  const calculatedDays = Math.max(1, Math.floor(totalQuantity / dailyUnits));
  const effectiveDaysSupply =
    rx.daysSupply && Number.isFinite(rx.daysSupply) && rx.daysSupply > 0
      ? rx.daysSupply
      : calculatedDays;

  const now = new Date();
  const todayMs = new Date(toLocalDateInputValue(now) + "T00:00:00Z").getTime();

  // Safely determine base date
  const rawBase = rx.lastFilledAt || rx.startDate || rx.createdAt;
  const baseTime = rawBase ? new Date(rawBase).getTime() : Date.now();
  const validBaseMs = Number.isFinite(baseTime) ? baseTime : Date.now();

  let projectedDueDate: Date;
  if (rx.nextRefillDue && !isNaN(new Date(rx.nextRefillDue).getTime())) {
    projectedDueDate = new Date(rx.nextRefillDue);
  } else {
    projectedDueDate = new Date(validBaseMs + effectiveDaysSupply * 86400000);
  }

  const dueTime = projectedDueDate.getTime();
  const validDueMs = Number.isFinite(dueTime) ? dueTime : Date.now();
  const projectedDueClean = new Date(validDueMs);

  const dueLocalDateStr = toLocalDateInputValue(projectedDueClean) || toLocalDateInputValue(now);
  const dueMs = new Date(dueLocalDateStr + "T00:00:00Z").getTime();
  const diffDays = Math.round((dueMs - todayMs) / 86400000);
  const daysRemaining = Number.isFinite(diffDays) ? diffDays : 0;
  const projectedRunOutDate = projectedDueClean;

  const refillsLeft = Number.isFinite(rx.refillsRemaining) ? (rx.refillsRemaining ?? 0) : 0;

  let scheduleStatus: RefillScheduleStatus = "healthy";
  let statusLabel = "On Track";

  if (rx.status === "discontinued" || rx.status === "expired") {
    scheduleStatus = "discontinued";
    statusLabel = rx.status === "expired" ? "Prescription Expired" : "Discontinued";
  } else if (refillsLeft <= 0) {
    scheduleStatus = "exhausted";
    statusLabel = "0 Refills (Renewal Needed)";
  } else if (daysRemaining <= -14) {
    scheduleStatus = "severely_lapsed";
    statusLabel = `Lapsed (${Math.abs(daysRemaining)}d Overdue)`;
  } else if (daysRemaining < 0) {
    scheduleStatus = "overdue";
    statusLabel = `Overdue (${Math.abs(daysRemaining)}d)`;
  } else if (daysRemaining === 0) {
    scheduleStatus = "due_today";
    statusLabel = "Due Today";
  } else if (daysRemaining <= 7) {
    scheduleStatus = "due_soon";
    statusLabel = `Due in ${daysRemaining}d`;
  } else {
    scheduleStatus = "healthy";
    statusLabel = `${daysRemaining}d Supply Remaining`;
  }

  return {
    effectiveDaysSupply,
    daysRemaining,
    projectedDueDate: projectedDueClean,
    projectedRunOutDate,
    scheduleStatus,
    statusLabel,
  };
}

/**
 * Aggregates high-level metrics for the Refills control center.
 */
export async function getRefillDashboardSummary() {
  const now = new Date();
  const todayStr = toLocalDateInputValue(now);
  const todayStart = new Date(todayStr + "T00:00:00Z");
  const in7Days = new Date(todayStart.getTime() + 7 * 86400000);
  const fourteenDaysAgo = new Date(todayStart.getTime() - 14 * 86400000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const [
    activeRequestsCount,
    submittedCount,
    underReviewCount,
    approvedCount,
    preparingCount,
    readyForPickupCount,
    totalPrescriptionsOnRefill,
    dueInNext7DaysCount,
    overdueRefillsCount,
    severelyLapsedCount,
    completed30dCount,
    unpaidOrdersCount,
  ] = await Promise.all([
    // Active requests
    prisma.refillRequest.count({
      where: { status: { in: ["submitted", "under_review", "approved", "preparing", "ready_for_pickup"] } },
    }),
    prisma.refillRequest.count({ where: { status: "submitted" } }),
    prisma.refillRequest.count({ where: { status: "under_review" } }),
    prisma.refillRequest.count({ where: { status: "approved" } }),
    prisma.refillRequest.count({ where: { status: "preparing" } }),
    prisma.refillRequest.count({ where: { status: "ready_for_pickup" } }),

    // Total active prescriptions with refills
    prisma.prescription.count({
      where: { status: "active" },
    }),

    // Due in next 7 days (including today)
    prisma.prescription.count({
      where: {
        status: "active",
        refillsRemaining: { gt: 0 },
        nextRefillDue: { gte: todayStart, lte: in7Days },
      },
    }),

    // Overdue refills (< today but >= 14 days ago)
    prisma.prescription.count({
      where: {
        status: "active",
        refillsRemaining: { gt: 0 },
        nextRefillDue: { lt: todayStart, gte: fourteenDaysAgo },
      },
    }),

    // Severely lapsed (>14 days past due)
    prisma.prescription.count({
      where: {
        status: "active",
        nextRefillDue: { lt: fourteenDaysAgo },
      },
    }),

    // Completed / collected in last 30 days
    prisma.refillRequest.count({
      where: {
        status: "collected",
        statusUpdatedAt: { gte: thirtyDaysAgo },
      },
    }),

    // Unpaid refill orders
    prisma.order.count({
      where: {
        source: "refill",
        status: { in: ["pending", "active"] },
        amountDue: { gt: 0 },
      },
    }),
  ]);

  return {
    activeRequestsCount,
    submittedCount,
    underReviewCount,
    approvedCount,
    preparingCount,
    readyForPickupCount,
    totalPrescriptionsOnRefill,
    dueInNext7DaysCount,
    overdueRefillsCount,
    severelyLapsedCount,
    completed30dCount,
    unpaidOrdersCount,
  };
}

/**
 * Loads all patient refill schedules with calculated forward runout dates and status.
 */
export async function getRefillSchedules(opts?: {
  filter?: "all" | "due_soon" | "due_today" | "overdue" | "severely_lapsed" | "exhausted";
  query?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  total: number;
  items: RefillScheduleItem[];
  page: number;
  pageSize: number;
}> {
  const page = opts?.page && opts.page > 0 ? opts.page : 1;
  const pageSize = opts?.pageSize || 25;
  const filter = opts?.filter || "all";
  const q = opts?.query?.trim() || "";

  const where: Prisma.PrescriptionWhereInput = {
    status: "active",
    ...(q
      ? {
          OR: [
            { medicineName: { contains: q, mode: "insensitive" } },
            { rxReference: { contains: q, mode: "insensitive" } },
            { prescriber: { contains: q, mode: "insensitive" } },
            { customer: { fullName: { contains: q, mode: "insensitive" } } },
            { customer: { phone: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const prescriptions = await prisma.prescription.findMany({
    where,
    include: {
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          user: { select: { email: true } },
          caregivers: { select: { id: true } },
        },
      },
      medication: {
        select: {
          id: true,
          currentStock: true,
          price: true,
        },
      },
      refillRequests: {
        where: { status: { notIn: ["collected", "cancelled"] } },
        select: { id: true, status: true },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      doseLogs: {
        select: { scheduledDate: true, scheduledTime: true, status: true },
        take: 30,
      },
      adherence: {
        select: { takenOn: true, status: true },
        take: 30,
      },
    },
    orderBy: [{ nextRefillDue: "asc" }, { createdAt: "desc" }],
    take: 500, // Fetch pool to sort & paginate after computing dynamic status
  });

  const allItems: RefillScheduleItem[] = prescriptions.map((rx) => {
    const metrics = computeRefillScheduleMetrics(rx);
    const adherenceCalc = calculatePrescriptionMetrics(
      {
        startDate: rx.startDate,
        createdAt: rx.createdAt,
        dosage: rx.dosage,
        schedule: rx.schedule,
        quantity: rx.quantity,
      },
      rx.doseLogs.length > 0
        ? rx.doseLogs
        : rx.adherence.map((a) => ({
            scheduledDate: a.takenOn,
            scheduledTime: null,
            status: a.status,
          })),
    );

    const openRequest = rx.refillRequests[0] || null;
    const stock = rx.medication?.currentStock ?? null;
    const isOutOfStock = stock !== null && stock < (rx.quantity || 1);

    return {
      prescriptionId: rx.id,
      customerId: rx.customerId,
      customerName: rx.customer?.fullName || "Unassigned",
      phone: rx.customer?.phone || null,
      email: rx.customer?.user?.email || null,
      medicineName: rx.medicineName,
      dosage: rx.dosage,
      schedule: rx.schedule,
      rxReference: rx.rxReference,
      prescriber: rx.prescriber,
      prescriberPhone: rx.prescriberPhone,
      prescriberEmail: rx.prescriberEmail,
      prescriberFacility: rx.prescriberFacility,
      prescriberLicense: rx.prescriberLicense,
      prescriberVerified: rx.prescriberVerified,
      quantity: rx.quantity && Number.isFinite(rx.quantity) && rx.quantity > 0 ? rx.quantity : 1,
      daysSupply: Number.isFinite(metrics.effectiveDaysSupply) ? metrics.effectiveDaysSupply : 30,
      refillsRemaining: Number.isFinite(rx.refillsRemaining) ? (rx.refillsRemaining ?? 0) : 0,
      unitPrice: Number.isFinite(Number(rx.unitPrice ?? rx.medication?.price ?? 0))
        ? Number(rx.unitPrice ?? rx.medication?.price ?? 0)
        : 0,
      lastFilledAt: rx.lastFilledAt,
      nextRefillDue: rx.nextRefillDue || metrics.projectedDueDate,
      effectiveDaysSupply: Number.isFinite(metrics.effectiveDaysSupply) ? metrics.effectiveDaysSupply : 30,
      daysRemaining: Number.isFinite(metrics.daysRemaining) ? metrics.daysRemaining : 0,
      projectedRunOutDate: metrics.projectedRunOutDate,
      scheduleStatus: metrics.scheduleStatus,
      statusLabel: metrics.statusLabel,
      adherenceRate: Number.isFinite(adherenceCalc.adherenceRate) ? adherenceCalc.adherenceRate : 100,
      hasOpenRefillRequest: Boolean(openRequest),
      openRefillRequestId: openRequest?.id ?? null,
      openRefillStatus: openRequest?.status ?? null,
      medicationId: rx.medicationId,
      currentStock: stock !== null && Number.isFinite(stock) ? stock : null,
      isOutOfStock,
      caregiversCount: rx.customer?.caregivers?.length ?? 0,
    };
  });

  // Apply status filter in memory
  const filtered = allItems.filter((item) => {
    if (filter === "all") return true;
    if (filter === "due_soon") return item.scheduleStatus === "due_soon" || item.scheduleStatus === "due_today";
    if (filter === "due_today") return item.scheduleStatus === "due_today";
    if (filter === "overdue") return item.scheduleStatus === "overdue" || item.scheduleStatus === "severely_lapsed";
    if (filter === "severely_lapsed") return item.scheduleStatus === "severely_lapsed";
    if (filter === "exhausted") return item.scheduleStatus === "exhausted";
    return true;
  });

  const total = filtered.length;
  const startIdx = (page - 1) * pageSize;
  const pagedItems = filtered.slice(startIdx, startIdx + pageSize);

  return {
    total,
    items: pagedItems,
    page,
    pageSize,
  };
}

/**
 * Identifies patients repeatedly missing refills or having large gaps in therapy.
 */
export async function getMissingRefillsPatients(opts?: {
  minGapDays?: number;
  query?: string;
}): Promise<MissingRefillPatientItem[]> {
  const minGap = opts?.minGapDays ?? 7;
  const q = opts?.query?.trim() || "";

  const prescriptions = await prisma.prescription.findMany({
    where: {
      status: "active",
      ...(q
        ? {
            OR: [
              { medicineName: { contains: q, mode: "insensitive" } },
              { customer: { fullName: { contains: q, mode: "insensitive" } } },
              { customer: { phone: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      customer: {
        include: {
          user: { select: { email: true } },
          caregivers: {
            where: { status: "active" },
            select: {
              id: true,
              caregiverName: true,
              caregiverPhone: true,
              caregiverEmail: true,
            },
          },
        },
      },
      refillRequests: {
        where: { status: { notIn: ["collected", "cancelled"] } },
        select: { id: true },
        take: 1,
      },
      doseLogs: {
        select: { scheduledDate: true, status: true },
        take: 60,
      },
      adherence: {
        select: { takenOn: true, status: true },
        take: 60,
      },
    },
    orderBy: { nextRefillDue: "asc" },
    take: 300,
  });

  const missingList: MissingRefillPatientItem[] = [];

  for (const rx of prescriptions) {
    const metrics = computeRefillScheduleMetrics(rx);
    const gapDays = Math.max(0, -metrics.daysRemaining);

    if (gapDays < minGap) continue;

    const adherenceCalc = calculatePrescriptionMetrics(
      {
        startDate: rx.startDate,
        createdAt: rx.createdAt,
        dosage: rx.dosage,
        schedule: rx.schedule,
        quantity: rx.quantity,
      },
      rx.doseLogs.length > 0
        ? rx.doseLogs
        : rx.adherence.map((a) => ({
            scheduledDate: a.takenOn,
            scheduledTime: null,
            status: a.status,
          })),
    );

    // Fetch last reminder sent
    const lastReminder = await prisma.reminder.findFirst({
      where: {
        customerId: rx.customerId,
        type: { in: ["refill", "medication_dose"] },
        status: { in: ["sent", "answered", "escalated"] },
      },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true },
    });

    const safeGap = Number.isFinite(gapDays) ? gapDays : 0;
    const safeAdherence = Number.isFinite(adherenceCalc.adherenceRate) ? adherenceCalc.adherenceRate : 100;

    let riskLevel: "severe" | "moderate" | "mild" = "mild";
    if (safeGap >= 14 || safeAdherence < 50) {
      riskLevel = "severe";
    } else if (safeGap >= 7 || safeAdherence < 75) {
      riskLevel = "moderate";
    }

    missingList.push({
      prescriptionId: rx.id,
      customerId: rx.customerId,
      customerName: rx.customer?.fullName || "Patient",
      phone: rx.customer?.phone || null,
      email: rx.customer?.user?.email || null,
      medicineName: rx.medicineName,
      dosage: rx.dosage,
      rxReference: rx.rxReference,
      prescriber: rx.prescriber,
      prescriberPhone: rx.prescriberPhone,
      daysSupply: metrics.effectiveDaysSupply,
      refillsRemaining: rx.refillsRemaining ?? 0,
      lastFilledAt: rx.lastFilledAt,
      nextRefillDue: rx.nextRefillDue || metrics.projectedDueDate,
      gapDays: safeGap,
      riskLevel,
      adherenceRate: safeAdherence,
      caregivers: (rx.customer?.caregivers || []).map((cg) => ({
        id: cg.id,
        name: cg.caregiverName,
        phone: cg.caregiverPhone,
      email: cg.caregiverEmail,
      })),
      lastReminderSentAt: lastReminder?.sentAt ?? null,
      hasOpenRefill: rx.refillRequests.length > 0,
    });
  }

  // Sort by gap severity (highest gap first)
  return missingList.sort((a, b) => b.gapDays - a.gapDays);
}

/**
 * Complete inspection payload for Pharmacist Review Cockpit.
 */
export async function getRefillRequestReviewDetails(refillId: string) {
  const refill = await prisma.refillRequest.findUnique({
    where: { id: refillId },
    include: {
      customer: {
        include: {
          user: { select: { id: true, email: true } },
          preferences: true,
          caregivers: { where: { status: "active" } },
        },
      },
      prescription: {
        include: {
          medication: {
            include: {
              medicationMaster: true,
              lots: { where: { active: true, quantity: { gt: 0 } }, orderBy: { expiryDate: "asc" } },
            },
          },
          clarificationLogs: {
            include: { staff: { select: { email: true } } },
            orderBy: { createdAt: "desc" },
          },
          fills: {
            orderBy: { fillNumber: "desc" },
            take: 5,
          },
        },
      },
      assignedTo: { select: { id: true, email: true } },
    },
  });

  if (!refill) return null;

  // Run clinical safety screen
  let clinicalSafety = null;
  if (refill.prescription) {
    clinicalSafety = await screenClinicalSafety({
      medicationId: refill.prescription.medicationId,
      customerId: refill.customerId || undefined,
      dosage: refill.prescription.dosage,
      schedule: refill.prescription.schedule,
      quantity: refill.prescription.quantity,
    });
  }

  // Calculate schedule metrics
  const scheduleMetrics = refill.prescription
    ? computeRefillScheduleMetrics(refill.prescription)
    : null;

  // Check payable order
  const order = await prisma.order.findFirst({
    where: { refillId: refill.id },
    include: { payments: true, items: true },
  });

  return {
    refill,
    clinicalSafety,
    scheduleMetrics,
    order,
  };
}

/**
 * Approves a refill request, generating commercial fill, stock reservation,
 * schedule advancement, and patient notifications.
 */
export async function approveRefillRequest(
  refillId: string,
  actorId: string,
  options?: {
    markPreparing?: boolean;
    markPaid?: boolean;
    paymentMethod?: "cash" | "daraja" | "card" | "other";
    notes?: string;
    overrideUnitPrice?: number;
  },
) {
  const refill = await prisma.refillRequest.findUnique({
    where: { id: refillId },
    include: {
      customer: { select: { id: true, fullName: true, user: { select: { id: true } } } },
      prescription: {
        include: {
          medication: { select: { id: true, price: true, currentStock: true, medicationMaster: { select: { name: true } } } },
          customer: { select: { id: true, fullName: true, user: { select: { id: true } } } },
        },
      },
    },
  });

  if (!refill) throw new Error("Refill request not found.");

  const nextStatus: RefillStatus = options?.markPreparing ? "preparing" : "approved";

  const rx = refill.prescription;

  // If linked prescription exists, generate commercial fill inside transaction
  let fillResult = null;
  if (rx) {
    fillResult = await prisma.$transaction(async (tx) => {
      // Create commercial PrescriptionFill + Order + deduct/reserve stock
      const res = await createPrescriptionFill(tx, {
        prescriptionId: rx.id,
        refillRequestId: refill.id,
        actorId,
        manualUnitPrice: options?.overrideUnitPrice ?? (rx.unitPrice != null ? Number(rx.unitPrice) : null),
        markDispatched: false,
        markPaid: options?.markPaid ?? false,
        paymentMethod: options?.paymentMethod ?? "cash",
        notes: options?.notes || `Refill approved by staff (${actorId})`,
      });

      // Calculate next refill due date based on daysSupply
      const days = rx.daysSupply && rx.daysSupply > 0 ? rx.daysSupply : 30;
      const nextDue = new Date(Date.now() + days * 86400000);

      // Advance prescription schedule
      await tx.prescription.update({
        where: { id: rx.id },
        data: {
          lastFilledAt: new Date(),
          nextRefillDue: nextDue,
          lifecycleStatus: "approved",
        },
      });

      // Update refill request
      await tx.refillRequest.update({
        where: { id: refill.id },
        data: {
          status: nextStatus,
          assignedToId: actorId,
          statusUpdatedAt: new Date(),
        },
      });

      return res;
    });
  } else {
    // Free-text refill without prescription link
    await prisma.refillRequest.update({
      where: { id: refill.id },
      data: {
        status: nextStatus,
        assignedToId: actorId,
        statusUpdatedAt: new Date(),
      },
    });
  }

  await notifyCareRequest({ ...refill, relatedType: "refill_request", staff: true,
    title: "Refill approved", body: `Your refill request is now ${nextStatus}.` });

  // Multi-channel notifications
  if (refill.customerId) {
    const medName = rx?.medicineName || refill.medicineName;
    const title = `Refill ${nextStatus === "preparing" ? "being prepared" : "approved"}`;
    const bodyText = `Your refill for ${medName} has been approved by the pharmacist and is ${nextStatus === "preparing" ? "being prepared" : "scheduled"}.`;

    await prisma.notification.create({
      data: {
        customerId: refill.customerId,
        channel: "in_app",
        type: "refill",
        title,
        body: bodyText,
        fullBody: `Your refill request for **${medName}** has been approved by the pharmacy staff.\n\nPickup Preference: ${refill.pickupPreference.toUpperCase()}\nStatus: ${nextStatus.toUpperCase()}`,
        status: "delivered",
        sentAt: new Date(),
        relatedType: "refill_request",
        relatedId: refill.id,
      },
    });

    if (refill.customer?.user?.id || rx?.customer?.user?.id) {
      const uid = refill.customer?.user?.id || rx?.customer?.user?.id;
      if (uid) {
        await dispatchPushToUser(uid, {
          title,
          body: bodyText,
          url: "/portal/refills",
          data: { tag: `refill-${refill.id}`, refillId: refill.id, status: nextStatus },
        }).catch(() => {});
      }
    }

    await addTimelineEvent(
      refill.customerId,
      actorId,
      "refill_approved",
      "Refill request approved",
      `${medName} approved for dispensing.`,
      { refillId: refill.id, fillId: fillResult?.fillId, orderId: fillResult?.orderId },
      actorId,
    );
  }

  await writeAuditLog(actorId, "refill_approved", "refill_request", refill.id, {
    status: nextStatus,
    prescriptionId: rx?.id,
    orderId: fillResult?.orderId,
  });

  return { ok: true, refillId: refill.id, fillResult };
}

/**
 * Sends a direct multi-channel refill reminder to a patient.
 */
export async function sendDirectRefillReminder(data: {
  customerId: string;
  prescriptionId?: string;
  refillRequestId?: string;
  channel: "sms" | "whatsapp" | "email" | "in_app";
  customSubject?: string;
  customBody?: string;
  actorId: string;
}) {
  const customer = await prisma.customerProfile.findUnique({
    where: { id: data.customerId },
    include: {
      user: { select: { email: true, id: true } },
      preferences: true,
    },
  });
  if (!customer) throw new Error("Customer not found.");

  let rx = null;
  if (data.prescriptionId) {
    rx = await prisma.prescription.findUnique({ where: { id: data.prescriptionId } });
  }

  const medicineName = rx?.medicineName || "your prescription medication";
  const defaultSubject = `Prescription Refill Reminder: ${medicineName}`;
  const defaultBody = `Hello ${customer.fullName}, this is a reminder from Afyvia Pharmacy that your refill for ${medicineName} is due. Please request your refill online at https://afyviapharmacy.com/portal/refills or reply to this message to confirm delivery.`;

  const subject = data.customSubject || defaultSubject;
  const body = data.customBody || defaultBody;

  const delivery = await sendDelivery({
    channel: data.channel,
    purpose: "reminder",
    recipient: {
      email: customer.user.email,
      phone: customer.phone,
      preferences: customer.preferences,
    },
    subject,
    body,
  });

  // Record Reminder row
  const reminder = await prisma.reminder.create({
    data: {
      customerId: data.customerId,
      type: "refill",
      title: subject,
      body,
      channel: data.channel as any,
      scheduledFor: new Date(),
      status: delivery.status === "failed" ? "failed" : "sent",
      sentAt: delivery.status === "failed" ? null : new Date(),
      relatedType: data.prescriptionId ? "prescription" : "refill_request",
      relatedId: data.prescriptionId || data.refillRequestId,
      createdById: data.actorId,
    },
  });

  // Record Notification row
  await prisma.notification.create({
    data: {
      customerId: data.customerId,
      channel: data.channel as any,
      type: "refill",
      title: subject,
      body,
      status: delivery.status,
      sentAt: new Date(),
      relatedType: "reminder",
      relatedId: reminder.id,
    },
  });

  // Push to device
  if (customer.user?.id) {
    await dispatchPushToUser(customer.user.id, {
      title: subject,
      body,
      url: "/portal/refills",
      data: {
        tag: `refill-reminder-${reminder.id}`,
        prescriptionId: data.prescriptionId || "",
      },
    }).catch(() => {});
  }

  await addTimelineEvent(
    data.customerId,
    data.actorId,
    "refill_reminder_sent",
    "Refill reminder sent",
    `${data.channel.toUpperCase()} reminder sent for ${medicineName}.`,
    { reminderId: reminder.id, channel: data.channel, prescriptionId: data.prescriptionId },
    data.actorId,
  );

  return { ok: true, reminderId: reminder.id, deliveryStatus: delivery.status };
}

/**
 * Logs a prescriber refill authorization inquiry or clarification call.
 */
export async function logPrescriberRefillAuthorization(data: {
  prescriptionId: string;
  contactMethod: string;
  contactedTo: string;
  inquiryDetails: string;
  doctorResponse?: string;
  resolved?: boolean;
  actorId: string;
}) {
  const rx = await prisma.prescription.findUnique({
    where: { id: data.prescriptionId },
    include: { customer: { select: { id: true, fullName: true } } },
  });
  if (!rx) throw new Error("Prescription not found.");

  const log = await prisma.prescriptionClarificationLog.create({
    data: {
      prescriptionId: data.prescriptionId,
      contactMethod: data.contactMethod,
      contactedTo: data.contactedTo,
      inquiryDetails: data.inquiryDetails,
      doctorResponse: data.doctorResponse || null,
      resolved: data.resolved ?? false,
      staffId: data.actorId,
    },
  });

  await prisma.prescription.update({
    where: { id: data.prescriptionId },
    data: {
      clarificationStatus: data.resolved ? "resolved" : "contacted",
      clarificationContactMethod: data.contactMethod,
      clarificationContactedAt: new Date(),
      ...(data.resolved ? { clarificationResolvedAt: new Date() } : {}),
      clarificationNotes: data.inquiryDetails,
    },
  });

  await addTimelineEvent(
    rx.customerId,
    data.actorId,
    "prescriber_contacted",
    "Prescriber contacted for refill authorization",
    `Contacted ${data.contactedTo} via ${data.contactMethod}: ${data.inquiryDetails.slice(0, 100)}`,
    { prescriptionId: rx.id, logId: log.id },
    data.actorId,
  );

  return log;
}

/**
 * Cron helper: automatically queues refill reminders 3 days ahead of `nextRefillDue`.
 */
export async function generateUpcomingRefillReminders(): Promise<number> {
  const now = new Date();
  const todayStr = toLocalDateInputValue(now);
  const todayStart = new Date(todayStr + "T00:00:00Z");
  const threeDaysAhead = new Date(todayStart.getTime() + 3 * 86400000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

  // Active prescriptions due in next 3 days
  const prescriptions = await prisma.prescription.findMany({
    where: {
      status: "active",
      refillsRemaining: { gt: 0 },
      nextRefillDue: { gte: todayStart, lte: threeDaysAhead },
      customer: {
        preferences: {
          reminderConsent: true,
        },
      },
    },
    include: {
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          user: { select: { id: true, email: true } },
          preferences: true,
        },
      },
    },
    take: 100,
  });

  let createdCount = 0;
  // Existing-patient refill safety reminders are part of core clinical care.
  for (const rx of prescriptions) {
    // Check if an open refill request already exists
    const openRequest = await prisma.refillRequest.findFirst({
      where: {
        prescriptionId: rx.id,
        status: { notIn: ["collected", "cancelled"] },
      },
      select: { id: true },
    });
    if (openRequest) continue;

    // Check if reminder was already sent in last 7 days for this Rx
    const recentReminder = await prisma.reminder.findFirst({
      where: {
        customerId: rx.customerId,
        relatedType: "prescription",
        relatedId: rx.id,
        type: "refill",
        createdAt: { gte: sevenDaysAgo },
      },
      select: { id: true },
    });
    if (recentReminder) continue;

    const dueDateStr = rx.nextRefillDue ? formatDate(rx.nextRefillDue) : "soon";
    const title = `Refill due for ${rx.medicineName}`;
    const body = `Your refill for ${rx.medicineName} is due on ${dueDateStr}. Log in to your Afyvia Pharmacy portal to request your refill or confirm delivery.`;

    await prisma.reminder.create({
      data: {
        customerId: rx.customerId,
        type: "refill",
        title,
        body,
        channel: "sms",
        scheduledFor: now,
        status: "scheduled",
        relatedType: "prescription",
        relatedId: rx.id,
      },
    });

    createdCount += 1;
  }

  return createdCount;
}

/**
 * Cron helper: detects patients with severely lapsed refills (>14 days past due) and alerts staff.
 */
export async function processRefillLapseAlerts(): Promise<number> {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

  const lapsedPrescriptions = await prisma.prescription.findMany({
    where: {
      status: "active",
      nextRefillDue: { lte: fourteenDaysAgo },
    },
    include: {
      customer: { select: { id: true, fullName: true, phone: true } },
    },
    take: 50,
  });

  let alertedCount = 0;

  for (const rx of lapsedPrescriptions) {
    // Rate limit: 1 admin notification per prescription per 7 days
    const existingNotification = await prisma.adminNotification.findFirst({
      where: {
        type: "refill_lapsed",
        relatedId: rx.id,
        createdAt: { gte: sevenDaysAgo },
      },
      select: { id: true },
    });
    if (existingNotification) continue;

    const patientName = rx.customer?.fullName || "Patient";
    const dueStr = rx.nextRefillDue ? formatDate(rx.nextRefillDue) : "2+ weeks ago";

    await recordAdminNotification({
      type: "refill_lapsed",
      title: `Critical Refill Lapse: ${rx.medicineName}`,
      body: `${patientName} has not refilled ${rx.medicineName} (due ${dueStr}). High non-adherence risk. Contact patient or prescriber.`,
      severity: "critical",
      relatedType: "prescription",
      relatedId: rx.id,
    });

    alertedCount += 1;
  }

  return alertedCount;
}

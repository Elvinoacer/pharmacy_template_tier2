import "server-only";

import { withPlatformBypass } from "@/app/lib/tenant-context";
import { prisma } from "@/app/lib/db";
import { addTimelineEvent } from "@/app/lib/auth";
import { parseDosageFormula } from "@/app/lib/services/medication-schedule";
import { computeRefillScheduleMetrics } from "@/app/lib/services/refills";
import { toLocalDateInputValue, formatDate } from "@/app/lib/time";
import { sendDelivery } from "@/app/lib/services/delivery";
import type { PickupPreference } from "@/app/generated/prisma/client";

export type SyncMedicationPlan = {
  prescriptionId: string;
  medicineName: string;
  dosage: string | null;
  currentDaysRemaining: number;
  currentNextRefillDue: Date | null;
  unitsPerDose: number;
  dosesPerDay: number;
  dailyTotalUnits: number;
  standardMonthlyQty: number;
  unitPrice: number;
  // Bridge / Short fill metrics to align to the anchor date
  bridgeDaysNeeded: number;
  bridgeQuantity: number;
  bridgeCost: number;
  syncedMonthlyCost: number;
  isSynced: boolean;
};

export type PatientSyncPlan = {
  customerId: string;
  customerName: string;
  phone: string | null;
  email: string | null;
  targetAnchorDay: number; // e.g. 1st, 15th
  targetSyncDate: Date; // e.g. 2026-09-01
  medications: SyncMedicationPlan[];
  totalBridgeCost: number;
  totalMonthlyCost: number;
  isEnrolled: boolean;
  enrollmentStatus?: string;
};

/**
 * Calculates the next anchor date given an anchor day of month (1-28).
 */
export function calculateNextAnchorDate(anchorDay: number, fromDate: Date = new Date()): Date {
  const safeAnchor = Math.max(1, Math.min(28, anchorDay));
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth();
  const currentDay = fromDate.getDate();

  let targetYear = year;
  let targetMonth = month;

  // If the anchor day is at least 7 days ahead in the current month, target this month.
  // Otherwise target next month.
  if (safeAnchor > currentDay + 5) {
    targetMonth = month;
  } else {
    targetMonth = month + 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }

  const dateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(safeAnchor).padStart(2, "0")}`;
  return new Date(`${dateStr}T00:00:00Z`);
}

/**
 * Calculates a complete Medication Synchronization (Med Sync) plan for a patient.
 * Determines how many bridge doses are needed for each prescription so that all
 * medications run out and refill on the chosen monthly Anchor Date.
 */
export async function calculateRefillSyncPlan(
  customerId: string,
  targetAnchorDay = 1,
): Promise<PatientSyncPlan | null> {
  return withPlatformBypass(async () => {
  const customer = await prisma.customerProfile.findUnique({
    where: { id: customerId },
    include: {
      user: { select: { email: true } },
      syncEnrollment: true,
      prescriptions: {
        where: { status: "active" },
        include: { medication: { select: { price: true } } },
      },
    },
  });

  if (!customer) return null;

  const anchorDay = targetAnchorDay || customer.syncEnrollment?.anchorDay || 1;
  const targetSyncDate = calculateNextAnchorDate(anchorDay);
  const now = new Date();
  const todayMs = new Date(toLocalDateInputValue(now) + "T00:00:00Z").getTime();
  const targetMs = targetSyncDate.getTime();
  const daysUntilTarget = Math.max(1, Math.round((targetMs - todayMs) / 86400000));

  const medications: SyncMedicationPlan[] = customer.prescriptions.map((rx) => {
    const formula = parseDosageFormula(rx.dosage, rx.schedule);
    const metrics = computeRefillScheduleMetrics(rx);
    const unitPrice = Number(rx.unitPrice ?? rx.medication?.price ?? 0);

    const dailyUnits = Math.max(1, formula.dailyTotalUnits);
    const standardMonthlyQty = dailyUnits * 30;

    // How many days of supply does the patient currently have?
    const daysRemaining = Math.max(0, metrics.daysRemaining);

    // If current supply runs out before targetSyncDate, bridge fill is needed
    // Bridge days = days until target - current days remaining
    const bridgeDaysNeeded = Math.max(0, daysUntilTarget - daysRemaining);
    const bridgeQuantity = bridgeDaysNeeded > 0 ? bridgeDaysNeeded * dailyUnits : 0;
    const bridgeCost = Math.round(bridgeQuantity * unitPrice * 100) / 100;
    const syncedMonthlyCost = Math.round(standardMonthlyQty * unitPrice * 100) / 100;

    return {
      prescriptionId: rx.id,
      medicineName: rx.medicineName,
      dosage: rx.dosage,
      currentDaysRemaining: metrics.daysRemaining,
      currentNextRefillDue: rx.nextRefillDue,
      unitsPerDose: formula.unitsPerDose,
      dosesPerDay: formula.dosesPerDay,
      dailyTotalUnits: dailyUnits,
      standardMonthlyQty,
      unitPrice,
      bridgeDaysNeeded,
      bridgeQuantity,
      bridgeCost,
      syncedMonthlyCost,
      isSynced: rx.isSynced,
    };
  });

  const totalBridgeCost = medications.reduce((acc, m) => acc + m.bridgeCost, 0);
  const totalMonthlyCost = medications.reduce((acc, m) => acc + m.syncedMonthlyCost, 0);

  return {
    customerId: customer.id,
    customerName: customer.fullName,
    phone: customer.phone,
    email: customer.user.email,
    targetAnchorDay: anchorDay,
    targetSyncDate,
    medications,
    totalBridgeCost: Math.round(totalBridgeCost * 100) / 100,
    totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
    isEnrolled: Boolean(customer.syncEnrollment && customer.syncEnrollment.status === "active"),
    enrollmentStatus: customer.syncEnrollment?.status,
  };
  });
}

/**
 * Enrolls or updates a patient in the Refill Synchronization Program.
 */
export async function enrollCustomerInRefillSync(input: {
  customerId: string;
  anchorDay: number;
  prescriptionIds: string[];
  preferredPickup?: PickupPreference;
  notes?: string;
  staffId?: string;
}) {
  return withPlatformBypass(async () => {
  const safeAnchor = Math.max(1, Math.min(28, input.anchorDay));
  const nextSyncDate = calculateNextAnchorDate(safeAnchor);

  // 1. Upsert enrollment record
  const enrollment = await prisma.refillSyncEnrollment.upsert({
    where: { customerId: input.customerId },
    create: {
      customerId: input.customerId,
      anchorDay: safeAnchor,
      status: "active",
      preferredPickup: input.preferredPickup || "pickup",
      notes: input.notes || "Enrolled in monthly refill synchronization",
      nextSyncDate,
      syncedPrescriptionIds: input.prescriptionIds,
    },
    update: {
      anchorDay: safeAnchor,
      status: "active",
      preferredPickup: input.preferredPickup || "pickup",
      notes: input.notes,
      nextSyncDate,
      syncedPrescriptionIds: input.prescriptionIds,
      updatedAt: new Date(),
    },
  });

  // 2. Mark prescriptions as synced and tag chronic maintenance
  if (input.prescriptionIds.length > 0) {
    await prisma.prescription.updateMany({
      where: { id: { in: input.prescriptionIds }, customerId: input.customerId },
      data: {
        isSynced: true,
        isChronic: true,
        syncAnchorDay: safeAnchor,
        nextRefillDue: nextSyncDate,
      },
    });
  }

  // 3. Log timeline event
  await addTimelineEvent(
    input.customerId,
    input.staffId || null,
    "med_sync_enrolled",
    "Enrolled in Refill Synchronization Program",
    `Synchronized ${input.prescriptionIds.length} chronic medications to Anchor Day ${safeAnchor} of each month (Next cycle: ${formatDate(nextSyncDate)}).`,
    { anchorDay: safeAnchor, nextSyncDate: nextSyncDate.toISOString(), prescriptionIds: input.prescriptionIds },
    input.staffId || undefined,
  );

  // 4. Send confirmation notification to customer
  const customer = await prisma.customerProfile.findUnique({
    where: { id: input.customerId },
    include: { user: { select: { email: true } }, preferences: true },
  });

  if (customer) {
    const subject = `Enrolled in Refill Synchronization (Anchor Day: ${safeAnchor})`;
    const body = `Hello ${customer.fullName}, your chronic medications have been synchronized! All your maintenance prescriptions will now refill together on day ${safeAnchor} of each month (first unified pickup: ${formatDate(nextSyncDate)}). No more multiple trips to the pharmacy!`;

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

  return enrollment;
  });
}

/**
 * Identifies patients with multiple maintenance medications who would benefit from Med Sync.
 */
export async function getRefillSyncCandidates(query?: string) {
  const q = query?.trim() || "";

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
      syncEnrollment: true,
      prescriptions: {
        where: { status: "active" },
        select: {
          id: true,
          medicineName: true,
          dosage: true,
          schedule: true,
          quantity: true,
          daysSupply: true,
          nextRefillDue: true,
          isChronic: true,
          isSynced: true,
          syncAnchorDay: true,
          refillsRemaining: true,
          createdAt: true,
          startDate: true,
          lastFilledAt: true,
        },
      },
    },
    take: 100,
  });

  return customers
    .map((c) => {
      const activePrescriptions = c.prescriptions;
      const isEnrolled = Boolean(c.syncEnrollment && c.syncEnrollment.status === "active");
      const syncedCount = activePrescriptions.filter((p) => p.isSynced).length;

      // Candidate if >= 2 active medications and not fully synced
      const isCandidate = activePrescriptions.length >= 2 && (!isEnrolled || syncedCount < activePrescriptions.length);

      return {
        customerId: c.id,
        fullName: c.fullName,
        phone: c.phone,
        email: c.user.email,
        activeMedicationCount: activePrescriptions.length,
        syncedCount,
        isEnrolled,
        anchorDay: c.syncEnrollment?.anchorDay ?? null,
        nextSyncDate: c.syncEnrollment?.nextSyncDate ?? null,
        isCandidate,
        prescriptions: activePrescriptions.map((p) => ({
          id: p.id,
          medicineName: p.medicineName,
          dosage: p.dosage,
          nextRefillDue: p.nextRefillDue,
          isSynced: p.isSynced,
          isChronic: p.isChronic,
          refillsRemaining: p.refillsRemaining ?? 0,
        })),
      };
    })
    .sort((a, b) => b.activeMedicationCount - a.activeMedicationCount);
}

/**
 * Returns all active Refill Synchronization enrollments with current batch status.
 */
export async function getRefillSyncEnrollments(opts?: { query?: string; status?: string }) {
  const q = opts?.query?.trim() || "";
  const status = opts?.status || "active";

  const enrollments = await prisma.refillSyncEnrollment.findMany({
    where: {
      ...(status !== "all" ? { status } : {}),
      ...(q
        ? {
            customer: {
              OR: [
                { fullName: { contains: q, mode: "insensitive" } },
                { phone: { contains: q, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: {
      customer: {
        include: {
          user: { select: { email: true } },
          prescriptions: {
            where: { status: "active" },
            select: {
              id: true,
              medicineName: true,
              dosage: true,
              isSynced: true,
              nextRefillDue: true,
              refillsRemaining: true,
            },
          },
        },
      },
    },
    orderBy: { anchorDay: "asc" },
  });

  return enrollments.map((e) => ({
    id: e.id,
    customerId: e.customerId,
    customerName: e.customer.fullName,
    phone: e.customer.phone,
    email: e.customer.user.email,
    anchorDay: e.anchorDay,
    status: e.status,
    preferredPickup: e.preferredPickup,
    nextSyncDate: e.nextSyncDate,
    lastSyncDate: e.lastSyncDate,
    enrolledAt: e.enrolledAt,
    notes: e.notes,
    syncedMedications: e.customer.prescriptions.filter((p) => e.syncedPrescriptionIds.includes(p.id) || p.isSynced),
    totalMedications: e.customer.prescriptions.length,
  }));
}

import "server-only";

import { prisma } from "@/app/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  PrescriptionIntakeChannel,
  PrescriptionLifecycleStatus,
  ClarificationStatus,
  PrescriptionStatus,
} from "@/app/generated/prisma/enums";
import { parseDosageFormula } from "@/app/lib/services/medication-schedule";
import { createPrescriptionFill } from "@/app/lib/services/commerce/prescription-fills";

// Re-export pure shared metadata and calculation helpers
export * from "@/app/lib/prescription-lifecycle-shared";
import {
  INTAKE_CHANNEL_LABELS,
  PRIMARY_LIFECYCLE_STAGES,
  EXCEPTION_LIFECYCLE_STATUSES,
  LIFECYCLE_STATUS_LABELS,
  getDosesPerDay,
  calculatePrescriptionQuantity,
  calculatePrescriptionDuration,
  type QuantityCalculationInput,
} from "@/app/lib/prescription-lifecycle-shared";

// ── Refill Eligibility Engine ─────────────────────────────────

export type RefillEligibilityResult = {
  isEligible: boolean;
  refillsRemaining: number;
  daysSupply: number;
  daysSinceLastFill: number | null;
  minDaysRequiredBeforeRefill: number;
  status: "eligible" | "too_early" | "no_refills_left" | "expired" | "discontinued" | "on_hold";
  reason: string;
};

export function checkRefillEligibility(rx: {
  status: PrescriptionStatus;
  lifecycleStatus?: PrescriptionLifecycleStatus | null;
  refillsRemaining?: number | null;
  daysSupply?: number | null;
  lastFilledAt?: Date | null;
  createdAt: Date;
  endDate?: Date | null;
}): RefillEligibilityResult {
  const refillsRemaining = rx.refillsRemaining ?? 0;
  const daysSupply = rx.daysSupply ?? 30;

  if (rx.status === "discontinued" || rx.lifecycleStatus === "cancelled") {
    return {
      isEligible: false,
      refillsRemaining,
      daysSupply,
      daysSinceLastFill: null,
      minDaysRequiredBeforeRefill: 0,
      status: "discontinued",
      reason: "Prescription has been discontinued or cancelled.",
    };
  }

  if (rx.status === "on_hold" || rx.lifecycleStatus === "on_hold") {
    return {
      isEligible: false,
      refillsRemaining,
      daysSupply,
      daysSinceLastFill: null,
      minDaysRequiredBeforeRefill: 0,
      status: "on_hold",
      reason: "Prescription is currently on clinical hold.",
    };
  }

  if (rx.endDate && new Date(rx.endDate) < new Date()) {
    return {
      isEligible: false,
      refillsRemaining,
      daysSupply,
      daysSinceLastFill: null,
      minDaysRequiredBeforeRefill: 0,
      status: "expired",
      reason: "Prescription therapeutic course has expired.",
    };
  }

  if (refillsRemaining <= 0) {
    return {
      isEligible: false,
      refillsRemaining: 0,
      daysSupply,
      daysSinceLastFill: null,
      minDaysRequiredBeforeRefill: 0,
      status: "no_refills_left",
      reason: "No authorized refills remaining. Prescriber renewal required.",
    };
  }

  const baselineDate = rx.lastFilledAt ? new Date(rx.lastFilledAt) : new Date(rx.createdAt);
  const now = new Date();
  const diffMs = now.getTime() - baselineDate.getTime();
  const daysSinceLastFill = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  // Early refill safety policy: Patient must have consumed at least 75% of prior supply
  const minDaysRequired = Math.max(1, Math.floor(daysSupply * 0.75));

  if (daysSinceLastFill < minDaysRequired) {
    const daysUntilEligible = minDaysRequired - daysSinceLastFill;
    return {
      isEligible: false,
      refillsRemaining,
      daysSupply,
      daysSinceLastFill,
      minDaysRequiredBeforeRefill: minDaysRequired,
      status: "too_early",
      reason: `Refill requested too early (${daysSinceLastFill}/${daysSupply} days elapsed). Eligible in ${daysUntilEligible} day(s).`,
    };
  }

  return {
    isEligible: true,
    refillsRemaining,
    daysSupply,
    daysSinceLastFill,
    minDaysRequiredBeforeRefill: minDaysRequired,
    status: "eligible",
    reason: `Eligible for refill (${refillsRemaining} remaining).`,
  };
}

// ── Duplicate Therapy Detection Engine ────────────────────────

export type DuplicateTherapyMatch = {
  prescriptionId: string;
  medicineName: string;
  dosage: string | null;
  schedule: string | null;
  status: string;
  prescriber: string | null;
  createdAt: Date;
  matchType: "exact_medication" | "same_active_ingredient" | "therapeutic_overlap";
  message: string;
};

export async function detectDuplicateTherapies(params: {
  customerId: string;
  medicationId?: string | null;
  medicineName: string;
  excludePrescriptionId?: string;
}): Promise<DuplicateTherapyMatch[]> {
  if (!params.customerId) return [];

  const activePrescriptions = await prisma.prescription.findMany({
    where: {
      customerId: params.customerId,
      status: { in: ["active", "on_hold"] },
      ...(params.excludePrescriptionId ? { id: { not: params.excludePrescriptionId } } : {}),
    },
    include: {
      medication: {
        include: {
          medicationMaster: {
            include: {
              activeIngredients: {
                include: { activeIngredient: true },
              },
            },
          },
        },
      },
    },
  });

  const queryNameClean = params.medicineName.trim().toLowerCase();
  const matches: DuplicateTherapyMatch[] = [];

  for (const p of activePrescriptions) {
    const existingNameClean = p.medicineName.trim().toLowerCase();

    // 1) Exact / Brand name match
    if (
      (params.medicationId && p.medicationId === params.medicationId) ||
      queryNameClean === existingNameClean ||
      queryNameClean.includes(existingNameClean) ||
      existingNameClean.includes(queryNameClean)
    ) {
      matches.push({
        prescriptionId: p.id,
        medicineName: p.medicineName,
        dosage: p.dosage,
        schedule: p.schedule,
        status: p.status,
        prescriber: p.prescriber,
        createdAt: p.createdAt,
        matchType: "exact_medication",
        message: `Patient is already actively prescribed "${p.medicineName}" (${p.dosage || "standard dose"}). Risk of therapeutic duplication and overdosage.`,
      });
      continue;
    }

    // 2) Active Ingredient overlap check
    if (params.medicationId && p.medication?.medicationMaster?.activeIngredients) {
      const targetMed = await prisma.pharmacyInventory.findUnique({
        where: { id: params.medicationId },
        include: {
          medicationMaster: {
            include: {
              activeIngredients: { include: { activeIngredient: true } },
            },
          },
        },
      });

      if (targetMed?.medicationMaster?.activeIngredients) {
        const targetIngredients = new Set(
          targetMed.medicationMaster.activeIngredients.map((i) => i.activeIngredient.name.toLowerCase())
        );

        for (const existingIng of p.medication.medicationMaster.activeIngredients) {
          const ingName = existingIng.activeIngredient.name.toLowerCase();
          if (targetIngredients.has(ingName)) {
            matches.push({
              prescriptionId: p.id,
              medicineName: p.medicineName,
              dosage: p.dosage,
              schedule: p.schedule,
              status: p.status,
              prescriber: p.prescriber,
              createdAt: p.createdAt,
              matchType: "same_active_ingredient",
              message: `Both prescriptions share the active ingredient "${existingIng.activeIngredient.name}". Concurrent use requires clinical rationale.`,
            });
            break;
          }
        }
      }
    }
  }

  return matches;
}

// ── Prescription Clinical Operations ──────────────────────────

/**
 * Perform professional verification of patient information.
 */
export async function verifyPrescriptionPatientInfo(params: {
  prescriptionId: string;
  staffId: string;
  verified: boolean;
  notes?: string;
}) {
  return await prisma.prescription.update({
    where: { id: params.prescriptionId },
    data: {
      patientVerified: params.verified,
      patientVerifiedAt: params.verified ? new Date() : null,
      patientVerificationNotes: params.notes || null,
      lifecycleStatus: PrescriptionLifecycleStatus.under_review,
    },
  });
}

/**
 * Perform professional verification of prescriber details.
 */
export async function verifyPrescriptionPrescriberInfo(params: {
  prescriptionId: string;
  staffId: string;
  prescriber?: string;
  prescriberLicense?: string;
  prescriberPhone?: string;
  prescriberEmail?: string;
  prescriberFacility?: string;
  verified: boolean;
}) {
  return await prisma.prescription.update({
    where: { id: params.prescriptionId },
    data: {
      prescriber: params.prescriber || undefined,
      prescriberLicense: params.prescriberLicense || null,
      prescriberPhone: params.prescriberPhone || null,
      prescriberEmail: params.prescriberEmail || null,
      prescriberFacility: params.prescriberFacility || null,
      prescriberVerified: params.verified,
      prescriberVerifiedAt: params.verified ? new Date() : null,
      lifecycleStatus: PrescriptionLifecycleStatus.under_review,
    },
  });
}

/**
 * Flag an unclear or ambiguous prescription and place on hold if needed.
 */
export async function flagPrescriptionAsUnclear(params: {
  prescriptionId: string;
  staffId: string;
  unclearReason: string;
  notes?: string;
  placeOnHold?: boolean;
}) {
  return await prisma.$transaction(async (tx) => {
    const rx = await tx.prescription.update({
      where: { id: params.prescriptionId },
      data: {
        isUnclear: true,
        unclearReason: params.unclearReason,
        clarificationStatus: ClarificationStatus.needed,
        clarificationNotes: params.notes || null,
        ...(params.placeOnHold
          ? {
              status: PrescriptionStatus.on_hold,
              lifecycleStatus: PrescriptionLifecycleStatus.on_hold,
              holdReason: `Unclear Prescription: ${params.unclearReason}`,
            }
          : {}),
      },
    });

    await tx.adminNotification.create({
      data: {
        type: "prescription_unclear",
        title: `Unclear Prescription Flagged: ${rx.medicineName}`,
        body: `Reason: ${params.unclearReason}. Pharmacist clarification with prescriber required.`,
        severity: "warning",
        relatedType: "prescription",
        relatedId: rx.id,
      },
    });

    return rx;
  });
}

/**
 * Log a prescriber communication / clarification contact attempt or resolution.
 */
export async function logPrescriberClarificationAttempt(params: {
  prescriptionId: string;
  staffId: string;
  contactMethod: string;
  contactedTo: string;
  inquiryDetails: string;
  doctorResponse?: string;
  resolved?: boolean;
}) {
  return await prisma.$transaction(async (tx) => {
    const log = await tx.prescriptionClarificationLog.create({
      data: {
        prescriptionId: params.prescriptionId,
        contactMethod: params.contactMethod,
        contactedTo: params.contactedTo,
        inquiryDetails: params.inquiryDetails,
        doctorResponse: params.doctorResponse || null,
        resolved: Boolean(params.resolved),
        staffId: params.staffId,
      },
    });

    const isResolved = Boolean(params.resolved);

    await tx.prescription.update({
      where: { id: params.prescriptionId },
      data: {
        clarificationContactMethod: params.contactMethod,
        clarificationStatus: isResolved ? ClarificationStatus.resolved : ClarificationStatus.contacted,
        clarificationContactedAt: new Date(),
        ...(isResolved
          ? {
              clarificationResolvedAt: new Date(),
              isUnclear: false,
              status: PrescriptionStatus.active,
              lifecycleStatus: PrescriptionLifecycleStatus.under_review,
            }
          : {}),
      },
    });

    return log;
  });
}

/**
 * Pharmacist Professional Review: Approve, Reject, or Hold.
 */
export async function recordPrescriptionReviewDecision(params: {
  prescriptionId: string;
  staffId: string;
  decision: "approved" | "rejected" | "on_hold";
  notes?: string;
  rejectionReason?: string;
  holdReason?: string;
}) {
  return await prisma.$transaction(async (tx) => {
    let status: PrescriptionStatus = PrescriptionStatus.active;
    let lifecycleStatus: PrescriptionLifecycleStatus = PrescriptionLifecycleStatus.approved;

    if (params.decision === "rejected") {
      status = PrescriptionStatus.discontinued;
      lifecycleStatus = PrescriptionLifecycleStatus.rejected;
    } else if (params.decision === "on_hold") {
      status = PrescriptionStatus.on_hold;
      lifecycleStatus = PrescriptionLifecycleStatus.on_hold;
    } else {
      status = PrescriptionStatus.active;
      lifecycleStatus = PrescriptionLifecycleStatus.approved;
    }

    const updated = await tx.prescription.update({
      where: { id: params.prescriptionId },
      data: {
        status,
        lifecycleStatus,
        reviewedById: params.staffId,
        reviewedAt: new Date(),
        reviewDecision: params.decision,
        reviewNotes: params.notes || null,
        rejectionReason: params.decision === "rejected" ? params.rejectionReason || "Clinical review rejection" : null,
        holdReason: params.decision === "on_hold" ? params.holdReason || "Prescription placed on clinical hold" : null,
      },
      include: {
        customer: { select: { id: true, fullName: true, phone: true } },
      },
    });

    return updated;
  });
}

/**
 * Transition prescription lifecycle status along the happy path.
 */
export async function transitionPrescriptionLifecycleStatus(params: {
  prescriptionId: string;
  staffId: string;
  newStatus: PrescriptionLifecycleStatus;
  notes?: string;
}) {
  const isTerminalDiscontinued =
    params.newStatus === PrescriptionLifecycleStatus.rejected ||
    params.newStatus === PrescriptionLifecycleStatus.cancelled;

  const isOnHold = params.newStatus === PrescriptionLifecycleStatus.on_hold;

  const legacyStatus: PrescriptionStatus = isTerminalDiscontinued
    ? PrescriptionStatus.discontinued
    : isOnHold
    ? PrescriptionStatus.on_hold
    : PrescriptionStatus.active;

  return await prisma.prescription.update({
    where: { id: params.prescriptionId },
    data: {
      lifecycleStatus: params.newStatus,
      status: legacyStatus,
      ...(params.newStatus === PrescriptionLifecycleStatus.dispatched && {
        dispatchedAt: new Date(),
        dispatchedById: params.staffId,
      }),
      ...(params.notes ? { notes: params.notes } : {}),
    },
  });
}

/**
 * Convert Prescription into a Commercial Dispensing Order.
 */
export async function convertPrescriptionToCommercialDispensingOrder(params: {
  prescriptionId: string;
  staffId: string;
  markPaid?: boolean;
  paymentMethod?: "cash" | "daraja" | "card" | "other";
  markDispatched?: boolean;
  notes?: string;
}) {
  return await prisma.$transaction(async (tx) => {
    const rx = await tx.prescription.findUnique({
      where: { id: params.prescriptionId },
      include: {
        medication: true,
      },
    });
    if (!rx) throw new Error("Prescription not found.");

    // Check stock availability
    if (rx.medication && rx.medication.currentStock < (rx.quantity || 1)) {
      throw new Error(
        `Insufficient inventory to convert to dispensing order. Stock available: ${rx.medication.currentStock}, required: ${rx.quantity || 1}`
      );
    }

    const fillResult = await createPrescriptionFill(tx, {
      prescriptionId: rx.id,
      actorId: params.staffId,
      manualUnitPrice: rx.unitPrice ? Number(rx.unitPrice) : null,
      markDispatched: Boolean(params.markDispatched),
      markPaid: Boolean(params.markPaid),
      paymentMethod: params.paymentMethod || "cash",
      notes: params.notes || `Prescription converted to dispensing order`,
    });

    const nextLifecycle = params.markDispatched
      ? PrescriptionLifecycleStatus.dispatched
      : PrescriptionLifecycleStatus.ready;

    await tx.prescription.update({
      where: { id: rx.id },
      data: {
        dispensingOrderId: fillResult.orderId,
        lifecycleStatus: nextLifecycle,
        status: PrescriptionStatus.active,
        ...(params.markDispatched ? { dispatchedAt: new Date(), dispatchedById: params.staffId } : {}),
      },
    });

    return fillResult;
  });
}

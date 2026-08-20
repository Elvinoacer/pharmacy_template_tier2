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

// ── Channels Metadata ─────────────────────────────────────────

export const INTAKE_CHANNEL_LABELS: Record<PrescriptionIntakeChannel, { label: string; icon: string; description: string }> = {
  [PrescriptionIntakeChannel.physical_paper]: {
    label: "Physical Paper",
    icon: "FileText",
    description: "Hard-copy prescription presented in-person or physical dispensary drop-off",
  },
  [PrescriptionIntakeChannel.whatsapp]: {
    label: "WhatsApp",
    icon: "MessageSquare",
    description: "Prescription photo, PDF, or text received via official WhatsApp line",
  },
  [PrescriptionIntakeChannel.email]: {
    label: "Email",
    icon: "Mail",
    description: "Scanned prescription or referral received via pharmacy email inbox",
  },
  [PrescriptionIntakeChannel.patient_upload]: {
    label: "Patient Upload",
    icon: "UploadCloud",
    description: "Uploaded directly by customer via the digital patient portal",
  },
  [PrescriptionIntakeChannel.doctor_referral]: {
    label: "Doctor Referral",
    icon: "Stethoscope",
    description: "Direct referral note or transfer from attending medical practitioner",
  },
  [PrescriptionIntakeChannel.hospital_system]: {
    label: "Hospital System (EHR)",
    icon: "Building2",
    description: "Inter-facility electronic medical record / EHR discharge transmission",
  },
  [PrescriptionIntakeChannel.electronic_prescription]: {
    label: "Electronic Prescription (e-Rx)",
    icon: "QrCode",
    description: "Digitally signed e-Prescription code / national e-Health token",
  },
  [PrescriptionIntakeChannel.phone_communication]: {
    label: "Phone Communication",
    icon: "PhoneCall",
    description: "Verbal / telephonic physician order recorded with readback confirmation",
  },
  [PrescriptionIntakeChannel.in_person_consultation]: {
    label: "In-Person Consultation",
    icon: "UserCheck",
    description: "Assessed & initiated during in-pharmacy clinical consultation",
  },
};

// ── Lifecycle Status Metadata ─────────────────────────────────

export const PRIMARY_LIFECYCLE_STAGES: PrescriptionLifecycleStatus[] = [
  PrescriptionLifecycleStatus.received,
  PrescriptionLifecycleStatus.under_review,
  PrescriptionLifecycleStatus.approved,
  PrescriptionLifecycleStatus.partially_fulfilled,
  PrescriptionLifecycleStatus.ready,
  PrescriptionLifecycleStatus.dispatched,
  PrescriptionLifecycleStatus.completed,
];

export const EXCEPTION_LIFECYCLE_STATUSES: PrescriptionLifecycleStatus[] = [
  PrescriptionLifecycleStatus.on_hold,
  PrescriptionLifecycleStatus.rejected,
  PrescriptionLifecycleStatus.cancelled,
];

export const LIFECYCLE_STATUS_LABELS: Record<PrescriptionLifecycleStatus, {
  label: string;
  badgeClass: string;
  description: string;
  stepIndex: number;
}> = {
  [PrescriptionLifecycleStatus.received]: {
    label: "Received",
    badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30",
    description: "Captured into pharmacy queue; pending clinical review",
    stepIndex: 1,
  },
  [PrescriptionLifecycleStatus.under_review]: {
    label: "Under Review",
    badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30",
    description: "Pharmacist performing patient, prescriber, and dosage safety verification",
    stepIndex: 2,
  },
  [PrescriptionLifecycleStatus.approved]: {
    label: "Approved",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
    description: "Clinical verification passed; authorized for dispensing",
    stepIndex: 3,
  },
  [PrescriptionLifecycleStatus.partially_fulfilled]: {
    label: "Partially Fulfilled",
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30",
    description: "Partial quantity dispensed; balance remaining for subsequent supply",
    stepIndex: 4,
  },
  [PrescriptionLifecycleStatus.ready]: {
    label: "Ready",
    badgeClass: "bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-500/30",
    description: "Packed, labeled, and staged in collection bin or dispatch staging",
    stepIndex: 5,
  },
  [PrescriptionLifecycleStatus.dispatched]: {
    label: "Dispatched / Picked Up",
    badgeClass: "bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 border border-emerald-600/30",
    description: "Handed over to patient at counter or collected by delivery rider",
    stepIndex: 6,
  },
  [PrescriptionLifecycleStatus.completed]: {
    label: "Completed",
    badgeClass: "bg-emerald-700/15 text-emerald-900 dark:text-emerald-200 border border-emerald-700/30",
    description: "Full therapeutic course completed and all refills dispensed",
    stepIndex: 7,
  },
  [PrescriptionLifecycleStatus.on_hold]: {
    label: "On Hold",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30",
    description: "Awaiting prescriber clarification, stock arrival, or patient confirmation",
    stepIndex: -1,
  },
  [PrescriptionLifecycleStatus.rejected]: {
    label: "Rejected",
    badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30",
    description: "Refused by pharmacist due to clinical contraindication or invalidity",
    stepIndex: -2,
  },
  [PrescriptionLifecycleStatus.cancelled]: {
    label: "Cancelled",
    badgeClass: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border border-slate-500/30",
    description: "Discontinued by patient or prescriber prior to completion",
    stepIndex: -3,
  },
};

// ── Dosage & Quantity Mathematical Engines ────────────────────

export type QuantityCalculationInput = {
  unitsPerDose: number;
  frequency: string;
  timesCount?: number;
  daysSupply: number;
};

export function getDosesPerDay(frequency: string, timesCount = 1): number {
  const f = (frequency || "").toLowerCase().trim();
  if (f === "qd" || f === "once" || f === "daily" || f === "od") return 1;
  if (f === "bid" || f === "twice") return 2;
  if (f === "tid" || f === "three_times") return 3;
  if (f === "qid" || f === "four_times") return 4;
  if (f === "with_meals") return 3;
  if (f === "q4h") return 6;
  if (f === "q6h") return 4;
  if (f === "q8h") return 3;
  if (f === "q12h") return 2;
  if (f === "prn" || f === "as_needed") return 1;
  if (f === "custom") return Math.max(1, timesCount);
  return Math.max(1, timesCount);
}

/**
 * Calculates total required units based on standard clinical formula:
 * Total Quantity = Units Per Dose × Doses Per Day × Days Supply
 */
export function calculatePrescriptionQuantity(input: QuantityCalculationInput): {
  dosesPerDay: number;
  totalQuantity: number;
  dailyTotalUnits: number;
} {
  const dosesPerDay = getDosesPerDay(input.frequency, input.timesCount);
  const unitsPerDose = Math.max(0.25, input.unitsPerDose || 1);
  const daysSupply = Math.max(1, input.daysSupply || 30);
  const dailyTotalUnits = unitsPerDose * dosesPerDay;
  const totalQuantity = Math.ceil(dailyTotalUnits * daysSupply);

  return {
    dosesPerDay,
    dailyTotalUnits,
    totalQuantity,
  };
}

/**
 * Calculates course duration and projected refill due date from available quantity.
 */
export function calculatePrescriptionDuration(input: {
  quantity: number;
  unitsPerDose: number;
  frequency: string;
  timesCount?: number;
  startDate?: Date | string | null;
}): {
  daysSupply: number;
  dosesPerDay: number;
  startDate: Date;
  endDate: Date;
  nextRefillDue: Date;
} {
  const start = input.startDate ? new Date(input.startDate) : new Date();
  const dosesPerDay = getDosesPerDay(input.frequency, input.timesCount);
  const unitsPerDose = Math.max(0.25, input.unitsPerDose || 1);
  const dailyUsage = unitsPerDose * dosesPerDay;
  const daysSupply = Math.max(1, Math.floor((input.quantity || 30) / Math.max(0.1, dailyUsage)));

  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + daysSupply);

  // Recommended refill reminder is 5 days before course exhaustion (or 80% through course)
  const refillLeadDays = Math.min(5, Math.max(2, Math.floor(daysSupply * 0.2)));
  const nextRefillDue = new Date(endDate);
  nextRefillDue.setDate(nextRefillDue.getDate() - refillLeadDays);

  return {
    daysSupply,
    dosesPerDay,
    startDate: start,
    endDate,
    nextRefillDue,
  };
}

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

import {
  PrescriptionIntakeChannel,
  PrescriptionLifecycleStatus,
  ClarificationStatus,
  PrescriptionStatus,
} from "@/app/generated/prisma/enums";

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
  if (timesCount > 1) return timesCount;
  if (f === "od" || f === "once daily" || f === "daily" || f === "q24h") return 1;
  if (f === "bd" || f === "twice daily" || f === "bid" || f === "q12h") return 2;
  if (f === "tds" || f === "three times daily" || f === "tid" || f === "q8h") return 3;
  if (f === "qds" || f === "four times daily" || f === "qid" || f === "q6h") return 4;
  if (f === "prn" || f === "as needed") return 1;
  return Math.max(1, timesCount);
}

export function calculatePrescriptionQuantity(input: QuantityCalculationInput): {
  totalQuantity: number;
  dosesPerDay: number;
  formulaDescription: string;
} {
  const dosesPerDay = getDosesPerDay(input.frequency, input.timesCount);
  const unitsPerDose = Math.max(0.25, input.unitsPerDose || 1);
  const daysSupply = Math.max(1, input.daysSupply || 30);
  const totalQuantity = Math.ceil(unitsPerDose * dosesPerDay * daysSupply);

  return {
    totalQuantity,
    dosesPerDay,
    formulaDescription: `${unitsPerDose} unit(s) × ${dosesPerDay} dose(s)/day × ${daysSupply} days = ${totalQuantity} units`,
  };
}

export function calculatePrescriptionDuration(input: {
  quantity: number;
  unitsPerDose: number;
  frequency: string;
  timesCount?: number;
  startDate?: Date | string;
}): {
  daysSupply: number;
  calculatedEndDate: Date;
  nextRefillDueDate: Date;
} {
  const dosesPerDay = getDosesPerDay(input.frequency, input.timesCount);
  const unitsPerDose = Math.max(0.25, input.unitsPerDose || 1);
  const dailyConsumption = unitsPerDose * dosesPerDay;
  const daysSupply = Math.max(1, Math.floor((input.quantity || 30) / dailyConsumption));

  const start = input.startDate ? new Date(input.startDate) : new Date();
  const calculatedEndDate = new Date(start.getTime() + daysSupply * 24 * 60 * 60 * 1000);
  // Refill alert typically 5 days prior to runout
  const refillLeadDays = Math.min(5, Math.max(1, Math.floor(daysSupply * 0.2)));
  const nextRefillDueDate = new Date(calculatedEndDate.getTime() - refillLeadDays * 24 * 60 * 60 * 1000);

  return {
    daysSupply,
    calculatedEndDate,
    nextRefillDueDate,
  };
}

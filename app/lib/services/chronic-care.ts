import "server-only";

import { prisma } from "@/app/lib/db";
import { computeRefillScheduleMetrics } from "@/app/lib/services/refills";
import { addTimelineEvent } from "@/app/lib/auth";

export const CHRONIC_CONDITION_CATEGORIES = [
  { id: "hypertension", name: "Hypertension & Blood Pressure", color: "rose" },
  { id: "diabetes", name: "Diabetes & Glycemic Control", color: "amber" },
  { id: "cardiovascular", name: "Cardiovascular & Heart Health", color: "red" },
  { id: "dyslipidemia", name: "Cholesterol & Dyslipidemia", color: "orange" },
  { id: "respiratory", name: "Asthma & Respiratory (COPD)", color: "sky" },
  { id: "thyroid", name: "Thyroid & Endocrine", color: "indigo" },
  { id: "mental_health", name: "Mental Health & Neurological", color: "purple" },
  { id: "arthritis", name: "Arthritis & Pain Management", color: "emerald" },
  { id: "other", name: "Other Maintenance Therapy", color: "teal" },
] as const;

export type ChronicMedicationItem = {
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
  prescriberEmail: string | null;
  chronicCondition: string;
  isSynced: boolean;
  syncAnchorDay: number | null;
  refillsRemaining: number;
  daysRemaining: number;
  nextRefillDue: Date | null;
  status: string;
  needsPrescriberRenewal: boolean;
  renewalStatus?: string;
};

export type ChronicCareSummary = {
  totalChronicPatients: number;
  totalChronicPrescriptions: number;
  syncedPrescriptionsCount: number;
  renewalNeededCount: number;
  conditionBreakdown: Array<{ id: string; name: string; count: number; color: string }>;
};

/**
 * Returns comprehensive Chronic Medication Management dashboard metrics.
 */
export async function getChronicCareDashboardData(): Promise<{
  summary: ChronicCareSummary;
  chronicMedications: ChronicMedicationItem[];
  renewalNeededList: ChronicMedicationItem[];
}> {
  const activePrescriptions = await prisma.prescription.findMany({
    where: {
      status: "active",
      OR: [
        { isChronic: true },
        { refillsRemaining: { gt: 1 } },
        { isSynced: true },
        { daysSupply: { gte: 28 } },
      ],
    },
    include: {
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          user: { select: { email: true } },
          syncEnrollment: true,
        },
      },
      clarificationLogs: {
        where: { inquiryDetails: { contains: "renewal", mode: "insensitive" } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ nextRefillDue: "asc" }, { refillsRemaining: "asc" }],
    take: 200,
  });

  const uniqueCustomerIds = new Set<string>();
  let syncedCount = 0;
  let renewalNeededCount = 0;

  const conditionCountMap = new Map<string, number>();
  for (const c of CHRONIC_CONDITION_CATEGORIES) conditionCountMap.set(c.id, 0);

  const chronicMedications: ChronicMedicationItem[] = activePrescriptions.map((rx) => {
    uniqueCustomerIds.add(rx.customerId);
    const metrics = computeRefillScheduleMetrics(rx);
    const refillsLeft = rx.refillsRemaining ?? 0;

    // Detect chronic category based on medication name or stored condition
    let condition = rx.chronicCondition || "other";
    const nameLower = rx.medicineName.toLowerCase();

    if (!rx.chronicCondition) {
      if (nameLower.includes("amlodipine") || nameLower.includes("losartan") || nameLower.includes("enalapril") || nameLower.includes("telmisartan") || nameLower.includes("lisinopril") || nameLower.includes("atenolol") || nameLower.includes("hydrochlorothiazide")) {
        condition = "hypertension";
      } else if (nameLower.includes("metformin") || nameLower.includes("glimepiride") || nameLower.includes("insulin") || nameLower.includes("vildagliptin") || nameLower.includes("empagliflozin") || nameLower.includes("gliclazide")) {
        condition = "diabetes";
      } else if (nameLower.includes("atorvastatin") || nameLower.includes("rosuvastatin") || nameLower.includes("simvastatin") || nameLower.includes("fenofibrate")) {
        condition = "dyslipidemia";
      } else if (nameLower.includes("salbutamol") || nameLower.includes("budesonide") || nameLower.includes("fluticasone") || nameLower.includes("montelukast") || nameLower.includes("seretide") || nameLower.includes("inhaler")) {
        condition = "respiratory";
      } else if (nameLower.includes("levothyroxine") || nameLower.includes("eltroxin") || nameLower.includes("carbimazole")) {
        condition = "thyroid";
      } else if (nameLower.includes("aspirin") || nameLower.includes("clopidogrel") || nameLower.includes("warfarin") || nameLower.includes("digoxin")) {
        condition = "cardiovascular";
      } else if (nameLower.includes("sertraline") || nameLower.includes("fluoxetine") || nameLower.includes("escitalopram") || nameLower.includes("pregabalin") || nameLower.includes("carbamazepine")) {
        condition = "mental_health";
      }
    }

    conditionCountMap.set(condition, (conditionCountMap.get(condition) || 0) + 1);

    const isSynced = rx.isSynced || Boolean(rx.customer.syncEnrollment && rx.customer.syncEnrollment.status === "active");
    if (isSynced) syncedCount += 1;

    // Needs renewal if 0 or 1 refill remaining on chronic therapy
    const needsPrescriberRenewal = refillsLeft <= 1;
    if (needsPrescriberRenewal) renewalNeededCount += 1;

    const lastClarification = rx.clarificationLogs[0] || null;

    return {
      prescriptionId: rx.id,
      customerId: rx.customerId,
      customerName: rx.customer.fullName,
      phone: rx.customer.phone,
      email: rx.customer.user.email,
      medicineName: rx.medicineName,
      dosage: rx.dosage,
      rxReference: rx.rxReference,
      prescriber: rx.prescriber,
      prescriberPhone: rx.prescriberPhone,
      prescriberEmail: rx.prescriberEmail,
      chronicCondition: condition,
      isSynced,
      syncAnchorDay: rx.syncAnchorDay || rx.customer.syncEnrollment?.anchorDay || null,
      refillsRemaining: refillsLeft,
      daysRemaining: metrics.daysRemaining,
      nextRefillDue: rx.nextRefillDue,
      status: rx.status,
      needsPrescriberRenewal,
      renewalStatus: lastClarification ? (lastClarification.resolved ? "Renewed by Prescriber" : "Outreach in Progress") : undefined,
    };
  });

  const conditionBreakdown = CHRONIC_CONDITION_CATEGORIES.map((c) => ({
    id: c.id,
    name: c.name,
    count: conditionCountMap.get(c.id) || 0,
    color: c.color,
  }));

  const renewalNeededList = chronicMedications.filter((m) => m.needsPrescriberRenewal);

  return {
    summary: {
      totalChronicPatients: uniqueCustomerIds.size,
      totalChronicPrescriptions: chronicMedications.length,
      syncedPrescriptionsCount: syncedCount,
      renewalNeededCount,
      conditionBreakdown,
    },
    chronicMedications,
    renewalNeededList,
  };
}

/**
 * Initiates physician renewal re-authorization for a chronic maintenance prescription.
 */
export async function requestPrescriberChronicRenewal(input: {
  prescriptionId: string;
  additionalRefillsRequested?: number;
  contactMethod?: string;
  inquiryDetails?: string;
  staffId: string;
}) {
  const rx = await prisma.prescription.findUnique({
    where: { id: input.prescriptionId },
    include: {
      customer: { select: { id: true, fullName: true, phone: true } },
    },
  });

  if (!rx) throw new Error("Prescription not found");

  const method = input.contactMethod || "email";
  const contactTarget = rx.prescriberEmail || rx.prescriberPhone || rx.prescriber || "Attending Physician";
  const details = input.inquiryDetails || `Chronic maintenance therapy for ${rx.medicineName} (${rx.dosage || "standard"}). Current prescription has ${rx.refillsRemaining ?? 0} refills left. Requesting authorization for ${input.additionalRefillsRequested || 6} recurring maintenance refills.`;

  // Create clarification log
  const log = await prisma.prescriptionClarificationLog.create({
    data: {
      prescriptionId: rx.id,
      contactMethod: method,
      contactedTo: contactTarget,
      inquiryDetails: details,
      resolved: false,
      staffId: input.staffId,
    },
  });

  // Update prescription clarification status
  await prisma.prescription.update({
    where: { id: rx.id },
    data: {
      clarificationStatus: "contacted",
      clarificationContactMethod: method,
      clarificationContactedAt: new Date(),
      clarificationNotes: details,
    },
  });

  // Add customer timeline event
  await addTimelineEvent(
    rx.customerId,
    input.staffId,
    "chronic_renewal_requested",
    `Physician Renewal Requested: ${rx.medicineName}`,
    `Contacted ${contactTarget} via ${method} for chronic refill re-authorization.`,
    { prescriptionId: rx.id, logId: log.id, refillsRemaining: rx.refillsRemaining },
    input.staffId,
  );

  return log;
}

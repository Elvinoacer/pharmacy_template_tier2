import "server-only";

import { prisma } from "@/app/lib/db";
import { addTimelineEvent } from "@/app/lib/auth";
import {
  classifyBloodPressure,
  classifyBloodGlucose,
  calculateAndClassifyBmi,
  classifyTemperature,
  type ReferralDestination,
  type ReferralUrgency,
} from "@/app/lib/screening-utils";

export * from "@/app/lib/screening-utils";

// ── Database CRUD Operations ──────────────────────────────────

export type RecordScreeningInput = {
  customerId?: string | null;
  conductedById?: string | null;
  screeningType: string;
  patientName: string;
  patientPhone?: string | null;
  patientEmail?: string | null;
  patientAge?: number | null;
  patientGender?: string | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  pulseRate?: number | null;
  bloodGlucose?: number | null;
  glucoseUnit?: string;
  fastingStatus?: string;
  weightKg?: number | null;
  heightCm?: number | null;
  waistCircumferenceCm?: number | null;
  temperatureC?: number | null;
  spO2Percent?: number | null;
  poctType?: string | null;
  poctResult?: string | null;
  poctValues?: Record<string, any>;
  notes?: string | null;
  equipmentUsed?: string | null;
  requiresReferral?: boolean;
  referralUrgency?: ReferralUrgency | null;
};

/**
 * Creates a new Health Screening Record in the database.
 */
export async function recordHealthScreening(input: RecordScreeningInput) {
  const bpCls = classifyBloodPressure(input.systolicBp, input.diastolicBp);
  const bgCls = classifyBloodGlucose(input.bloodGlucose, input.glucoseUnit, input.fastingStatus);
  const bmiCls = calculateAndClassifyBmi(input.weightKg, input.heightCm);
  const tempCls = classifyTemperature(input.temperatureC);

  let autoReferral = input.requiresReferral ?? false;
  let autoUrgency = input.referralUrgency || "routine";

  if (bpCls.category === "hypertensive_crisis" || bgCls.category === "hypoglycemia" || (input.spO2Percent && input.spO2Percent < 90)) {
    autoReferral = true;
    autoUrgency = "emergency";
  } else if (bpCls.category === "stage_2_hypertension" || bgCls.category === "diabetes_range" || tempCls.category === "high_fever") {
    autoReferral = true;
    if (autoUrgency === "routine") autoUrgency = "urgent";
  }

  const record = await prisma.healthScreeningRecord.create({
    data: {
      customerId: input.customerId || null,
      conductedById: input.conductedById || null,
      screeningType: input.screeningType || "general",
      patientName: input.patientName.trim(),
      patientPhone: input.patientPhone?.trim() || null,
      patientEmail: input.patientEmail?.trim().toLowerCase() || null,
      patientAge: input.patientAge || null,
      patientGender: input.patientGender || null,
      systolicBp: input.systolicBp || null,
      diastolicBp: input.diastolicBp || null,
      pulseRate: input.pulseRate || null,
      bpCategory: input.systolicBp ? bpCls.category : null,
      bloodGlucose: input.bloodGlucose != null ? input.bloodGlucose : null,
      glucoseUnit: input.glucoseUnit || "mmol/L",
      fastingStatus: input.fastingStatus || "random",
      glucoseCategory: input.bloodGlucose != null ? bgCls.category : null,
      weightKg: input.weightKg != null ? input.weightKg : null,
      heightCm: input.heightCm != null ? input.heightCm : null,
      bmi: bmiCls.bmi != null ? bmiCls.bmi : null,
      bmiCategory: bmiCls.bmi != null ? bmiCls.category : null,
      waistCircumferenceCm: input.waistCircumferenceCm != null ? input.waistCircumferenceCm : null,
      temperatureC: input.temperatureC != null ? input.temperatureC : null,
      tempCategory: input.temperatureC != null ? tempCls.category : null,
      spO2Percent: input.spO2Percent || null,
      poctType: input.poctType || null,
      poctResult: input.poctResult || null,
      poctValues: input.poctValues || {},
      notes: input.notes?.trim() || null,
      nonDiagnosticDisclaimer: true,
      equipmentUsed: input.equipmentUsed?.trim() || "PPB-compliant calibrated clinical devices",
      requiresReferral: autoReferral,
      referralUrgency: autoReferral ? autoUrgency : null,
    },
  });

  if (input.customerId) {
    await addTimelineEvent(
      input.customerId,
      input.conductedById || null,
      "health_screening_completed",
      `Health Screening Completed (${input.screeningType.replace(/_/g, " ")})`,
      `BP: ${input.systolicBp ? `${input.systolicBp}/${input.diastolicBp} mmHg (${bpCls.label})` : "N/A"} | Glucose: ${input.bloodGlucose ? `${input.bloodGlucose} ${input.glucoseUnit || "mmol/L"}` : "N/A"} | BMI: ${bmiCls.bmi || "N/A"}${autoReferral ? ` — Referral Indicated (${autoUrgency.toUpperCase()})` : ""}`,
      { screeningId: record.id, screeningType: input.screeningType, requiresReferral: autoReferral },
      input.conductedById || undefined,
    ).catch(() => {});
  }

  return record;
}

export type CreateReferralInput = {
  screeningId?: string | null;
  customerId?: string | null;
  referredById?: string | null;
  patientName: string;
  patientPhone?: string | null;
  patientEmail?: string | null;
  patientDob?: string | null;
  patientGender?: string | null;
  destinationType: ReferralDestination;
  facilityName: string;
  facilityContact?: string | null;
  specialistType?: string | null;
  urgency: ReferralUrgency;
  reason: string;
  clinicalSummary: string;
  pharmacistRecommendations?: string | null;
};

/**
 * Creates an official Pharmacist Clinical Referral.
 */
export async function createClinicalReferral(input: CreateReferralInput) {
  const dateStr = new Date().toISOString().slice(0, 7).replace("-", "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const referenceCode = `REF-${dateStr}-${randomSuffix}`;

  const referral = await prisma.clinicalReferral.create({
    data: {
      screeningId: input.screeningId || null,
      customerId: input.customerId || null,
      referredById: input.referredById || null,
      referenceCode,
      patientName: input.patientName.trim(),
      patientPhone: input.patientPhone?.trim() || null,
      patientEmail: input.patientEmail?.trim().toLowerCase() || null,
      patientDob: input.patientDob ? new Date(input.patientDob) : null,
      patientGender: input.patientGender || null,
      destinationType: input.destinationType,
      facilityName: input.facilityName.trim(),
      facilityContact: input.facilityContact?.trim() || null,
      specialistType: input.specialistType?.trim() || null,
      urgency: input.urgency,
      reason: input.reason.trim(),
      clinicalSummary: input.clinicalSummary.trim(),
      pharmacistRecommendations: input.pharmacistRecommendations?.trim() || null,
      status: "issued",
      issuedAt: new Date(),
    },
  });

  if (input.screeningId) {
    await prisma.healthScreeningRecord.update({
      where: { id: input.screeningId },
      data: { requiresReferral: true, referralUrgency: input.urgency },
    }).catch(() => {});
  }

  if (input.customerId) {
    await addTimelineEvent(
      input.customerId,
      input.referredById || null,
      "clinical_referral_issued",
      `Clinical Referral Issued: ${input.facilityName} (${input.urgency.toUpperCase()})`,
      `Referred to ${input.destinationType.toUpperCase()} (${input.facilityName}${input.specialistType ? ` - ${input.specialistType}` : ""}). Reason: ${input.reason}. Reference: ${referenceCode}`,
      { referralId: referral.id, referenceCode, urgency: input.urgency, destinationType: input.destinationType },
      input.referredById || undefined,
    ).catch(() => {});
  }

  return referral;
}

export async function listCustomerScreenings(customerId: string) {
  return prisma.healthScreeningRecord.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    include: {
      conductedBy: { select: { id: true, email: true, role: true } },
      referrals: true,
    },
  });
}

export async function listCustomerReferrals(customerId: string) {
  return prisma.clinicalReferral.findMany({
    where: { customerId },
    orderBy: { issuedAt: "desc" },
    include: {
      referredBy: { select: { id: true, email: true, role: true } },
      screening: true,
    },
  });
}

export async function listAdminScreenings(opts?: {
  type?: string;
  referralOnly?: boolean;
  take?: number;
}) {
  return prisma.healthScreeningRecord.findMany({
    where: {
      ...(opts?.type && opts.type !== "all" ? { screeningType: opts.type } : {}),
      ...(opts?.referralOnly ? { requiresReferral: true } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts?.take ?? 100,
    include: {
      customer: { select: { id: true, fullName: true, phone: true } },
      conductedBy: { select: { id: true, email: true } },
      referrals: true,
    },
  });
}

export async function listAdminReferrals(opts?: {
  destination?: string;
  urgency?: string;
  status?: string;
  take?: number;
}) {
  return prisma.clinicalReferral.findMany({
    where: {
      ...(opts?.destination && opts.destination !== "all" ? { destinationType: opts.destination } : {}),
      ...(opts?.urgency && opts.urgency !== "all" ? { urgency: opts.urgency } : {}),
      ...(opts?.status && opts.status !== "all" ? { status: opts.status } : {}),
    },
    orderBy: { issuedAt: "desc" },
    take: opts?.take ?? 100,
    include: {
      customer: { select: { id: true, fullName: true, phone: true } },
      referredBy: { select: { id: true, email: true } },
      screening: true,
    },
  });
}

export async function getClinicalReferral(idOrCode: string) {
  return prisma.clinicalReferral.findFirst({
    where: {
      OR: [{ id: idOrCode }, { referenceCode: idOrCode }],
    },
    include: {
      customer: { select: { id: true, fullName: true, phone: true, dateOfBirth: true, gender: true } },
      referredBy: { select: { id: true, email: true, role: true } },
      screening: true,
    },
  });
}

export async function getHealthScreening(id: string) {
  return prisma.healthScreeningRecord.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, fullName: true, phone: true } },
      conductedBy: { select: { id: true, email: true } },
      referrals: true,
    },
  });
}

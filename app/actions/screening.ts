"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/app/lib/auth";
import { requirePermission } from "@/app/lib/platform/policy";
import {
  recordHealthScreening,
  createClinicalReferral,
  type ReferralDestination,
  type ReferralUrgency,
} from "@/app/lib/services/screening-service";
import { prisma } from "@/app/lib/db";

export type ScreeningActionState = {
  error?: string;
  success?: string;
  recordId?: string;
  referralCode?: string;
};

async function clinicalStaff() {
  return requirePermission(await getSessionUser(), "prescriptions.dispense");
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function recordScreeningAction(
  _prev: ScreeningActionState,
  formData: FormData,
): Promise<ScreeningActionState> {
  let user;
  try {
    user = await clinicalStaff();
  } catch {
    return { error: "Unauthorized. Licensed clinical staff permissions required." };
  }

  const patientName = String(formData.get("patientName") || "").trim();
  if (!patientName) {
    return { error: "Patient name is required." };
  }

  const customerIdRaw = String(formData.get("customerId") || "").trim();
  const customerId = customerIdRaw && customerIdRaw !== "walkin" ? customerIdRaw : null;
  const screeningType = String(formData.get("screeningType") || "wellness_check").trim();
  const patientPhone = String(formData.get("patientPhone") || "").trim() || null;
  const patientEmail = String(formData.get("patientEmail") || "").trim() || null;
  const patientAgeRaw = String(formData.get("patientAge") || "").trim();
  const patientAge = patientAgeRaw ? parseInt(patientAgeRaw, 10) : null;
  const patientGender = String(formData.get("patientGender") || "").trim() || null;

  // Vitals
  const systolicBpRaw = String(formData.get("systolicBp") || "").trim();
  const systolicBp = systolicBpRaw ? parseInt(systolicBpRaw, 10) : null;
  const diastolicBpRaw = String(formData.get("diastolicBp") || "").trim();
  const diastolicBp = diastolicBpRaw ? parseInt(diastolicBpRaw, 10) : null;
  const pulseRateRaw = String(formData.get("pulseRate") || "").trim();
  const pulseRate = pulseRateRaw ? parseInt(pulseRateRaw, 10) : null;

  const bloodGlucoseRaw = String(formData.get("bloodGlucose") || "").trim();
  const bloodGlucose = bloodGlucoseRaw ? parseFloat(bloodGlucoseRaw) : null;
  const glucoseUnit = String(formData.get("glucoseUnit") || "mmol/L").trim();
  const fastingStatus = String(formData.get("fastingStatus") || "random").trim();

  const weightKgRaw = String(formData.get("weightKg") || "").trim();
  const weightKg = weightKgRaw ? parseFloat(weightKgRaw) : null;
  const heightCmRaw = String(formData.get("heightCm") || "").trim();
  const heightCm = heightCmRaw ? parseFloat(heightCmRaw) : null;
  const waistCmRaw = String(formData.get("waistCircumferenceCm") || "").trim();
  const waistCircumferenceCm = waistCmRaw ? parseFloat(waistCmRaw) : null;

  const temperatureCRaw = String(formData.get("temperatureC") || "").trim();
  const temperatureC = temperatureCRaw ? parseFloat(temperatureCRaw) : null;
  const spO2PercentRaw = String(formData.get("spO2Percent") || "").trim();
  const spO2Percent = spO2PercentRaw ? parseInt(spO2PercentRaw, 10) : null;

  const poctType = String(formData.get("poctType") || "").trim() || null;
  const poctResult = String(formData.get("poctResult") || "").trim() || null;

  let poctValues: Record<string, unknown> = {};
  const poctValuesJson = String(formData.get("poctValuesJson") || "").trim();
  if (poctValuesJson) {
    try {
      const parsed: unknown = JSON.parse(poctValuesJson);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        poctValues = parsed as Record<string, unknown>;
      }
    } catch {
      // Invalid optional POCT JSON is ignored; structured fields still persist.
    }
  }

  const notes = String(formData.get("notes") || "").trim() || null;
  const equipmentUsed = String(formData.get("equipmentUsed") || "").trim() || null;

  const requiresReferral = formData.get("requiresReferral") === "true";
  const referralUrgency = String(
    formData.get("referralUrgency") || "routine",
  ) as ReferralUrgency;

  try {
    const record = await recordHealthScreening({
      customerId,
      conductedById: user.id,
      screeningType,
      patientName,
      patientPhone,
      patientEmail,
      patientAge,
      patientGender,
      systolicBp,
      diastolicBp,
      pulseRate,
      bloodGlucose,
      glucoseUnit,
      fastingStatus,
      weightKg,
      heightCm,
      waistCircumferenceCm,
      temperatureC,
      spO2Percent,
      poctType,
      poctResult,
      poctValues,
      notes,
      equipmentUsed,
      requiresReferral,
      referralUrgency: requiresReferral ? referralUrgency : null,
    });

    let referralCode: string | undefined;
    const issueReferralNow = formData.get("issueReferralNow") === "true";
    if (issueReferralNow) {
      const destinationType = String(
        formData.get("referralDestinationType") || "clinic",
      ) as ReferralDestination;
      const facilityName = String(
        formData.get("referralFacilityName") || "Outpatient Health Clinic",
      ).trim();
      const facilityContact = String(
        formData.get("referralFacilityContact") || "",
      ).trim() || null;
      const specialistType = String(
        formData.get("referralSpecialistType") || "",
      ).trim() || null;
      const urgency = String(
        formData.get("referralUrgency") || "routine",
      ) as ReferralUrgency;
      const reason = String(
        formData.get("referralReason") ||
          "Out of range vital parameters requiring clinical workup",
      ).trim();
      const clinicalSummary = String(
        formData.get("referralClinicalSummary") ||
          notes ||
          "Preliminary health screening findings attached.",
      ).trim();
      const recommendations = String(
        formData.get("referralRecommendations") || "",
      ).trim() || null;

      const ref = await createClinicalReferral({
        screeningId: record.id,
        customerId,
        referredById: user.id,
        patientName,
        patientPhone,
        patientEmail,
        patientDob: null,
        patientGender,
        destinationType,
        facilityName,
        facilityContact,
        specialistType,
        urgency,
        reason,
        clinicalSummary,
        pharmacistRecommendations: recommendations,
      });
      referralCode = ref.referenceCode;
    }

    revalidatePath("/admin/screenings");
    revalidatePath("/portal/screenings");
    if (customerId) {
      revalidatePath(`/admin/customers/${customerId}`);
    }

    return {
      success: referralCode
        ? `Screening recorded successfully and Clinical Referral ${referralCode} issued.`
        : "Health screening record saved successfully.",
      recordId: record.id,
      referralCode,
    };
  } catch (error: unknown) {
    console.error("[recordScreeningAction]", error);
    return { error: errorMessage(error, "Failed to record health screening.") };
  }
}

export async function issueReferralAction(
  _prev: ScreeningActionState,
  formData: FormData,
): Promise<ScreeningActionState> {
  let user;
  try {
    user = await clinicalStaff();
  } catch {
    return { error: "Unauthorized. Licensed clinical staff permissions required." };
  }

  const patientName = String(formData.get("patientName") || "").trim();
  if (!patientName) return { error: "Patient name is required." };

  const destinationType = String(
    formData.get("destinationType") || "clinic",
  ) as ReferralDestination;
  const facilityName = String(formData.get("facilityName") || "").trim();
  if (!facilityName) return { error: "Facility name is required." };

  const facilityContact = String(formData.get("facilityContact") || "").trim() || null;
  const specialistType = String(formData.get("specialistType") || "").trim() || null;
  const urgency = String(formData.get("urgency") || "routine") as ReferralUrgency;
  const reason = String(formData.get("reason") || "").trim();
  if (!reason) return { error: "Reason for referral is required." };

  const clinicalSummary = String(formData.get("clinicalSummary") || "").trim();
  if (!clinicalSummary) return { error: "Clinical findings summary is required." };

  const recommendations = String(
    formData.get("pharmacistRecommendations") || "",
  ).trim() || null;

  const screeningIdRaw = String(formData.get("screeningId") || "").trim();
  const screeningId = screeningIdRaw || null;
  const customerIdRaw = String(formData.get("customerId") || "").trim();
  const customerId = customerIdRaw || null;
  const patientPhone = String(formData.get("patientPhone") || "").trim() || null;
  const patientEmail = String(formData.get("patientEmail") || "").trim() || null;
  const patientGender = String(formData.get("patientGender") || "").trim() || null;

  try {
    const ref = await createClinicalReferral({
      screeningId,
      customerId,
      referredById: user.id,
      patientName,
      patientPhone,
      patientEmail,
      patientDob: null,
      patientGender,
      destinationType,
      facilityName,
      facilityContact,
      specialistType,
      urgency,
      reason,
      clinicalSummary,
      pharmacistRecommendations: recommendations,
    });

    revalidatePath("/admin/screenings");
    revalidatePath("/portal/screenings");
    if (customerId) {
      revalidatePath(`/admin/customers/${customerId}`);
    }

    return {
      success: `Clinical Referral Slip (${ref.referenceCode}) generated successfully.`,
      referralCode: ref.referenceCode,
      recordId: ref.id,
    };
  } catch (error: unknown) {
    console.error("[issueReferralAction]", error);
    return { error: errorMessage(error, "Failed to generate clinical referral slip.") };
  }
}

export async function updateReferralStatusAction(formData: FormData) {
  let user;
  try {
    user = await clinicalStaff();
  } catch {
    return;
  }

  const id = String(formData.get("id") || "").trim();
  const status = String(formData.get("status") || "completed").trim();
  if (!id) return;

  await prisma.clinicalReferral
    .update({
      where: { id },
      data: { status },
    })
    .catch(() => {});

  revalidatePath("/admin/screenings");
  revalidatePath("/portal/screenings");
  void user;
}

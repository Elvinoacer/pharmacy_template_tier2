"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/app/lib/auth";
import { requirePermission } from "@/app/lib/platform/policy";
import type { Permission } from "@/app/lib/platform/permissions";
import type { SessionUser } from "@/app/lib/types";
import { checkRateLimitAsync } from "@/app/lib/rate-limit";
import {
  bookVaccination,
  administerVaccination,
  updateAppointmentStatus,
  completeObservation,
  recordAefi,
  createCounsellingSession,
  updateCounsellingSession,
  upsertImmunizerCredential,
  updateImmunizationPolicy,
  createPublicHealthCampaign,
} from "@/app/lib/services/vaccination-service";
import type { ScreeningAnswers as CatalogAnswers } from "@/app/lib/vaccination-catalog";
import { PRE_VACCINATION_QUESTIONS } from "@/app/lib/vaccination-catalog";

export type VaccinationActionState = {
  error?: string;
  success?: string;
  appointmentId?: string;
  recordId?: string;
  certificateCode?: string;
  outcome?: string;
  counsellingId?: string;
};

async function permissionGuard(
  permission: Permission,
  error: string,
): Promise<{ user: SessionUser; error?: never } | { user: null; error: string }> {
  try {
    return { user: await requirePermission(await getSessionUser(), permission) };
  } catch {
    return { error, user: null };
  }
}

async function clinicalGuard() {
  return permissionGuard(
    "prescriptions.dispense",
    "Unauthorized. Licensed clinical staff permissions required.",
  );
}

export async function bookVaccinationAction(
  _prev: VaccinationActionState,
  formData: FormData,
): Promise<VaccinationActionState> {
  const vaccineSlug = String(formData.get("vaccineSlug") || "").trim();
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const dateOfBirth = String(formData.get("dateOfBirth") || "").trim();
  const gender = String(formData.get("gender") || "").trim();
  const preferredDate = String(formData.get("preferredDate") || "").trim();
  const preferredTime = String(formData.get("preferredTime") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const campaignSlug = String(formData.get("campaignSlug") || "").trim();
  const consentType = String(formData.get("consentType") || "self").trim();
  const consenterName = String(formData.get("consenterName") || fullName).trim();
  const consenterRelationship = String(formData.get("consenterRelationship") || "").trim();
  const signatureName = String(formData.get("signatureName") || "").trim();
  const visAcknowledged = formData.get("visAcknowledged") === "on" || formData.get("visAcknowledged") === "true";

  if (!vaccineSlug) return { error: "Please choose a vaccine." };
  if (!fullName || fullName.length < 2) return { error: "Your name is required." };
  if (!phone || phone.replace(/\D/g, "").length < 9) {
    return { error: "A valid phone number is required so we can confirm your appointment." };
  }
  if (!visAcknowledged) {
    return { error: "Please confirm you have read the vaccine information." };
  }
  if (!signatureName) {
    return { error: "Type your name to sign the consent." };
  }

  const answers: CatalogAnswers = {};
  for (const q of PRE_VACCINATION_QUESTIONS) {
    const raw = String(formData.get(`q_${q.id}`) || "").trim();
    if (raw === "yes" || raw === "no" || raw === "unsure") answers[q.id] = raw;
  }

  const rateKey = `vaccination-book:${phone.replace(/\D/g, "").slice(-9)}`;
  const rl = await checkRateLimitAsync(rateKey, {
    limit: 8,
    windowMs: 60 * 60 * 1000,
    failClosed: true,
  });
  if (!rl.allowed) {
    return { error: `Too many booking attempts. Try again in ${rl.retryAfterSeconds}s, or call the pharmacy.` };
  }

  const session = await getSessionUser().catch(() => null);
  // Publicly supplied contact details identify a guest but do not authenticate
  // an existing customer. Only an authenticated customer session may attach a
  // clinical appointment to that customer's longitudinal record.
  const customerId = session?.customerId ?? null;

  try {
    const result = await bookVaccination({
      vaccineSlug,
      fullName,
      phone,
      email: email || null,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      preferredDate: preferredDate || null,
      preferredTime: preferredTime || null,
      notes: notes || null,
      source: session?.customerId ? "portal" : "online",
      customerId,
      campaignSlug: campaignSlug || null,
      answers: answers,
      consentType,
      consenterName,
      consenterRelationship: consenterRelationship || null,
      signatureName,
    });

    try {
      const { recordAdminNotification } = await import("@/app/lib/services/admin-notifications");
      await recordAdminNotification({
        type: "enquiry_new",
        title:
          result.evaluation.outcome === "eligible"
            ? "New vaccination booking"
            : `Vaccination ${result.evaluation.outcome}`,
        body: `${fullName} (${phone}) — ${result.vaccine.name}. Screening: ${result.evaluation.outcome}.`,
        severity: result.evaluation.outcome === "eligible" ? "info" : "warning",
        relatedType: "immunization_appointment",
        relatedId: result.appointment.id,
      });
    } catch {
      /* non-fatal */
    }

    revalidatePath("/admin/vaccinations");
    revalidatePath("/portal/vaccinations");
    revalidatePath("/vaccinations");

    if (result.evaluation.outcome === "contraindicated") {
      return {
        appointmentId: result.appointment.id,
        outcome: result.evaluation.outcome,
        error: `We cannot administer this vaccine based on your screening: ${result.evaluation.reason} Please speak with a clinician. Your request has been logged.`,
      };
    }
    if (result.evaluation.outcome === "defer") {
      return {
        appointmentId: result.appointment.id,
        outcome: result.evaluation.outcome,
        success: `We've logged your request but recommend waiting: ${result.evaluation.reason} Call us when you have recovered.`,
      };
    }
    if (result.evaluation.outcome === "refer") {
      return {
        appointmentId: result.appointment.id,
        outcome: result.evaluation.outcome,
        success: `A pharmacist will review before vaccinating: ${result.evaluation.reason} We'll contact you on ${phone}.`,
      };
    }
    return {
      appointmentId: result.appointment.id,
      outcome: result.evaluation.outcome,
      success: `You're booked for ${result.vaccine.name}. We'll confirm timing on ${phone}. Please arrive a few minutes early and bring photo ID.`,
    };
  } catch (e) {
    console.error("[bookVaccinationAction]", e);
    return {
      error: e instanceof Error ? e.message : "Could not submit booking. Please try again or call us.",
    };
  }
}

export async function administerVaccinationAction(
  _prev: VaccinationActionState,
  formData: FormData,
): Promise<VaccinationActionState> {
  const guard = await clinicalGuard();
  if (guard.error) return { error: guard.error };
  const user = guard.user;

  const vaccineProductId = String(formData.get("vaccineProductId") || "").trim();
  const patientName = String(formData.get("patientName") || "").trim();
  const lotNumber = String(formData.get("lotNumber") || "").trim();
  const site = String(formData.get("site") || "").trim();
  if (!vaccineProductId) return { error: "Select a vaccine." };
  if (!patientName) return { error: "Patient name is required." };
  if (!lotNumber) return { error: "Lot / batch number is required." };
  if (!site) return { error: "Injection site is required." };

  const customerIdRaw = String(formData.get("customerId") || "").trim();
  const appointmentId = String(formData.get("appointmentId") || "").trim() || null;
  const doseMlRaw = String(formData.get("doseMl") || "").trim();
  const observationRaw = String(formData.get("observationMinutes") || "").trim();
  const doseNumberRaw = String(formData.get("doseNumber") || "").trim();

  try {
    const record = await administerVaccination({
      appointmentId,
      vaccineProductId,
      customerId: customerIdRaw && customerIdRaw !== "walkin" ? customerIdRaw : null,
      administeredById: user.id,
      supervisingPharmacistId: String(formData.get("supervisingPharmacistId") || "").trim() || user.id,
      patientName,
      patientDob: String(formData.get("patientDob") || "").trim() || null,
      patientGender: String(formData.get("patientGender") || "").trim() || null,
      patientPhone: String(formData.get("patientPhone") || "").trim() || null,
      doseNumber: doseNumberRaw ? parseInt(doseNumberRaw, 10) : 1,
      route: String(formData.get("route") || "IM").trim(),
      site,
      doseMl: doseMlRaw ? parseFloat(doseMlRaw) : null,
      lotNumber,
      expiryDate: String(formData.get("expiryDate") || "").trim() || null,
      manufacturer: String(formData.get("manufacturer") || "").trim() || null,
      visVersion: String(formData.get("visVersion") || "").trim() || null,
      observationMinutes: observationRaw ? parseInt(observationRaw, 10) : undefined,
      notes: String(formData.get("notes") || "").trim() || null,
      campaignId: String(formData.get("campaignId") || "").trim() || null,
    });

    revalidatePath("/admin/vaccinations");
    revalidatePath("/portal/vaccinations");
    return {
      success: `Dose recorded. Certificate ${record.certificateCode}. Observe the patient for ${record.observationMinutes} minutes.`,
      recordId: record.id,
      certificateCode: record.certificateCode,
    };
  } catch (e) {
    console.error("[administerVaccinationAction]", e);
    return { error: e instanceof Error ? e.message : "Could not record administration." };
  }
}

export async function updateAppointmentStatusAction(
  _prev: VaccinationActionState,
  formData: FormData,
): Promise<VaccinationActionState> {
  const guard = await clinicalGuard();
  if (guard.error) return { error: guard.error };
  const id = String(formData.get("appointmentId") || "").trim();
  const status = String(formData.get("status") || "").trim();
  if (!id || !status) return { error: "Missing appointment or status." };
  try {
    await updateAppointmentStatus(
      id,
      status,
      String(formData.get("staffNotes") || "").trim() || null,
      guard.user.id,
    );
    revalidatePath("/admin/vaccinations");
    return { success: `Appointment marked ${status.replace(/_/g, " ")}.`, appointmentId: id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Update failed." };
  }
}

export async function completeObservationAction(
  _prev: VaccinationActionState,
  formData: FormData,
): Promise<VaccinationActionState> {
  const guard = await clinicalGuard();
  if (guard.error) return { error: guard.error };
  const id = String(formData.get("recordId") || "").trim();
  const outcome = String(formData.get("observationOutcome") || "uneventful").trim();
  if (!id) return { error: "Missing record." };
  try {
    await completeObservation(id, outcome, guard.user.id);
    revalidatePath("/admin/vaccinations");
    return { success: `Observation closed (${outcome}).`, recordId: id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not close observation." };
  }
}

export async function recordAefiAction(
  _prev: VaccinationActionState,
  formData: FormData,
): Promise<VaccinationActionState> {
  const guard = await clinicalGuard();
  if (guard.error) return { error: guard.error };
  const immunizationId = String(formData.get("immunizationId") || "").trim();
  const symptoms = String(formData.get("symptoms") || "").trim();
  const actionTaken = String(formData.get("actionTaken") || "").trim();
  if (!immunizationId) return { error: "Select an immunisation record." };
  if (!symptoms) return { error: "Describe the symptoms." };
  if (!actionTaken) return { error: "Record the action taken." };
  try {
    await recordAefi({
      immunizationId,
      onsetAt: String(formData.get("onsetAt") || new Date().toISOString()),
      severity: String(formData.get("severity") || "mild"),
      symptoms,
      actionTaken,
      outcome: String(formData.get("outcome") || "recovering"),
      reportedToAuthority: formData.get("reportedToAuthority") === "on" || formData.get("reportedToAuthority") === "true",
      reportedById: guard.user.id,
      notes: String(formData.get("notes") || "").trim() || null,
    });
    revalidatePath("/admin/vaccinations");
    return { success: "AEFI report saved. Escalate immediately if this is severe or life-threatening." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save AEFI report." };
  }
}

export async function bookCounsellingAction(
  _prev: VaccinationActionState,
  formData: FormData,
): Promise<VaccinationActionState> {
  const topic = String(formData.get("topic") || "").trim();
  const patientName = String(formData.get("patientName") || "").trim();
  const phone = String(formData.get("patientPhone") || "").trim();
  if (!topic) return { error: "Choose a counselling topic." };
  if (!patientName) return { error: "Your name is required." };

  const session = await getSessionUser().catch(() => null);
  try {
    const row = await createCounsellingSession({
      customerId: session?.customerId ?? null,
      topic,
      format: String(formData.get("format") || "in_person"),
      patientName,
      patientPhone: phone || null,
      preferredDate: String(formData.get("preferredDate") || "").trim() || null,
      preferredTime: String(formData.get("preferredTime") || "").trim() || null,
      status: "requested",
      source: session?.customerId ? "portal" : "online",
      summary: String(formData.get("notes") || "").trim() || null,
    });

    try {
      const { recordAdminNotification } = await import("@/app/lib/services/admin-notifications");
      await recordAdminNotification({
        type: "enquiry_new",
        title: "Preventive counselling request",
        body: `${patientName} requested ${topic.replace(/_/g, " ")} counselling.`,
        severity: "info",
        relatedType: "preventive_counselling",
        relatedId: row.id,
      });
    } catch {
      /* non-fatal */
    }

    revalidatePath("/admin/vaccinations");
    revalidatePath("/portal/preventive");
    revalidatePath("/preventive");
    return {
      success: "Counselling request received. A pharmacist will confirm a time with you.",
      counsellingId: row.id,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not book counselling." };
  }
}

export async function completeCounsellingAction(
  _prev: VaccinationActionState,
  formData: FormData,
): Promise<VaccinationActionState> {
  const guard = await clinicalGuard();
  if (guard.error) return { error: guard.error };
  const id = String(formData.get("sessionId") || "").trim();
  if (!id) return { error: "Missing session." };
  try {
    await updateCounsellingSession(id, {
      status: String(formData.get("status") || "completed"),
      summary: String(formData.get("summary") || "").trim() || null,
      followUpDate: String(formData.get("followUpDate") || "").trim() || null,
      goals: String(formData.get("goals") || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      resourcesGiven: String(formData.get("resourcesGiven") || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    revalidatePath("/admin/vaccinations");
    return { success: "Counselling session updated.", counsellingId: id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Update failed." };
  }
}

export async function saveCredentialAction(
  _prev: VaccinationActionState,
  formData: FormData,
): Promise<VaccinationActionState> {
  const guard = await permissionGuard(
    "settings.manage",
    "Only pharmacy managers can manage immuniser credentials.",
  );
  if (guard.error) return { error: guard.error };
  const userId = String(formData.get("userId") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const issuedBy = String(formData.get("issuedBy") || "").trim();
  if (!userId || !title || !issuedBy) return { error: "Staff member, title, and issuer are required." };
  try {
    await upsertImmunizerCredential({
      userId,
      credentialType: String(formData.get("credentialType") || "immunization_certificate"),
      title,
      licenseNumber: String(formData.get("licenseNumber") || "").trim() || null,
      issuedBy,
      issuedAt: String(formData.get("issuedAt") || "").trim() || null,
      expiresAt: String(formData.get("expiresAt") || "").trim() || null,
      notes: String(formData.get("notes") || "").trim() || null,
    });
    revalidatePath("/admin/vaccinations");
    return { success: "Immuniser credential saved." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save credential." };
  }
}

export async function savePolicyAction(
  _prev: VaccinationActionState,
  formData: FormData,
): Promise<VaccinationActionState> {
  const guard = await permissionGuard(
    "settings.manage",
    "Only pharmacy managers can change immunisation policy.",
  );
  if (guard.error) return { error: guard.error };
  try {
    await updateImmunizationPolicy({
      enabled: formData.get("enabled") === "on" || formData.get("enabled") === "true",
      jurisdiction: String(formData.get("jurisdiction") || "Kenya"),
      authorizingBody: String(formData.get("authorizingBody") || ""),
      authorizingRegulation: String(formData.get("authorizingRegulation") || "") || null,
      supervisingPharmacistRequired:
        formData.get("supervisingPharmacistRequired") === "on" ||
        formData.get("supervisingPharmacistRequired") === "true",
      observationMinutesDefault: parseInt(String(formData.get("observationMinutesDefault") || "15"), 10),
      visRequired: formData.get("visRequired") === "on" || formData.get("visRequired") === "true",
      walkInAccepted: formData.get("walkInAccepted") === "on" || formData.get("walkInAccepted") === "true",
      paediatricOnSite: formData.get("paediatricOnSite") === "on" || formData.get("paediatricOnSite") === "true",
      publicDisclaimer: String(formData.get("publicDisclaimer") || "") || null,
      coldChainNotes: String(formData.get("coldChainNotes") || "") || null,
      aefiReportingContact: String(formData.get("aefiReportingContact") || "") || null,
      updatedById: guard.user.id,
    });
    revalidatePath("/admin/vaccinations");
    revalidatePath("/vaccinations");
    return { success: "Immunisation policy updated." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save policy." };
  }
}

export async function createCampaignAction(
  _prev: VaccinationActionState,
  formData: FormData,
): Promise<VaccinationActionState> {
  const guard = await permissionGuard(
    "campaigns.create",
    "You do not have permission to publish public-health campaigns.",
  );
  if (guard.error) return { error: guard.error };
  const title = String(formData.get("title") || "").trim();
  const slug = String(formData.get("slug") || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!title || !slug) return { error: "Title and slug are required." };
  try {
    await createPublicHealthCampaign({
      slug,
      title,
      theme: String(formData.get("theme") || "vaccination"),
      description: String(formData.get("description") || "").trim(),
      short: String(formData.get("short") || "").trim() || title,
      startDate: String(formData.get("startDate") || new Date().toISOString().slice(0, 10)),
      endDate: String(formData.get("endDate") || "").trim() || null,
      targetPopulation: String(formData.get("targetPopulation") || "General public"),
      vaccinesOffered: String(formData.get("vaccinesOffered") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      walkInDays: String(formData.get("walkInDays") || "").trim() || null,
      targetDoses: String(formData.get("targetDoses") || "").trim()
        ? parseInt(String(formData.get("targetDoses")), 10)
        : null,
      educationTopics: String(formData.get("educationTopics") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      locationNotes: String(formData.get("locationNotes") || "").trim() || null,
      regulatoryNotes: String(formData.get("regulatoryNotes") || "").trim() || null,
      heroImage: String(formData.get("heroImage") || "").trim() || null,
    });
    revalidatePath("/admin/vaccinations");
    revalidatePath("/preventive");
    revalidatePath("/vaccinations");
    return { success: "Public-health campaign published." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create campaign." };
  }
}
"use server";

import { revalidatePath } from "next/cache";
import {
  createEmailVerification,
  getSessionUser,
} from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { emailVerificationBody, sendDelivery } from "@/app/lib/services/delivery";
import {
  loadApprovalReadiness,
  VERIFICATION_CHECKLIST_EVENT,
  VERIFICATION_PROFILE_EVENT,
  verificationRiskScore,
  type VerificationChecklist,
} from "@/app/lib/services/pharmacy-verification";
import { requirePlatformAction } from "@/app/lib/platform/policy";
import { recordAuditRequired } from "@/app/lib/platform/audit";
import {
  reviewPharmacyAction,
  type ReviewActionState,
} from "@/app/actions/platform";

export type VerificationActionState = {
  error?: string;
  success?: string;
};

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function checked(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function validVerificationReference(value: string, pharmacyId: string, kind: "license" | "business") {
  return value.startsWith(`r2-private://pharmacy-verification/${pharmacyId}/${kind}/`);
}

function isExpired(dateInput: string) {
  const parsed = new Date(`${dateInput}T23:59:59+03:00`);
  return Number.isNaN(parsed.getTime()) || parsed.getTime() < Date.now();
}

export async function savePharmacyVerificationProfileAction(
  _prev: VerificationActionState,
  formData: FormData,
): Promise<VerificationActionState> {
  try {
    const user = await getSessionUser();
    if (!user) return { error: "Sign in before editing the verification dossier." };

    const pharmacyId = text(formData, "pharmacyId");
    const pharmacy = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) return { error: "Pharmacy application not found." };
    if (pharmacy.ownerUserId !== user.id && !user.platformAdmin) {
      return { error: "You do not own this pharmacy application." };
    }
    if (!["draft", "needs_info"].includes(pharmacy.status)) {
      return { error: "This verification dossier can no longer be edited while the application is in review." };
    }

    const licenseNumber = text(formData, "licenseNumber") || pharmacy.licenseNumber || "";
    const ppbPremisesNumber = text(formData, "ppbPremisesNumber");
    const facilityType = text(formData, "facilityType");
    const physicalAddress = text(formData, "physicalAddress");
    const licenseExpiryDate = text(formData, "licenseExpiryDate");
    const licenseQrPayload = text(formData, "licenseQrPayload");
    const licenseDocumentUrl = text(formData, "licenseDocumentUrl");
    const superintendentName = text(formData, "superintendentName");
    const superintendentRegistrationNumber = text(formData, "superintendentRegistrationNumber");
    const superintendentPracticeLicenseNumber = text(formData, "superintendentPracticeLicenseNumber");
    const ownershipType = text(formData, "ownershipType");
    const businessRegistrationNumber = text(formData, "businessRegistrationNumber");
    const kraPin = text(formData, "kraPin");
    const businessDocumentUrl = text(formData, "businessDocumentUrl");
    const applicantAuthorityConfirmed = checked(formData, "applicantAuthorityConfirmed");

    const required: Array<[string, string]> = [
      [licenseNumber, "PPB / premises licence number"],
      [ppbPremisesNumber, "PPB premises/facility number"],
      [facilityType, "facility type"],
      [physicalAddress, "physical premises address"],
      [licenseExpiryDate, "licence expiry date"],
      [licenseDocumentUrl, "current PPB licence image"],
      [superintendentName, "responsible professional name"],
      [superintendentRegistrationNumber, "professional PPB registration/enrolment number"],
      [superintendentPracticeLicenseNumber, "professional practice licence number"],
      [ownershipType, "business ownership type"],
      [businessRegistrationNumber, "business registration number"],
      [businessDocumentUrl, "business registration evidence"],
    ];
    const missing = required.filter(([value]) => !value).map(([, label]) => label);
    if (!applicantAuthorityConfirmed) missing.push("applicant authority declaration");
    if (missing.length) {
      return { error: `Complete the verification dossier first: ${missing.join(", ")}.` };
    }

    if (isExpired(licenseExpiryDate)) {
      return { error: "The submitted PPB premises licence expiry date must be valid and in the future." };
    }
    if (!validVerificationReference(licenseDocumentUrl, pharmacyId, "license")) {
      return { error: "Upload the PPB licence through the secure document uploader." };
    }
    if (!validVerificationReference(businessDocumentUrl, pharmacyId, "business")) {
      return { error: "Upload the business-registration evidence through the secure document uploader." };
    }

    const duplicate = await prismaUnscoped.pharmacy.findFirst({
      where: {
        id: { not: pharmacyId },
        OR: [
          { licenseNumber: { equals: licenseNumber, mode: "insensitive" } },
          { ppbPremisesNumber: { equals: ppbPremisesNumber, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, licenseNumber: true, ppbPremisesNumber: true, status: true },
    });
    if (duplicate) {
      return {
        error: "That PPB licence or premises number is already attached to another pharmacy application. Contact platform support if this is a legitimate transfer or duplicate record.",
      };
    }

    const declaredAt = new Date().toISOString();
    await prismaUnscoped.$transaction([
      prismaUnscoped.pharmacy.update({
        where: { id: pharmacyId },
        data: {
          licenseNumber,
          ppbPremisesNumber,
          licenseDocumentUrl,
          kraPin: kraPin || null,
        },
      }),
      prismaUnscoped.pharmacyOnboardingEvent.create({
        data: {
          pharmacyId,
          actorId: user.id,
          type: VERIFICATION_PROFILE_EVENT,
          message: "Regulatory verification dossier updated",
          meta: {
            schemaVersion: 1,
            facilityType,
            physicalAddress,
            licenseExpiryDate,
            licenseQrPayload: licenseQrPayload || null,
            superintendentName,
            superintendentRegistrationNumber,
            superintendentPracticeLicenseNumber,
            ownershipType,
            businessRegistrationNumber,
            businessDocumentUrl,
            applicantAuthorityConfirmed,
            declaredAt,
          },
        },
      }),
    ]);

    revalidatePath("/onboard");
    revalidatePath("/onboard/verification");
    revalidatePath(`/platform/pharmacies/${pharmacyId}`);
    revalidatePath(`/platform/pharmacies/${pharmacyId}/verification`);
    return { success: "Verification dossier saved. You can now return to onboarding and submit for review." };
  } catch (err) {
    console.error("[verification] save owner dossier", err);
    return { error: err instanceof Error ? err.message : "Could not save the verification dossier." };
  }
}

export async function resendOwnerVerificationEmailAction(
  _prev: VerificationActionState,
  _formData: FormData,
): Promise<VerificationActionState> {
  try {
    const session = await getSessionUser();
    if (!session) return { error: "Sign in first." };

    const user = await prismaUnscoped.user.findUnique({
      where: { id: session.id },
      select: { id: true, email: true, emailVerified: true },
    });
    if (!user) return { error: "Account not found." };
    if (user.emailVerified) return { success: "Your email is already verified." };

    const token = await createEmailVerification(user.id);
    const delivery = await sendDelivery({
      channel: "email",
      purpose: "transactional",
      recipient: { email: user.email },
      subject: "Verify your email for pharmacy onboarding",
      body: emailVerificationBody(token),
    });
    if (delivery.status === "failed") {
      console.error("[verification] email delivery failed", delivery.error);
      return { error: "Could not send the verification email. Try again shortly." };
    }
    return { success: `Verification email sent to ${user.email}.` };
  } catch (err) {
    console.error("[verification] resend owner email", err);
    return { error: "Could not send the verification email." };
  }
}

export async function savePharmacyVerificationChecklistAction(
  _prev: VerificationActionState,
  formData: FormData,
): Promise<VerificationActionState> {
  try {
    const reviewer = await requirePlatformAction(["super_admin"], { stepUp: true });
    const pharmacyId = text(formData, "pharmacyId");
    const pharmacy = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) return { error: "Pharmacy application not found." };

    const checklist: VerificationChecklist = {
      ppbRegistryMatched: checked(formData, "ppbRegistryMatched"),
      licenceActive: checked(formData, "licenceActive"),
      licenceDocumentMatched: checked(formData, "licenceDocumentMatched"),
      practitionerMatched: checked(formData, "practitionerMatched"),
      locationMatched: checked(formData, "locationMatched"),
      ownershipVerified: checked(formData, "ownershipVerified"),
      applicantAuthorityVerified: checked(formData, "applicantAuthorityVerified"),
      contactVerified: checked(formData, "contactVerified"),
      noCriticalMismatch: checked(formData, "noCriticalMismatch"),
      ppbRegistrySource: text(formData, "ppbRegistrySource") || "https://practice.pharmacyboardkenya.org/LicenseStatus?register=facilities",
      practitionerRegistrySource: text(formData, "practitionerRegistrySource") || "https://practice.pharmacyboardkenya.org/LicenseStatus?registers=search",
      checkedAt: new Date().toISOString(),
      notes: text(formData, "notes") || null,
    };
    const riskScore = verificationRiskScore(checklist);

    await prismaUnscoped.$transaction([
      prismaUnscoped.pharmacyOnboardingEvent.create({
        data: {
          pharmacyId,
          actorId: reviewer.id,
          type: VERIFICATION_CHECKLIST_EVENT,
          message: riskScore === 0 ? "Verification checklist passed" : `Verification checklist saved with risk score ${riskScore}`,
          meta: { ...checklist, riskScore, schemaVersion: 1 },
        },
      }),
      ...(pharmacy.status === "submitted"
        ? [prismaUnscoped.pharmacy.update({ where: { id: pharmacyId }, data: { status: "under_review" } })]
        : []),
    ]);

    await recordAuditRequired({
      actorId: reviewer.id,
      action: "pharmacy.verification_checklist",
      resource: "pharmacy",
      resourceId: pharmacyId,
      tenantId: pharmacyId,
      reason: checklist.notes,
      details: { riskScore },
    });

    revalidatePath("/platform/applications");
    revalidatePath(`/platform/pharmacies/${pharmacyId}`);
    revalidatePath(`/platform/pharmacies/${pharmacyId}/verification`);
    return {
      success:
        riskScore === 0
          ? "All mandatory verification checks are recorded as passed. Approval is now unlocked."
          : `Checklist saved. Risk score ${riskScore}/100; approval remains blocked until every mandatory check passes.`,
    };
  } catch (err) {
    console.error("[verification] save reviewer checklist", err);
    return { error: err instanceof Error ? err.message : "Could not save the verification checklist." };
  }
}

export async function safeReviewPharmacyAction(
  prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const decision = text(formData, "decision");
  const pharmacyId = text(formData, "pharmacyId");

  if (decision === "approve") {
    const readiness = await loadApprovalReadiness(pharmacyId);
    if (!readiness.ready) {
      const missing = [...readiness.profileMissing, ...readiness.checklistMissing];
      return {
        error: `Approval blocked. Complete mandatory pharmacy verification first: ${missing.join("; ")}.`,
      };
    }
  }

  return reviewPharmacyAction(prev, formData);
}

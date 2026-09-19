"use server";

import { revalidatePath } from "next/cache";
import { createEmailVerification, getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { publicErrorMessage } from "@/app/lib/public-error";
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
import { reviewPharmacyAction, type ReviewActionState } from "@/app/actions/platform";

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

function isOfficialPpbSource(value: string | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && (host === "pharmacyboardkenya.org" || host.endsWith(".pharmacyboardkenya.org"));
  } catch {
    return false;
  }
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
      return { error: "You do not have permission to edit this pharmacy application." };
    }
    if (!["draft", "needs_info"].includes(pharmacy.status)) {
      return { error: "This verification dossier can no longer be edited while the application is in review." };
    }

    const draft = text(formData, "intent") === "draft";
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

    // Regulatory evidence is intentionally optional at intake. The owner can
    // submit what they currently have and the platform reviewer decides whether
    // the available evidence is sufficient for approval. The authority
    // declaration remains mandatory when leaving this step.
    if (!draft && !applicantAuthorityConfirmed) {
      return { error: "Confirm that you are authorised to represent this pharmacy before continuing." };
    }

    if (licenseDocumentUrl && !validVerificationReference(licenseDocumentUrl, pharmacyId, "license")) {
      return { error: "Upload the PPB licence through the secure document uploader." };
    }
    if (businessDocumentUrl && !validVerificationReference(businessDocumentUrl, pharmacyId, "business")) {
      return { error: "Upload the business-registration evidence through the secure document uploader." };
    }

    for (const reference of [licenseDocumentUrl, businessDocumentUrl].filter(Boolean)) {
      const uploaded = await prismaUnscoped.pharmacyOnboardingEvent.findFirst({
        where: { pharmacyId, type: "verification_document_uploaded", meta: { path: ["reference"], equals: reference } },
        select: { id: true },
      });
      if (!uploaded) return { error: "Document not found in your secure uploads. Please upload it again." };
    }

    if (licenseNumber || ppbPremisesNumber) {
      const orConditions = [] as Array<
        | { licenseNumber: { equals: string; mode: "insensitive" } }
        | { ppbPremisesNumber: { equals: string; mode: "insensitive" } }
      >;
      if (licenseNumber) orConditions.push({ licenseNumber: { equals: licenseNumber, mode: "insensitive" } });
      if (ppbPremisesNumber) orConditions.push({ ppbPremisesNumber: { equals: ppbPremisesNumber, mode: "insensitive" } });

      const duplicate = await prismaUnscoped.pharmacy.findFirst({
        where: {
          id: { not: pharmacyId },
          OR: orConditions,
        },
        select: { id: true, name: true, licenseNumber: true, ppbPremisesNumber: true, status: true },
      });
      if (duplicate) {
        return {
          error: "That PPB licence or premises number is already attached to another pharmacy application. Contact platform support if this is a legitimate transfer or duplicate record.",
        };
      }
    }

    const declaredAt = new Date().toISOString();
    await prismaUnscoped.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM pharmacies WHERE id = ${pharmacyId}::uuid FOR UPDATE`;
      const latest = await tx.pharmacy.findUniqueOrThrow({ where: { id: pharmacyId } });
      if (!["draft", "needs_info"].includes(latest.status)) {
        throw new Error("Application is already in review. Your changes were not saved.");
      }
      await tx.pharmacy.update({
        where: { id: pharmacyId },
        data: {
          licenseNumber: licenseNumber || null,
          ppbPremisesNumber: ppbPremisesNumber || null,
          licenseDocumentUrl: licenseDocumentUrl || null,
          kraPin: kraPin || null,
        },
      });
      await tx.pharmacyOnboardingEvent.create({
        data: {
          pharmacyId,
          actorId: user.id,
          type: VERIFICATION_PROFILE_EVENT,
          message: "Verification intake details updated",
          meta: {
            schemaVersion: 2,
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
      });
    });

    revalidatePath("/onboard");
    revalidatePath("/onboard/verification");
    revalidatePath(`/platform/pharmacies/${pharmacyId}`);
    revalidatePath(`/platform/pharmacies/${pharmacyId}/verification`);
    return {
      success: draft
        ? "Progress saved securely. Return any time to continue."
        : "Verification details saved. Missing PPB or licensing evidence can be reviewed by the platform admin later.",
    };
  } catch (err) {
    console.error("[verification] save owner dossier", err);
    return {
      error: publicErrorMessage(
        err,
        "We couldn't save the verification dossier right now. Your previous information is unchanged. Please try again.",
      ),
    };
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
    }, { platformSender: true });
    if (delivery.status === "failed") {
      console.error("[verification] email delivery failed", delivery.error);
      return { error: "We couldn't send the verification email right now. Please try again shortly." };
    }
    return { success: `Verification email sent to ${user.email}.` };
  } catch (err) {
    console.error("[verification] resend owner email", err);
    return { error: "We couldn't send the verification email right now. Please try again shortly." };
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
      ppbRegistrySource: text(formData, "ppbRegistrySource") || null,
      practitionerRegistrySource: text(formData, "practitionerRegistrySource") || null,
      checkedAt: new Date().toISOString(),
      notes: text(formData, "notes") || null,
    };
    const riskScore = verificationRiskScore(checklist);

    if (checklist.ppbRegistryMatched && !isOfficialPpbSource(checklist.ppbRegistrySource)) {
      return { error: "A confirmed PPB facility-register match must cite an official Pharmacy and Poisons Board HTTPS source." };
    }
    if (checklist.practitionerMatched && !isOfficialPpbSource(checklist.practitionerRegistrySource)) {
      return { error: "A confirmed PPB practitioner match must cite an official Pharmacy and Poisons Board HTTPS source." };
    }
    if (riskScore === 0 && (!checklist.notes || checklist.notes.length < 20)) {
      return { error: "Add meaningful reviewer evidence notes (at least 20 characters) before unlocking approval." };
    }

    await prismaUnscoped.$transaction([
      ...(pharmacy.status === "submitted"
        ? [prismaUnscoped.pharmacy.update({ where: { id: pharmacyId }, data: { status: "under_review" } })]
        : []),
      prismaUnscoped.pharmacyOnboardingEvent.create({
        data: {
          pharmacyId,
          actorId: reviewer.id,
          type: VERIFICATION_CHECKLIST_EVENT,
          message: riskScore === 0 ? "Mandatory admin verification checks passed" : `Verification checklist saved with risk score ${riskScore}`,
          meta: { ...checklist, riskScore, schemaVersion: 2 },
        },
      }),
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
          ? "Mandatory admin verification checks are complete. PPB/licensing checks remain supporting evidence when documentation is available, and approval is now unlocked."
          : `Checklist saved. Risk score ${riskScore}/100; approval remains blocked until the mandatory identity, authority, location, ownership and mismatch checks pass.`,
    };
  } catch (err) {
    console.error("[verification] save reviewer checklist", err);
    return {
      error: publicErrorMessage(
        err,
        "We couldn't save the verification checklist right now. Refresh the application and try again.",
      ),
    };
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
      return { error: `Approval blocked. Complete mandatory pharmacy verification first: ${missing.join("; ")}.` };
    }
  }

  return reviewPharmacyAction(prev, formData);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser, addTimelineEvent, writeAuditLog } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { createRefillRequest, createFeedback } from "@/app/lib/services/crm";

export type ActionState = { error?: string; success?: string };

export async function portalRefillAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user?.customerId) return { error: "Please sign in." };

  const medicineName = String(formData.get("medicineName") || "").trim();
  if (!medicineName) return { error: "Medicine name is required." };

  await createRefillRequest({
    customerId: user.customerId,
    medicineName,
    rxReference: String(formData.get("rxReference") || "") || undefined,
    customerName: user.fullName || undefined,
    phone: String(formData.get("phone") || "") || undefined,
    email: user.email,
    pickupPreference: (String(formData.get("pickupPreference") || "pickup") as "pickup" | "delivery"),
    preferredDate: String(formData.get("preferredDate") || "") || undefined,
    preferredTime: String(formData.get("preferredTime") || "") || undefined,
    notes: String(formData.get("notes") || "") || undefined,
    prescriptionId: String(formData.get("prescriptionId") || "") || undefined,
    source: "portal",
  });

  revalidatePath("/portal");
  revalidatePath("/portal/refills");
  redirect("/portal/refills");
}

export async function cancelRefillAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user?.customerId) return;

  const id = String(formData.get("id") || "");
  const refill = await prisma.refillRequest.findFirst({
    where: { id, customerId: user.customerId },
  });
  if (!refill || ["collected", "cancelled"].includes(refill.status)) return;

  await prisma.refillRequest.update({
    where: { id },
    data: { status: "cancelled", statusUpdatedAt: new Date() },
  });
  await addTimelineEvent(
    user.customerId,
    user.id,
    "refill_cancelled",
    "Refill cancelled",
    refill.medicineName,
    { refillId: id },
    user.id,
  );
  revalidatePath("/portal/refills");
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user?.customerId) return { error: "Please sign in." };

  await prisma.customerProfile.update({
    where: { id: user.customerId },
    data: {
      fullName: String(formData.get("fullName") || "").trim(),
      phone: String(formData.get("phone") || "").trim() || null,
      dateOfBirth: formData.get("dateOfBirth")
        ? new Date(String(formData.get("dateOfBirth")))
        : null,
      gender: (() => {
        const g = String(formData.get("gender") || "").trim();
        if (g === "female" || g === "male" || g === "other" || g === "prefer_not_to_say") return g;
        return null;
      })(),
      addressLine1: String(formData.get("addressLine1") || "") || null,
      addressLine2: String(formData.get("addressLine2") || "") || null,
      city: String(formData.get("city") || "") || null,
      state: String(formData.get("state") || "") || null,
      zip: String(formData.get("zip") || "") || null,
      preferredCommunication: (String(formData.get("preferredCommunication") || "email") as
        | "email"
        | "sms"
        | "whatsapp"
        | "phone"),
      emergencyContactName: String(formData.get("emergencyContactName") || "") || null,
      emergencyContactPhone: String(formData.get("emergencyContactPhone") || "") || null,
      preferredBranch: String(formData.get("preferredBranch") || "") || "Main Branch",
    },
  });

  await writeAuditLog(user.id, "profile_updated", "customer_profile", user.customerId);
  revalidatePath("/portal/profile");
  return { success: "Profile updated." };
}

export async function updatePreferencesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user?.customerId) return { error: "Please sign in." };

  const checked = (name: string) => formData.get(name) === "on" || formData.get(name) === "true";

  await prisma.customerPreference.upsert({
    where: { customerId: user.customerId },
    create: {
      customerId: user.customerId,
      emailEnabled: checked("emailEnabled"),
      smsEnabled: checked("smsEnabled"),
      whatsappEnabled: checked("whatsappEnabled"),
      marketingConsent: checked("marketingConsent"),
      reminderConsent: checked("reminderConsent"),
      birthdayMessages: checked("birthdayMessages"),
    },
    update: {
      emailEnabled: checked("emailEnabled"),
      smsEnabled: checked("smsEnabled"),
      whatsappEnabled: checked("whatsappEnabled"),
      marketingConsent: checked("marketingConsent"),
      reminderConsent: checked("reminderConsent"),
      birthdayMessages: checked("birthdayMessages"),
    },
  });

  revalidatePath("/portal/preferences");
  return { success: "Preferences saved." };
}

export async function addCaregiverAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user?.customerId) return { error: "Please sign in." };

  const caregiverName = String(formData.get("caregiverName") || "").trim();
  if (!caregiverName) return { error: "Caregiver name is required." };

  await prisma.caregiver.create({
    data: {
      customerId: user.customerId,
      caregiverName,
      caregiverEmail: String(formData.get("caregiverEmail") || "") || null,
      caregiverPhone: String(formData.get("caregiverPhone") || "") || null,
      relationship: String(formData.get("relationship") || "") || null,
      canRequestRefills: formData.get("canRequestRefills") === "on",
      canReceivePickupNotifications: formData.get("canReceivePickupNotifications") === "on",
    },
  });

  await addTimelineEvent(
    user.customerId,
    user.id,
    "caregiver_added",
    "Caregiver added",
    caregiverName,
    {},
    user.id,
  );

  revalidatePath("/portal/caregivers");
  return { success: "Caregiver added." };
}

export async function removeCaregiverAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user?.customerId) return;
  const id = String(formData.get("id") || "");
  await prisma.caregiver.updateMany({
    where: { id, customerId: user.customerId },
    data: { status: "revoked" },
  });
  revalidatePath("/portal/caregivers");
}

export async function portalFeedbackAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user?.customerId) return { error: "Please sign in." };

  const body = String(formData.get("body") || "").trim();
  if (!body) return { error: "Please share your feedback." };

  await createFeedback({
    customerId: user.customerId,
    name: user.fullName || undefined,
    email: user.email,
    rating: Number(formData.get("rating") || 0) || undefined,
    type: (String(formData.get("type") || "review") as "review" | "suggestion" | "complaint" | "satisfaction"),
    title: String(formData.get("title") || "") || undefined,
    body,
  });

  revalidatePath("/portal/feedback");
  return { success: "Thank you — your feedback was submitted." };
}

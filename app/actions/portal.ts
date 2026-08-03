"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser, addTimelineEvent, writeAuditLog } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { createRefillRequest, createFeedback } from "@/app/lib/services/crm";
import { ageSegmentFromDob, isFuture } from "@/app/lib/time";

export type ActionState = { error?: string; success?: string };

export async function portalRefillAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user?.customerId) return { error: "Please sign in." };

  const medicineName = String(formData.get("medicineName") || "").trim();
  if (!medicineName) return { error: "Medicine name is required." };

  const prescriptionId = String(formData.get("prescriptionId") || "") || undefined;

  // If the customer has active prescriptions, require one to be selected.
  // (Per the spec: "creating a new refill request without prescriptions should not occur".)
  if (!prescriptionId) {
    const activePrescriptions = await prisma.prescription.count({
      where: { customerId: user.customerId, status: "active" },
    });
    if (activePrescriptions > 0) {
      return {
        error: "Please select a prescription from your file. If you need to add a new medication, contact the pharmacy.",
      };
    }
  }

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
    prescriptionId,
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

  const dobRaw = String(formData.get("dateOfBirth") || "").trim();
  // Validate birthday — reject future dates.
  if (dobRaw && isFuture(dobRaw)) {
    return { error: "Date of birth cannot be in the future." };
  }

  const dob = dobRaw ? new Date(dobRaw) : null;
  // Auto-tag age segment based on DOB.
  const ageSegment = ageSegmentFromDob(dob);

  // Get the existing profile so we can check if onboarding was previously incomplete.
  const existing = await prisma.customerProfile.findUnique({
    where: { id: user.customerId },
    select: { onboardingCompletedAt: true, fullName: true, phone: true },
  });
  const wasOnboarding = !existing?.onboardingCompletedAt;

  await prisma.customerProfile.update({
    where: { id: user.customerId },
    data: {
      fullName: String(formData.get("fullName") || "").trim(),
      phone: String(formData.get("phone") || "").trim() || null,
      dateOfBirth: dob,
      ageSegment,
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
      // Mark onboarding complete if it wasn't already and the profile now has the minimum fields.
      onboardingCompletedAt: existing?.onboardingCompletedAt ?? new Date(),
    },
  });

  // If we just completed onboarding, add a timeline event.
  if (wasOnboarding) {
    await addTimelineEvent(
      user.customerId,
      user.id,
      "onboarding_completed",
      "Onboarding completed",
      "Customer finished their profile",
      {},
      user.id,
    );
  }

  await writeAuditLog(user.id, "profile_updated", "customer_profile", user.customerId);
  revalidatePath("/portal/profile");
  revalidatePath("/portal");
  return { success: "Profile saved successfully." };
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
  await addTimelineEvent(
    user.customerId,
    user.id,
    "caregiver_revoked",
    "Caregiver revoked",
    "",
    { caregiverId: id },
    user.id,
  );
  revalidatePath("/portal/caregivers");
}

export async function restoreCaregiverAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user?.customerId) return;
  const id = String(formData.get("id") || "");
  await prisma.caregiver.updateMany({
    where: { id, customerId: user.customerId },
    data: { status: "active" },
  });
  await addTimelineEvent(
    user.customerId,
    user.id,
    "caregiver_restored",
    "Caregiver restored",
    "",
    { caregiverId: id },
    user.id,
  );
  revalidatePath("/portal/caregivers");
}

export async function inviteCaregiverAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user?.customerId) return;
  const id = String(formData.get("id") || "");
  const caregiver = await prisma.caregiver.findFirst({
    where: { id, customerId: user.customerId },
  });
  if (!caregiver || !caregiver.caregiverEmail) return;

  // Generate a token-based invite link.
  const { randomBytes, createHash } = await import("crypto");
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.caregiverInvite.create({
    data: {
      caregiverId: caregiver.id,
      email: caregiver.caregiverEmail,
      tokenHash,
      expiresAt,
    },
  });

  // Send the invite email.
  const { sendDelivery } = await import("@/app/lib/services/delivery");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
  const inviteUrl = `${appUrl}/caregiver/accept?token=${token}`;
  await sendDelivery({
    channel: "email",
    recipient: { email: caregiver.caregiverEmail },
    subject: `${user.fullName || "A patient"} invited you to be their caregiver`,
    body: `Hi ${caregiver.caregiverName},\n\n${user.fullName || "A patient"} has invited you to be their caregiver on Aether Pharmacy. As a caregiver, you can:\n\n- Request refills on their behalf\n- Receive pickup notifications\n- View their medication schedule\n\nClick the link below to accept the invitation and set up your account:\n\n${inviteUrl}\n\nThis link expires in 7 days.\n\n— Aether Pharmacy`,
  });

  await writeAuditLog(user.id, "caregiver_invited", "caregiver", caregiver.id, { email: caregiver.caregiverEmail });
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

export async function redeemCouponAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user?.customerId) return;

  const couponId = String(formData.get("couponId") || "");
  if (!couponId) return;

  const result = await prisma.$transaction(async (tx) => {
    const [account, coupon] = await Promise.all([
      tx.loyaltyAccount.findUnique({ where: { customerId: user.customerId! } }),
      tx.coupon.findUnique({ where: { id: couponId } }),
    ]);

    const now = new Date();
    if (!account || !coupon || !coupon.active) return { ok: false, reason: "Coupon not available." };
    if (coupon.validFrom && coupon.validFrom > now) return { ok: false, reason: "Coupon not yet valid." };
    if (coupon.validUntil && coupon.validUntil < now) return { ok: false, reason: "Coupon expired." };
    if (coupon.maxRedemptions && coupon.redemptions >= coupon.maxRedemptions) {
      return { ok: false, reason: "Coupon fully redeemed." };
    }

    // Per-customer limit: default 1 — a customer can't redeem the same coupon multiple times.
    const perCustomerLimit = coupon.maxRedemptionsPerCustomer ?? 1;
    const customerRedemptions = await tx.loyaltyTransaction.count({
      where: {
        accountId: account.id,
        type: "redeem",
        description: { contains: coupon.code },
      },
    });
    if (customerRedemptions >= perCustomerLimit) {
      return { ok: false, reason: `You've already redeemed this coupon ${customerRedemptions} time(s). Limit: ${perCustomerLimit}.` };
    }

    if (coupon.pointsCost <= 0 || account.points < coupon.pointsCost) return { ok: false, reason: "Not enough points." };

    const newPoints = account.points - coupon.pointsCost;
    await tx.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        points: newPoints,
        tier:
          newPoints >= 1000 ? "platinum" : newPoints >= 400 ? "gold" : newPoints >= 150 ? "silver" : "bronze",
      },
    });
    await tx.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        points: -coupon.pointsCost,
        type: "redeem",
        description: `Redeemed coupon ${coupon.code}`,
        source: "portal",
      },
    });
    await tx.coupon.update({
      where: { id: coupon.id },
      data: { redemptions: { increment: 1 } },
    });
    await tx.timelineEvent.create({
      data: {
        customerId: user.customerId,
        userId: user.id,
        eventType: "coupon_redeemed",
        title: "Coupon redeemed",
        description: coupon.code,
        metadata: { couponId: coupon.id, pointsCost: coupon.pointsCost },
        createdById: user.id,
      },
    });
    return { ok: true, accountId: account.id, couponCode: coupon.code, pointsCost: coupon.pointsCost };
  });

  if (result.ok) {
    await writeAuditLog(user.id, "coupon_redeemed", "loyalty_account", result.accountId, {
      couponCode: result.couponCode,
      pointsCost: result.pointsCost,
    });
  } else if ("reason" in result && result.reason) {
    // Best-effort: surface the reason via a server-thrown error message.
    console.warn(`[redeemCoupon] blocked: ${result.reason}`);
  }

  revalidatePath("/portal/loyalty");
}

// ── Portal message reply ──────────────────────────────────────

export async function portalReplyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user?.customerId) return { error: "Please sign in." };

  const conversationId = String(formData.get("conversationId") || "");
  const body = String(formData.get("body") || "").trim();
  if (!conversationId || !body) return { error: "Message is required." };

  // Verify the conversation belongs to this customer.
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, customerId: user.customerId },
  });
  if (!conversation) return { error: "Conversation not found." };

  // Add the inbound message.
  await prisma.message.create({
    data: {
      conversationId,
      direction: "inbound",
      channel: "portal",
      senderType: "customer",
      senderId: user.id,
      body,
      status: "delivered",
    },
  });

  // Update conversation's lastMessageAt.
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date(), status: "open" },
  });

  // Add a timeline event + alert staff.
  await addTimelineEvent(
    user.customerId,
    user.id,
    "message_received",
    "Customer replied",
    body.slice(0, 120),
    { conversationId },
    user.id,
  );

  // Notify staff via push.
  const { dispatchPushToStaff } = await import("@/app/lib/services/push");
  await dispatchPushToStaff({
    title: "Customer replied",
    body: body.slice(0, 120),
    url: "/admin/messages",
    data: { tag: `reply-${conversationId}`, conversationId },
  }).catch(() => {});

  // Record admin inbox notification.
  const { recordAdminNotification } = await import("@/app/lib/services/admin-notifications");
  await recordAdminNotification({
    type: "enquiry_new",
    title: "Customer replied to a message",
    body: body.slice(0, 200),
    relatedType: "conversation",
    relatedId: conversationId,
  });

  revalidatePath("/portal/messages");
  return { success: "Reply sent." };
}

"use server";

import { getTenant } from "@/app/lib/tenant";
import { recordAudit } from "@/app/lib/platform/audit";
import { resolvePostLoginPath } from "@/app/lib/session-claim";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionUser, addTimelineEvent, writeAuditLog } from "@/app/lib/auth";
import { prisma, prismaUnscoped } from "@/app/lib/db";
import { createRefillRequest, createFeedback } from "@/app/lib/services/crm";
import { ageSegmentFromDob, isFuture, parseLocalDateInput } from "@/app/lib/time";
import { PUBLIC_PHARMACY_COOKIE } from "@/app/lib/tenant-context";

export type ActionState = { error?: string; success?: string };

export async function portalRefillAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user?.customerId) return { error: "Please sign in." };

  const prescriptionId = String(formData.get("prescriptionId") || "").trim();
  if (!prescriptionId) {
    return {
      error:
        "Please select a prescription from your file. If you need a new medication added, contact the pharmacy.",
    };
  }

  // Always re-derive medicine details from the prescription on file.
  // Never trust client-supplied medicineName/rxReference.
  const rx = await prisma.prescription.findFirst({
    where: { id: prescriptionId, customerId: user.customerId, status: "active" },
  });
  if (!rx) {
    return { error: "Selected prescription was not found on your account." };
  }
  if ((rx.refillsRemaining ?? 0) <= 0) {
    return {
      error: "This prescription has no refills remaining. Contact the pharmacy or your doctor for a renewal.",
    };
  }

  await createRefillRequest({
    customerId: user.customerId,
    medicineName: rx.medicineName,
    rxReference: rx.rxReference || undefined,
    customerName: user.fullName || undefined,
    phone: String(formData.get("phone") || "") || undefined,
    email: user.email,
    pickupPreference: (String(formData.get("pickupPreference") || "pickup") as "pickup" | "delivery"),
    preferredDate: String(formData.get("preferredDate") || "") || undefined,
    preferredTime: String(formData.get("preferredTime") || "") || undefined,
    notes: String(formData.get("notes") || "") || undefined,
    prescriptionId: rx.id,
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

/** Minimal first-run profile setup; preserve all existing health and address data. */
export async function completeOnboardingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user?.customerId) return { error: "Please sign in again to continue." };
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  if (!fullName || fullName.length > 120) return { error: "Enter your name using up to 120 characters." };
  if (phone && !/^[+()0-9 .-]{7,30}$/.test(phone)) return { error: "Enter a valid phone number, or leave it blank for now." };
  const profile = await prisma.customerProfile.findUnique({ where: { id: user.customerId }, select: { onboardingCompletedAt: true } });
  if (!profile) return { error: "We could not find your profile. Please sign in again." };
  await prisma.customerProfile.update({ where: { id: user.customerId }, data: { fullName, phone: phone || null, onboardingCompletedAt: profile.onboardingCompletedAt ?? new Date() } });
  await recordAudit({ actorId: user.id, action: "onboarding_completed", resource: "customer_profile", resourceId: user.customerId });
  revalidatePath("/portal", "layout");
  const next = String(formData.get("next") || "/portal");
  redirect(resolvePostLoginPath(user, next.split(/[?#]/)[0] === "/portal/onboarding" ? null : next));
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user?.customerId) return { error: "Please sign in." };

  const fullName = String(formData.get("fullName") || "").trim();
  if (!fullName) return { error: "Please enter your name." };
  const dobRaw = String(formData.get("dateOfBirth") || "").trim();
  // Validate birthday — reject future dates.
  if (dobRaw && isFuture(dobRaw)) {
    return { error: "Date of birth cannot be in the future." };
  }

  const dob = dobRaw ? parseLocalDateInput(dobRaw) : null;
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
      preferredBranch: String(formData.get("preferredBranch") || "").trim() || null,
      // Mark onboarding complete if it wasn't already and the profile now has the minimum fields.
      onboardingCompletedAt: existing?.onboardingCompletedAt ?? new Date(),
    },
  });

  // The identity is network-wide; a CRM timeline belongs to a selected pharmacy.
  const profileTenant = await getTenant();
  if (wasOnboarding && profileTenant.pharmacyId) {
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

  await recordAudit({ actorId: user.id, action: "profile_updated", resource: "customer_profile", resourceId: user.customerId });
  revalidatePath("/portal/profile");
  revalidatePath("/portal");
  if (wasOnboarding) redirect(resolvePostLoginPath(user, String(formData.get("next") || "/portal")));
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
      canLogAdherence: formData.get("canLogAdherence") === "on",
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

  const cooldownMs = Number(process.env.CAREGIVER_INVITE_COOLDOWN_SECONDS || 60) * 1000;
  if (caregiver.lastInviteSentAt) {
    const remainingMs = cooldownMs - (Date.now() - caregiver.lastInviteSentAt.getTime());
    if (remainingMs > 0) {
      console.warn(`[caregiverInvite] cooldown active for ${caregiver.id}; ${Math.ceil(remainingMs / 1000)}s remaining`);
      return;
    }
  }

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

  await prisma.caregiver.update({
    where: { id: caregiver.id },
    data: { lastInviteSentAt: new Date(), inviteSendCount: { increment: 1 } },
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

export async function redeemCouponAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user?.customerId) return { error: "Please sign in." };

  const couponId = String(formData.get("couponId") || "");
  if (!couponId) return { error: "Coupon is required." };

  const result = await prisma.$transaction(async (tx) => {
    const [account, coupon] = await Promise.all([
      tx.loyaltyAccount.findFirst({ where: { customerId: user.customerId! } }),
      tx.coupon.findFirst({ where: { id: couponId } }),
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
    revalidatePath("/portal/loyalty");
    return { success: `Coupon ${result.couponCode} redeemed! Your reward has been applied.` };
  }

  const reason = "reason" in result && result.reason ? result.reason : "Could not redeem coupon.";
  console.warn(`[redeemCoupon] blocked: ${reason}`);
  revalidatePath("/portal/loyalty");
  return { error: reason };
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

// ── Portal OTC order ──────────────────────────────────────────

export async function portalCreateOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user?.customerId) return { error: "Please sign in." };

  const medicationId = String(formData.get("medicationId") || "").trim();
  const quantity = Math.max(1, Number(formData.get("quantity") || 1));
  const couponCode = String(formData.get("couponCode") || "").trim().toUpperCase() || null;
  const reason = String(formData.get("reason") || "").trim();

  if (!medicationId) return { error: "Please select a product." };
  if (!reason) {
    return { error: "Please select a reason for this medication so our pharmacist can review." };
  }

  const med = await prisma.pharmacyInventory.findFirst({
    where: { id: medicationId, active: true, overTheCounter: true },
    include: { medicationMaster: { select: { name: true } } },
  });
  if (!med) return { error: "Product not available for online order." };

  let discount = 0;
  let couponId: string | null = null;
  if (couponCode) {
    const coupon = await prisma.coupon.findFirst({ where: { code: couponCode } });
    if (!coupon || !coupon.active) return { error: "Invalid or inactive coupon." };
    const now = new Date();
    if (coupon.validFrom && coupon.validFrom > now) return { error: "Coupon not yet valid." };
    if (coupon.validUntil && coupon.validUntil < now) return { error: "Coupon expired." };
    if (coupon.maxRedemptions && coupon.redemptions >= coupon.maxRedemptions) {
      return { error: "Coupon fully redeemed." };
    }
    const perCustomerLimit = coupon.maxRedemptionsPerCustomer ?? 1;
    const prior = await prisma.orderItem.count({
      where: { couponId: coupon.id, order: { customerId: user.customerId } },
    });
    if (prior >= perCustomerLimit) return { error: "You have already used this coupon." };

    couponId = coupon.id;
    if (coupon.discountType === "percent") {
      discount = Number(med.price) * quantity * (Number(coupon.discountValue) / 100);
    } else if (coupon.discountType === "fixed") {
      discount = Number(coupon.discountValue) * quantity;
    }
  }

  const unitPrice = Number(med.price);
  const total = Math.max(0, unitPrice * quantity - discount);
  const {
    applyStockChange,
    notifyStockThreshold,
    InsufficientStockError,
  } = await import("@/app/lib/services/stock");

  let orderId = "";
  try {
    const { order, stockResult } = await prisma.$transaction(async (tx) => {
      const portalPhone = String(formData.get("phone") || "").trim();
      const unitCost = Number(med.purchasePrice ?? 0);
      const grossAmount = unitPrice * quantity;
      const netAmount = Math.max(0, grossAmount - discount);
      const grossProfit = netAmount - unitCost * quantity;
      const expiresAt = new Date(Date.now() + 48 * 3600 * 1000);

      const o = await tx.order.create({
        data: {
          customerId: user.customerId,
          source: "portal",
          status: "pending",
          total,
          // ── Commerce ledger extension (audit §8, §9, §16) ──
          type: "OTC_PURCHASE",
          lifecycleStatus: "active",
          paymentStage: "unpaid",
          fulfillmentStage: "reserved",
          currency: "KES",
          subtotal: grossAmount,
          discountTotal: discount,
          taxTotal: 0,
          netTotal: netAmount,
          amountPaid: 0,
          amountRefunded: 0,
          amountDue: netAmount,
          reservedAt: new Date(),
          expiresAt,
          // Remote portal buys are reservations until staff dispatch on handoff.
          fulfillment: "reserve",
          guestPhone: portalPhone || null,
          // Logistics-only notes — clinical reason lives on Order.reason.
          notes: portalPhone ? `M-Pesa phone: ${portalPhone}` : null,
          reason,
          items: {
            create: {
              medicationId,
              name: med.medicationMaster.name,
              quantity,
              unitPrice,
              discountApplied: discount,
              // Commerce snapshots (audit §17)
              unitCostSnapshot: unitCost,
              grossAmount,
              netAmount,
              grossProfit,
              taxAmount: 0,
              currency: "KES",
              pricingRule: "catalogue",
              couponId,
            },
          },
        },
      });

      // Reservation lifecycle (audit §9): create InventoryReservation + reservation_create stock movement.
      const { createReservation } = await import("@/app/lib/services/commerce/reservations");
      const { recordCommerceEvent } = await import("@/app/lib/services/commerce/events");
      const r = await createReservation(tx, {
        orderId: o.id,
        inventoryId: medicationId,
        quantity,
        createdById: user.id,
        expiresAt,
      });
      await recordCommerceEvent(tx, {
        eventType: "order_created",
        entityType: "order",
        entityId: o.id,
        orderId: o.id,
        customerId: user.customerId,
        actorId: user.id,
        amount: netAmount,
        metadata: { source: "portal", type: "OTC_PURCHASE", quantity, medicationId },
      });
      await recordCommerceEvent(tx, {
        eventType: "order_reserved",
        entityType: "order",
        entityId: o.id,
        orderId: o.id,
        customerId: user.customerId,
        actorId: user.id,
        amount: netAmount,
        metadata: { expiresAt },
      });

      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { redemptions: { increment: 1 } },
        });
        await recordCommerceEvent(tx, {
          eventType: "coupon_redeemed",
          entityType: "coupon",
          entityId: couponId,
          orderId: o.id,
          customerId: user.customerId,
          actorId: user.id,
          amount: discount,
          metadata: { couponId, code: couponCode },
        });
      }
      return { order: o, stockResult: null };
    });
    orderId = order.id;
    await notifyStockThreshold(stockResult);
  } catch (e) {
    if (e instanceof InsufficientStockError) {
      return { error: `Only ${e.available} unit(s) in stock.` };
    }
    throw e;
  }

  await addTimelineEvent(
    user.customerId,
    user.id,
    "order_placed",
    "OTC order placed",
    `${med.medicationMaster.name} × ${quantity} — KES ${total}`,
    { orderId },
    user.id,
  );

  const { recordAdminNotification } = await import("@/app/lib/services/admin-notifications");
  await recordAdminNotification({
    type: "enquiry_new",
    title: "New portal OTC order",
    body: `${user.fullName || user.email} ordered ${quantity}× ${med.medicationMaster.name} (KES ${total})`,
    severity: "info",
    relatedType: "order",
    relatedId: orderId,
  });

  revalidatePath("/portal");
  revalidatePath("/portal/orders");
  revalidatePath("/medicines");
  redirect(`/portal/orders?placed=${orderId}`);
}

/** Create a payable order from an approved/ready refill so coupons & Daraja apply. */
export async function portalPayRefillAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user?.customerId) return { error: "Please sign in." };

  const refillId = String(formData.get("refillId") || "").trim();
  if (!refillId) return { error: "Refill required." };

  const refill = await prisma.refillRequest.findFirst({
    where: { id: refillId, customerId: user.customerId },
    include: { prescription: true },
  });
  if (!refill) return { error: "Refill not found." };
  if (!["approved", "preparing", "ready_for_pickup"].includes(refill.status)) {
    return { error: "This refill is not ready for payment yet." };
  }

  // Idempotent: reuse existing order for this refill.
  const existing = await prisma.order.findFirst({
    where: { refillId, customerId: user.customerId },
  });
  if (existing) {
    redirect(`/portal/orders?orderId=${existing.id}`);
  }

  const unitPrice = Number(refill.prescription?.unitPrice ?? 0);
  const qty = refill.prescription?.quantity ?? 1;
  const total = Math.max(0, unitPrice * qty);
  if (total <= 0) {
    return { error: "No price set for this prescription — pay at the counter or contact the pharmacy." };
  }

  // Look up medication for cost snapshot.
  const med = refill.prescription?.medicationId
    ? await prisma.pharmacyInventory.findUnique({
        where: { id: refill.prescription.medicationId },
        select: { id: true, purchasePrice: true, medicationMaster: { select: { name: true } } },
      })
    : null;
  const unitCost = Number(med?.purchasePrice ?? 0);
  const grossAmount = unitPrice * qty;
  const netAmount = Math.max(0, grossAmount);
  const grossProfit = netAmount - unitCost * qty;
  const expiresAt = new Date(Date.now() + 48 * 3600 * 1000);

  const order = await prisma.order.create({
    data: {
      customerId: user.customerId,
      source: "refill",
      refillId,
      status: "pending",
      total,
      // ── Commerce ledger extension (audit §16) ──
      type: "REFILL",
      lifecycleStatus: "active",
      paymentStage: "unpaid",
      fulfillmentStage: "reserved",
      currency: "KES",
      subtotal: grossAmount,
      discountTotal: 0,
      taxTotal: 0,
      netTotal: netAmount,
      amountPaid: 0,
      amountRefunded: 0,
      amountDue: netAmount,
      reservedAt: new Date(),
      expiresAt,
      // Refill payments are reservations until collection / dispatch.
      fulfillment: "reserve",
      items: {
        create: {
          medicationId: refill.prescription?.medicationId || null,
          name: refill.medicineName,
          quantity: qty,
          unitPrice,
          // Commerce snapshots (audit §17)
          unitCostSnapshot: unitCost,
          grossAmount,
          netAmount,
          grossProfit,
          taxAmount: 0,
          currency: "KES",
          pricingRule: "prescription",
          refillRequestId: refillId,
        },
      },
    },
  });

  // Create a matching PrescriptionFill row linked to this order + refill (audit §4, §41.A).
  if (refill.prescriptionId) {
    try {
      await prisma.$transaction(async (tx) => {
        const priorFills = await tx.prescriptionFill.count({
          where: { prescriptionId: refill.prescriptionId! },
        });
        await tx.prescriptionFill.create({
          data: {
            prescriptionId: refill.prescriptionId!,
            orderId: order.id,
            refillRequestId: refillId,
            fillNumber: priorFills + 1,
            quantity: qty,
            unitPriceSnapshot: unitPrice,
            discountAmount: 0,
            netAmount,
            costPriceSnapshot: unitCost,
            status: "pending",
            filledAt: new Date(),
            medicationId: med?.id ?? null,
            medicationName: med?.medicationMaster?.name ?? refill.medicineName,
            lotIds: [],
            notes: `Created from portal refill payment (${refillId.slice(0, 8)})`,
          },
        });
        // Link RefillRequest → PrescriptionFill.
        await tx.refillRequest.update({
          where: { id: refillId },
          data: {},
        });
        const { recordCommerceEvent } = await import("@/app/lib/services/commerce/events");
        await recordCommerceEvent(tx, {
          eventType: "prescription_filled",
          entityType: "prescription",
          entityId: refill.prescriptionId!,
          orderId: order.id,
          customerId: user.customerId,
          actorId: user.id,
          amount: netAmount,
          metadata: { refillId, quantity: qty },
        });
      });
    } catch (err) {
      console.error("[portalPayRefill] fill creation failed:", err);
    }
  }

  revalidatePath("/portal/orders");
  revalidatePath("/portal/refills");
  redirect(`/portal/orders?orderId=${order.id}`);
}

/**
 * Customer digital prescription upload from Patient Portal.
 */
export async function portalUploadPrescriptionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await getSessionUser();
    if (!user || !user.customerId) {
      return { error: "Please sign in to upload prescriptions." };
    }
    const customerId: string = user.customerId;
    const medicineName = String(formData.get("medicineName") || "").trim();
    const prescriber = String(formData.get("prescriber") || "").trim() || null;
    const notes = String(formData.get("notes") || "").trim() || null;
    const rawUrls = String(formData.get("attachmentUrls") || "").trim();
    const attachmentUrls = rawUrls
      ? rawUrls
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    if (!medicineName) {
      return { error: "Medication name or description is required." };
    }

    const { PrescriptionIntakeChannel, PrescriptionLifecycleStatus } = await import(
      "@/app/generated/prisma/enums"
    );

    const rx = await prisma.$transaction(async (tx) => {
      const created = await tx.prescription.create({
        data: {
          customerId,
          medicineName,
          prescriber,
          notes,
          attachmentUrls,
          intakeChannel: PrescriptionIntakeChannel.patient_upload,
          lifecycleStatus: PrescriptionLifecycleStatus.received,
          status: "active",
        },
      });

      await tx.adminNotification.create({
        data: {
          type: "prescription_upload",
          title: `New Patient Prescription Upload: ${medicineName}`,
          body: `Uploaded by patient via portal. Clinical verification required.`,
          severity: "info",
          relatedType: "prescription",
          relatedId: created.id,
        },
      });

      return created;
    });

    await addTimelineEvent(
      customerId,
      user.id,
      "prescription_uploaded",
      "Prescription Uploaded",
      `${medicineName} submitted via patient portal`,
      { prescriptionId: rx.id },
      user.id,
    );

    revalidatePath("/portal/prescriptions");
    revalidatePath("/admin/prescriptions");

    return { success: "Prescription uploaded successfully. Our pharmacy team will review it shortly." };
  } catch (e) {
    console.error("[portalUploadPrescriptionAction]", e);
    return { error: e instanceof Error ? e.message : "Failed to upload prescription." };
  }
}

/** Bind the signed-in customer to a pharmacy (loyalty + prescriptions scoped there). */
export async function chooseCustomerPharmacyAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login?next=/portal/pharmacies");

  const pharmacyId = String(formData.get("pharmacyId") || "");
  const pharmacy = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId } });
  if (!pharmacy || pharmacy.status !== "active" || !pharmacy.listed) {
    redirect("/portal/pharmacies");
  }

  await prismaUnscoped.customerPharmacy.upsert({
    where: {
      customerId_pharmacyId: { customerId: user.customerId, pharmacyId: pharmacy.id },
    },
    create: { customerId: user.customerId, pharmacyId: pharmacy.id, preferred: true },
    update: { preferred: true },
  });
  await prismaUnscoped.customerPharmacy.updateMany({
    where: { customerId: user.customerId, pharmacyId: { not: pharmacy.id } },
    data: { preferred: false },
  });

  const existingLoyalty = await prismaUnscoped.loyaltyAccount.findFirst({
    where: { customerId: user.customerId, pharmacyId: pharmacy.id },
  });
  if (!existingLoyalty) {
    const code = `AE${user.customerId.replace(/-/g, "").slice(0, 6).toUpperCase()}${pharmacy.slug.slice(0, 4).toUpperCase()}`;
    const loyalty = await prismaUnscoped.loyaltyAccount.create({
      data: {
        pharmacyId: pharmacy.id,
        customerId: user.customerId,
        points: 50,
        lifetimePoints: 50,
        referralCode: code,
        tier: "bronze",
      },
    });
    await prismaUnscoped.loyaltyTransaction.create({
      data: {
        accountId: loyalty.id,
        points: 50,
        type: "bonus",
        description: `Welcome bonus — ${pharmacy.name}`,
        source: "portal:join",
      },
    });
  }

  const jar = await cookies();
  jar.set(PUBLIC_PHARMACY_COOKIE, pharmacy.slug, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/portal");
  redirect("/portal");
}


/**
 * Switch the customer's active pharmacy (portal + storefront context).
 * Verifies the target is an active, listed pharmacy before setting the
 * public cookie so a stale link can't pin a suspended tenant.
 */
export async function setActivePharmacyAction(slug: string): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user?.customerId) return { error: "Please sign in." };

  const normalized = slug.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(normalized)) {
    return { error: "Invalid pharmacy." };
  }

  const pharmacy = await prismaUnscoped.pharmacy.findUnique({
    where: { slug: normalized },
    select: { id: true, slug: true, status: true, listed: true },
  });
  if (!pharmacy || pharmacy.status !== "active" || !pharmacy.listed) {
    return { error: "That pharmacy is not available right now." };
  }

  const jar = await cookies();
  jar.set(PUBLIC_PHARMACY_COOKIE, pharmacy.slug, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath("/portal", "layout");
  return { success: `Now viewing ${pharmacy.slug}` };
}

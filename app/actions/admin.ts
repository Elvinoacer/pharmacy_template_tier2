"use server";

import { revalidatePath } from "next/cache";
import {
  getSessionUser,
  requireStaff,
  requireManager,
  writeAuditLog,
  addTimelineEvent,
  AuthError,
} from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import {
  updateRefillStatus,
  updateEnquiryStatus,
  respondToFeedback,
  sendStaffMessage,
  launchCampaign,
  processDueReminders,
} from "@/app/lib/services/crm";
import { parseLocalDatetimeInput } from "@/app/lib/time";
import type { RefillStatus } from "@/app/generated/prisma/client";

export type ActionState = { error?: string; success?: string };

async function staff() {
  const user = await getSessionUser();
  return requireStaff(user);
}

export async function adminUpdateRefillAction(formData: FormData) {
  const user = await staff();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as RefillStatus;
  await updateRefillStatus(id, status, user.id);
  await writeAuditLog(user.id, "refill_status_update", "refill_request", id, { status });
  revalidatePath("/admin/refills");
  revalidatePath("/admin/customers");
}

export async function adminEnquiryAction(formData: FormData) {
  const user = await staff();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as "new" | "in_progress" | "resolved" | "closed";
  const staffNotes = String(formData.get("staffNotes") || "") || undefined;
  await updateEnquiryStatus(id, status, staffNotes, user.id);
  await writeAuditLog(user.id, "enquiry_status_update", "enquiry", id, { status });
  revalidatePath("/admin/enquiries");
}

export async function adminFeedbackRespondAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await staff();
  const id = String(formData.get("id") || "");
  const response = String(formData.get("response") || "").trim();
  if (!response) return { error: "Response required." };
  const isPublic = formData.get("isPublic") === "on";
  await respondToFeedback(id, response, user.id, isPublic);
  await writeAuditLog(user.id, "feedback_response_saved", "feedback", id, { isPublic });
  revalidatePath("/admin/feedback");
  return { success: "Response saved." };
}

export async function adminSendMessageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await staff();
  const customerId = String(formData.get("customerId") || "");
  const body = String(formData.get("body") || "").trim();
  if (!customerId || !body) return { error: "Customer and message required." };

  const message = await sendStaffMessage({
    customerId,
    channel: (String(formData.get("channel") || "email") as "email" | "sms" | "whatsapp" | "portal"),
    subject: String(formData.get("subject") || "") || undefined,
    body,
    staffId: user.id,
    scheduledFor: formData.get("scheduledFor")
      ? parseLocalDatetimeInput(String(formData.get("scheduledFor")))
      : undefined,
  });
  await writeAuditLog(user.id, "staff_message_sent", "conversation", message.id, {
    customerId,
    channel: String(formData.get("channel") || "email"),
  });

  revalidatePath("/admin/messages");
  revalidatePath(`/admin/customers/${customerId}`);
  return { success: "Message queued/sent." };
}

export async function adminAddNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await staff();
  const customerId = String(formData.get("customerId") || "");
  const body = String(formData.get("body") || "").trim();
  if (!customerId || !body) return { error: "Note required." };

  // Place the new note at the end of the current list (max sortOrder + 1).
  const maxOrder = await prisma.customerNote.aggregate({
    where: { customerId },
    _max: { sortOrder: true },
  });
  const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const note = await prisma.customerNote.create({
    data: {
      customerId,
      authorId: user.id,
      body,
      isPinned: formData.get("isPinned") === "on",
      sortOrder: nextOrder,
    },
  });
  await writeAuditLog(user.id, "customer_note_added", "customer_note", note.id, { customerId });
  revalidatePath(`/admin/customers/${customerId}`);
  return { success: "Note added." };
}

export async function adminCreateCampaignAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = requireManager(await getSessionUser());
    const name = String(formData.get("name") || "").trim();
    const body = String(formData.get("body") || "").trim();
    if (!name || !body) return { error: "Name and body required." };

    const sendNow = formData.get("sendNow") === "true";
    const scheduledFor = formData.get("scheduledFor")
      ? parseLocalDatetimeInput(String(formData.get("scheduledFor")))
      : null;

    const status = sendNow ? "sending" : scheduledFor ? "scheduled" : "draft";

    const campaign = await prisma.campaign.create({
      data: {
        name,
        description: String(formData.get("description") || "") || null,
        channel: (String(formData.get("channel") || "email") as "email" | "sms" | "whatsapp" | "multi"),
        segmentId: String(formData.get("segmentId") || "") || null,
        subject: String(formData.get("subject") || "") || null,
        body,
        status,
        scheduledFor,
        createdById: user.id,
      },
    });
    await writeAuditLog(user.id, "campaign_created", "campaign", campaign.id);

    // If "send immediately", launch right away.
    if (sendNow) {
      try {
        await launchCampaign(campaign.id, user.id);
      } catch (err) {
        console.error("[campaign] immediate launch failed:", err);
      }
    }

    revalidatePath("/admin/campaigns");
    return { success: sendNow ? "Campaign launched." : scheduledFor ? "Campaign scheduled — cron will auto-launch at the right time." : "Campaign saved as draft." };
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    return { error: "Failed to create campaign." };
  }
}

export async function adminLaunchCampaignAction(formData: FormData) {
  const user = requireManager(await getSessionUser());
  const id = String(formData.get("id") || "");
  await launchCampaign(id, user.id);
  await writeAuditLog(user.id, "campaign_launched", "campaign", id);
  revalidatePath("/admin/campaigns");
}

export async function adminCreateSegmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = requireManager(await getSessionUser());
    const name = String(formData.get("name") || "").trim();
    if (!name) return { error: "Name required." };
    const segment = await prisma.segment.create({
      data: {
        name,
        description: String(formData.get("description") || "") || null,
        isSystem: false,
        createdById: user.id,
      },
    });
    await writeAuditLog(user.id, "segment_created", "segment", segment.id);
    revalidatePath("/admin/segments");
    return { success: "Segment created." };
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    return { error: "Could not create segment (name may already exist)." };
  }
}

export async function adminKnowledgeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await staff();
  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  if (!title || !content) return { error: "Title and content required." };

  const id = String(formData.get("id") || "");
  if (id) {
    await prisma.knowledgeArticle.update({
      where: { id },
      data: {
        title,
        content,
        category: String(formData.get("category") || "general"),
        isApproved: formData.get("isApproved") === "on",
        priority: Number(formData.get("priority") || 0),
        updatedById: user.id,
      },
    });
    await writeAuditLog(user.id, "knowledge_article_updated", "knowledge_article", id);
  } else {
    const article = await prisma.knowledgeArticle.create({
      data: {
        title,
        content,
        category: String(formData.get("category") || "general"),
        isApproved: formData.get("isApproved") !== "off",
        priority: Number(formData.get("priority") || 0),
        createdById: user.id,
        updatedById: user.id,
      },
    });
    await writeAuditLog(user.id, "knowledge_article_created", "knowledge_article", article.id);
  }
  revalidatePath("/admin/knowledge");
  return { success: "Knowledge article saved." };
}

export async function adminCreateReminderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await staff();
  const customerId = String(formData.get("customerId") || "");
  const title = String(formData.get("title") || "").trim();
  if (!customerId || !title) return { error: "Customer and title required." };

  const reminder = await prisma.reminder.create({
    data: {
      customerId,
      type: (String(formData.get("type") || "custom") as
        | "refill"
        | "pickup"
        | "follow_up"
        | "wellness"
        | "birthday"
        | "custom"),
      title,
      body: String(formData.get("body") || "") || null,
      channel: (String(formData.get("channel") || "email") as
        | "email"
        | "sms"
        | "whatsapp"
        | "push"
        | "in_app"),
      scheduledFor: parseLocalDatetimeInput(String(formData.get("scheduledFor") || new Date().toISOString())),
      createdById: user.id,
    },
  });
  await writeAuditLog(user.id, "reminder_created", "reminder", reminder.id, { customerId });
  revalidatePath("/admin/reminders");
  return { success: "Reminder scheduled." };
}

export async function adminProcessRemindersAction() {
  const user = await staff();
  const count = await processDueReminders();
  await writeAuditLog(user.id, "reminders_processed", "reminder", undefined, { count });
  revalidatePath("/admin/reminders");
  revalidatePath("/admin/notifications");
}

export async function adminCreateTemplateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await staff();
  const name = String(formData.get("name") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (!name || !body) return { error: "Name and body required." };

  const id = String(formData.get("id") || "");
  if (id) {
    await prisma.messageTemplate.update({
      where: { id },
      data: {
        name,
        channel: (String(formData.get("channel") || "email") as "email" | "sms" | "whatsapp" | "portal" | "ai"),
        subject: String(formData.get("subject") || "") || null,
        body,
        category: String(formData.get("category") || "general"),
        updatedById: user.id,
      },
    });
    await writeAuditLog(user.id, "message_template_updated", "message_template", id);
    revalidatePath("/admin/templates");
    return { success: "Template updated." };
  }

  const template = await prisma.messageTemplate.create({
    data: {
      name,
      channel: (String(formData.get("channel") || "email") as "email" | "sms" | "whatsapp" | "portal" | "ai"),
      subject: String(formData.get("subject") || "") || null,
      body,
      category: String(formData.get("category") || "general"),
      createdById: user.id,
    },
  });
  await writeAuditLog(user.id, "message_template_created", "message_template", template.id);
  revalidatePath("/admin/templates");
  return { success: "Template saved." };
}

export async function adminAssignSegmentAction(formData: FormData) {
  const user = await staff();
  const customerId = String(formData.get("customerId") || "");
  const segmentId = String(formData.get("segmentId") || "");
  if (!customerId || !segmentId) return;

  await prisma.customerSegment.upsert({
    where: { customerId_segmentId: { customerId, segmentId } },
    create: { customerId, segmentId },
    update: {},
  });
  await addTimelineEvent(
    customerId,
    user.id,
    "segment_assigned",
    "Segment updated",
    "Customer assigned to segment",
    { segmentId },
    user.id,
  );
  await writeAuditLog(user.id, "segment_assigned", "customer_profile", customerId, { segmentId });
  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath("/admin/segments");
}

export async function adminLoyaltyAdjustAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await staff();
  const customerId = String(formData.get("customerId") || "");
  const points = Number(formData.get("points") || 0);
  const description = String(formData.get("description") || "Manual adjustment");
  if (!customerId || !points) return { error: "Customer and points required." };

  const account = await prisma.loyaltyAccount.findUnique({ where: { customerId } });
  if (!account) return { error: "No loyalty account." };

  const newPoints = Math.max(0, account.points + points);
  await prisma.$transaction([
    prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        points: newPoints,
        lifetimePoints: points > 0 ? account.lifetimePoints + points : account.lifetimePoints,
        tier:
          newPoints >= 1000 ? "platinum" : newPoints >= 400 ? "gold" : newPoints >= 150 ? "silver" : "bronze",
      },
    }),
    prisma.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        points,
        type: "adjust",
        description,
        createdById: user.id,
      },
    }),
  ]);
  await writeAuditLog(user.id, "loyalty_points_adjusted", "loyalty_account", account.id, {
    customerId,
    points,
    description,
  });

  revalidatePath("/admin/loyalty");
  revalidatePath(`/admin/customers/${customerId}`);
  return { success: "Points updated." };
}

export async function adminCreateCouponAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = requireManager(await getSessionUser());
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const discountType = String(formData.get("discountType") || "percent") as "percent" | "fixed" | "points";
  const discountValue = Number(formData.get("discountValue") || 0);
  const pointsCost = Number(formData.get("pointsCost") || 0);
  const id = String(formData.get("id") || "");

  if (!code || !discountValue) return { error: "Code and discount value are required." };
  if (!["percent", "fixed", "points"].includes(discountType)) return { error: "Invalid discount type." };
  if (pointsCost < 0) return { error: "Points cost cannot be negative." };

  try {
    if (id) {
      // Update existing coupon.
      const updated = await prisma.coupon.update({
        where: { id },
        data: {
          code,
          description: String(formData.get("description") || "") || null,
          discountType,
          discountValue,
          pointsCost,
          maxRedemptions: Number(formData.get("maxRedemptions") || 0) || null,
          validUntil: formData.get("validUntil") ? new Date(String(formData.get("validUntil"))) : null,
          active: formData.get("active") !== "off",
        },
      });
      await writeAuditLog(user.id, "coupon_updated", "coupon", updated.id, { code });
      revalidatePath("/admin/loyalty");
      return { success: "Coupon updated." };
    }
    const coupon = await prisma.coupon.create({
      data: {
        code,
        description: String(formData.get("description") || "") || null,
        discountType,
        discountValue,
        pointsCost,
        maxRedemptions: Number(formData.get("maxRedemptions") || 0) || null,
        validUntil: formData.get("validUntil") ? new Date(String(formData.get("validUntil"))) : null,
        active: formData.get("active") !== "off",
      },
    });
    await writeAuditLog(user.id, "coupon_created", "coupon", coupon.id, { code, pointsCost });
    revalidatePath("/admin/loyalty");
    return { success: "Coupon created." };
  } catch (e) {
    console.error(e);
    return { error: "Could not save coupon. The code may already exist." };
  }
}

// ── Prescriptions ─────────────────────────────────────────────

export async function adminCreatePrescriptionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await staff();
  const customerId = String(formData.get("customerId") || "");
  const medicineName = String(formData.get("medicineName") || "").trim();
  if (!customerId || !medicineName) return { error: "Customer and medicine name are required." };

  const id = String(formData.get("id") || "");
  const data = {
    customerId,
    medicineName,
    rxReference: String(formData.get("rxReference") || "") || null,
    dosage: String(formData.get("dosage") || "") || null,
    schedule: String(formData.get("schedule") || "") || null,
    quantity: Number(formData.get("quantity") || 0) || null,
    daysSupply: Number(formData.get("daysSupply") || 0) || null,
    refillsRemaining: Number(formData.get("refillsRemaining") || 0),
    prescriber: String(formData.get("prescriber") || "") || null,
    unitPrice: formData.get("unitPrice") ? Number(formData.get("unitPrice")) : null,
    status: (String(formData.get("status") || "active") as "active" | "on_hold" | "expired" | "discontinued"),
    endDate: formData.get("endDate") ? new Date(String(formData.get("endDate"))) : null,
    nextRefillDue: formData.get("nextRefillDue") ? new Date(String(formData.get("nextRefillDue"))) : null,
    notes: String(formData.get("notes") || "") || null,
  };

  if (id) {
    await prisma.prescription.update({ where: { id }, data });
    await writeAuditLog(user.id, "prescription_updated", "prescription", id, { customerId });
    revalidatePath("/admin/prescriptions");
    revalidatePath(`/admin/prescriptions/${id}`);
    revalidatePath(`/admin/customers/${customerId}`);
    return { success: "Prescription updated." };
  }

  const rx = await prisma.prescription.create({ data });
  await addTimelineEvent(
    customerId,
    user.id,
    "prescription_created",
    "Prescription added",
    `${medicineName} — ${data.refillsRemaining ?? 0} refills`,
    { prescriptionId: rx.id },
    user.id,
  );
  await writeAuditLog(user.id, "prescription_created", "prescription", rx.id, { customerId });
  revalidatePath("/admin/prescriptions");
  revalidatePath(`/admin/customers/${customerId}`);
  return { success: "Prescription created." };
}

export async function adminDeletePrescriptionAction(formData: FormData) {
  const user = await staff();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.prescription.delete({ where: { id } });
  await writeAuditLog(user.id, "prescription_deleted", "prescription", id);
  revalidatePath("/admin/prescriptions");
}

// ── Medications (drug catalog) ────────────────────────────────

export async function adminCreateMedicationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await staff();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Medication name is required." };

  const slug = String(formData.get("slug") || "").trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const id = String(formData.get("id") || "");
  const data = {
    name,
    slug,
    sku: String(formData.get("sku") || "") || null,
    category: String(formData.get("category") || "general"),
    description: String(formData.get("description") || "") || null,
    indications: String(formData.get("indications") || "") || null,
    dosage: String(formData.get("dosage") || "") || null,
    sideEffects: String(formData.get("sideEffects") || "") || null,
    contraindications: String(formData.get("contraindications") || "") || null,
    storage: String(formData.get("storage") || "") || null,
    price: Number(formData.get("price") || 0),
    overTheCounter: formData.get("overTheCounter") === "on",
    publicListing: formData.get("publicListing") === "on",
    prescriptionRequired: formData.get("prescriptionRequired") === "on",
    stockQty: Number(formData.get("stockQty") || 0),
    lowStockThreshold: Number(formData.get("lowStockThreshold") || 10),
    imageUrl: String(formData.get("imageUrl") || "") || null,
    active: formData.get("active") !== "off",
  };

  try {
    if (id) {
      await prisma.medication.update({ where: { id }, data });
      await writeAuditLog(user.id, "medication_updated", "medication", id);
      revalidatePath("/admin/medications");
      revalidatePath(`/admin/medications/${id}`);
      revalidatePath("/medicines");
      return { success: "Medication updated." };
    }
    const med = await prisma.medication.create({ data });
    await writeAuditLog(user.id, "medication_created", "medication", med.id);
    revalidatePath("/admin/medications");
    revalidatePath("/medicines");
    return { success: "Medication created." };
  } catch (e) {
    console.error(e);
    return { error: "Could not save medication. The slug or SKU may already exist." };
  }
}

export async function adminDeleteMedicationAction(formData: FormData) {
  const user = await staff();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.medication.delete({ where: { id } });
  await writeAuditLog(user.id, "medication_deleted", "medication", id);
  revalidatePath("/admin/medications");
  revalidatePath("/medicines");
}

// ── Orders / OTC sales ────────────────────────────────────────

export async function adminCreateOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await staff();
  const customerId = String(formData.get("customerId") || "") || null;
  const medicationId = String(formData.get("medicationId") || "") || null;
  const quantity = Number(formData.get("quantity") || 1);
  const couponCode = String(formData.get("couponCode") || "") || null;
  const notes = String(formData.get("notes") || "") || null;
  const source = String(formData.get("source") || "counter");

  if (!medicationId || quantity < 1) return { error: "Medication and quantity are required." };

  // Look up the medication to get the current price.
  const med = await prisma.medication.findUnique({ where: { id: medicationId } });
  if (!med) return { error: "Medication not found." };

  // If a customer email is given instead of an ID, create the customer account on the fly.
  let finalCustomerId = customerId;
  const customerEmail = String(formData.get("customerEmail") || "").trim();
  if (!finalCustomerId && customerEmail) {
    const existingUser = await prisma.user.findUnique({
      where: { email: customerEmail.toLowerCase() },
      include: { profile: true },
    });
    if (existingUser?.profile) {
      finalCustomerId = existingUser.profile.id;
    } else {
      // Create a customer + profile + loyalty + preferences.
      const fullName = String(formData.get("customerName") || customerEmail.split("@")[0] || "Walk-in customer");
      const result = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            email: customerEmail.toLowerCase(),
            role: "customer" as const,
            emailVerified: false,
          },
        });
        const p = await tx.customerProfile.create({
          data: {
            userId: u.id,
            fullName,
            phone: String(formData.get("customerPhone") || "") || null,
          },
        });
        await tx.customerPreference.create({ data: { customerId: p.id } });
        const referral = `AE${p.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
        const loyalty = await tx.loyaltyAccount.create({
          data: {
            customerId: p.id,
            points: 50,
            lifetimePoints: 50,
            referralCode: referral,
            tier: "bronze",
          },
        });
        await tx.loyaltyTransaction.create({
          data: {
            accountId: loyalty.id,
            points: 50,
            type: "bonus",
            description: "Welcome bonus (created at counter)",
            source: "counter",
          },
        });
        return p.id;
      });
      finalCustomerId = result;
    }
  }

  // Apply coupon if given.
  let discount = 0;
  let couponId: string | null = null;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
    if (coupon && coupon.active) {
      couponId = coupon.id;
      if (coupon.discountType === "percent") {
        discount = Number(med.price) * quantity * (Number(coupon.discountValue) / 100);
      } else if (coupon.discountType === "fixed") {
        discount = Number(coupon.discountValue) * quantity;
      }
    }
  }

  const unitPrice = Number(med.price);
  const total = Math.max(0, unitPrice * quantity - discount);

  // Create the order in a transaction.
  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.order.create({
      data: {
        customerId: finalCustomerId,
        source,
        status: "pending",
        total,
        notes,
        servedById: user.id,
        items: {
          create: {
            medicationId,
            name: med.name,
            quantity,
            unitPrice,
            discountApplied: discount,
            couponId,
          },
        },
      },
    });
    // Decrement stock.
    await tx.medication.update({
      where: { id: medicationId },
      data: { stockQty: { decrement: quantity } },
    });
    return o;
  });

  await writeAuditLog(user.id, "order_created", "order", order.id, {
    customerId: finalCustomerId,
    medicationId,
    quantity,
    total,
  });
  revalidatePath("/admin/orders");
  revalidatePath("/admin/medications");
  if (finalCustomerId) revalidatePath(`/admin/customers/${finalCustomerId}`);
  return { success: `Order created. Total: ${total}.` };
}

export async function adminWaiveOrderAction(formData: FormData) {
  const user = await staff();
  const id = String(formData.get("id") || "");
  const scope = String(formData.get("scope") || "one_time") as "one_time" | "recurring_until" | "recurring_permanent";
  const reason = String(formData.get("reason") || "") || null;
  const until = formData.get("until") ? new Date(String(formData.get("until"))) : null;
  if (!id) return;
  await prisma.order.update({
    where: { id },
    data: {
      waived: true,
      waivedReason: reason,
      waivedScope: scope,
      waivedUntil: until,
      status: "waived",
    },
  });
  await writeAuditLog(user.id, "order_waived", "order", id, { scope, reason });
  revalidatePath("/admin/orders");
}

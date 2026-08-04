"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
import { emailVerificationBody, sendDelivery } from "@/app/lib/services/delivery";
import type { RefillStatus } from "@/app/generated/prisma/client";
import { createHash, randomBytes } from "crypto";

export type ActionState = {
  error?: string;
  success?: string;
  /** Set when the medication form must show a review screen before final commit (Phase 4.2). */
  needsConfirmation?: boolean;
  /** Validation result payload (pass/flag/fail checks) surfaced to the review UI. */
  validation?: Record<string, unknown>;
  /** Optional redirect target (used by AI/CSV import flows). */
  redirectTo?: string;
};

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

export async function adminEnquiryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await staff();
    const id = String(formData.get("id") || "");
    if (!id) return { error: "Enquiry id required." };
    const status = String(formData.get("status") || "") as "new" | "in_progress" | "resolved" | "closed";
    const staffNotes = String(formData.get("staffNotes") || "") || undefined;
    await updateEnquiryStatus(id, status, staffNotes, user.id);
    await writeAuditLog(user.id, "enquiry_status_update", "enquiry", id, { status });
    revalidatePath("/admin/enquiries");
    return { success: "Enquiry updated." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update enquiry." };
  }
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

export async function adminProcessRemindersAction(
  _prev?: ActionState,
  _formData?: FormData,
): Promise<ActionState> {
  try {
    const user = await staff();
    const result = await processDueReminders();
    await writeAuditLog(user.id, "reminders_processed", "reminder", undefined, result);
    revalidatePath("/admin/reminders");
    revalidatePath("/admin/notifications");
    const processed = result.processedCount ?? 0;
    const failed = result.failedCount ?? 0;
    if (failed > 0) {
      return {
        success: `Processed ${processed} reminder(s); ${failed} failed.`,
        error: result.errors?.slice(0, 3).join("; "),
      };
    }
    return { success: `Processed ${processed} due reminder(s).` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to process reminders." };
  }
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
          // Hidden "off" + checkbox "on" both submit; get() returns the first
          // value ("off"), so use getAll and treat active as on if "on" is present.
          active: formData.getAll("active").includes("on"),
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
        active: formData.getAll("active").includes("on"),
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
  const medicationId = String(formData.get("medicationId") || "") || null;

  // If a medication is linked, verify it exists and pull its current price
  // if the admin didn't override unitPrice.
  // NOTE: medicationId now points at PharmacyInventory (per Phase 0 split).
  let linkedMed: { id: string; price: unknown; currentStock: number; medicationMaster: { name: string } } | null = null;
  if (medicationId) {
    linkedMed = await prisma.pharmacyInventory.findUnique({
      where: { id: medicationId },
      select: {
        id: true,
        price: true,
        currentStock: true,
        medicationMaster: { select: { name: true } },
      },
    });
    if (!linkedMed) {
      return { error: "Linked medication not found. Refresh the page and try again." };
    }
  }

  const data = {
    customerId,
    medicationId,
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
    startDate: formData.get("startDate") ? new Date(String(formData.get("startDate"))) : null,
    endDate: formData.get("endDate") ? new Date(String(formData.get("endDate"))) : null,
    nextRefillDue: formData.get("nextRefillDue") ? new Date(String(formData.get("nextRefillDue"))) : null,
    notes: String(formData.get("notes") || "") || null,
  };

  if (id) {
    await prisma.prescription.update({ where: { id }, data });
    await writeAuditLog(user.id, "prescription_updated", "prescription", id, { customerId, medicationId });
    // Regenerate medication schedule from the (possibly updated) dosage/schedule text.
    try {
      const { generateScheduleForPrescription } = await import("@/app/lib/services/medication-schedule");
      await generateScheduleForPrescription(id);
    } catch (err) {
      console.warn("[adminCreatePrescription] schedule generation failed:", err);
    }
    revalidatePath("/admin/prescriptions");
    revalidatePath(`/admin/prescriptions/${id}`);
    revalidatePath(`/admin/customers/${customerId}`);
    return { success: "Prescription updated." };
  }

  const rx = await prisma.prescription.create({ data });
  // Generate the initial medication schedule from the dosage/schedule text.
  try {
    const { generateScheduleForPrescription } = await import("@/app/lib/services/medication-schedule");
    await generateScheduleForPrescription(rx.id);
  } catch (err) {
    console.warn("[adminCreatePrescription] schedule generation failed:", err);
  }
  await addTimelineEvent(
    customerId,
    user.id,
    "prescription_created",
    "Prescription added",
    `${medicineName} — ${data.refillsRemaining ?? 0} refills`,
    { prescriptionId: rx.id, medicationId },
    user.id,
  );
  await writeAuditLog(user.id, "prescription_created", "prescription", rx.id, { customerId, medicationId });
  revalidatePath("/admin/prescriptions");
  revalidatePath(`/admin/customers/${customerId}`);
  // Redirect to the new record so the form doesn't keep stale values.
  // redirect() throws NEXT_REDIRECT — must not be caught by callers.
  redirect(`/admin/prescriptions/${rx.id}`);
}

/**
 * Dispatch a prescription — deducts stock from the linked medication.
 *
 * Per the spec: prescriptions must NOT affect inventory at creation time.
 * Only when an admin explicitly clicks "Dispatch" should stock be deducted.
 *
 * Idempotent: if the prescription is already dispatched, returns success
 * without re-decrementing stock.
 */
export async function adminDispatchPrescriptionAction(formData: FormData) {
  const user = await staff();
  const id = String(formData.get("id") || "");
  if (!id) return;

  const rx = await prisma.prescription.findUnique({
    where: { id },
    include: {
      medication: { include: { medicationMaster: { select: { name: true } } } },
      customer: { select: { id: true, fullName: true } },
    },
  });
  if (!rx) return;

  // Idempotent — already dispatched.
  if (rx.dispatchedAt) {
    revalidatePath(`/admin/prescriptions/${id}`);
    return;
  }

  const qty = rx.quantity ?? 1;
  const shouldDecrementRefills = (rx.refillsRemaining ?? 0) > 0;

  // Atomic: stock decrement + dispatch mark + refillsRemaining all in one transaction.
  // NOTE: rx.medication is now a PharmacyInventory row; clinical name lives on medicationMaster.
  if (rx.medicationId && rx.medication) {
    const inv = rx.medication;
    const medName = inv.medicationMaster?.name ?? "this medication";
    if (inv.currentStock < qty) {
      throw new Error(
        `Insufficient stock for ${medName}. Available: ${inv.currentStock}, required: ${qty}.`,
      );
    }
    await prisma.$transaction(async (tx) => {
      await tx.pharmacyInventory.update({
        where: { id: inv.id },
        data: { currentStock: { decrement: qty } },
      });
      await tx.prescription.update({
        where: { id },
        data: {
          dispatchedAt: new Date(),
          dispatchedById: user.id,
          lastFilledAt: new Date(),
          ...(shouldDecrementRefills ? { refillsRemaining: { decrement: 1 } } : {}),
        },
      });
    });
  } else {
    // No linked medication — still atomic for dispatch + refill decrement.
    await prisma.prescription.update({
      where: { id },
      data: {
        dispatchedAt: new Date(),
        dispatchedById: user.id,
        lastFilledAt: new Date(),
        ...(shouldDecrementRefills ? { refillsRemaining: { decrement: 1 } } : {}),
      },
    });
  }

  await addTimelineEvent(
    rx.customerId,
    user.id,
    "prescription_dispatched",
    "Prescription dispatched",
    `${rx.medicineName} — ${qty} units`,
    { prescriptionId: id, medicationId: rx.medicationId, quantity: qty },
    user.id,
  );
  await writeAuditLog(user.id, "prescription_dispatched", "prescription", id, {
    medicationId: rx.medicationId,
    quantity: qty,
  });
  revalidatePath(`/admin/prescriptions/${id}`);
  revalidatePath(`/admin/customers/${rx.customerId}`);
  revalidatePath("/admin/medications");
}

export async function adminDeletePrescriptionAction(formData: FormData) {
  const user = await staff();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.prescription.delete({ where: { id } });
  await writeAuditLog(user.id, "prescription_deleted", "prescription", id);
  revalidatePath("/admin/prescriptions");
}

// ── Medications (drug catalog — split into MedicationMaster + PharmacyInventory per Phase 0) ──

/**
 * Create or update a medication. Per Phase 0 split:
 *   - clinical fields → MedicationMaster (create or update)
 *   - commercial fields → PharmacyInventory (create or update, linked to master)
 *   - relational fields (active ingredients, clinical tags, interactions) → join tables
 *
 * Per Phase 4: runs the shared validation service before save. If `fail` checks exist,
 * returns errors without saving. If only `flag` checks exist and `confirmed !== "true"`,
 * returns `needsConfirmation` so the client can show a review modal (Decision D22).
 *
 * Per Phase 5: computes enrichmentScore + enrichmentStatus on every save (Decision D14).
 */
export async function adminCreateMedicationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await staff();
  const { parseMedicationFormData } = await import("@/app/lib/services/medication-form-data");
  const { validateMedication, computeEnrichmentScore } = await import(
    "@/app/lib/services/medication-validation"
  );

  const parsed = parseMedicationFormData(formData);
  const inventoryId = String(formData.get("inventoryId") || "") || undefined;
  const masterId = String(formData.get("masterId") || "") || undefined;
  const confirmed = String(formData.get("confirmed") || "") === "true";

  if (!parsed.master.name) return { error: "Medication name is required." };
  if (!parsed.master.genericName) return { error: "Generic name is required (Phase 4 rule)." };
  if (!parsed.master.dosageFormId) return { error: "Dosage form is required (Phase 4 rule)." };

  // Run the shared validation service.
  const validation = await validateMedication(
    {
      id: masterId,
      name: parsed.master.name,
      genericName: parsed.master.genericName,
      brandName: parsed.master.brandName,
      strengthValue: parsed.master.strengthValue,
      strengthUnit: parsed.master.strengthUnit,
      strengthDisplay: parsed.master.strengthDisplay,
      dosageFormId: parsed.master.dosageFormId,
      routeId: parsed.master.routeId,
      barcode: parsed.master.barcode,
      controlledDrug: parsed.master.controlledDrug,
      controlledDrugSchedule: parsed.master.controlledDrugSchedule,
      interactionIds: parsed.interactionIds,
    },
    {
      id: inventoryId,
      medicationMasterId: masterId,
      slug: parsed.inventory.slug,
      sku: parsed.inventory.sku,
      price: parsed.inventory.price,
      overTheCounter: parsed.inventory.overTheCounter,
      prescriptionRequired: parsed.inventory.prescriptionRequired,
    },
    { existingMasterId: masterId, existingInventoryId: inventoryId },
  );

  if (validation.counts.fail > 0) {
    return {
      error: `Validation failed: ${validation.checks
        .filter((c) => c.severity === "fail")
        .map((c) => c.message)
        .join(" ")}`,
      validation: validation as unknown as Record<string, unknown>,
    };
  }

  if (validation.hasIssues && !confirmed) {
    return {
      needsConfirmation: true,
      validation: validation as unknown as Record<string, unknown>,
      success: undefined,
    };
  }

  // Compute enrichment (Phase 5).
  const enrichment = computeEnrichmentScore({
    genericName: parsed.master.genericName,
    activeIngredients: parsed.activeIngredientIds,
    strengthDisplay: parsed.master.strengthDisplay,
    strengthValue: parsed.master.strengthValue,
    dosageFormId: parsed.master.dosageFormId,
    routeId: parsed.master.routeId,
    indications: parsed.master.indications,
    sideEffects: parsed.master.sideEffects,
    contraindications: parsed.master.contraindications,
    manufacturerId: parsed.master.manufacturerId,
    pregnancyCategoryId: parsed.master.pregnancyCategoryId,
    barcode: parsed.master.barcode,
    imageUrl: parsed.master.imageUrl,
  });

  const masterData = {
    name: parsed.master.name,
    slug: parsed.master.slug,
    genericName: parsed.master.genericName,
    brandName: parsed.master.brandName,
    strengthValue: parsed.master.strengthValue,
    strengthUnit: parsed.master.strengthUnit,
    strengthDisplay: parsed.master.strengthDisplay,
    packSize: parsed.master.packSize,
    dosageFormId: parsed.master.dosageFormId,
    routeId: parsed.master.routeId,
    pregnancyCategoryId: parsed.master.pregnancyCategoryId,
    manufacturerId: parsed.master.manufacturerId,
    countryOfOrigin: parsed.master.countryOfOrigin,
    barcode: parsed.master.barcode,
    category: parsed.master.category,
    description: parsed.master.description,
    indications: parsed.master.indications,
    dosage: parsed.master.dosage,
    sideEffects: parsed.master.sideEffects,
    contraindications: parsed.master.contraindications,
    storage: parsed.master.storage,
    clinicalNotes: parsed.master.clinicalNotes,
    imageUrl: parsed.master.imageUrl,
    imageUrls: parsed.master.imageUrls,
    alternativeIds: parsed.master.alternativeIds,
    controlledDrug: parsed.master.controlledDrug,
    controlledDrugSchedule: parsed.master.controlledDrugSchedule,
    pediatricUse: parsed.master.pediatricUse,
    requiresRefrigeration: parsed.master.requiresRefrigeration,
    enrichmentStatus: enrichment.status,
    enrichmentScore: enrichment.score,
    enrichedAt: enrichment.status === "complete" ? new Date() : null,
    acquisitionMethod: parsed.master.acquisitionMethod,
  };

  const inventoryData = {
    slug: parsed.inventory.slug,
    sku: parsed.inventory.sku,
    price: parsed.inventory.price,
    purchasePrice: parsed.inventory.purchasePrice,
    currentStock: parsed.inventory.currentStock,
    lowStockThreshold: parsed.inventory.lowStockThreshold,
    supplier: parsed.inventory.supplier,
    shelfLocation: parsed.inventory.shelfLocation,
    promotions: parsed.inventory.promotions,
    overTheCounter: parsed.inventory.overTheCounter,
    prescriptionRequired: parsed.inventory.prescriptionRequired,
    publicListing: parsed.inventory.publicListing,
    active: parsed.inventory.active,
  };

  try {
    if (masterId && inventoryId) {
      // Update both models in a transaction.
      await prisma.$transaction(async (tx) => {
        await tx.medicationMaster.update({ where: { id: masterId }, data: masterData });
        await tx.pharmacyInventory.update({ where: { id: inventoryId }, data: inventoryData });

        // Sync relational fields (replace strategy).
        if (parsed.activeIngredientIds.length > 0) {
          await tx.medicationActiveIngredient.deleteMany({ where: { medicationMasterId: masterId } });
          await tx.medicationActiveIngredient.createMany({
            data: parsed.activeIngredientIds.map((id) => ({
              medicationMasterId: masterId,
              activeIngredientId: id,
            })),
            skipDuplicates: true,
          });
        } else {
          await tx.medicationActiveIngredient.deleteMany({ where: { medicationMasterId: masterId } });
        }

        if (parsed.clinicalTagIds.length > 0) {
          await tx.medicationClinicalTag.deleteMany({ where: { medicationMasterId: masterId } });
          await tx.medicationClinicalTag.createMany({
            data: parsed.clinicalTagIds.map((id) => ({
              medicationMasterId: masterId,
              clinicalTagId: id,
            })),
            skipDuplicates: true,
          });
        } else {
          await tx.medicationClinicalTag.deleteMany({ where: { medicationMasterId: masterId } });
        }
      });
      await writeAuditLog(user.id, "medication_updated", "medication_master", masterId, {
        inventoryId,
        enrichmentScore: enrichment.score,
      });
      revalidatePath("/admin/medications");
      revalidatePath(`/admin/medications/${inventoryId}`);
      revalidatePath("/medicines");
      return {
        success: `Medication updated. Enrichment: ${enrichment.score}% (${enrichment.status}).${
          validation.counts.flag > 0 ? ` ${validation.counts.flag} flag(s) acknowledged.` : ""
        }`,
      };
    }

    // Create: master first, then inventory linked to it.
    const newMaster = await prisma.medicationMaster.create({ data: masterData });

    // Sync relational fields on the new master.
    if (parsed.activeIngredientIds.length > 0) {
      await prisma.medicationActiveIngredient.createMany({
        data: parsed.activeIngredientIds.map((id) => ({
          medicationMasterId: newMaster.id,
          activeIngredientId: id,
        })),
        skipDuplicates: true,
      });
    }
    if (parsed.clinicalTagIds.length > 0) {
      await prisma.medicationClinicalTag.createMany({
        data: parsed.clinicalTagIds.map((id) => ({
          medicationMasterId: newMaster.id,
          clinicalTagId: id,
        })),
        skipDuplicates: true,
      });
    }

    const newInventory = await prisma.pharmacyInventory.create({
      data: { ...inventoryData, medicationMasterId: newMaster.id },
    });

    await writeAuditLog(user.id, "medication_created", "medication_master", newMaster.id, {
      inventoryId: newInventory.id,
      acquisitionMethod: parsed.master.acquisitionMethod,
      enrichmentScore: enrichment.score,
    });
    revalidatePath("/admin/medications");
    revalidatePath("/medicines");
    redirect("/admin/medications");
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error(e);
    return { error: "Could not save medication. The slug, SKU, or barcode may already exist." };
  }
}

export async function adminDeleteMedicationAction(formData: FormData) {
  const user = await staff();
  // inventoryId is what the admin UI passes (it lists PharmacyInventory rows).
  const inventoryId = String(formData.get("id") || "");
  if (!inventoryId) return;
  try {
    // Soft-prefer: if order line items or prescriptions still reference this inventory row,
    // deactivate instead of hard-deleting so history stays intact and the FK doesn't blow up.
    const [linkedOrders, linkedPrescriptions] = await Promise.all([
      prisma.orderItem.count({ where: { medicationId: inventoryId } }),
      prisma.prescription.count({ where: { medicationId: inventoryId } }),
    ]);
    const linked = linkedOrders + linkedPrescriptions;
    if (linked > 0) {
      await prisma.pharmacyInventory.update({
        where: { id: inventoryId },
        data: { active: false, publicListing: false },
      });
      await writeAuditLog(user.id, "medication_deactivated", "pharmacy_inventory", inventoryId, {
        linkedOrders,
        linkedPrescriptions,
      });
    } else {
      // Hard delete: remove inventory + master (master cascades via FK ON DELETE CASCADE).
      const inv = await prisma.pharmacyInventory.findUnique({
        where: { id: inventoryId },
        select: { medicationMasterId: true },
      });
      if (inv) {
        await prisma.pharmacyInventory.delete({ where: { id: inventoryId } });
        // Delete the master too (only this pharmacy stocked it).
        await prisma.medicationMaster.deleteMany({ where: { id: inv.medicationMasterId } }).catch(() => {});
        await writeAuditLog(user.id, "medication_deleted", "pharmacy_inventory", inventoryId);
      }
    }
  } catch (e) {
    console.error("[adminDeleteMedicationAction]", e);
  }
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

  // Look up the medication (PharmacyInventory row) to get the current price.
  // medicationId now points at PharmacyInventory (per Phase 0 split).
  const med = await prisma.pharmacyInventory.findUnique({
    where: { id: medicationId },
    select: {
      id: true,
      price: true,
      currentStock: true,
      overTheCounter: true,
      prescriptionRequired: true,
      medicationMaster: { select: { name: true } },
    },
  });
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
      // Create a customer + profile + loyalty + preferences, then email onboarding invite.
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
        return { profileId: p.id, userId: u.id, email: u.email };
      });
      finalCustomerId = result.profileId;

      // Send onboarding / email-verification invite so the new customer can log in.
      try {
        const token = randomBytes(32).toString("hex");
        const tokenHash = createHash("sha256").update(token).digest("hex");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await prisma.emailVerification.create({
          data: { userId: result.userId, tokenHash, expiresAt },
        });
        await sendDelivery({
          channel: "email",
          purpose: "transactional",
          recipient: { email: result.email },
          subject: "Welcome to Aether Pharmacy — complete your account",
          body:
            `Hi ${fullName},\n\n` +
            `Your account was created at our pharmacy counter. Verify your email and finish setup:\n\n` +
            emailVerificationBody(token) +
            `\n\nAfter verifying, sign in at the portal to manage refills, prescriptions, and loyalty rewards.`,
        });
      } catch (err) {
        console.error("[adminCreateOrder] onboarding email failed:", err);
      }
    }
  }

  // Apply coupon if given — with full validation.
  // The previous code only checked `active` and silently ignored invalid
  // coupons, which created abuse opportunities (expired coupons, over-limit
  // redemptions, coupons that didn't belong to the customer).
  // Now we validate existence, active state, validity window, global
  // redemption cap, and per-customer redemption cap. We also try to match
  // the coupon to the customer's email when the customer isn't selected.
  let discount = 0;
  let couponId: string | null = null;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode.toUpperCase() },
    });
    if (!coupon) {
      return { error: `Coupon "${couponCode.toUpperCase()}" does not exist.` };
    }
    if (!coupon.active) {
      return { error: `Coupon ${coupon.code} is inactive.` };
    }
    const now = new Date();
    if (coupon.validFrom && coupon.validFrom > now) {
      return { error: `Coupon ${coupon.code} is not valid yet (starts ${coupon.validFrom.toISOString().slice(0, 10)}).` };
    }
    if (coupon.validUntil && coupon.validUntil < now) {
      return { error: `Coupon ${coupon.code} expired on ${coupon.validUntil.toISOString().slice(0, 10)}.` };
    }
    if (coupon.maxRedemptions && coupon.redemptions >= coupon.maxRedemptions) {
      return { error: `Coupon ${coupon.code} has reached its redemption limit (${coupon.maxRedemptions}).` };
    }

    // Per-customer limit (default 1). Walk-in customers (no customerId) skip this.
    if (finalCustomerId) {
      const perCustomerLimit = coupon.maxRedemptionsPerCustomer ?? 1;
      const customerRedemptions = await prisma.orderItem.count({
        where: {
          couponId: coupon.id,
          order: { customerId: finalCustomerId },
        },
      });
      if (customerRedemptions >= perCustomerLimit) {
        return {
          error: `Customer has already redeemed ${coupon.code} ${customerRedemptions} time(s). Limit: ${perCustomerLimit}.`,
        };
      }
    } else if (customerEmail) {
      // Walk-in case: try to match against any prior order under this email.
      const perCustomerLimit = coupon.maxRedemptionsPerCustomer ?? 1;
      const customerRedemptions = await prisma.orderItem.count({
        where: {
          couponId: coupon.id,
          order: {
            customer: { user: { email: customerEmail.toLowerCase() } },
          },
        },
      });
      if (customerRedemptions >= perCustomerLimit) {
        return {
          error: `Email ${customerEmail} has already redeemed ${coupon.code}. Limit: ${perCustomerLimit}.`,
        };
      }
    }

    couponId = coupon.id;
    if (coupon.discountType === "percent") {
      discount = Number(med.price) * quantity * (Number(coupon.discountValue) / 100);
    } else if (coupon.discountType === "fixed") {
      discount = Number(coupon.discountValue) * quantity;
    }
    // "points" discount type is handled at loyalty redemption time, not here.
  }

  // Verify stock is sufficient — fail loudly instead of going negative.
  const medName = med.medicationMaster?.name ?? "this medication";
  if (med.currentStock < quantity) {
    return {
      error: `Insufficient stock for ${medName}. Available: ${med.currentStock}, requested: ${quantity}.`,
    };
  }

  const unitPrice = Number(med.price);
  const total = Math.max(0, unitPrice * quantity - discount);
  // Counter sales default to cash paid so revenue analytics count them.
  // Portal/refill orders stay pending until Daraja or explicit mark-paid.
  const paymentMethod = String(formData.get("paymentMethod") || "cash") as "cash" | "daraja" | "card" | "other";
  const markPaid = formData.get("markPaid") !== "off" && paymentMethod === "cash";
  const dosage = String(formData.get("dosage") || "").trim() || null;

  // Create the order in a transaction — cash path creates a completed Payment.
  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.order.create({
      data: {
        customerId: finalCustomerId,
        source,
        status: markPaid ? "paid" : "pending",
        total,
        notes: [notes, dosage ? `Dosage: ${dosage}` : null].filter(Boolean).join("\n") || null,
        servedById: user.id,
        items: {
          create: {
            medicationId,
            name: medName,
            quantity,
            unitPrice,
            discountApplied: discount,
            couponId,
          },
        },
      },
    });
    // Decrement stock (Phase 0: stock lives on PharmacyInventory.currentStock).
    await tx.pharmacyInventory.update({
      where: { id: medicationId },
      data: { currentStock: { decrement: quantity } },
    });

    if (markPaid) {
      await tx.payment.create({
        data: {
          orderId: o.id,
          customerId: finalCustomerId,
          amount: total,
          provider: "cash",
          status: "completed",
          providerRef: `CASH-${o.id.slice(0, 8).toUpperCase()}`,
        },
      });
    }

    // If Rx-required med sold at counter, optionally create a prescription record.
    if (med.prescriptionRequired && finalCustomerId && formData.get("createPrescription") === "on") {
      await tx.prescription.create({
        data: {
          customerId: finalCustomerId,
          medicationId,
          medicineName: medName,
          dosage: dosage || null,
          quantity,
          unitPrice,
          refillsRemaining: Number(formData.get("refillsRemaining") || 0),
          status: "active",
          notes: "Created from counter OTC/Rx sale",
        },
      });
    }

    return o;
  });

  if (couponId) {
    await prisma.coupon.update({
      where: { id: couponId },
      data: { redemptions: { increment: 1 } },
    });
  }

  await writeAuditLog(user.id, "order_created", "order", order.id, {
    customerId: finalCustomerId,
    medicationId,
    quantity,
    total,
    paymentMethod,
    markPaid,
  });
  revalidatePath("/admin/orders");
  revalidatePath("/admin/medications");
  if (finalCustomerId) revalidatePath(`/admin/customers/${finalCustomerId}`);
  return {
    success: markPaid
      ? `Sale recorded & paid (cash). Total: KES ${total}.`
      : `Order created (pending payment). Total: KES ${total}.`,
  };
}

export async function adminMarkOrderPaidAction(formData: FormData) {
  const user = await staff();
  const id = String(formData.get("id") || "");
  const provider = (String(formData.get("provider") || "cash") as "cash" | "card" | "other" | "daraja");
  if (!id) return { error: "Order id required." };

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return { error: "Order not found." };
  if (order.status === "paid" || order.status === "waived") {
    return { error: "Order already settled." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: { status: "paid" },
    });
    await tx.payment.create({
      data: {
        orderId: id,
        customerId: order.customerId,
        amount: order.total,
        provider,
        status: "completed",
        providerRef: `${provider.toUpperCase()}-${id.slice(0, 8).toUpperCase()}`,
      },
    });
  });

  await writeAuditLog(user.id, "order_marked_paid", "order", id, { provider });
  revalidatePath("/admin/orders");
  return { success: "Order marked as paid." };
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
  // Record a waived payment so revenue reports stay consistent.
  const order = await prisma.order.findUnique({ where: { id } });
  if (order) {
    await prisma.payment.create({
      data: {
        orderId: id,
        customerId: order.customerId,
        amount: order.total,
        provider: "other",
        status: "waived",
        providerRef: `WAIVE-${id.slice(0, 8).toUpperCase()}`,
        failureReason: reason,
      },
    }).catch(() => {
      /* may already exist */
    });
  }
  await writeAuditLog(user.id, "order_waived", "order", id, { scope, reason });
  revalidatePath("/admin/orders");
}

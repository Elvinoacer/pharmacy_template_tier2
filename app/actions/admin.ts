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
import { validateCsrfToken } from "@/app/lib/csrf";
import { prisma } from "@/app/lib/db";
import {
  updateRefillStatus,
  updateEnquiryStatus,
  respondToFeedback,
  sendStaffMessage,
  launchCampaign,
  processDueReminders,
} from "@/app/lib/services/crm";
import {
  parseLocalDatetimeInput,
  parseLocalDateInput,
  formatDate,
  now,
} from "@/app/lib/time";
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
  /** Created/updated order id (counter sale → STK pay flow). */
  orderId?: string;
  /** Hint for client: start M-Pesa STK after create. */
  startStk?: boolean;
  /** Phone to prefill STK. */
  stkPhone?: string;
};

async function staff() {
  const user = await getSessionUser();
  return requireStaff(user);
}

export async function adminUpdateRefillAction(formData: FormData) {
  const user = await staff();
  // Validate CSRF token for form submissions
  const csrfToken = String(formData.get("csrfToken") || "");
  try {
    await validateCsrfToken(csrfToken);
  } catch {
    throw new Error("Invalid request. Please refresh and try again.");
  }
  
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as RefillStatus;
  try {
    await updateRefillStatus(id, status, user.id);
  } catch (e) {
    const { InsufficientStockError } = await import("@/app/lib/services/stock");
    if (e instanceof InsufficientStockError) {
      // Surface as thrown error for API route; server-action callers should catch.
      throw new Error(e.message);
    }
    throw e;
  }
  await writeAuditLog(user.id, "refill_status_update", "refill_request", id, { status });
  revalidatePath("/admin/refills");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/medications");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");
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
        | "medication_dose"
        | "custom"),
      title,
      body: String(formData.get("body") || "") || null,
      channel: (String(formData.get("channel") || "email") as
        | "email"
        | "sms"
        | "whatsapp"
        | "push"
        | "in_app"),
      scheduledFor: formData.get("scheduledFor")
        ? parseLocalDatetimeInput(String(formData.get("scheduledFor")))
        : now(),
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

  const account = await prisma.loyaltyAccount.findFirst({ where: { customerId } });
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
          validUntil: formData.get("validUntil")
            ? parseLocalDateInput(String(formData.get("validUntil")))
            : null,
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
        validUntil: formData.get("validUntil")
            ? parseLocalDateInput(String(formData.get("validUntil")))
            : null,
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

type DrugPayload = {
  medicationId?: string | null;
  medicineName?: string;
  rxReference?: string | null;
  dosage?: string | null;
  unitPrice?: number | null;
  quantity?: number | null;
  daysSupply?: number | null;
  refillsRemaining?: number;
  frequency?: string;
  times?: string[];
  /** Parallel to times — Morning / Evening / etc. */
  labels?: string[];
  foodCondition?: "none" | "with_food" | "without_food";
  unitsPerDose?: number;
  /** First dose in entry order when times crossed midnight (HH:mm). */
  cycleAnchorTime?: string | null;
  crossesMidnight?: boolean;
};

function parseDrugsJson(formData: FormData): DrugPayload[] {
  const raw = String(formData.get("drugsJson") || "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DrugPayload[]) : [];
  } catch {
    return [];
  }
}

export async function adminCreatePrescriptionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await staff();
  const customerId = String(formData.get("customerId") || "");
  if (!customerId) return { error: "Customer is required." };

  const id = String(formData.get("id") || "");
  const drugs = parseDrugsJson(formData);

  // Shared course-level fields including 9-channel intake, prescriber verification, and clinical clarity.
  const shared = {
    prescriber: String(formData.get("prescriber") || "").trim() || null,
    intakeChannel: (formData.get("intakeChannel") as any) || "in_person_consultation",
    lifecycleStatus: (formData.get("lifecycleStatus") as any) || "received",
    prescriberLicense: String(formData.get("prescriberLicense") || "").trim() || null,
    prescriberPhone: String(formData.get("prescriberPhone") || "").trim() || null,
    prescriberEmail: String(formData.get("prescriberEmail") || "").trim() || null,
    prescriberFacility: String(formData.get("prescriberFacility") || "").trim() || null,
    prescriberVerified: formData.get("prescriberVerified") === "true" || formData.get("prescriberVerified") === "on",
    prescriberVerifiedAt: (formData.get("prescriberVerified") === "true" || formData.get("prescriberVerified") === "on") ? new Date() : null,
    patientVerified: formData.get("patientVerified") === "true" || formData.get("patientVerified") === "on",
    patientVerifiedAt: (formData.get("patientVerified") === "true" || formData.get("patientVerified") === "on") ? new Date() : null,
    patientVerificationNotes: String(formData.get("patientVerificationNotes") || "").trim() || null,
    isUnclear: formData.get("isUnclear") === "true" || formData.get("isUnclear") === "on",
    unclearReason: String(formData.get("unclearReason") || "").trim() || null,
    attachmentUrls: formData.get("attachmentUrls")
      ? String(formData.get("attachmentUrls"))
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    status: (String(formData.get("status") || "active") as
      | "active"
      | "on_hold"
      | "expired"
      | "discontinued"),
    startDate: formData.get("startDate")
      ? parseLocalDateInput(String(formData.get("startDate")))
      : null,
    endDate: formData.get("endDate")
      ? parseLocalDateInput(String(formData.get("endDate")))
      : null,
    nextRefillDue: formData.get("nextRefillDue")
      ? parseLocalDateInput(String(formData.get("nextRefillDue")))
      : null,
    notes: String(formData.get("notes") || "") || null,
  };

  const {
    applyStructuredSchedule,
    resolveStructuredSchedule,
    generateScheduleForPrescription,
  } = await import("@/app/lib/services/medication-schedule");

  async function verifyMedication(medicationId: string | null | undefined) {
    if (!medicationId) return null;
    const linkedMed = await prisma.pharmacyInventory.findUnique({
      where: { id: medicationId },
      select: {
        id: true,
        price: true,
        currentStock: true,
        medicationMaster: { select: { name: true } },
      },
    });
    if (!linkedMed) {
      throw new Error("Linked medication not found. Refresh the page and try again.");
    }
    return linkedMed;
  }

  /**
   * Ensure linked catalogue quantities never exceed on-hand stock for this fill.
   * Aggregates demand when the same medication appears on multiple drug rows.
   */
  async function assertQuantitiesWithinStock(drugList: DrugPayload[]) {
    const demand = new Map<
      string,
      { need: number; nameHint: string }
    >();
    for (const drug of drugList) {
      const medicationId = drug.medicationId || null;
      if (!medicationId) continue;
      const qty =
        drug.quantity && drug.quantity > 0 ? Math.floor(Number(drug.quantity)) : 0;
      if (qty <= 0) continue;
      const prev = demand.get(medicationId);
      if (prev) {
        prev.need += qty;
        if (!prev.nameHint && drug.medicineName) prev.nameHint = String(drug.medicineName);
      } else {
        demand.set(medicationId, {
          need: qty,
          nameHint: String(drug.medicineName || "").trim(),
        });
      }
    }
    if (demand.size === 0) return;

    const ids = [...demand.keys()];
    const rows = await prisma.pharmacyInventory.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        currentStock: true,
        medicationMaster: { select: { name: true } },
      },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));

    for (const [medicationId, { need, nameHint }] of demand) {
      const row = byId.get(medicationId);
      if (!row) {
        throw new Error(
          `Linked medication not found (${nameHint || medicationId}). Refresh and try again.`,
        );
      }
      const name = row.medicationMaster.name || nameHint || "Medication";
      const available = row.currentStock ?? 0;
      if (available <= 0) {
        throw new Error(
          `${name} is out of stock (0 on hand). Receive inventory before creating this prescription.`,
        );
      }
      if (need > available) {
        throw new Error(
          `Insufficient stock for ${name}. Requested ${need} for this fill, but only ${available} available. Lower the quantity or receive stock first.`,
        );
      }
    }
  }

  async function saveOneDrug(
    drug: DrugPayload,
    existingId?: string,
  ): Promise<{ id: string; medicineName: string; medicationId: string | null }> {
    const medicineName = String(drug.medicineName || "").trim();
    if (!medicineName) throw new Error("Medicine name is required for each drug.");

    const medicationId = drug.medicationId || null;
    const linkedMed = await verifyMedication(medicationId);

    // Per-row guard (multi-row aggregate is checked before batch create).
    const qty =
      drug.quantity && drug.quantity > 0 ? Math.floor(Number(drug.quantity)) : 0;
    if (linkedMed && qty > 0) {
      const available = linkedMed.currentStock ?? 0;
      const name = linkedMed.medicationMaster.name || medicineName;
      if (available <= 0) {
        throw new Error(
          `${name} is out of stock (0 on hand). Receive inventory before creating this prescription.`,
        );
      }
      if (qty > available) {
        throw new Error(
          `Insufficient stock for ${name}. Requested ${qty}, available ${available}. Lower the quantity or receive stock first.`,
        );
      }
    }

    const hasStructured =
      Boolean(drug.frequency) || (Array.isArray(drug.times) && drug.times.length > 0);

    const scheduleInput = {
      frequency: drug.frequency || "custom",
      times: drug.times,
      labels: drug.labels,
      foodCondition: drug.foodCondition || ("none" as const),
      unitsPerDose: drug.unitsPerDose ?? 1,
    };

    const resolved = hasStructured ? resolveStructuredSchedule(scheduleInput) : null;

    const data = {
      customerId,
      medicationId,
      medicineName,
      rxReference: drug.rxReference || null,
      dosage: drug.dosage || null,
      schedule: resolved?.scheduleText ?? null,
      quantity: qty > 0 ? qty : null,
      daysSupply: drug.daysSupply && drug.daysSupply > 0 ? drug.daysSupply : null,
      refillsRemaining: drug.refillsRemaining ?? 0,
      unitPrice: drug.unitPrice != null ? drug.unitPrice : null,
      ...shared,
    };

    if (existingId) {
      await prisma.prescription.update({ where: { id: existingId }, data });
      if (resolved) {
        await applyStructuredSchedule(existingId, scheduleInput);
      } else {
        try {
          await generateScheduleForPrescription(existingId);
        } catch (err) {
          console.warn("[adminCreatePrescription] schedule generation failed:", err);
        }
      }
      return { id: existingId, medicineName, medicationId };
    }

    const rx = await prisma.prescription.create({ data });
    if (resolved) {
      await applyStructuredSchedule(rx.id, scheduleInput);
    } else {
      try {
        await generateScheduleForPrescription(rx.id);
      } catch (err) {
        console.warn("[adminCreatePrescription] schedule generation failed:", err);
      }
    }
    return { id: rx.id, medicineName, medicationId };
  }

  // ── Edit path (single prescription) ──────────────────────────
  if (id) {
    const drug = drugs[0] || {
      medicineName: String(formData.get("medicineName") || "").trim(),
      medicationId: String(formData.get("medicationId") || "") || null,
      rxReference: String(formData.get("rxReference") || "") || null,
      dosage: String(formData.get("dosage") || "") || null,
      schedule: String(formData.get("schedule") || "") || null,
      quantity: Number(formData.get("quantity") || 0) || null,
      daysSupply: Number(formData.get("daysSupply") || 0) || null,
      refillsRemaining: Number(formData.get("refillsRemaining") || 0),
      unitPrice: formData.get("unitPrice") ? Number(formData.get("unitPrice")) : null,
    };

    try {
      await assertQuantitiesWithinStock([drug]);
      const saved = await saveOneDrug(drug, id);
      await writeAuditLog(user.id, "prescription_updated", "prescription", id, {
        customerId,
        medicationId: saved.medicationId,
      });
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Could not update prescription." };
    }

    revalidatePath("/admin/prescriptions");
    revalidatePath(`/admin/prescriptions/${id}`);
    revalidatePath(`/admin/customers/${customerId}`);
    return { success: "Prescription updated." };
  }

  // ── Create path (one or many drugs) ──────────────────────────
  const toCreate =
    drugs.length > 0
      ? drugs
      : [
          {
            medicineName: String(formData.get("medicineName") || "").trim(),
            medicationId: String(formData.get("medicationId") || "") || null,
            rxReference: String(formData.get("rxReference") || "") || null,
            dosage: String(formData.get("dosage") || "") || null,
            quantity: Number(formData.get("quantity") || 0) || null,
            daysSupply: Number(formData.get("daysSupply") || 0) || null,
            refillsRemaining: Number(formData.get("refillsRemaining") || 0),
            unitPrice: formData.get("unitPrice") ? Number(formData.get("unitPrice")) : null,
            frequency: undefined,
            times: undefined,
          } satisfies DrugPayload,
        ];

  if (!toCreate.some((d) => String(d.medicineName || "").trim())) {
    return { error: "At least one medication with a name is required." };
  }

  const created: Array<{ id: string; medicineName: string; medicationId: string | null }> = [];
  try {
    // Aggregate stock check first so multi-drug forms can't oversell the same SKU.
    await assertQuantitiesWithinStock(toCreate);

    for (const drug of toCreate) {
      if (!String(drug.medicineName || "").trim()) continue;
      const saved = await saveOneDrug(drug);
      created.push(saved);
      await addTimelineEvent(
        customerId,
        user.id,
        "prescription_created",
        "Prescription added",
        `${saved.medicineName} — ${drug.refillsRemaining ?? 0} refills`,
        { prescriptionId: saved.id, medicationId: saved.medicationId },
        user.id,
      );
      await writeAuditLog(user.id, "prescription_created", "prescription", saved.id, {
        customerId,
        medicationId: saved.medicationId,
      });
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create prescription." };
  }

  if (created.length === 0) {
    return { error: "At least one medication with a name is required." };
  }

  revalidatePath("/admin/prescriptions");
  revalidatePath(`/admin/customers/${customerId}`);

  // Single drug → detail page; multi → list so the admin sees all new rows.
  if (created.length === 1) {
    redirect(`/admin/prescriptions/${created[0].id}`);
  }
  redirect("/admin/prescriptions");
}

/**
 * Dispatch a prescription — deducts stock from the linked medication.
 *
 * Per the spec: prescriptions must NOT affect inventory at creation time.
 * Only when an admin explicitly clicks "Dispatch" should stock be deducted.
 *
 * Idempotent: if the prescription is already dispatched, returns success
 * without re-decrementing stock. Also skips stock if a linked refill already
 * deducted inventory for this prescription fill.
 *
 * Returns ActionState so insufficient-stock and other failures surface inline
 * instead of crashing into the admin error boundary.
 */
export async function adminDispatchPrescriptionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await staff();
    const id = String(formData.get("id") || "");
    if (!id) return { error: "Prescription id required." };

    // ── Commerce ledger path (audit §5, §41.A) ──
    // Dispatch now creates: PrescriptionFill + Order + OrderItem (with price
    // + cost snapshots) + stock movement (prescription_fill) + CommerceEvent.
    // The legacy `dispatchedAt` on Prescription is still updated for back-compat
    // with the existing prescription detail page.
    const rx = await prisma.prescription.findUnique({
      where: { id },
      include: {
        medication: { include: { medicationMaster: { select: { name: true } } } },
        customer: { select: { id: true, fullName: true } },
      },
    });
    if (!rx) return { error: "Prescription not found." };

    // Idempotent — already dispatched (legacy field on Prescription).
    if (rx.dispatchedAt) {
      revalidatePath(`/admin/prescriptions/${id}`);
      return { success: "Already dispatched." };
    }

    const { createPrescriptionFill } = await import("@/app/lib/services/commerce/prescription-fills");
    const { applyStockChange, notifyStockThreshold, InsufficientStockError } = await import("@/app/lib/services/stock");

    // Pre-check stock so we can return a friendly message without rolling back.
    const qty = rx.quantity ?? 1;
    if (rx.medicationId && rx.medication && (rx.medication.currentStock ?? 0) < qty) {
      const name = rx.medication.medicationMaster?.name || rx.medicineName;
      return {
        error: `Insufficient stock for ${name}. Available: ${rx.medication.currentStock ?? 0}, required: ${qty}. Receive stock or lower the prescription quantity before dispatching.`,
      };
    }

    const markPaid = String(formData.get("markPaid") || "cash") !== "none";
    const paymentMethod = String(formData.get("markPaid") || "cash") as "cash" | "daraja" | "card" | "other";

    try {
      const result = await prisma.$transaction(async (tx) => {
        return createPrescriptionFill(tx, {
          prescriptionId: id,
          actorId: user.id,
          manualUnitPrice: rx.unitPrice != null ? Number(rx.unitPrice) : null,
          markDispatched: true,
          markPaid,
          paymentMethod,
          notes: `Dispatched by ${user.email}`,
        });
      });

      // Stock threshold notification (best-effort, outside tx).
      try {
        if (rx.medicationId) {
          const inv = await prisma.pharmacyInventory.findUnique({
            where: { id: rx.medicationId },
            select: { currentStock: true, lowStockThreshold: true, medicationMaster: { select: { name: true } } },
          });
          if (inv) {
            await notifyStockThreshold({
              inventoryId: rx.medicationId,
              previousStock: inv.currentStock + qty,
              newStock: inv.currentStock,
              quantityDelta: -qty,
              lotIds: [],
              lotDetails: [],
              movementIds: [],
              crossedLowStock: inv.currentStock <= inv.lowStockThreshold,
              isOutOfStock: inv.currentStock <= 0,
              medicationName: inv.medicationMaster.name,
              lowStockThreshold: inv.lowStockThreshold,
            });
          }
        }
      } catch (e) {
        console.error("[adminDispatchPrescription] notifyStockThreshold failed:", e);
      }

      await addTimelineEvent(
        rx.customerId,
        user.id,
        "prescription_dispatched",
        "Prescription dispatched",
        `${rx.medicineName} — ${qty} units (Fill #${result.fillId.slice(0, 8)})`,
        { prescriptionId: id, fillId: result.fillId, orderId: result.orderId, medicationId: rx.medicationId, quantity: qty },
        user.id,
      );
      await writeAuditLog(user.id, "prescription_dispatched", "prescription", id, {
        medicationId: rx.medicationId,
        quantity: qty,
        orderId: result.orderId,
        fillId: result.fillId,
      });

      revalidatePath(`/admin/prescriptions/${id}`);
      revalidatePath(`/admin/customers/${rx.customerId}`);
      revalidatePath("/admin/medications");
      revalidatePath("/admin/inventory");
      revalidatePath("/admin/orders");

      const paymentNote = markPaid ? ` Payment recorded (${paymentMethod}).` : " Payment pending.";
      return {
        success: `Dispatched ${rx.medicineName} (${qty} units). Fill #${result.fillId.slice(0, 8)} → Order #${result.orderId.slice(0, 8)}.${paymentNote}`,
        orderId: result.orderId,
      };
    } catch (e) {
      if (e instanceof InsufficientStockError || (e instanceof Error && e.name === "InsufficientStockError")) {
        const stockErr = e as InstanceType<typeof InsufficientStockError> & {
          medicationName?: string;
          available?: number;
          required?: number;
        };
        const name = stockErr.medicationName || rx.medicineName;
        const available = stockErr.available ?? rx.medication?.currentStock ?? 0;
        const required = stockErr.required ?? qty;
        return {
          error: `Insufficient stock for ${name}. Available: ${available}, required: ${required}. Receive stock or lower the prescription quantity before dispatching.`,
        };
      }
      throw e;
    }
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    console.error("[adminDispatchPrescription]", e);
    return {
      error: e instanceof Error ? e.message : "Failed to dispatch prescription.",
    };
  }
}

// ── Legacy dispatch path retained for reference / fallback ────────────────
// (No longer called; adminDispatchPrescriptionAction above now routes through
// createPrescriptionFill which produces a full commercial transaction.)

export async function adminDeletePrescriptionAction(formData: FormData) {
  const user = await staff();
  const id = String(formData.get("id") || "");
  if (!id) redirect("/admin/prescriptions");

  const existing = await prisma.prescription.findUnique({
    where: { id },
    select: { id: true, customerId: true },
  });
  if (!existing) {
    // Already gone — don't 404 the detail page; land on the list.
    revalidatePath("/admin/prescriptions");
    redirect("/admin/prescriptions");
  }

  await prisma.prescription.delete({ where: { id } });
  await writeAuditLog(user.id, "prescription_deleted", "prescription", id);
  revalidatePath("/admin/prescriptions");
  revalidatePath(`/admin/customers/${existing.customerId}`);
  // Critical: leave the detail URL so Next doesn't re-render a deleted row → 404.
  redirect("/admin/prescriptions");
}

/**
 * Verify patient & prescriber information.
 */
export async function adminVerifyPrescriptionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await staff();
    const prescriptionId = String(formData.get("prescriptionId") || "");
    if (!prescriptionId) return { error: "Prescription ID is required." };

    const {
      verifyPrescriptionPatientInfo,
      verifyPrescriptionPrescriberInfo,
    } = await import("@/app/lib/services/prescription-lifecycle");

    const patientVerified = formData.get("patientVerified") === "true" || formData.get("patientVerified") === "on";
    const patientNotes = String(formData.get("patientNotes") || "").trim();

    const prescriberVerified = formData.get("prescriberVerified") === "true" || formData.get("prescriberVerified") === "on";
    const prescriber = String(formData.get("prescriber") || "").trim();
    const prescriberLicense = String(formData.get("prescriberLicense") || "").trim();
    const prescriberPhone = String(formData.get("prescriberPhone") || "").trim();
    const prescriberEmail = String(formData.get("prescriberEmail") || "").trim();
    const prescriberFacility = String(formData.get("prescriberFacility") || "").trim();

    await verifyPrescriptionPatientInfo({
      prescriptionId,
      staffId: user.id,
      verified: patientVerified,
      notes: patientNotes,
    });

    await verifyPrescriptionPrescriberInfo({
      prescriptionId,
      staffId: user.id,
      prescriber: prescriber || undefined,
      prescriberLicense: prescriberLicense || undefined,
      prescriberPhone: prescriberPhone || undefined,
      prescriberEmail: prescriberEmail || undefined,
      prescriberFacility: prescriberFacility || undefined,
      verified: prescriberVerified,
    });

    await writeAuditLog(user.id, "prescription_verified", "prescription", prescriptionId, {
      patientVerified,
      prescriberVerified,
    });

    revalidatePath(`/admin/prescriptions/${prescriptionId}`);
    revalidatePath("/admin/prescriptions");
    return { success: "Patient & prescriber verification updated." };
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    console.error("[adminVerifyPrescriptionAction]", e);
    return { error: e instanceof Error ? e.message : "Failed to verify prescription." };
  }
}

/**
 * Flag an unclear prescription and request prescriber clarification.
 */
export async function adminFlagUnclearPrescriptionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await staff();
    const prescriptionId = String(formData.get("prescriptionId") || "");
    const unclearReason = String(formData.get("unclearReason") || "").trim();
    const notes = String(formData.get("notes") || "").trim();
    const placeOnHold = formData.get("placeOnHold") === "true" || formData.get("placeOnHold") === "on";

    if (!prescriptionId) return { error: "Prescription ID is required." };
    if (!unclearReason) return { error: "Reason for flagging is required." };

    const { flagPrescriptionAsUnclear } = await import("@/app/lib/services/prescription-lifecycle");

    await flagPrescriptionAsUnclear({
      prescriptionId,
      staffId: user.id,
      unclearReason,
      notes,
      placeOnHold,
    });

    await writeAuditLog(user.id, "prescription_flagged_unclear", "prescription", prescriptionId, {
      unclearReason,
      placeOnHold,
    });

    revalidatePath(`/admin/prescriptions/${prescriptionId}`);
    revalidatePath("/admin/prescriptions");
    return { success: "Prescription flagged for prescriber clarification." };
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    console.error("[adminFlagUnclearPrescriptionAction]", e);
    return { error: e instanceof Error ? e.message : "Failed to flag prescription." };
  }
}

/**
 * Log prescriber clarification communication attempt or resolution.
 */
export async function adminLogClarificationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await staff();
    const prescriptionId = String(formData.get("prescriptionId") || "");
    const contactMethod = String(formData.get("contactMethod") || "phone").trim();
    const contactedTo = String(formData.get("contactedTo") || "").trim();
    const inquiryDetails = String(formData.get("inquiryDetails") || "").trim();
    const doctorResponse = String(formData.get("doctorResponse") || "").trim();
    const resolved = formData.get("resolved") === "true" || formData.get("resolved") === "on";

    if (!prescriptionId) return { error: "Prescription ID is required." };
    if (!contactedTo) return { error: "Prescriber contact / name is required." };
    if (!inquiryDetails) return { error: "Inquiry / clarification details required." };

    const { logPrescriberClarificationAttempt } = await import("@/app/lib/services/prescription-lifecycle");

    await logPrescriberClarificationAttempt({
      prescriptionId,
      staffId: user.id,
      contactMethod,
      contactedTo,
      inquiryDetails,
      doctorResponse,
      resolved,
    });

    await writeAuditLog(user.id, "prescriber_clarification_logged", "prescription", prescriptionId, {
      contactMethod,
      resolved,
    });

    revalidatePath(`/admin/prescriptions/${prescriptionId}`);
    revalidatePath("/admin/prescriptions");
    return { success: resolved ? "Prescriber clarification resolved successfully." : "Prescriber contact log recorded." };
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    console.error("[adminLogClarificationAction]", e);
    return { error: e instanceof Error ? e.message : "Failed to log clarification." };
  }
}

/**
 * Pharmacist Professional Review: Approve, Reject, or Hold.
 */
export async function adminReviewPrescriptionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await staff();
    const prescriptionId = String(formData.get("prescriptionId") || "");
    const decision = String(formData.get("decision") || "approved") as "approved" | "rejected" | "on_hold";
    const notes = String(formData.get("notes") || "").trim();
    const rejectionReason = String(formData.get("rejectionReason") || "").trim();
    const holdReason = String(formData.get("holdReason") || "").trim();

    if (!prescriptionId) return { error: "Prescription ID is required." };
    if (decision === "rejected" && !rejectionReason) {
      return { error: "Clinical rejection reason is required." };
    }
    if (decision === "on_hold" && !holdReason) {
      return { error: "Reason for placing prescription on hold is required." };
    }

    const { recordPrescriptionReviewDecision } = await import("@/app/lib/services/prescription-lifecycle");

    const updated = await recordPrescriptionReviewDecision({
      prescriptionId,
      staffId: user.id,
      decision,
      notes,
      rejectionReason,
      holdReason,
    });

    await writeAuditLog(user.id, "prescription_reviewed", "prescription", prescriptionId, {
      decision,
      rejectionReason,
      holdReason,
    });

    await addTimelineEvent(
      updated.customerId,
      user.id,
      `prescription_${decision}`,
      `Prescription ${decision === "approved" ? "Approved" : decision === "rejected" ? "Rejected" : "Placed On Hold"}`,
      `${updated.medicineName}: ${decision === "approved" ? (notes || "Verified by pharmacist") : (decision === "rejected" ? rejectionReason : holdReason)}`,
      { prescriptionId, decision },
      user.id,
    );

    revalidatePath(`/admin/prescriptions/${prescriptionId}`);
    revalidatePath("/admin/prescriptions");
    revalidatePath(`/admin/customers/${updated.customerId}`);

    return {
      success: `Prescription ${decision === "approved" ? "approved for dispensing" : decision === "rejected" ? "rejected" : "placed on hold"}.`,
    };
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    console.error("[adminReviewPrescriptionAction]", e);
    return { error: e instanceof Error ? e.message : "Failed to record review decision." };
  }
}

/**
 * Transition prescription along lifecycle progression.
 */
export async function adminUpdatePrescriptionLifecycleStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await staff();
    const prescriptionId = String(formData.get("prescriptionId") || "");
    const newStatus = String(formData.get("newStatus") || "") as any;
    const notes = String(formData.get("notes") || "").trim();

    if (!prescriptionId) return { error: "Prescription ID is required." };
    if (!newStatus) return { error: "Target status is required." };

    const { transitionPrescriptionLifecycleStatus } = await import("@/app/lib/services/prescription-lifecycle");

    await transitionPrescriptionLifecycleStatus({
      prescriptionId,
      staffId: user.id,
      newStatus,
      notes,
    });

    await writeAuditLog(user.id, "prescription_status_transitioned", "prescription", prescriptionId, {
      newStatus,
    });

    revalidatePath(`/admin/prescriptions/${prescriptionId}`);
    revalidatePath("/admin/prescriptions");
    return { success: `Prescription lifecycle updated to ${newStatus}.` };
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    console.error("[adminUpdatePrescriptionLifecycleStatusAction]", e);
    return { error: e instanceof Error ? e.message : "Failed to update lifecycle status." };
  }
}

/**
 * Convert prescription items into a commercial dispensing order (ready for POS / counter payment / pickup).
 */
export async function adminConvertToDispensingOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await staff();
    const prescriptionId = String(formData.get("prescriptionId") || "");
    const markPaid = formData.get("markPaid") === "true" || formData.get("markPaid") === "on";
    const paymentMethod = (String(formData.get("paymentMethod") || "cash") as "cash" | "daraja" | "card" | "other");
    const markDispatched = formData.get("markDispatched") === "true" || formData.get("markDispatched") === "on";
    const notes = String(formData.get("notes") || "").trim();

    if (!prescriptionId) return { error: "Prescription ID is required." };

    const { convertPrescriptionToCommercialDispensingOrder } = await import("@/app/lib/services/prescription-lifecycle");

    const result = await convertPrescriptionToCommercialDispensingOrder({
      prescriptionId,
      staffId: user.id,
      markPaid,
      paymentMethod,
      markDispatched,
      notes,
    });

    await writeAuditLog(user.id, "prescription_converted_to_order", "prescription", prescriptionId, {
      orderId: result.orderId,
      fillId: result.fillId,
    });

    revalidatePath(`/admin/prescriptions/${prescriptionId}`);
    revalidatePath("/admin/prescriptions");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${result.orderId}`);

    return {
      success: `Prescription converted into Dispensing Order #${result.orderId.slice(0, 8)}.`,
      orderId: result.orderId,
    };
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    console.error("[adminConvertToDispensingOrderAction]", e);
    return { error: e instanceof Error ? e.message : "Failed to convert prescription into dispensing order." };
  }
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
  const reason = String(formData.get("reason") || "").trim() || null;
  const dispenserNote = String(formData.get("dispenserNote") || "").trim() || null;
  const source = String(formData.get("source") || "counter");

  if (!medicationId || quantity < 1) return { error: "Medication and quantity are required." };

  // Look up the medication (PharmacyInventory row) to get the current price.
  // medicationId now points at PharmacyInventory (per Phase 0 split).
  const med = await prisma.pharmacyInventory.findUnique({
    where: { id: medicationId },
    select: {
      id: true,
      price: true,
      purchasePrice: true,
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
    const coupon = await prisma.coupon.findFirst({
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
      return { error: `Coupon ${coupon.code} is not valid yet (starts ${formatDate(coupon.validFrom)}).` };
    }
    if (coupon.validUntil && coupon.validUntil < now) {
      return { error: `Coupon ${coupon.code} expired on ${formatDate(coupon.validUntil)}.` };
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

  const medName = med.medicationMaster?.name ?? "this medication";
  const unitPrice = Number(med.price);
  const total = Math.max(0, unitPrice * quantity - discount);
  // Counter sales default to cash paid so revenue analytics count them.
  // Portal/refill orders stay pending until Daraja or explicit mark-paid.
  const paymentMethod = String(formData.get("paymentMethod") || "cash") as "cash" | "daraja" | "card" | "other";
  const markPaid = formData.get("markPaid") !== "off" && paymentMethod === "cash";
  const dosage = String(formData.get("dosage") || "").trim() || null;

  // Rx-required counter sales that auto-dispatch need a dispenser note up front.
  if (med.prescriptionRequired && !dispenserNote && formData.get("autoDispatch") !== "off") {
    // Only hard-require when they intend to dispatch now (auto-dispatch on).
    // Held reservations can add the note at dispatch time.
    const willAutoDispatch =
      formData.get("autoDispatch") !== "off" &&
      (source === "counter" || formData.get("autoDispatch") === "on") &&
      String(formData.get("paymentMethod") || "cash") === "cash";
    if (willAutoDispatch) {
      return {
        error:
          "Dispenser note is required before dispatching an Rx-required medication (condition observed, counselling, validity).",
      };
    }
  }

  // OTC counter: auto-dispatch by default (customer walking out with meds).
  // Admin can uncheck "Mark as dispatched" to keep it as a paid reservation.
  const autoDispatch =
    formData.get("autoDispatch") !== "off" &&
    (source === "counter" || formData.get("autoDispatch") === "on");
  const fulfillment =
    String(formData.get("fulfillment") || "").trim() ||
    (autoDispatch ? "immediate" : "reserve");
  const guestName = String(formData.get("customerName") || "").trim() || null;
  const guestPhoneRaw =
    String(formData.get("customerPhone") || formData.get("mpesaPhone") || "").trim() || null;
  const { formatMpesaPhone } = await import("@/app/lib/services/daraja");
  const guestPhone = guestPhoneRaw ? formatMpesaPhone(guestPhoneRaw) : null;

  const {
    applyStockChange,
    notifyStockThreshold,
    InsufficientStockError,
  } = await import("@/app/lib/services/stock");

  let stockResult: Awaited<ReturnType<typeof applyStockChange>> | null = null;
  let orderId = "";

  try {
    const order = await prisma.$transaction(
      async (tx) => {
      // ── PRESCRIPTION-REQUIRED DISPENSING PATH ──────────────────
      if (med.prescriptionRequired || formData.get("prescriptionId")) {
        const { createPrescriptionFill } = await import("@/app/lib/services/commerce/prescription-fills");

        // Guarantee customer anchor for prescription and fill tracking
        if (!finalCustomerId) {
          const walkInName = String(formData.get("customerName") || "Walk-in Patient").trim();
          const walkInPhone = guestPhone || String(formData.get("customerPhone") || "").trim() || null;
          const walkInEmail = customerEmail || `patient-${Date.now()}@pharmacy.internal`;

          const u = await tx.user.create({
            data: {
              email: walkInEmail.toLowerCase(),
              role: "customer" as const,
              emailVerified: false,
            },
          });
          const p = await tx.customerProfile.create({
            data: {
              userId: u.id,
              fullName: walkInName,
              phone: walkInPhone,
            },
          });
          finalCustomerId = p.id;
        }

        let targetRxId = String(formData.get("prescriptionId") || "").trim();

        // If no existing prescription selected, automatically create the new prescription
        if (!targetRxId) {
          const prescriber = String(formData.get("prescriber") || "Licensed Prescriber").trim();
          const prescriberLicense = String(formData.get("prescriberLicense") || "").trim();
          const patientNationalId = String(formData.get("patientNationalId") || "").trim();
          const rxRef = String(formData.get("rxReference") || `RX-${Date.now().toString(36).toUpperCase()}`).trim();
          const refillsRemaining = Math.max(0, Number(formData.get("refillsRemaining") || 0));
          const daysSupply = Number(formData.get("daysSupply") || 30);

          const rx = await tx.prescription.create({
            data: {
              customerId: finalCustomerId,
              medicationId,
              medicineName: medName,
              prescriber,
              rxReference: rxRef,
              dosage: dosage || "As directed by prescriber",
              quantity,
              unitPrice,
              daysSupply,
              refillsRemaining,
              status: "active",
              notes: [
                dispenserNote ? `[Dispenser Note]: ${dispenserNote}` : null,
                prescriberLicense ? `Prescriber License: ${prescriberLicense}` : null,
                patientNationalId ? `Patient National ID: ${patientNationalId}` : null,
                notes,
              ]
                .filter(Boolean)
                .join("\n") || "Created via counter dispensing",
            },
          });
          targetRxId = rx.id;
        }

        // Convert prescription into a commercial fill with exactly ONE stock deduction
        const fillResult = await createPrescriptionFill(tx, {
          prescriptionId: targetRxId,
          actorId: user.id,
          manualUnitPrice: unitPrice,
          discountAmount: discount,
          markDispatched: autoDispatch,
          markPaid,
          paymentMethod: paymentMethod as any,
          notes: [dispenserNote, reason ? `Reason: ${reason}` : null].filter(Boolean).join(" · ") || null,
        });

        // Update the order with counter dispenser metadata
        await tx.order.update({
          where: { id: fillResult.orderId },
          data: {
            reason,
            dispenserNote: dispenserNote || null,
            dispenserNoteAt: dispenserNote ? new Date() : null,
            dispenserNoteById: dispenserNote ? user.id : null,
            guestName: guestName,
            guestPhone: guestPhone,
          },
        });

        if (couponId) {
          await tx.coupon.update({
            where: { id: couponId },
            data: { redemptions: { increment: 1 } },
          });
        }

        return { id: fillResult.orderId };
      }

      // ── STANDARD OTC COUNTER SALES PATH ─────────────────────────
      const initialStatus = markPaid
        ? autoDispatch
          ? "fulfilled"
          : "paid"
        : "pending";

      const { deriveInitialStages } = await import("@/app/lib/services/commerce/orders");
      const { recordCommerceEvent } = await import("@/app/lib/services/commerce/events");
      const { createReservation } = await import("@/app/lib/services/commerce/reservations");
      const unitCost = Number(med.purchasePrice ?? 0);
      const grossAmount = unitPrice * quantity;
      const netAmount = Math.max(0, grossAmount - discount);
      const grossProfit = netAmount - unitCost * quantity;
      const stages = deriveInitialStages({
        type: "OTC_PURCHASE",
        source,
        isCounterSale: source === "counter",
        markPaid,
        autoDispatch,
        fulfillment: fulfillment === "delivery" ? "delivery" : autoDispatch ? "immediate" : "reserve",
      });

      const o = await tx.order.create({
        data: {
          customerId: finalCustomerId,
          source,
          status: initialStatus,
          total,
          type: stages.type,
          lifecycleStatus: stages.lifecycleStatus,
          paymentStage: stages.paymentStage,
          fulfillmentStage: stages.fulfillmentStage,
          currency: "KES",
          subtotal: grossAmount,
          discountTotal: discount,
          taxTotal: 0,
          netTotal: netAmount,
          amountPaid: markPaid ? netAmount : 0,
          amountRefunded: 0,
          amountDue: markPaid ? 0 : netAmount,
          reservedAt: stages.reservedAt,
          expiresAt: stages.expiresAt,
          paidAt: stages.paidAt,
          fulfilledAt: stages.fulfilledAt,
          dispatchedAt: stages.dispatchedAt,
          notes: [notes, dosage ? `Dosage: ${dosage}` : null].filter(Boolean).join("\n") || null,
          reason,
          dispenserNote: dispenserNote || null,
          dispenserNoteAt: dispenserNote ? new Date() : null,
          dispenserNoteById: dispenserNote ? user.id : null,
          guestName: finalCustomerId ? null : guestName,
          guestPhone: guestPhone,
          guestEmail: String(formData.get("customerEmail") || "").trim() || null,
          fulfillment: fulfillment === "delivery" ? "delivery" : autoDispatch ? "immediate" : "reserve",
          dispatchedById: markPaid && autoDispatch ? user.id : null,
          servedById: user.id,
          items: {
            create: {
              medicationId,
              name: medName,
              quantity,
              unitPrice,
              discountApplied: discount,
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

      // Stock handling for OTC sale
      if (stages.fulfillmentStage === "fulfilled" && autoDispatch) {
        stockResult = await applyStockChange(tx, {
          inventoryId: medicationId,
          quantityDelta: -quantity,
          reason: "sale",
          notes: `Counter OTC sale × ${quantity}`,
          relatedType: "order",
          relatedId: o.id,
          actorId: user.id,
        });
      } else {
        try {
          await createReservation(tx, {
            orderId: o.id,
            inventoryId: medicationId,
            quantity,
            createdById: user.id,
            expiresAt: stages.expiresAt,
          });
          stockResult = null;
        } catch (err) {
          if (err instanceof Error && err.message !== "reservation_already_exists") {
            throw err;
          }
        }
      }

      await recordCommerceEvent(tx, {
        eventType: "order_created",
        entityType: "order",
        entityId: o.id,
        orderId: o.id,
        customerId: finalCustomerId ?? null,
        actorId: user.id,
        amount: netAmount,
        metadata: { source, type: stages.type, quantity, medicationId },
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
            initiatedById: user.id,
            paidAt: new Date(),
          },
        });
      }

      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { redemptions: { increment: 1 } },
        });
      }

      return o;
    }, { maxWait: 15000, timeout: 30000 });
    orderId = order.id;
  } catch (e) {
    if (e instanceof InsufficientStockError) {
      return {
        error: `Insufficient stock for ${e.medicationName}. Available: ${e.available}, requested: ${e.required}.`,
      };
    }
    throw e;
  }

  if (stockResult) await notifyStockThreshold(stockResult);

  await writeAuditLog(user.id, "order_created", "order", orderId, {
    customerId: finalCustomerId,
    medicationId,
    quantity,
    total,
    paymentMethod,
    markPaid,
    autoDispatch,
    fulfillment,
  });
  revalidatePath("/admin/orders");
  revalidatePath("/admin/medications");
  revalidatePath("/admin/inventory");
  if (finalCustomerId) revalidatePath(`/admin/customers/${finalCustomerId}`);

  if (paymentMethod === "daraja") {
    return {
      success: `Order created (KES ${total}). Send STK push — customer enters PIN on their phone.`,
      orderId,
      startStk: true,
      stkPhone: guestPhone || undefined,
    };
  }

  return {
    success: markPaid
      ? autoDispatch
        ? `Sale recorded, paid (cash) & dispatched. Total: KES ${total}.`
        : `Sale recorded & paid (cash), held for later dispatch. Total: KES ${total}.`
      : `Order created (pending payment). Total: KES ${total}.`,
    orderId,
  };
}

export async function adminMarkOrderPaidAction(formData: FormData) {
  const user = await staff();
  const id = String(formData.get("id") || "");
  const provider = (String(formData.get("provider") || "cash") as "cash" | "card" | "other" | "daraja");
  const autoDispatch = formData.get("autoDispatch") !== "off";
  const dispenserNote = String(formData.get("dispenserNote") || "").trim() || null;
  if (!id) return { error: "Order id required." };

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          medication: {
            select: { prescriptionRequired: true, overTheCounter: true },
          },
        },
      },
    },
  });
  if (!order) return { error: "Order not found." };
  if (order.status === "paid" || order.status === "fulfilled" || order.status === "waived") {
    return { error: "Order already settled." };
  }

  const doDispatch =
    autoDispatch &&
    (order.fulfillment === "immediate" || order.source === "counter" || formData.get("autoDispatch") === "on");

  // Rx gate also applies on paid+dispatch from the settle panel.
  if (doDispatch) {
    const hasRxItem = order.items.some(
      (i) => i.medication?.prescriptionRequired === true && i.medication?.overTheCounter !== true,
    );
    const noteToUse = dispenserNote || order.dispenserNote;
    if (hasRxItem && !noteToUse) {
      return {
        error:
          "Dispenser note required before dispatching Rx medication — record condition observed, counselling, and validity.",
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: {
        status: doDispatch ? "fulfilled" : "paid",
        ...(doDispatch
          ? { dispatchedAt: new Date(), dispatchedById: user.id }
          : {}),
        ...(dispenserNote
          ? {
              dispenserNote,
              dispenserNoteAt: new Date(),
              dispenserNoteById: user.id,
            }
          : {}),
      },
    });
    await tx.payment.create({
      data: {
        orderId: id,
        customerId: order.customerId,
        amount: order.total,
        provider,
        status: "completed",
        providerRef: `${provider.toUpperCase()}-${id.slice(0, 8).toUpperCase()}`,
        initiatedById: user.id,
      },
    });
  });

  await writeAuditLog(user.id, "order_marked_paid", "order", id, { provider, doDispatch });
  revalidatePath("/admin/orders");
  return {
    success: doDispatch
      ? "Order marked paid & dispatched."
      : "Order marked as paid (awaiting dispatch).",
  };
}

/** Hand over a paid remote/reservation order to the customer. */
export async function adminDispatchOrderAction(formData: FormData) {
  const user = await staff();
  const id = String(formData.get("id") || "");
  if (!id) return { error: "Order id required." };

  const dispenserNote = String(formData.get("dispenserNote") || "").trim() || null;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          medication: {
            select: { prescriptionRequired: true, overTheCounter: true },
          },
        },
      },
    },
  });
  if (!order) return { error: "Order not found." };

  // Verification gate: Rx-required lines need a dispenser clinical note before handoff.
  const hasRxItem = order.items.some(
    (i) => i.medication?.prescriptionRequired === true && i.medication?.overTheCounter !== true,
  );
  const noteToUse = dispenserNote || order.dispenserNote;
  if (hasRxItem && !noteToUse) {
    return {
      error:
        "Dispenser note required before dispatching Rx medication — record condition observed, counselling, and validity.",
    };
  }

  if (dispenserNote) {
    await prisma.order.update({
      where: { id },
      data: {
        dispenserNote,
        dispenserNoteAt: new Date(),
        dispenserNoteById: user.id,
      },
    });
  }

  const { dispatchOrder } = await import("@/app/lib/services/payments");
  const result = await dispatchOrder({ orderId: id, actorId: user.id });
  if (!result.ok) return { error: result.error };

  await writeAuditLog(user.id, "order_dispatched", "order", id, {
    hasRxItem,
    dispenserNotePresent: Boolean(noteToUse),
  });
  revalidatePath("/admin/orders");
  return { success: "Order marked as dispatched." };
}

/** Undo auto-dispatch — keep paid, hold for later handoff. */
export async function adminUndispatchOrderAction(formData: FormData) {
  const user = await staff();
  const id = String(formData.get("id") || "");
  if (!id) return { error: "Order id required." };

  const { undispatchOrder } = await import("@/app/lib/services/payments");
  const result = await undispatchOrder({ orderId: id, actorId: user.id });
  if (!result.ok) return { error: result.error };

  await writeAuditLog(user.id, "order_undispatched", "order", id, {});
  revalidatePath("/admin/orders");
  return { success: "Dispatch cleared — order held as paid reservation." };
}

export async function adminWaiveOrderAction(formData: FormData) {
  const user = await staff();
  const id = String(formData.get("id") || "");
  const scope = String(formData.get("scope") || "one_time") as "one_time" | "recurring_until" | "recurring_permanent";
  const reason = String(formData.get("reason") || "") || null;
  const until = formData.get("until")
    ? parseLocalDateInput(String(formData.get("until")))
    : null;
  if (!id) return;

  // ── Commerce ledger path (audit §47) ──
  // markOrderWaived handles paymentStage, amountDue, CommerceEvent, and order
  // financial recompute atomically. We still mirror the legacy waived payment
  // row so existing dashboards (which sum Payment.amount by status=waived)
  // keep working.
  await prisma.$transaction(async (tx) => {
    const { markOrderWaived } = await import("@/app/lib/services/commerce/orders");
    await markOrderWaived(tx, {
      orderId: id,
      actorId: user.id,
      reason,
      scope,
      until,
    });
    // Mirror a waived payment row for back-compat with existing dashboards.
    const order = await tx.order.findUnique({ where: { id }, select: { customerId: true, netTotal: true, total: true } });
    if (order) {
      await tx.payment.create({
        data: {
          orderId: id,
          customerId: order.customerId,
          amount: Number(order.netTotal || order.total || 0),
          provider: "other",
          status: "waived",
          providerRef: `WAIVE-${id.slice(0, 8).toUpperCase()}`,
          failureReason: reason,
          paidAt: new Date(),
        },
      }).catch(() => {
        /* may already exist */
      });
    }
  });
  await writeAuditLog(user.id, "order_waived", "order", id, { scope, reason });
  revalidatePath("/admin/orders");
}

/**
 * Refund an order's completed payment. Creates a first-class Refund row,
 * recomputes the order's financials, and (for non-Daraja providers) marks
 * the refund completed immediately. Audit §14.
 */
export async function adminRefundOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await staff();
    const orderId = String(formData.get("orderId") || "");
    const paymentId = String(formData.get("paymentId") || "");
    const amountStr = String(formData.get("amount") || "0");
    const reason = String(formData.get("reason") || "") || null;
    const provider = String(formData.get("provider") || "cash") as "cash" | "daraja" | "card" | "other";

    if (!orderId || !paymentId) return { error: "Order and payment are required." };
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) return { error: "Refund amount must be greater than zero." };

    const { createRefund } = await import("@/app/lib/services/commerce/refunds");
    const result = await createRefund({
      paymentId,
      amount,
      reason: reason ?? undefined,
      provider,
      createdById: user.id,
      approvedById: user.id,
      markCompleted: provider !== "daraja",
    });

    if (!result.ok) return { error: result.error };

    await writeAuditLog(user.id, "refund_created", "order", orderId, {
      paymentId,
      refundId: result.refundId,
      amount,
      reason,
      provider,
    });
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders?orderId=${orderId}`);
    return { success: `Refund of KES ${amount.toFixed(0)} recorded.` };
  } catch (e) {
    console.error("[adminRefundOrder]", e);
    return { error: e instanceof Error ? e.message : "Failed to process refund." };
  }
}

/**
 * Cancel an order with full commerce-side cleanup (audit §67.6).
 * Releases any active reservation, marks the order cancelled, optionally
 * auto-refunds any completed payments.
 */
export async function adminCancelOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await staff();
    const orderId = String(formData.get("orderId") || "");
    const reason = String(formData.get("reason") || "cancelled_by_staff") || "cancelled_by_staff";
    const autoRefund = formData.get("autoRefund") === "on";
    if (!orderId) return { error: "Order id required." };

    const { cancelOrder } = await import("@/app/lib/services/commerce/fulfillment");
    const result = await cancelOrder({
      orderId,
      actorId: user.id,
      reason,
      autoRefund,
      refundReason: reason,
    });

    if (!result.ok) return { error: result.error };

    await writeAuditLog(user.id, "order_cancelled", "order", orderId, {
      reason,
      autoRefund,
      refundId: result.refundId ?? null,
    });
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders?orderId=${orderId}`);
    return { success: `Order cancelled.${autoRefund && result.refundId ? " Refund initiated." : ""}` };
  } catch (e) {
    console.error("[adminCancelOrder]", e);
    return { error: e instanceof Error ? e.message : "Failed to cancel order." };
  }
}

// ── Inventory ops: receive / adjust / lots ────────────────────

/** Receive stock (goods-in) — increments inventory + optional lot (batch/expiry). */
export async function adminReceiveStockAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await staff();
  const inventoryId = String(formData.get("inventoryId") || "");
  const quantity = Math.max(0, Number(formData.get("quantity") || 0));
  const batchNumber = String(formData.get("batchNumber") || "").trim() || undefined;
  const expiryRaw = String(formData.get("expiryDate") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;
  const purchasePriceRaw = String(formData.get("purchasePrice") || "").trim();

  if (!inventoryId) return { error: "Inventory id required." };
  if (quantity < 1) return { error: "Quantity must be at least 1." };
  if (batchNumber && !expiryRaw) return { error: "Expiry date is required when a batch number is set." };

  const expiryDate = expiryRaw ? parseLocalDateInput(expiryRaw) : undefined;
  if (expiryDate && Number.isNaN(expiryDate.getTime())) {
    return { error: "Invalid expiry date." };
  }

  const { applyStockChange, notifyStockThreshold } = await import("@/app/lib/services/stock");

  const result = await prisma.$transaction(async (tx) => {
    if (purchasePriceRaw !== "" && !Number.isNaN(Number(purchasePriceRaw))) {
      await tx.pharmacyInventory.update({
        where: { id: inventoryId },
        data: { purchasePrice: Number(purchasePriceRaw) },
      });
    }
    return applyStockChange(tx, {
      inventoryId,
      quantityDelta: quantity,
      reason: "receive",
      notes: notes ?? `Goods received × ${quantity}`,
      relatedType: "manual",
      actorId: user.id,
      batchNumber,
      expiryDate,
    });
  });

  await notifyStockThreshold(result);
  await writeAuditLog(user.id, "stock_received", "pharmacy_inventory", inventoryId, {
    quantity,
    batchNumber,
    balanceAfter: result.newStock,
  });
  revalidatePath("/admin/medications");
  revalidatePath(`/admin/medications/${inventoryId}`);
  revalidatePath("/admin/inventory");
  return {
    success: `Received ${quantity} unit(s). Stock is now ${result.newStock}.`,
  };
}

/** Adjust stock (stocktake / correction / write-off). Signed quantity or absolute set. */
export async function adminAdjustStockAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await staff();
  const inventoryId = String(formData.get("inventoryId") || "");
  const mode = String(formData.get("mode") || "delta"); // delta | absolute
  const quantityRaw = Number(formData.get("quantity") || 0);
  const notes = String(formData.get("notes") || "").trim();
  const reason = (String(formData.get("reason") || "adjust") as "adjust" | "write_off" | "return");

  if (!inventoryId) return { error: "Inventory id required." };
  if (!notes) return { error: "A reason/note is required for stock adjustments (audit)." };

  const {
    applyStockChange,
    setAbsoluteStock,
    notifyStockThreshold,
    InsufficientStockError,
  } = await import("@/app/lib/services/stock");

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (mode === "absolute") {
        if (quantityRaw < 0) throw new Error("Absolute stock cannot be negative.");
        return setAbsoluteStock(tx, {
          inventoryId,
          newStock: Math.floor(quantityRaw),
          reason: "adjust",
          notes,
          relatedType: "manual",
          actorId: user.id,
        });
      }
      const delta = Math.trunc(quantityRaw);
      if (delta === 0) throw new Error("Adjustment quantity cannot be zero.");
      return applyStockChange(tx, {
        inventoryId,
        quantityDelta: delta,
        reason: delta < 0 && reason === "write_off" ? "write_off" : delta > 0 && reason === "return" ? "return" : "adjust",
        notes,
        relatedType: "manual",
        actorId: user.id,
        skipLots: delta > 0, // positive adjust without lot unless receive flow used
      });
    });

    await notifyStockThreshold(result);
    await writeAuditLog(user.id, "stock_adjusted", "pharmacy_inventory", inventoryId, {
      mode,
      quantity: quantityRaw,
      balanceAfter: result.newStock,
      notes,
    });
    revalidatePath("/admin/medications");
    revalidatePath(`/admin/medications/${inventoryId}`);
    revalidatePath("/admin/inventory");
    return {
      success: `Stock updated. Balance is now ${result.newStock} (Δ ${result.quantityDelta}).`,
    };
  } catch (e) {
    if (e instanceof InsufficientStockError) {
      return {
        error: `Cannot adjust: only ${e.available} available (tried to remove ${e.required}).`,
      };
    }
    return { error: e instanceof Error ? e.message : "Adjustment failed." };
  }
}

/** Deactivate an empty or expired lot (does not change aggregate stock — use adjust for that). */
export async function adminDeactivateLotAction(formData: FormData) {
  const user = await staff();
  const lotId = String(formData.get("lotId") || "");
  const inventoryId = String(formData.get("inventoryId") || "");
  if (!lotId) return;
  await prisma.inventoryLot.update({
    where: { id: lotId },
    data: { active: false },
  });
  await writeAuditLog(user.id, "lot_deactivated", "inventory_lot", lotId, { inventoryId });
  revalidatePath(`/admin/medications/${inventoryId}`);
  revalidatePath("/admin/inventory");
}

/** Write off remaining quantity on an expired lot (deducts aggregate + zeroes lot). */
export async function adminWriteOffLotAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await staff();
  const lotId = String(formData.get("lotId") || "");
  const inventoryId = String(formData.get("inventoryId") || "");
  const notes = String(formData.get("notes") || "").trim() || "Expired lot write-off";
  if (!lotId || !inventoryId) return { error: "Lot and inventory required." };

  const lot = await prisma.inventoryLot.findUnique({ where: { id: lotId } });
  if (!lot || lot.pharmacyInventoryId !== inventoryId) return { error: "Lot not found." };
  if (lot.quantity <= 0) {
    await prisma.inventoryLot.update({ where: { id: lotId }, data: { active: false } });
    return { success: "Lot already empty — deactivated." };
  }

  const { applyStockChange, notifyStockThreshold, InsufficientStockError } = await import(
    "@/app/lib/services/stock"
  );

  try {
    const result = await prisma.$transaction(async (tx) => {
      const r = await applyStockChange(tx, {
        inventoryId,
        quantityDelta: -lot.quantity,
        reason: "write_off",
        notes: `${notes} (batch ${lot.batchNumber})`,
        relatedType: "inventory_lot",
        relatedId: lotId,
        actorId: user.id,
        skipLots: true, // we zero this lot explicitly
      });
      await tx.inventoryLot.update({
        where: { id: lotId },
        data: { quantity: 0, active: false },
      });
      return r;
    });
    await notifyStockThreshold(result);
    await writeAuditLog(user.id, "lot_written_off", "inventory_lot", lotId, {
      quantity: lot.quantity,
      inventoryId,
    });
    revalidatePath(`/admin/medications/${inventoryId}`);
    revalidatePath("/admin/inventory");
    return { success: `Wrote off ${lot.quantity} unit(s) from batch ${lot.batchNumber}.` };
  } catch (e) {
    if (e instanceof InsufficientStockError) {
      return { error: e.message };
    }
    return { error: "Write-off failed." };
  }
}

// ════════════════════════════════════════════════════════════════
// ── Enhanced Medication Refills Server Actions ──────────────────
// ════════════════════════════════════════════════════════════════

export async function adminCreateInboundRefillAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await staff();
    const { createRefillRequest } = await import("@/app/lib/services/crm");

    const medicineName = String(formData.get("medicineName") || "").trim();
    const customerId = String(formData.get("customerId") || "").trim() || null;
    const customerName = String(formData.get("customerName") || "").trim() || null;
    const phone = String(formData.get("phone") || "").trim() || null;
    const email = String(formData.get("email") || "").trim() || null;
    const prescriptionId = String(formData.get("prescriptionId") || "").trim() || null;
    const rxReference = String(formData.get("rxReference") || "").trim() || null;
    const pickupPreference = (String(formData.get("pickupPreference") || "pickup") as "pickup" | "delivery");
    const preferredDate = String(formData.get("preferredDate") || "") || undefined;
    const preferredTime = String(formData.get("preferredTime") || "") || undefined;
    const notes = String(formData.get("notes") || "").trim() || undefined;
    const source = (String(formData.get("source") || "staff") as "website" | "portal" | "ai" | "phone" | "whatsapp" | "staff");

    if (!medicineName) {
      return { error: "Medicine name is required." };
    }

    const refill = await createRefillRequest({
      customerId,
      prescriptionId: prescriptionId || undefined,
      medicineName,
      rxReference: rxReference || undefined,
      customerName: customerName || undefined,
      phone: phone || undefined,
      email: email || undefined,
      pickupPreference,
      preferredDate,
      preferredTime,
      notes,
      source,
    });

    await writeAuditLog(user.id, "staff_inbound_refill_created", "refill_request", refill.id, {
      medicineName,
      source,
      customerId,
    });

    revalidatePath("/admin/refills");
    revalidatePath("/admin/customers");
    return { success: `Refill request created for ${medicineName}.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to record refill request." };
  }
}

export async function adminApproveRefillAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await staff();
    const id = String(formData.get("id") || "");
    if (!id) return { error: "Refill id is required." };

    const markPreparing = formData.get("markPreparing") === "true";
    const markPaid = formData.get("markPaid") === "true";
    const paymentMethod = (String(formData.get("paymentMethod") || "cash") as "cash" | "daraja" | "card" | "other");
    const notes = String(formData.get("notes") || "").trim() || undefined;
    const overrideUnitPrice = formData.get("overrideUnitPrice") ? Number(formData.get("overrideUnitPrice")) : undefined;

    const { approveRefillRequest } = await import("@/app/lib/services/refills");
    const result = await approveRefillRequest(id, user.id, {
      markPreparing,
      markPaid,
      paymentMethod,
      notes,
      overrideUnitPrice,
    });

    revalidatePath("/admin/refills");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/prescriptions");
    return { success: `Refill approved successfully.${markPreparing ? " Status moved to Preparing." : ""}` };
  } catch (e) {
    const { InsufficientStockError } = await import("@/app/lib/services/stock");
    if (e instanceof InsufficientStockError) {
      return { error: e.message };
    }
    return { error: e instanceof Error ? e.message : "Failed to approve refill." };
  }
}

export async function adminSendRefillReminderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await staff();
    const customerId = String(formData.get("customerId") || "");
    const prescriptionId = String(formData.get("prescriptionId") || "") || undefined;
    const refillRequestId = String(formData.get("refillRequestId") || "") || undefined;
    const channel = (String(formData.get("channel") || "sms") as "sms" | "whatsapp" | "email" | "in_app");
    const customSubject = String(formData.get("subject") || "").trim() || undefined;
    const customBody = String(formData.get("body") || "").trim() || undefined;

    if (!customerId) return { error: "Customer id is required." };

    const { sendDirectRefillReminder } = await import("@/app/lib/services/refills");
    const res = await sendDirectRefillReminder({
      customerId,
      prescriptionId,
      refillRequestId,
      channel,
      customSubject,
      customBody,
      actorId: user.id,
    });

    revalidatePath("/admin/refills");
    revalidatePath(`/admin/customers/${customerId}`);
    return { success: `Refill reminder sent via ${channel.toUpperCase()} (${res.deliveryStatus}).` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to send refill reminder." };
  }
}

export async function adminRequestPrescriberRefillAuthAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await staff();
    const prescriptionId = String(formData.get("prescriptionId") || "");
    const contactMethod = String(formData.get("contactMethod") || "phone");
    const contactedTo = String(formData.get("contactedTo") || "").trim();
    const inquiryDetails = String(formData.get("inquiryDetails") || "").trim();
    const doctorResponse = String(formData.get("doctorResponse") || "").trim() || undefined;
    const resolved = formData.get("resolved") === "true" || formData.get("resolved") === "on";

    if (!prescriptionId || !contactedTo || !inquiryDetails) {
      return { error: "Prescription, doctor contact, and inquiry details are required." };
    }

    const { logPrescriberRefillAuthorization } = await import("@/app/lib/services/refills");
    await logPrescriberRefillAuthorization({
      prescriptionId,
      contactMethod,
      contactedTo,
      inquiryDetails,
      doctorResponse,
      resolved,
      actorId: user.id,
    });

    revalidatePath("/admin/refills");
    revalidatePath(`/admin/prescriptions/${prescriptionId}`);
    return { success: `Prescriber contact recorded.${resolved ? " Status marked resolved." : ""}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to record prescriber inquiry." };
  }
}

export async function adminInterveneMissedRefillAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await staff();
    const customerId = String(formData.get("customerId") || "");
    const prescriptionId = String(formData.get("prescriptionId") || "");
    const channel = (String(formData.get("channel") || "whatsapp") as "whatsapp" | "sms" | "email" | "in_app");
    const message = String(formData.get("message") || "").trim();
    const notifyCaregivers = formData.get("notifyCaregivers") === "on" || formData.get("notifyCaregivers") === "true";

    if (!customerId || !prescriptionId || !message) {
      return { error: "Customer, prescription, and intervention message are required." };
    }

    const { sendDirectRefillReminder } = await import("@/app/lib/services/refills");
    await sendDirectRefillReminder({
      customerId,
      prescriptionId,
      channel,
      customSubject: "Clinical Adherence Follow-up from Aether Pharmacy",
      customBody: message,
      actorId: user.id,
    });

    // Notify caregivers if requested
    if (notifyCaregivers) {
      const caregivers = await prisma.caregiver.findMany({
        where: { customerId, status: "active" },
        include: { caregiverUser: { select: { id: true } } },
      });
      for (const cg of caregivers) {
        if (cg.caregiverUser?.id) {
          await prisma.notification.create({
            data: {
              userId: cg.caregiverUser.id,
              channel: "in_app",
              type: "refill",
              title: "Patient Refill Follow-up Alert",
              body: `A clinical adherence follow-up was initiated for your dependent's maintenance medication.`,
              status: "delivered",
              sentAt: new Date(),
            },
          });
        }
      }
    }

    // Add note to patient record
    await prisma.customerNote.create({
      data: {
        customerId,
        authorId: user.id,
        body: `[Non-Adherence Intervention] Sent ${channel.toUpperCase()} follow-up regarding missed refill. Message: "${message}"`,
      },
    });

    revalidatePath("/admin/refills");
    revalidatePath(`/admin/customers/${customerId}`);
    return { success: "Non-adherence clinical intervention recorded and sent." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to record clinical intervention." };
  }
}


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

  await sendStaffMessage({
    customerId,
    channel: (String(formData.get("channel") || "email") as "email" | "sms" | "whatsapp" | "portal"),
    subject: String(formData.get("subject") || "") || undefined,
    body,
    staffId: user.id,
    scheduledFor: formData.get("scheduledFor")
      ? new Date(String(formData.get("scheduledFor")))
      : undefined,
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

  await prisma.customerNote.create({
    data: {
      customerId,
      authorId: user.id,
      body,
      isPinned: formData.get("isPinned") === "on",
    },
  });
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

    await prisma.campaign.create({
      data: {
        name,
        description: String(formData.get("description") || "") || null,
        channel: (String(formData.get("channel") || "email") as "email" | "sms" | "whatsapp" | "multi"),
        segmentId: String(formData.get("segmentId") || "") || null,
        subject: String(formData.get("subject") || "") || null,
        body,
        status: formData.get("schedule") ? "scheduled" : "draft",
        scheduledFor: formData.get("scheduledFor")
          ? new Date(String(formData.get("scheduledFor")))
          : null,
        createdById: user.id,
      },
    });
    revalidatePath("/admin/campaigns");
    return { success: "Campaign created." };
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
    await prisma.segment.create({
      data: {
        name,
        description: String(formData.get("description") || "") || null,
        isSystem: false,
        createdById: user.id,
      },
    });
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
  } else {
    await prisma.knowledgeArticle.create({
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

  await prisma.reminder.create({
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
      scheduledFor: new Date(String(formData.get("scheduledFor") || new Date().toISOString())),
      createdById: user.id,
    },
  });
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

  await prisma.messageTemplate.create({
    data: {
      name,
      channel: (String(formData.get("channel") || "email") as "email" | "sms" | "whatsapp" | "portal" | "ai"),
      subject: String(formData.get("subject") || "") || null,
      body,
      category: String(formData.get("category") || "general"),
      createdById: user.id,
    },
  });
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

  revalidatePath("/admin/loyalty");
  revalidatePath(`/admin/customers/${customerId}`);
  return { success: "Points updated." };
}

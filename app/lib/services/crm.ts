import "server-only";

import { prisma } from "@/app/lib/db";
import type { RefillStatus, EnquiryStatus, FeedbackStatus, CampaignStatus } from "@/app/generated/prisma/client";
import { addTimelineEvent } from "@/app/lib/timeline";

export async function getCustomerDashboard(customerId: string) {
  const [profile, prescriptions, refills, notifications, loyalty, reminders, timeline] =
    await Promise.all([
      prisma.customerProfile.findUnique({
        where: { id: customerId },
        include: { preferences: true, user: { select: { email: true, emailVerified: true } } },
      }),
      prisma.prescription.findMany({
        where: { customerId, status: "active" },
        orderBy: { nextRefillDue: "asc" },
      }),
      prisma.refillRequest.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.notification.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.loyaltyAccount.findUnique({
        where: { customerId },
        include: { transactions: { orderBy: { createdAt: "desc" }, take: 5 } },
      }),
      prisma.reminder.findMany({
        where: { customerId, status: "scheduled" },
        orderBy: { scheduledFor: "asc" },
        take: 5,
      }),
      prisma.timelineEvent.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
    ]);

  return { profile, prescriptions, refills, notifications, loyalty, reminders, timeline };
}

export async function createRefillRequest(data: {
  customerId?: string | null;
  medicineName: string;
  rxReference?: string;
  customerName?: string;
  phone?: string;
  email?: string;
  pickupPreference?: "pickup" | "delivery";
  preferredDate?: string;
  preferredTime?: string;
  notes?: string;
  source?: "website" | "portal" | "ai" | "phone" | "whatsapp" | "staff";
  prescriptionId?: string;
}) {
  const refill = await prisma.refillRequest.create({
    data: {
      customerId: data.customerId ?? undefined,
      prescriptionId: data.prescriptionId ?? undefined,
      medicineName: data.medicineName,
      rxReference: data.rxReference ?? null,
      customerName: data.customerName ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      pickupPreference: data.pickupPreference ?? "pickup",
      preferredDate: data.preferredDate ? new Date(data.preferredDate) : null,
      preferredTime: data.preferredTime ?? null,
      notes: data.notes ?? null,
      source: data.source ?? "website",
      status: "submitted",
    },
  });

  if (data.customerId) {
    await addTimelineEvent(
      data.customerId,
      null,
      "refill_submitted",
      "Refill requested",
      `${data.medicineName} — submitted`,
      { refillId: refill.id },
    );

    await prisma.notification.create({
      data: {
        customerId: data.customerId,
        channel: "in_app",
        type: "refill",
        title: "Refill request submitted",
        body: `We received your request for ${data.medicineName}. Our team will review it shortly.`,
        status: "delivered",
        sentAt: new Date(),
        relatedType: "refill_request",
        relatedId: refill.id,
      },
    });
  }

  return refill;
}

export async function updateRefillStatus(
  refillId: string,
  status: RefillStatus,
  actorId?: string,
) {
  const refill = await prisma.refillRequest.update({
    where: { id: refillId },
    data: { status, statusUpdatedAt: new Date(), assignedToId: actorId },
  });

  if (refill.customerId) {
    await addTimelineEvent(
      refill.customerId,
      actorId ?? null,
      "refill_status",
      `Refill ${status.replaceAll("_", " ")}`,
      `${refill.medicineName} is now ${status.replaceAll("_", " ")}`,
      { refillId, status },
      actorId,
    );

    await prisma.notification.create({
      data: {
        customerId: refill.customerId,
        channel: "in_app",
        type: "refill",
        title: `Refill ${status.replaceAll("_", " ")}`,
        body: `Your request for ${refill.medicineName} is now: ${status.replaceAll("_", " ")}.`,
        status: "delivered",
        sentAt: new Date(),
        relatedType: "refill_request",
        relatedId: refill.id,
      },
    });

    if (status === "ready_for_pickup") {
      await prisma.reminder.create({
        data: {
          customerId: refill.customerId,
          type: "pickup",
          title: "Prescription ready for pickup",
          body: `${refill.medicineName} is ready at the pharmacy.`,
          channel: "sms",
          scheduledFor: new Date(),
          status: "scheduled",
          relatedType: "refill_request",
          relatedId: refill.id,
          createdById: actorId,
        },
      });
    }
  }

  return refill;
}

export async function getAdminAnalytics() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalCustomers,
    newCustomers,
    activeRefills,
    completedRefills,
    cancelledRefills,
    openEnquiries,
    messagesSent,
    aiConversations,
    aiEscalations,
    campaigns,
    feedbackAvg,
  ] = await Promise.all([
    prisma.customerProfile.count(),
    prisma.customerProfile.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.refillRequest.count({
      where: { status: { in: ["submitted", "under_review", "approved", "preparing", "ready_for_pickup"] } },
    }),
    prisma.refillRequest.count({ where: { status: "collected" } }),
    prisma.refillRequest.count({ where: { status: "cancelled" } }),
    prisma.enquiry.count({ where: { status: { in: ["new", "in_progress"] } } }),
    prisma.notification.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.aiConversation.count(),
    prisma.aiConversation.count({ where: { escalated: true } }),
    prisma.campaign.count(),
    prisma.feedback.aggregate({ _avg: { rating: true }, _count: true }),
  ]);

  const refillByStatus = await prisma.refillRequest.groupBy({
    by: ["status"],
    _count: true,
  });

  return {
    totalCustomers,
    newCustomers,
    activeRefills,
    completedRefills,
    cancelledRefills,
    openEnquiries,
    messagesSent,
    aiConversations,
    aiEscalations,
    campaigns,
    feedbackAvg: feedbackAvg._avg.rating,
    feedbackCount: feedbackAvg._count,
    refillByStatus,
  };
}

export async function listCustomers(search?: string) {
  return prisma.customerProfile.findMany({
    where: search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { user: { email: { contains: search, mode: "insensitive" } } },
          ],
        }
      : undefined,
    include: {
      user: { select: { email: true, lastLoginAt: true, status: true } },
      loyaltyAccount: true,
      segments: { include: { segment: true } },
      _count: { select: { refillRequests: true, prescriptions: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getCustomerDetail(customerId: string) {
  return prisma.customerProfile.findUnique({
    where: { id: customerId },
    include: {
      user: true,
      preferences: true,
      caregivers: true,
      prescriptions: { orderBy: { createdAt: "desc" } },
      refillRequests: { orderBy: { createdAt: "desc" }, take: 20 },
      timelineEvents: { orderBy: { createdAt: "desc" }, take: 40 },
      segments: { include: { segment: true } },
      notifications: { orderBy: { createdAt: "desc" }, take: 20 },
      reminders: { orderBy: { scheduledFor: "desc" }, take: 20 },
      loyaltyAccount: { include: { transactions: { orderBy: { createdAt: "desc" }, take: 10 } } },
      staffNotes: { include: { author: { select: { email: true } } }, orderBy: { createdAt: "desc" } },
      conversations: {
        include: { messages: { orderBy: { createdAt: "asc" } } },
        orderBy: { lastMessageAt: "desc" },
      },
      enquiries: { orderBy: { createdAt: "desc" } },
      feedback: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function createEnquiry(data: {
  name: string;
  email?: string;
  phone?: string;
  type?: "general" | "product_availability" | "delivery" | "contact" | "careers" | "other";
  subject?: string;
  message: string;
  customerId?: string;
  source?: string;
}) {
  const enquiry = await prisma.enquiry.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      type: data.type ?? "general",
      subject: data.subject,
      message: data.message,
      customerId: data.customerId,
      source: data.source ?? "website",
    },
  });

  if (data.customerId) {
    await addTimelineEvent(
      data.customerId,
      null,
      "enquiry",
      "Enquiry submitted",
      data.subject || data.type || "general",
      { enquiryId: enquiry.id },
    );
  }

  return enquiry;
}

export async function updateEnquiryStatus(id: string, status: EnquiryStatus, staffNotes?: string, assignedToId?: string) {
  return prisma.enquiry.update({
    where: { id },
    data: {
      status,
      staffNotes: staffNotes ?? undefined,
      assignedToId: assignedToId ?? undefined,
    },
  });
}

export async function createFeedback(data: {
  name?: string;
  email?: string;
  rating?: number;
  type?: "review" | "suggestion" | "complaint" | "satisfaction";
  title?: string;
  body: string;
  customerId?: string;
}) {
  return prisma.feedback.create({
    data: {
      name: data.name,
      email: data.email,
      rating: data.rating,
      type: data.type ?? "review",
      title: data.title,
      body: data.body,
      customerId: data.customerId,
    },
  });
}

export async function respondToFeedback(id: string, response: string, responderId: string, isPublic = false) {
  return prisma.feedback.update({
    where: { id },
    data: {
      staffResponse: response,
      respondedById: responderId,
      respondedAt: new Date(),
      status: "responded" as FeedbackStatus,
      isPublic,
    },
  });
}

export async function getApprovedKnowledge() {
  return prisma.knowledgeArticle.findMany({
    where: { isApproved: true },
    orderBy: [{ priority: "desc" }, { title: "asc" }],
  });
}

export async function sendStaffMessage(data: {
  customerId: string;
  channel: "email" | "sms" | "whatsapp" | "portal";
  subject?: string;
  body: string;
  staffId: string;
  scheduledFor?: Date;
}) {
  const conversation = await prisma.conversation.create({
    data: {
      customerId: data.customerId,
      channel: data.channel === "portal" ? "portal" : data.channel,
      subject: data.subject,
      status: data.scheduledFor ? "pending" : "open",
      assignedToId: data.staffId,
      messages: {
        create: {
          direction: "outbound",
          channel: data.channel === "portal" ? "portal" : data.channel,
          senderType: "staff",
          senderId: data.staffId,
          body: data.body,
          subject: data.subject,
          status: data.scheduledFor ? "scheduled" : "sent",
          scheduledFor: data.scheduledFor,
        },
      },
    },
    include: { messages: true },
  });

  await prisma.notification.create({
    data: {
      customerId: data.customerId,
      channel: data.channel === "portal" ? "in_app" : data.channel,
      type: "message",
      title: data.subject || "Message from Aether Pharmacy",
      body: data.body,
      status: data.scheduledFor ? "pending" : "sent",
      sentAt: data.scheduledFor ? null : new Date(),
    },
  });

  await addTimelineEvent(
    data.customerId,
    data.staffId,
    "message_sent",
    "Staff message sent",
    data.subject || data.channel,
    { conversationId: conversation.id },
    data.staffId,
  );

  return conversation;
}

export async function launchCampaign(campaignId: string, actorId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { segment: { include: { members: true } } },
  });
  if (!campaign) throw new Error("Campaign not found");

  const memberIds =
    campaign.segment?.members.map((m) => m.customerId) ??
    (await prisma.customerProfile.findMany({ select: { id: true } })).map((c) => c.id);

  let sent = 0;
  for (const customerId of memberIds) {
    await prisma.notification.create({
      data: {
        customerId,
        channel: campaign.channel === "multi" ? "email" : campaign.channel,
        type: "campaign",
        title: campaign.subject || campaign.name,
        body: campaign.body,
        status: "sent",
        sentAt: new Date(),
        relatedType: "campaign",
        relatedId: campaign.id,
      },
    });
    sent += 1;
  }

  return prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "sent" as CampaignStatus,
      sentAt: new Date(),
      stats: { sent, delivered: sent, opened: 0, clicked: 0, replied: 0 },
      createdById: actorId,
    },
  });
}

export async function processDueReminders() {
  const due = await prisma.reminder.findMany({
    where: { status: "scheduled", scheduledFor: { lte: new Date() } },
    take: 50,
  });

  for (const reminder of due) {
    await prisma.notification.create({
      data: {
        customerId: reminder.customerId,
        channel: reminder.channel,
        type: reminder.type,
        title: reminder.title,
        body: reminder.body || reminder.title,
        status: "sent",
        sentAt: new Date(),
        relatedType: "reminder",
        relatedId: reminder.id,
      },
    });
    await prisma.reminder.update({
      where: { id: reminder.id },
      data: { status: "sent", sentAt: new Date() },
    });
    await addTimelineEvent(
      reminder.customerId,
      null,
      "reminder_sent",
      reminder.title,
      reminder.body || undefined,
      { reminderId: reminder.id },
    );
  }

  return due.length;
}

import "server-only";

import { notifyCareRequest } from "./care-request-notifications";
import { acceptsCareRequests } from "./care-request-availability";
import { withPlatformBypass } from "@/app/lib/tenant-context";
import { requireTenantId } from "@/app/lib/tenant";
import { assertCampaignConfiguration } from "@/app/lib/platform/plan-enforcement";
import { prisma } from "@/app/lib/db";
import type { RefillStatus, EnquiryStatus, FeedbackStatus, CampaignStatus } from "@/app/generated/prisma/client";
import { addTimelineEvent } from "@/app/lib/timeline";
import { sendDelivery } from "@/app/lib/services/delivery";
import { dispatchPushToUser, dispatchPushToStaff } from "@/app/lib/services/push";
import { recordAdminNotification } from "@/app/lib/services/admin-notifications";
import { formatTime, toLocalDateInputValue } from "@/app/lib/time";
import { hasPremiumPlan } from "@/app/lib/platform/entitlements";

export async function getCustomerDashboard(customerId: string) {
  return withPlatformBypass(async () => {
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
      prisma.loyaltyAccount.findFirst({
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
  });
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
  const pharmacyId = await requireTenantId();
  if (!(await acceptsCareRequests(pharmacyId))) throw new Error("This pharmacy is no longer accepting requests.");
  const refill = await prisma.$transaction(async (tx) => {
  const saved = await tx.refillRequest.create({
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
  await tx.adminNotification.create({ data: {
    type: "refill_new", title: "New refill request",
    body: `${data.customerName || "A customer"} requested ${data.medicineName}.`,
    relatedType: "refill_request", relatedId: saved.id,
  } });
  return saved;
  });
  await notifyCareRequest({ ...refill, relatedType: "refill_request", staff: true,
    title: "Refill request received", body: "Your refill request has been received. The pharmacy will review it and confirm availability." });


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

    // Stop "please refill" nags — the customer already acted.
    const cancelWhere = data.prescriptionId
      ? {
          customerId: data.customerId,
          type: "refill" as const,
          status: { in: ["scheduled" as const, "sent" as const] },
          OR: [
            { relatedId: data.prescriptionId },
            { relatedType: "prescription", relatedId: data.prescriptionId },
          ],
        }
      : {
          customerId: data.customerId,
          type: "refill" as const,
          status: { in: ["scheduled" as const, "sent" as const] },
          title: { contains: data.medicineName.slice(0, 40) },
        };
    await prisma.reminder
      .updateMany({
        where: cancelWhere,
        data: { status: "cancelled" },
      })
      .catch(() => null);
  }

  // Always alert staff — including guest / website refills without a customer profile.
  const who =
    data.customerName ||
    (data.customerId
      ? (
          await prisma.customerProfile.findUnique({
            where: { id: data.customerId },
            select: { fullName: true },
          })
        )?.fullName
      : null) ||
    data.email ||
    data.phone ||
    "A customer";

  await dispatchPushToStaff({
    title: "New refill request",
    body: `${who} requested ${data.medicineName}.`,
    url: "/admin/refills",
    data: {
      tag: "refill-new",
      ...(data.customerId ? { customerId: data.customerId } : {}),
      refillId: refill.id,
    },
  }).catch(() => {
    /* push is best-effort */
  });



  return refill;
}

/**
 * When a refill reaches preparing / ready / collected, fulfill inventory once:
 * - deduct stock (FEFO) if linked medication exists and not already deducted
 * - decrement refillsRemaining once
 * - mark prescription dispatched if not already
 * - ensure a linked Order exists for payment tracking
 *
 * Idempotent via stock_movements relatedType=refill_request.
 */
export async function fulfillRefillInventory(
  refillId: string,
  actorId?: string,
): Promise<void> {
  const {
    applyStockChange,
    notifyStockThreshold,
    InsufficientStockError,
  } = await import("@/app/lib/services/stock");

  const existingMovement = await prisma.stockMovement.findFirst({
    where: {
      relatedType: "refill_request",
      relatedId: refillId,
      quantityDelta: { lt: 0 },
    },
    select: { id: true },
  });

  const refill = await prisma.refillRequest.findUnique({
    where: { id: refillId },
    include: {
      prescription: {
        include: {
          medication: {
            include: { medicationMaster: { select: { name: true } } },
          },
        },
      },
    },
  });
  if (!refill) return;

  const rx = refill.prescription;
  const medicationId = rx?.medicationId ?? null;
  const qty = rx?.quantity ?? 1;
  const unitPrice = rx?.unitPrice != null ? Number(rx.unitPrice) : Number(rx?.medication?.price ?? 0);
  const medName =
    rx?.medication?.medicationMaster?.name ??
    rx?.medicineName ??
    refill.medicineName;

  // Already stock-deducted for this refill — still ensure order + dispatch flags.
  if (existingMovement) {
    await ensureRefillOrder(refill, medName, qty, unitPrice, medicationId, actorId);
    return;
  }

  try {
    const stockResult = await prisma.$transaction(async (tx) => {
      let result = null as Awaited<ReturnType<typeof applyStockChange>> | null;

      if (medicationId) {
        result = await applyStockChange(tx, {
          inventoryId: medicationId,
          quantityDelta: -qty,
          reason: "refill",
          notes: `Refill fulfilled: ${medName}`,
          relatedType: "refill_request",
          relatedId: refillId,
          actorId: actorId ?? null,
        });
      }

      if (rx) {
        const shouldDecrementRefills = (rx.refillsRemaining ?? 0) > 0;
        await tx.prescription.update({
          where: { id: rx.id },
          data: {
            ...(rx.dispatchedAt
              ? {}
              : {
                  dispatchedAt: new Date(),
                  dispatchedById: actorId ?? null,
                }),
            ...(shouldDecrementRefills ? { refillsRemaining: { decrement: 1 } } : {}),
            lastFilledAt: new Date(),
          },
        });
      }

      // Ensure payable order exists for this refill.
      const existingOrder = await tx.order.findFirst({
        where: { refillId },
        select: { id: true },
      });
      if (!existingOrder && medicationId) {
        const total = Math.max(0, unitPrice * qty);
        await tx.order.create({
          data: {
            customerId: refill.customerId,
            source: "refill",
            refillId,
            status: "pending",
            total,
            notes: `Auto-created from refill ${refillId.slice(0, 8)}`,
            servedById: actorId ?? null,
            items: {
              create: {
                medicationId,
                name: medName,
                quantity: qty,
                unitPrice,
              },
            },
          },
        });
      }

      return result;
    });

    if (stockResult) await notifyStockThreshold(stockResult);
  } catch (e) {
    if (e instanceof InsufficientStockError) {
      await recordAdminNotification({
        type: "stock_low",
        title: `Cannot fulfill refill: ${e.medicationName}`,
        body: `Refill for ${medName} needs ${e.required} but only ${e.available} in stock.`,
        severity: "critical",
        relatedType: "refill_request",
        relatedId: refillId,
      });
      throw e;
    }
    throw e;
  }
}

export const fulfillRefillRequest = fulfillRefillInventory;

async function ensureRefillOrder(
  refill: {
    id: string;
    customerId: string | null;
  },
  medName: string,
  qty: number,
  unitPrice: number,
  medicationId: string | null,
  actorId?: string,
) {
  if (!medicationId) return;
  const existing = await prisma.order.findFirst({
    where: { refillId: refill.id },
    select: { id: true },
  });
  if (existing) return;
  const total = Math.max(0, unitPrice * qty);
  await prisma.order.create({
    data: {
      customerId: refill.customerId,
      source: "refill",
      refillId: refill.id,
      status: "pending",
      total,
      notes: `Auto-created from refill ${refill.id.slice(0, 8)}`,
      servedById: actorId ?? null,
      items: {
        create: {
          medicationId,
          name: medName,
          quantity: qty,
          unitPrice,
        },
      },
    },
  });
}

/** If a refill was cancelled after stock was deducted, put the units back (once). */
async function reverseRefillInventory(refillId: string, actorId?: string): Promise<void> {
  const {
    applyStockChange,
    notifyStockThreshold,
  } = await import("@/app/lib/services/stock");

  const deduction = await prisma.stockMovement.findFirst({
    where: {
      relatedType: "refill_request",
      relatedId: refillId,
      quantityDelta: { lt: 0 },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!deduction) return;

  // Already reversed?
  const reversal = await prisma.stockMovement.findFirst({
    where: {
      relatedType: "refill_request",
      relatedId: refillId,
      reason: "return",
      quantityDelta: { gt: 0 },
    },
    select: { id: true },
  });
  if (reversal) return;

  const qty = Math.abs(deduction.quantityDelta);
  if (qty === 0) return;

  const result = await prisma.$transaction(async (tx) => {
    const r = await applyStockChange(tx, {
      inventoryId: deduction.pharmacyInventoryId,
      quantityDelta: qty,
      reason: "return",
      notes: `Refill cancelled — restock ${qty} unit(s)`,
      relatedType: "refill_request",
      relatedId: refillId,
      actorId: actorId ?? null,
      skipLots: true, // aggregate restock; lots were FEFO'd outbound
    });
    // Cancel any pending auto-order for this refill.
    await tx.order.updateMany({
      where: { refillId, status: "pending" },
      data: { status: "cancelled", notes: "Cancelled with refill" },
    });
    return r;
  });
  await notifyStockThreshold(result);
}

export async function updateRefillStatus(
  refillId: string,
  status: RefillStatus,
  actorId?: string,
) {
  // Fulfill inventory when staff advances into operational stages.
  if (status === "preparing" || status === "ready_for_pickup" || status === "collected") {
    await fulfillRefillInventory(refillId, actorId);
  }

  // Restock if cancelling after a prior deduction.
  if (status === "cancelled") {
    await reverseRefillInventory(refillId, actorId);
  }

  const refill = await prisma.refillRequest.update({
    where: { id: refillId },
    data: { status, statusUpdatedAt: new Date(), assignedToId: actorId },
  });
  await notifyCareRequest({ ...refill, relatedType: "refill_request", staff: true,
    title: `Refill ${status.replaceAll("_", " ")}`, body: `Your refill request is now ${status.replaceAll("_", " ")}.` });


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
        fullBody: `Your refill request for **${refill.medicineName}** has been updated to **${status.replaceAll("_", " ")}**.\n\nReference: ${refill.rxReference || "—"}\n\nView your refill history in the portal for more details.`,
        status: "delivered",
        sentAt: new Date(),
        relatedType: "refill_request",
        relatedId: refill.id,
      },
    });

    // Send a push notification to the customer's devices so they see the update immediately.
    const customer = await prisma.customerProfile.findUnique({
      where: { id: refill.customerId },
      select: { user: { select: { id: true } } },
    });
    if (customer?.user) {
      await dispatchPushToUser(customer.user.id, {
        title: `Refill ${status.replaceAll("_", " ")}`,
        body: `Your request for ${refill.medicineName} is now: ${status.replaceAll("_", " ")}.`,
        url: "/portal/refills",
        data: { tag: `refill-${refill.id}`, refillId, status },
      });
    }

    if (status === "ready_for_pickup") {
      // One pickup reminder per refill request — never re-create on re-status.
      const existingPickup = await prisma.reminder.findFirst({
        where: {
          customerId: refill.customerId,
          type: "pickup",
          relatedType: "refill_request",
          relatedId: refill.id,
          status: { in: ["scheduled", "sent"] },
        },
        select: { id: true },
      });
      if (!existingPickup) {
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

    // When collected or cancelled, stop any lingering pickup/refill nags for this request.
    if (status === "collected" || status === "cancelled") {
      await prisma.reminder.updateMany({
        where: {
          customerId: refill.customerId,
          relatedType: "refill_request",
          relatedId: refill.id,
          status: { in: ["scheduled", "sent"] },
          type: { in: ["pickup", "refill"] },
        },
        data: { status: "cancelled" },
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

  const rawRefillByStatus = await prisma.refillRequest.groupBy({
    by: ["status"],
    _count: {
      _all: true,
    },
  });

  const refillByStatus = rawRefillByStatus.map(r => ({
    status: r.status,
    _count: r._count._all,
  }));

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

export async function listCustomers(
  search?: string,
  opts?: { take?: number; skip?: number },
) {
  const where = search
    ? {
        OR: [
          { fullName: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search, mode: "insensitive" as const } },
          { user: { email: { contains: search, mode: "insensitive" as const } } },
        ],
      }
    : undefined;

  const include = {
    user: { select: { email: true, lastLoginAt: true, status: true } },
    loyaltyAccounts: { take: 1 },
    segments: { include: { segment: true } },
    _count: { select: { refillRequests: true, prescriptions: true } },
  } as const;

  const [total, rows] = await Promise.all([
    prisma.customerProfile.count({ where }),
    prisma.customerProfile.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
      take: opts?.take ?? 25,
      skip: opts?.skip ?? 0,
    }),
  ]);

  return {
    total,
    customers: rows.map((c) => ({
      ...c,
      loyaltyAccount: c.loyaltyAccounts[0] ?? null,
    })),
  };
}

export async function getCustomerDetail(customerId: string) {
  const row = await prisma.customerProfile.findUnique({
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
      loyaltyAccounts: { take: 1, include: { transactions: { orderBy: { createdAt: "desc" }, take: 10 } } },
      staffNotes: { include: { author: { select: { email: true } } }, orderBy: [{ isPinned: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }] },
      conversations: {
        include: { messages: { orderBy: { createdAt: "asc" } } },
        orderBy: { lastMessageAt: "desc" },
      },
      enquiries: { orderBy: { createdAt: "desc" } },
      feedback: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!row) return null;
  return { ...row, loyaltyAccount: row.loyaltyAccounts[0] ?? null };
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

  // Push staff so they can respond quickly.
  await dispatchPushToStaff({
    title: "New customer enquiry",
    body: data.subject || data.message.slice(0, 120) || "Enquiry submitted",
    url: "/admin/enquiries",
    data: { tag: "enquiry-new", enquiryId: enquiry.id },
  }).catch(() => {
    /* best-effort */
  });

  await recordAdminNotification({
    type: "enquiry_new",
    title: "New customer enquiry",
    body: `${data.name}: ${data.subject || data.message.slice(0, 120)}`,
    relatedType: "enquiry",
    relatedId: enquiry.id,
  });

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
  const feedback = await prisma.feedback.create({
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

  // Staff should see complaints / low ratings immediately.
  const type = data.type ?? "review";
  if (type === "complaint" || (typeof data.rating === "number" && data.rating <= 2)) {
    await dispatchPushToStaff({
      title: type === "complaint" ? "New customer complaint" : "Low feedback rating",
      body: data.title || data.body.slice(0, 120) || "New feedback submitted",
      url: "/admin/feedback",
      data: { tag: "feedback-new", feedbackId: feedback.id, type },
    }).catch(() => {
      /* best-effort */
    });
    await recordAdminNotification({
      type: "feedback_low",
      title: type === "complaint" ? "New customer complaint" : "Low feedback rating",
      body: `${data.name || "Anonymous"}: ${data.title || data.body.slice(0, 120)}`,
      severity: "warning",
      relatedType: "feedback",
      relatedId: feedback.id,
    });
  } else {
    await recordAdminNotification({
      type: "feedback_new",
      title: "New customer feedback",
      body: `${data.name || "Anonymous"}: ${data.title || data.body.slice(0, 120)}`,
      relatedType: "feedback",
      relatedId: feedback.id,
    });
  }

  return feedback;
}

export async function respondToFeedback(id: string, response: string, responderId: string, isPublic = false) {
  const feedback = await prisma.feedback.update({
    where: { id },
    data: {
      staffResponse: response,
      respondedById: responderId,
      respondedAt: new Date(),
      status: "responded" as FeedbackStatus,
      isPublic,
    },
    include: {
      customer: { include: { user: { select: { id: true, email: true } } } },
    },
  });

  // Notify the customer that staff responded — both in-app notification and push.
  if (feedback.customer) {
      await prisma.notification.create({
      data: {
        customerId: feedback.customer.id,
        channel: "in_app",
        type: "feedback",
        title: "Pharmacy responded to your feedback",
        body: response.slice(0, 280),
        fullBody: response,
        status: "delivered",
        sentAt: new Date(),
        relatedType: "feedback",
        relatedId: feedback.id,
      },
    }).catch(() => {/* best-effort */});

    if (feedback.customer.user?.id) {
      await dispatchPushToUser(feedback.customer.user.id, {
        title: "Pharmacy response to your feedback",
        body: response.slice(0, 200),
        url: "/portal/feedback",
        data: { tag: `feedback-${feedback.id}`, feedbackId: feedback.id },
      }).catch(() => {
        /* best-effort */
      });
    }
  }

  return feedback;
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
  const customer = await prisma.customerProfile.findUnique({
    where: { id: data.customerId },
    include: {
      user: { select: { id: true, email: true } },
      loyaltyAccounts: { take: 1, select: { points: true, tier: true } },
      preferences: true,
    },
  });
  // Per-customer variable interpolation: {{name}}, {{tier}}, etc.
  const vars = customer
    ? {
        name: customer.fullName,
        fullName: customer.fullName,
        email: customer.user.email,
        points: customer.loyaltyAccounts?.[0]?.points ?? 0,
        tier: customer.loyaltyAccounts?.[0]?.tier ?? "bronze",
      }
    : {};
  const personalizedSubject = data.subject ? interpolateTemplate(data.subject, vars) : undefined;
  const personalizedBody = interpolateTemplate(data.body, vars);

  const delivery =
    data.scheduledFor || !customer
      ? { status: data.scheduledFor ? ("pending" as const) : ("failed" as const), error: customer ? undefined : "Customer not found" }
      : await sendDelivery({
          channel: data.channel,
          recipient: {
            email: customer.user.email,
            phone: customer.phone,
            preferences: customer.preferences
              ? {
                  emailEnabled: customer.preferences.emailEnabled,
                  smsEnabled: customer.preferences.smsEnabled,
                  whatsappEnabled: customer.preferences.whatsappEnabled,
                }
              : null,
          },
          subject: personalizedSubject,
          body: personalizedBody,
        });

  const conversation = await prisma.conversation.create({
    data: {
      customerId: data.customerId,
      channel: data.channel === "portal" ? "portal" : data.channel,
      subject: personalizedSubject,
      status: data.scheduledFor ? "pending" : "open",
      assignedToId: data.staffId,
      messages: {
        create: {
          direction: "outbound",
          channel: data.channel === "portal" ? "portal" : data.channel,
          senderType: "staff",
          senderId: data.staffId,
          body: personalizedBody,
          subject: personalizedSubject,
          status: data.scheduledFor ? "scheduled" : delivery.status === "delivered" ? "delivered" : delivery.status === "failed" ? "failed" : "sent",
          scheduledFor: data.scheduledFor,
          metadata: {
            provider: delivery.provider,
            providerMessageId: delivery.providerMessageId,
            deliveryError: delivery.error,
          },
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
      title: personalizedSubject || "Message from Afyvia Pharmacy",
      body: personalizedBody.slice(0, 280),
      fullBody: personalizedBody,
      status: data.scheduledFor ? "pending" : delivery.status,
      sentAt: data.scheduledFor || delivery.status === "failed" || delivery.status === "pending" ? null : new Date(),
      relatedType: "conversation",
      relatedId: conversation.id,
    },
  });

  // Fire a web push to the customer immediately for non-scheduled messages.
  if (!data.scheduledFor && customer?.user?.id) {
    await dispatchPushToUser(customer.user.id, {
      title: personalizedSubject || "Message from Afyvia Pharmacy",
      body: personalizedBody.slice(0, 200),
      url: "/portal/messages",
      data: { tag: `msg-${conversation.id}`, conversationId: conversation.id },
    }).catch(() => {
      /* push is best-effort */
    });
  }

  await addTimelineEvent(
    data.customerId,
    data.staffId,
    "message_sent",
    "Staff message sent",
    personalizedSubject || data.channel,
    { conversationId: conversation.id },
    data.staffId,
  );

  return conversation;
}

/**
 * Interpolate template variables: {{name}}, {{email}}, {{tier}}, {{points}}, etc.
 * Used by campaigns, message templates, and reminders so each recipient sees
 * their own data. Unknown variables are left as-is (so staff can spot typos).
 */
export function interpolateTemplate(
  template: string,
  vars: Record<string, string | number | undefined | null>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const v = vars[key];
    return v === undefined || v === null ? match : String(v);
  });
}

/**
 * Build the per-customer variable map for template interpolation.
 */
async function buildCustomerVars(customer: {
  id: string;
  fullName: string;
  user: { email: string };
  loyaltyAccounts?: { points: number; tier: string }[];
}): Promise<Record<string, string | number>> {
  return {
    name: customer.fullName,
    fullName: customer.fullName,
    email: customer.user.email,
    points: customer.loyaltyAccounts?.[0]?.points ?? 0,
    tier: customer.loyaltyAccounts?.[0]?.tier ?? "bronze",
    customerId: customer.id,
  };
}

export async function launchCampaign(campaignId: string, actorId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { segment: { include: { members: true } } },
  });
  if (!campaign) throw new Error("Campaign not found");
  await assertCampaignConfiguration(campaign.pharmacyId, campaign);
  // The database trigger serializes the Free monthly allowance across all launch paths.
  const claimed = await prisma.campaign.updateMany({
    where: { id: campaign.id, status: { in: ["draft", "scheduled"] } },
    data: { status: "sending" },
  });
  if (!claimed.count) throw new Error("This campaign is already sending or has been sent.");


  const memberIds =
    campaign.segment?.members.map((m) => m.customerId) ??
    (await prisma.customerProfile.findMany({ select: { id: true } })).map((c) => c.id);
  const customers = await prisma.customerProfile.findMany({
    where: { id: { in: memberIds } },
    include: {
      user: { select: { id: true, email: true } },
      loyaltyAccounts: { take: 1, select: { points: true, tier: true } },
      preferences: true,
    },
  });

  let sent = 0;
  let delivered = 0;
  let failed = 0;
  for (const customer of customers) {
    // Skip customers who opted out of marketing.
    if (customer.preferences?.marketingConsent === false) {
      failed += 1;
      continue;
    }

    const channel = campaign.channel === "multi" ? "email" : campaign.channel;
    // Per-customer variable interpolation.
    const vars = await buildCustomerVars(customer);
    const personalizedSubject = campaign.subject
      ? interpolateTemplate(campaign.subject, vars)
      : campaign.name;
    const personalizedBody = interpolateTemplate(campaign.body, vars);

    const delivery = await sendDelivery({
      channel,
      purpose: "marketing",
      recipient: {
        email: customer.user.email,
        phone: customer.phone,
        preferences: customer.preferences
          ? {
              emailEnabled: customer.preferences.emailEnabled,
              smsEnabled: customer.preferences.smsEnabled,
              whatsappEnabled: customer.preferences.whatsappEnabled,
              marketingConsent: customer.preferences.marketingConsent,
              reminderConsent: customer.preferences.reminderConsent,
            }
          : null,
      },
      subject: personalizedSubject,
      body: personalizedBody,
    });
      await prisma.notification.create({
      data: {
        customerId: customer.id,
        channel,
        type: "campaign",
        title: personalizedSubject,
        body: personalizedBody.slice(0, 280),
        fullBody: personalizedBody,
        status: delivery.status,
        sentAt: delivery.status === "sent" || delivery.status === "delivered" ? new Date() : null,
        relatedType: "campaign",
        relatedId: campaign.id,
      },
    });

    // Always fan out a web push so registered customer devices see the campaign,
    // even when the primary channel is email/SMS/WhatsApp.
    if (customer.user?.id) {
      const push = await dispatchPushToUser(customer.user.id, {
        title: personalizedSubject,
        body: personalizedBody.slice(0, 200),
        url: "/portal/messages",
        data: { tag: `campaign-${campaign.id}`, campaignId: campaign.id },
      }).catch(() => ({ sent: 0, failed: 0, pruned: 0 }));
      if (push.sent > 0) delivered += push.sent;
    }

    if (delivery.status === "sent" || delivery.status === "delivered") sent += 1;
    if (delivery.status === "delivered") delivered += 1;
    if (delivery.status === "failed") failed += 1;
  }

  return prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "sent" as CampaignStatus,
      sentAt: new Date(),
      stats: { sent, delivered, failed, opened: 0, clicked: 0, replied: 0 },
      createdById: actorId,
    },
  });
}

/**
 * Resolve the intended slot time for a medication_dose reminder.
 * Snoozed reminders move scheduledFor, but the title keeps the original HH:mm
 * (legacy: "Dose 08:00: Med", luxury: "Evening · Med · 08:00").
 */
function resolveDoseSlotTime(reminder: { title: string; scheduledFor: Date }): string {
  const fromTitle =
    reminder.title.match(/(?:·|Dose)\s*(\d{2}:\d{2})\b/i) ||
    reminder.title.match(/\b(\d{2}:\d{2})\b/);
  if (fromTitle?.[1]) return fromTitle[1];
  return formatTime(reminder.scheduledFor);
}

/**
 * Compact, luxury-feeling title/body for dose pushes — rewrites legacy wordy
 * copy already stored on older Reminder rows so customers always see the
 * polished presentation at send time.
 */
function luxuryDosePushCopy(reminder: {
  title: string;
  body: string | null;
  scheduledFor: Date;
}): { title: string; body: string } {
  const slot = resolveDoseSlotTime(reminder);
  const rawTitle = (reminder.title || "").trim();
  // Strip trailing/embedded slot time and legacy "Dose HH:mm:" prefix.
  let name = rawTitle
    .replace(/\bDose\s+\d{2}:\d{2}\s*:?\s*/i, "")
    .replace(/\s*[·•|]\s*\d{2}:\d{2}\s*$/i, "")
    .replace(/\s+\d{2}:\d{2}\s*$/i, "")
    .replace(/^[:\s·•|-]+/, "")
    .trim();
  if (!name) name = "Medication";

  // Luxury format always ends with the slot time for snooze / settle parsers.
  const title = `${name} · ${slot}`;

  const rawBody = (reminder.body || "").trim();
  // Drop instructional CTA lines and "It's time for…" fluff.
  let body = rawBody
    .replace(/\bTap\s+Taken[\s\S]*$/i, "")
    .replace(/^It'?s\s+time\s+for\s+[^.]+\.\s*/i, "")
    .replace(/\bDosage:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  // Avoid repeating the medicine name if body is just that.
  if (!body || body.toLowerCase() === name.toLowerCase()) {
    body = "Your scheduled dose";
  }
  // Keep push bodies scannable on lock screens.
  if (body.length > 90) body = `${body.slice(0, 87).trimEnd()}…`;

  return { title, body };
}

/**
 * True when a dose for this reminder is already resolved — do not re-notify.
 */
async function isDoseAlreadyResolved(reminder: {
  relatedId: string | null;
  customerId: string;
  title: string;
  scheduledFor: Date;
}): Promise<boolean> {
  if (!reminder.relatedId) return false;
  const dateStr = toLocalDateInputValue(reminder.scheduledFor);
  // Prefer original slot date from title window — for snoozed reminders
  // scheduledFor may roll past midnight; use local day of original send intent
  // by checking both today and yesterday around the slot.
  const slotTime = resolveDoseSlotTime(reminder);
  const candidates = [dateStr];
  const y = new Date(reminder.scheduledFor.getTime() - 24 * 60 * 60 * 1000);
  candidates.push(toLocalDateInputValue(y));

  for (const d of candidates) {
    const log = await prisma.doseLog
      .findUnique({
        where: {
          prescriptionId_scheduledDate_scheduledTime: {
            prescriptionId: reminder.relatedId,
            scheduledDate: new Date(d + "T00:00:00Z"),
            scheduledTime: slotTime,
          },
        },
        select: { status: true },
      })
      .catch(() => null);
    if (
      log &&
      (log.status === "taken" ||
        log.status === "late" ||
        log.status === "skipped" ||
        log.status === "missed")
    ) {
      return true;
    }
  }
  return false;
}

export async function processDueReminders(): Promise<{ processedCount: number; failedCount: number; errors: string[] }> {
  const due = await prisma.reminder.findMany({
    where: { status: "scheduled", scheduledFor: { lte: new Date() } },
    include: { customer: { include: { user: { select: { id: true, email: true } }, preferences: true } } },
    take: 50,
  });

  let processedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const reminder of due) {
    try {
      // System-generated prescription refill nudges are a Premium automation.
      // Medication-dose reminders and staff-created reminders remain available
      // because clinical safety and intentional patient communication stay Free.
      if (
        reminder.type === "refill" &&
        reminder.relatedType === "prescription" &&
        !reminder.createdById &&
        !(await hasPremiumPlan(reminder.pharmacyId))
      ) {
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: "cancelled" },
        });
        processedCount += 1;
        continue;
      }

      // Honour reminderConsent — skip opted-out customers without failing the batch.
      if (reminder.customer.preferences?.reminderConsent === false) {
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: "cancelled" },
        });
        processedCount += 1;
        continue;
      }

      // Dose already confirmed/missed → never re-fire; settle as answered.
      if (reminder.type === "medication_dose") {
        const resolved = await isDoseAlreadyResolved(reminder);
        if (resolved) {
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { status: "answered" },
          });
          processedCount += 1;
          continue;
        }
      }

      // Status-aware suppress for pickup / refill reminders.
      if (reminder.type === "pickup" || reminder.type === "refill") {
        let shouldCancel = false;

        if (reminder.relatedType === "refill_request" && reminder.relatedId) {
          const refill = await prisma.refillRequest
            .findUnique({
              where: { id: reminder.relatedId },
              select: { status: true },
            })
            .catch(() => null);

          if (refill) {
            if (refill.status === "collected" || refill.status === "cancelled") {
              // Lifecycle complete — never nag again.
              shouldCancel = true;
            } else if (reminder.type === "refill") {
              // Customer already has an open refill request — drop "please refill" nags.
              shouldCancel = true;
            } else if (reminder.type === "pickup" && refill.status !== "ready_for_pickup") {
              // Only remind about pickup while it's actually ready.
              shouldCancel = true;
            }
          }
        } else if (
          reminder.type === "refill" &&
          reminder.relatedType === "prescription" &&
          reminder.relatedId
        ) {
          // Prescription-scoped refill-due: suppress if an open request already exists.
          const open = await prisma.refillRequest
            .findFirst({
              where: {
                prescriptionId: reminder.relatedId,
                customerId: reminder.customerId,
                status: { notIn: ["collected", "cancelled"] },
              },
              select: { id: true },
            })
            .catch(() => null);
          if (open) shouldCancel = true;
        }

        if (shouldCancel) {
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { status: "cancelled" },
          });
          processedCount += 1;
          continue;
        }
      }

      const delivery = await sendDelivery({
        channel: reminder.channel,
        purpose: "reminder",
        recipient: {
          email: reminder.customer.user.email,
          phone: reminder.customer.phone,
          preferences: reminder.customer.preferences
            ? {
                emailEnabled: reminder.customer.preferences.emailEnabled,
                smsEnabled: reminder.customer.preferences.smsEnabled,
                whatsappEnabled: reminder.customer.preferences.whatsappEnabled,
                marketingConsent: reminder.customer.preferences.marketingConsent,
                reminderConsent: reminder.customer.preferences.reminderConsent,
              }
            : null,
        },
        subject: reminder.title,
        body: reminder.body || reminder.title,
      });

      await prisma.notification.create({
        data: {
          customerId: reminder.customerId,
          channel: reminder.channel,
          type: reminder.type,
          title: reminder.title,
          body: reminder.body || reminder.title,
          status: delivery.status,
          sentAt: delivery.status === "sent" || delivery.status === "delivered" ? new Date() : null,
          relatedType: "reminder",
          relatedId: reminder.id,
        },
      });

      await prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          status: delivery.status === "failed" ? "failed" : delivery.status === "pending" ? "scheduled" : "sent",
          sentAt: delivery.status === "sent" || delivery.status === "delivered" ? new Date() : null,
        },
      });

      // Best-effort web push for reminders so customers see them on their device.
      if (reminder.customer?.user?.id) {
        const isDose = reminder.type === "medication_dose";
        // Enrich dose pushes so the service worker can offer Taken/Skip/Snooze
        // and hit /api/portal/adherence without opening the app.
        let scheduleId = "";
        let scheduledTime = "";
        let prescriptionId = reminder.relatedId || "";
        let drugImage: string | undefined;
        let pushTitle = reminder.title;
        let pushBody = reminder.body || reminder.title;

        if (isDose && prescriptionId) {
          const polished = luxuryDosePushCopy(reminder);
          pushTitle = polished.title;
          pushBody = polished.body;
          scheduledTime = resolveDoseSlotTime(reminder);
          const [slot, rx] = await Promise.all([
            prisma.medicationSchedule
              .findFirst({
                where: {
                  prescriptionId,
                  timeOfDay: scheduledTime,
                  active: true,
                },
                select: { id: true, timeOfDay: true },
              })
              .catch(() => null),
            prisma.prescription
              .findUnique({
                where: { id: prescriptionId },
                select: {
                  medicineName: true,
                  dosage: true,
                  medication: {
                    select: {
                      medicationMaster: { select: { imageUrl: true } },
                    },
                  },
                },
              })
              .catch(() => null),
          ]);
          if (slot) {
            scheduleId = slot.id;
            scheduledTime = slot.timeOfDay;
          }
          drugImage = rx?.medication?.medicationMaster?.imageUrl || undefined;
          // Prefer catalogue dosage when the stored body is still generic.
          if (rx?.dosage?.trim() && (!reminder.body || /scheduled dose|it'?s time/i.test(pushBody))) {
            pushBody = rx.dosage.trim();
          }
          if (rx?.medicineName && !pushTitle.toLowerCase().includes(rx.medicineName.toLowerCase())) {
            pushTitle = `${rx.medicineName} · ${scheduledTime || resolveDoseSlotTime(reminder)}`;
          }
        }

        const pushUrl =
          isDose
            ? "/portal/prescriptions"
            : reminder.type === "refill" || reminder.type === "pickup"
              ? "/portal/refills"
              : "/portal";
        await dispatchPushToUser(reminder.customer.user.id, {
          title: pushTitle,
          body: pushBody,
          url: pushUrl,
          // Brand logo as icon; drug photo as the large rich-notification image.
          icon: "/icon-192.png",
          image: drugImage,
          data: {
            tag: `reminder-${reminder.id}`,
            reminderId: reminder.id,
            type: reminder.type,
            ...(isDose
              ? {
                  actions: "medication_dose",
                  prescriptionId,
                  scheduleId,
                  scheduledTime,
                  takenOn: toLocalDateInputValue(reminder.scheduledFor),
                  medicineName: pushTitle.split("·")[0]?.trim() || "",
                }
              : {}),
          },
        }).catch(() => {
          /* best-effort */
        });
      }

      await addTimelineEvent(
        reminder.customerId,
        null,
        "reminder_sent",
        reminder.title,
        reminder.body || undefined,
        { reminderId: reminder.id },
      );

      processedCount += 1;
      if (delivery.status === "failed") failedCount += 1;
    } catch (error) {
      failedCount += 1;
      errors.push(error instanceof Error ? error.message : "Unknown reminder processing error");
      await prisma.reminder.update({ where: { id: reminder.id }, data: { status: "failed" } }).catch(() => {});
    }
  }

  return { processedCount, failedCount, errors };
}

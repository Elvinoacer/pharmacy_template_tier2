import "server-only";

import { prisma } from "@/app/lib/db";
import type { RefillStatus, EnquiryStatus, FeedbackStatus, CampaignStatus } from "@/app/generated/prisma/client";
import { addTimelineEvent } from "@/app/lib/timeline";
import { sendDelivery } from "@/app/lib/services/delivery";
import { dispatchPushToUser, dispatchPushToStaff } from "@/app/lib/services/push";
import { recordAdminNotification } from "@/app/lib/services/admin-notifications";

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

  await recordAdminNotification({
    type: "refill_new",
    title: "New refill request",
    body: `${who} requested ${data.medicineName}.`,
    relatedType: "refill_request",
    relatedId: refill.id,
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
async function fulfillRefillInventory(
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

  // Also skip stock if prescription was already dispatched (stock taken on dispatch).
  const priorDispatch = rx?.id
    ? await prisma.stockMovement.findFirst({
        where: {
          relatedType: "prescription",
          relatedId: rx.id,
          reason: { in: ["dispatch", "refill"] },
          quantityDelta: { lt: 0 },
        },
        select: { id: true },
      })
    : null;

  try {
    const stockResult = await prisma.$transaction(async (tx) => {
      let result = null as Awaited<ReturnType<typeof applyStockChange>> | null;

      if (medicationId && !priorDispatch && !rx?.dispatchedAt) {
        result = await applyStockChange(tx, {
          inventoryId: medicationId,
          quantityDelta: -qty,
          reason: "refill",
          notes: `Refill fulfilled: ${medName}`,
          relatedType: "refill_request",
          relatedId: refillId,
          actorId: actorId ?? null,
        });
      } else if (medicationId && (priorDispatch || rx?.dispatchedAt)) {
        // Record a zero-delta audit so we know this refill was linked to prior dispatch.
        await tx.stockMovement.create({
          data: {
            pharmacyInventoryId: medicationId,
            reason: "refill",
            quantityDelta: 0,
            balanceAfter: rx?.medication?.currentStock ?? 0,
            notes: `Refill linked to prior dispatch (no double-count): ${medName}`,
            relatedType: "refill_request",
            relatedId: refillId,
            actorId: actorId ?? null,
          },
        });
      }

      if (rx) {
        const shouldDecrementRefills =
          !rx.dispatchedAt && (rx.refillsRemaining ?? 0) > 0 && !priorDispatch;
        await tx.prescription.update({
          where: { id: rx.id },
          data: {
            ...(rx.dispatchedAt
              ? {}
              : {
                  dispatchedAt: new Date(),
                  dispatchedById: actorId ?? null,
                  lastFilledAt: new Date(),
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
    loyaltyAccount: true,
    segments: { include: { segment: true } },
    _count: { select: { refillRequests: true, prescriptions: true } },
  } as const;

  const [total, customers] = await Promise.all([
    prisma.customerProfile.count({ where }),
    prisma.customerProfile.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
      take: opts?.take ?? 25,
      skip: opts?.skip ?? 0,
    }),
  ]);

  return { total, customers };
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
      staffNotes: { include: { author: { select: { email: true } } }, orderBy: [{ isPinned: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }] },
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
      loyaltyAccount: { select: { points: true, tier: true } },
      preferences: true,
    },
  });
  // Per-customer variable interpolation: {{name}}, {{tier}}, etc.
  const vars = customer
    ? {
        name: customer.fullName,
        fullName: customer.fullName,
        email: customer.user.email,
        points: customer.loyaltyAccount?.points ?? 0,
        tier: customer.loyaltyAccount?.tier ?? "bronze",
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
      title: personalizedSubject || "Message from Aether Pharmacy",
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
      title: personalizedSubject || "Message from Aether Pharmacy",
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
  loyaltyAccount?: { points: number; tier: string } | null;
}): Promise<Record<string, string | number>> {
  return {
    name: customer.fullName,
    fullName: customer.fullName,
    email: customer.user.email,
    points: customer.loyaltyAccount?.points ?? 0,
    tier: customer.loyaltyAccount?.tier ?? "bronze",
    customerId: customer.id,
  };
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
  const customers = await prisma.customerProfile.findMany({
    where: { id: { in: memberIds } },
    include: {
      user: { select: { id: true, email: true } },
      loyaltyAccount: { select: { points: true, tier: true } },
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
      // Honour reminderConsent — skip opted-out customers without failing the batch.
      if (reminder.customer.preferences?.reminderConsent === false) {
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: "cancelled" },
        });
        processedCount += 1;
        continue;
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
        if (isDose && prescriptionId) {
          const localTime = new Intl.DateTimeFormat("en-GB", {
            timeZone: process.env.TIMEZONE || "Africa/Nairobi",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(reminder.scheduledFor);
          scheduledTime = localTime;
          const slot = await prisma.medicationSchedule
            .findFirst({
              where: {
                prescriptionId,
                timeOfDay: localTime,
                active: true,
              },
              select: { id: true, timeOfDay: true },
            })
            .catch(() => null);
          if (slot) {
            scheduleId = slot.id;
            scheduledTime = slot.timeOfDay;
          }
        }

        const pushUrl = isDose ? "/portal/prescriptions" : "/portal";
        await dispatchPushToUser(reminder.customer.user.id, {
          title: reminder.title,
          body: reminder.body || reminder.title,
          url: pushUrl,
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
                  takenOn: new Intl.DateTimeFormat("en-CA", {
                    timeZone: process.env.TIMEZONE || "Africa/Nairobi",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  }).format(reminder.scheduledFor),
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

import "server-only";

import { prisma } from "@/app/lib/db";
import {
  darajaConfigured,
  formatMpesaPhone,
  phoneLast9,
  stkPush,
  stkQuery,
} from "@/app/lib/services/daraja";

/** How long a pending STK is considered "in flight" before allowing a retry. */
export const STK_PENDING_WINDOW_MS = 90 * 1000;
/** Max STK attempts per order within a rolling hour (abuse + customer retries). */
export const STK_MAX_ATTEMPTS_PER_HOUR = 5;

export type FulfillmentMode = "immediate" | "reserve" | "delivery";

export type InitiateStkResult =
  | {
      ok: true;
      paymentId: string;
      checkoutRequestId: string;
      message: string;
      phone: string;
      attemptCount: number;
    }
  | {
      ok: false;
      error: string;
      message: string;
      paymentId?: string;
      statusCode?: number;
    };

/**
 * Authorize who may start/pay an STK for an order.
 * - staff: any order
 * - customer: own order
 * - guest: website order + phone last-9 match (or order guestPhone)
 */
export async function canInitiatePayment(opts: {
  orderId: string;
  phone?: string;
  session?: { id: string; customerId?: string | null; role: string } | null;
  staff?: boolean;
}): Promise<{ allowed: boolean; reason?: string; order: Awaited<ReturnType<typeof loadOrder>> }> {
  const order = await loadOrder(opts.orderId);
  if (!order) return { allowed: false, reason: "order_not_found", order: null };
  if (order.status === "paid" || order.status === "fulfilled" || order.status === "waived") {
    return { allowed: false, reason: "order_already_settled", order };
  }
  if (order.status === "cancelled") {
    return { allowed: false, reason: "order_cancelled", order };
  }

  if (opts.staff) return { allowed: true, order };

  if (opts.session?.customerId && order.customerId === opts.session.customerId) {
    return { allowed: true, order };
  }

  // Guest pay: phone must match guestPhone or a note / payment history last-9.
  const phone = opts.phone ? phoneLast9(opts.phone) : "";
  if (phone && order.guestPhone && phoneLast9(order.guestPhone) === phone) {
    return { allowed: true, order };
  }
  if (phone && order.source === "website") {
    // Allow if phone appears in notes (legacy guest orders) or prior payments.
    const notes = order.notes || "";
    if (notes.includes(phone) || notes.replace(/\D/g, "").includes(phone)) {
      return { allowed: true, order };
    }
  }

  return { allowed: false, reason: "forbidden", order };
}

async function loadOrder(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      customer: { select: { id: true, phone: true, fullName: true } },
      payments: {
        where: { provider: "daraja" },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
}

/**
 * Start (or retry) an M-Pesa STK push for an order.
 * Creates a new Payment row per attempt so history stays clear; reuses pending
 * only when still inside the in-flight window.
 */
export async function initiateStkPayment(opts: {
  orderId: string;
  phone: string;
  initiatedById?: string | null;
  /** Force a new attempt even if a recent pending exists (staff retry after timeout). */
  forceRetry?: boolean;
}): Promise<InitiateStkResult> {
  const order = await loadOrder(opts.orderId);
  if (!order) {
    return { ok: false, error: "order_not_found", message: "Order not found.", statusCode: 404 };
  }
  if (order.status === "paid" || order.status === "fulfilled" || order.status === "waived") {
    return {
      ok: false,
      error: "order_already_settled",
      message: "This order is already settled.",
      statusCode: 400,
    };
  }
  if (order.status === "cancelled") {
    return { ok: false, error: "order_cancelled", message: "Order was cancelled.", statusCode: 400 };
  }

  const amount = Number(order.total);
  if (!(amount > 0)) {
    return {
      ok: false,
      error: "zero_amount",
      message: "Order total is zero — mark as waived or paid at counter.",
      statusCode: 400,
    };
  }

  const phone = formatMpesaPhone(opts.phone);
  if (phone.length < 12) {
    return {
      ok: false,
      error: "invalid_phone",
      message: "Enter a valid M-Pesa number (e.g. 07XX XXX XXX).",
      statusCode: 400,
    };
  }

  // Rate-limit retries per order.
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recentAttempts = await prisma.payment.count({
    where: {
      orderId: order.id,
      provider: "daraja",
      createdAt: { gte: since },
    },
  });
  if (recentAttempts >= STK_MAX_ATTEMPTS_PER_HOUR) {
    return {
      ok: false,
      error: "too_many_attempts",
      message: "Too many M-Pesa attempts for this order. Wait a bit or pay at the counter.",
      statusCode: 429,
    };
  }

  const existingPending = await prisma.payment.findFirst({
    where: {
      orderId: order.id,
      provider: "daraja",
      status: "pending",
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingPending) {
    const age = Date.now() - existingPending.createdAt.getTime();
    if (!opts.forceRetry && age < STK_PENDING_WINDOW_MS && existingPending.checkoutRequestId) {
      return {
        ok: true,
        paymentId: existingPending.id,
        checkoutRequestId: existingPending.checkoutRequestId,
        message:
          "A payment request is already on your phone. Enter your M-Pesa PIN, or wait a moment and retry.",
        phone: existingPending.phone || phone,
        attemptCount: existingPending.attemptCount,
      };
    }
    // Stale or forced retry — close out prior pending so a clean STK can proceed.
    if (opts.forceRetry || age >= STK_PENDING_WINDOW_MS) {
      await prisma.payment
        .update({
          where: { id: existingPending.id },
          data: {
            status: "failed",
            failureReason: opts.forceRetry
              ? "Superseded by retry STK"
              : "Timed out waiting for customer PIN / callback",
          },
        })
        .catch(() => {});
    } else {
      return {
        ok: false,
        error: "pending_payment_exists",
        message:
          "A payment request is already in progress. Check the phone or wait ~90s to retry.",
        paymentId: existingPending.id,
        statusCode: 409,
      };
    }
  }

  if (!darajaConfigured()) {
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        customerId: order.customerId,
        amount,
        provider: "daraja",
        status: "pending",
        phone,
        attemptCount: recentAttempts + 1,
        lastAttemptAt: new Date(),
        initiatedById: opts.initiatedById ?? null,
        failureReason: "Daraja not configured on this environment",
      },
    });
    return {
      ok: false,
      error: "daraja_not_configured",
      message:
        "M-Pesa is not configured. Set DARAJA_* env vars, or mark paid at the counter.",
      paymentId: payment.id,
      statusCode: 503,
    };
  }

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      customerId: order.customerId,
      amount,
      provider: "daraja",
      status: "pending",
      phone,
      attemptCount: recentAttempts + 1,
      lastAttemptAt: new Date(),
      initiatedById: opts.initiatedById ?? null,
    },
  });

  // Persist guest phone on order for later guest pay / contact.
  if (!order.guestPhone) {
    await prisma.order
      .update({
        where: { id: order.id },
        data: { guestPhone: phone },
      })
      .catch(() => {});
  }

  const push = await stkPush({
    amount,
    phone,
    accountReference: `AE${order.id.replace(/-/g, "").slice(0, 10)}`,
    transactionDesc: `Order ${order.id.slice(0, 8)}`,
  });

  if (!push.ok) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "failed",
        failureReason: push.error.slice(0, 500),
      },
    });
    return {
      ok: false,
      error: "stk_failed",
      message: push.error === "invalid_phone"
        ? "Invalid M-Pesa phone number."
        : `Could not send STK push: ${push.error}`,
      paymentId: payment.id,
      statusCode: 502,
    };
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      checkoutRequestId: push.checkoutRequestId,
      merchantRequestId: push.merchantRequestId || null,
      // Keep providerRef as checkout id until receipt arrives (legacy readers).
      providerRef: push.checkoutRequestId,
    },
  });

  return {
    ok: true,
    paymentId: payment.id,
    checkoutRequestId: push.checkoutRequestId,
    message: push.customerMessage || "STK push sent. Enter your M-Pesa PIN on the phone.",
    phone,
    attemptCount: payment.attemptCount,
  };
}

/**
 * Apply a successful M-Pesa result to payment + order.
 * Idempotent: safe if webhook and poll both fire.
 */
export async function completeDarajaPayment(opts: {
  paymentId: string;
  mpesaReceipt?: string | null;
  resultDesc?: string | null;
}): Promise<{ orderId: string; status: string; alreadyDone: boolean }> {
  const payment = await prisma.payment.findUnique({
    where: { id: opts.paymentId },
    include: { order: true },
  });
  if (!payment) throw new Error("payment_not_found");

  if (payment.status === "completed") {
    return {
      orderId: payment.orderId,
      status: payment.order.status,
      alreadyDone: true,
    };
  }

  const order = payment.order;
  const shouldAutoDispatch =
    order.fulfillment === "immediate" && !order.dispatchedAt;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "completed",
        providerRef: opts.mpesaReceipt || payment.providerRef,
        failureReason: null,
      },
    });

    // Collapse any other pending Daraja attempts for this order.
    await tx.payment.updateMany({
      where: {
        orderId: payment.orderId,
        provider: "daraja",
        status: "pending",
        id: { not: payment.id },
      },
      data: {
        status: "failed",
        failureReason: "Superseded by successful payment",
      },
    });

    const nextStatus = shouldAutoDispatch ? "fulfilled" : "paid";
    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        status: nextStatus,
        ...(shouldAutoDispatch
          ? {
              dispatchedAt: new Date(),
              dispatchedById: payment.initiatedById ?? null,
            }
          : {}),
      },
    });
  });

  // Soft notify staff for remote reservations that still need handoff.
  if (!shouldAutoDispatch) {
    try {
      const { recordAdminNotification } = await import(
        "@/app/lib/services/admin-notifications"
      );
      await recordAdminNotification({
        type: "enquiry_new",
        title: "M-Pesa payment received",
        body: `Order ${payment.orderId.slice(0, 8).toUpperCase()} paid — ready to dispatch / prepare.`,
        severity: "info",
        relatedType: "order",
        relatedId: payment.orderId,
      });
    } catch {
      /* non-fatal */
    }
  }

  // If this order settles a pharmacy service booking, confirm it + notify customer.
  try {
    const {
      confirmServiceBookingPayment,
      notifyBookingCustomer,
    } = await import("@/app/lib/services/pharmacy-services");
    const confirmed = await confirmServiceBookingPayment({
      orderId: payment.orderId,
      paidVia: "daraja",
      paymentRef: opts.mpesaReceipt || null,
    });
    if (confirmed && !confirmed.alreadyDone) {
      const booking = await prisma.serviceBooking.findUnique({
        where: { id: confirmed.bookingId },
        include: { service: { select: { title: true, slug: true } } },
      });
      if (booking) {
        await notifyBookingCustomer(booking, {
          title: "Booking confirmed",
          body: `Payment received for ${booking.service.title}. You're all set.`,
          url: `/services/${booking.service.slug}`,
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error("[completeDarajaPayment] service booking hook:", err);
  }

  return {
    orderId: payment.orderId,
    status: shouldAutoDispatch ? "fulfilled" : "paid",
    alreadyDone: false,
  };
}

export async function failDarajaPayment(opts: {
  paymentId: string;
  reason: string;
}): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { id: opts.paymentId } });
  if (!payment || payment.status !== "pending") return;
  await prisma.payment.update({
    where: { id: opts.paymentId },
    data: {
      status: "failed",
      failureReason: opts.reason.slice(0, 500),
    },
  });
}

export type PaymentStatusView = {
  paymentId: string;
  orderId: string;
  paymentStatus: string;
  orderStatus: string;
  mpesaReceipt: string | null;
  failureReason: string | null;
  checkoutRequestId: string | null;
  phone: string | null;
  /** true when UI should keep polling */
  pending: boolean;
  /** true when order is paid or fulfilled */
  settled: boolean;
  dispatched: boolean;
};

/**
 * Resolve current payment status. If still pending and we have a checkout id,
 * optionally query Daraja (long-poll fallback).
 */
export async function resolvePaymentStatus(opts: {
  paymentId?: string;
  orderId?: string;
  /** Hit Daraja query API when local status is still pending */
  queryProvider?: boolean;
}): Promise<PaymentStatusView | null> {
  let payment = opts.paymentId
    ? await prisma.payment.findUnique({
        where: { id: opts.paymentId },
        include: { order: true },
      })
    : opts.orderId
      ? await prisma.payment.findFirst({
          where: { orderId: opts.orderId, provider: "daraja" },
          orderBy: { createdAt: "desc" },
          include: { order: true },
        })
      : null;

  if (!payment) return null;

  // Long-poll / webhook miss: ask Daraja.
  if (
    opts.queryProvider &&
    payment.status === "pending" &&
    payment.checkoutRequestId &&
    darajaConfigured()
  ) {
    const q = await stkQuery(payment.checkoutRequestId);
    if (q.ok) {
      if (q.resultCode === "0") {
        // Success without receipt in query response — complete without receipt.
        await completeDarajaPayment({
          paymentId: payment.id,
          mpesaReceipt: payment.providerRef?.startsWith("ws")
            ? null
            : payment.providerRef,
          resultDesc: q.resultDesc,
        });
        payment = await prisma.payment.findUnique({
          where: { id: payment.id },
          include: { order: true },
        });
      } else if (
        // Still processing codes vary; only fail definitive customer cancels / timeouts.
        ["1032", "1037", "1", "2001", "1001"].includes(q.resultCode)
      ) {
        await failDarajaPayment({
          paymentId: payment.id,
          reason: q.resultDesc || `STK result ${q.resultCode}`,
        });
        payment = await prisma.payment.findUnique({
          where: { id: payment.id },
          include: { order: true },
        });
      }
      // else: still waiting (e.g. 4999) — leave pending
    }
  }

  if (!payment) return null;

  const orderStatus = payment.order.status;
  const settled =
    payment.status === "completed" ||
    orderStatus === "paid" ||
    orderStatus === "fulfilled" ||
    orderStatus === "waived";

  return {
    paymentId: payment.id,
    orderId: payment.orderId,
    paymentStatus: payment.status,
    orderStatus,
    mpesaReceipt:
      payment.status === "completed" ? payment.providerRef : null,
    failureReason: payment.failureReason,
    checkoutRequestId: payment.checkoutRequestId,
    phone: payment.phone,
    pending: payment.status === "pending",
    settled,
    dispatched: Boolean(payment.order.dispatchedAt) || orderStatus === "fulfilled",
  };
}

/** Mark order as handed over (remote reservation → customer collected). */
export async function dispatchOrder(opts: {
  orderId: string;
  actorId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const order = await prisma.order.findUnique({ where: { id: opts.orderId } });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status === "cancelled") return { ok: false, error: "Order is cancelled." };
  if (order.dispatchedAt && order.status === "fulfilled") {
    return { ok: true }; // idempotent
  }
  if (order.status === "pending") {
    return {
      ok: false,
      error: "Order is not paid yet. Collect payment before dispatching.",
    };
  }

  await prisma.order.update({
    where: { id: opts.orderId },
    data: {
      status: "fulfilled",
      dispatchedAt: new Date(),
      dispatchedById: opts.actorId,
    },
  });
  return { ok: true };
}

/** Undo auto-dispatch (e.g. counter sale that should wait for packing). */
export async function undispatchOrder(opts: {
  orderId: string;
  actorId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const order = await prisma.order.findUnique({ where: { id: opts.orderId } });
  if (!order) return { ok: false, error: "Order not found." };
  if (!order.dispatchedAt) return { ok: true };

  // Only revert fulfilled → paid; keep waived/cancelled intact.
  const nextStatus =
    order.status === "fulfilled"
      ? order.waived
        ? "waived"
        : "paid"
      : order.status;

  await prisma.order.update({
    where: { id: opts.orderId },
    data: {
      status: nextStatus === "fulfilled" ? "paid" : nextStatus,
      dispatchedAt: null,
      dispatchedById: null,
      // Flip fulfillment so future payment callbacks don't auto-dispatch again.
      fulfillment: order.fulfillment === "immediate" ? "reserve" : order.fulfillment,
    },
  });
  return { ok: true };
}

import "server-only";

import { prisma } from "@/app/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";
import type { TxClient } from "@/app/lib/services/stock";
import { recordCommerceEvent } from "@/app/lib/services/commerce/events";
import { recomputeOrderFinancials } from "@/app/lib/services/commerce/pricing";

/**
 * Refund lifecycle (audit §14).
 *
 * Refunds are first-class records — never just `Payment.status = refunded`.
 * One payment may have multiple partial refunds; we always recompute the
 * parent Order's financials after a refund completes.
 *
 * Refund does NOT touch stock — that's the fulfillment layer's job.
 */

export type RefundInput = {
  paymentId: string;
  amount: number;
  reason?: string;
  provider?: "daraja" | "cash" | "card" | "other";
  providerRef?: string | null;
  createdById?: string | null;
  approvedById?: string | null;
  /// If true, mark refund completed immediately (cash refunds at counter).
  markCompleted?: boolean;
};

export async function createRefund(
  input: RefundInput,
): Promise<
  | { ok: true; refundId: string }
  | { ok: false; error: string }
> {
  if (!(input.amount > 0)) return { ok: false, error: "Refund amount must be greater than zero." };

  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    include: {
      order: { select: { id: true, customerId: true } },
      refunds: { where: { status: { in: ["pending", "approved", "completed"] } } },
    },
  });
  if (!payment) return { ok: false, error: "Payment not found." };
  if (payment.status !== "completed") {
    return { ok: false, error: "Only completed payments can be refunded." };
  }

  const alreadyRefunded = payment.refunds.reduce((s, r) => s + Number(r.amount || 0), 0);
  const maxRefundable = Number(payment.amount) - alreadyRefunded;
  if (input.amount > maxRefundable) {
    return {
      ok: false,
      error: `Refund exceeds available amount. Max refundable: KES ${maxRefundable.toFixed(2)}.`,
    };
  }

  const refund = await prisma.$transaction(async (tx) => {
    const r = await tx.refund.create({
      data: {
        paymentId: payment.id,
        orderId: payment.order.id,
        amount: input.amount,
        provider: input.provider ?? "cash",
        providerRef: input.providerRef ?? null,
        reason: input.reason ?? null,
        status: input.markCompleted ? "completed" : "pending",
        createdById: input.createdById ?? null,
        approvedById: input.approvedById ?? null,
        processedAt: input.markCompleted ? new Date() : null,
      },
    });

    await recordCommerceEvent(tx, {
      eventType: "refund_created",
      entityType: "payment",
      entityId: payment.id,
      orderId: payment.order.id,
      customerId: payment.order.customerId ?? null,
      actorId: input.createdById ?? null,
      amount: input.amount,
      metadata: { refundId: r.id, reason: input.reason ?? null, provider: input.provider ?? "cash" },
    });

    if (input.markCompleted) {
      await recordCommerceEvent(tx, {
        eventType: "refund_completed",
        entityType: "refund",
        entityId: r.id,
        orderId: payment.order.id,
        customerId: payment.order.customerId ?? null,
        actorId: input.createdById ?? null,
        amount: input.amount,
        metadata: { refundId: r.id, paymentId: payment.id },
      });
    }

    // Recompute Order totals (amountRefunded, amountDue).
    await recomputeOrderFinancials(tx, payment.order.id);

    // If the refund covers the entire payment, mark Payment.status = refunded.
    // For partial refunds, keep Payment.status = completed and use Order.paymentStage.
    const totalRefundedAfter = alreadyRefunded + input.amount;
    if (totalRefundedAfter >= Number(payment.amount) - 0.001) {
      // Full refund: mark payment as fully refunded
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "refunded" },
      });
      await tx.order.update({
        where: { id: payment.order.id },
        data: { paymentStage: "refunded" },
      });
    } else {
      // Partial refund: keep payment as completed, mark order as partially_refunded
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "completed" },
      });
      await tx.order.update({
        where: { id: payment.order.id },
        data: { paymentStage: "partially_refunded" },
      });
    }

    return r;
  });

  return { ok: true, refundId: refund.id };
}

/** Approve a pending refund (if approval workflow is enabled). */
export async function approveRefund(refundId: string, approverId: string): Promise<void> {
  await prisma.refund.update({
    where: { id: refundId },
    data: { status: "approved", approvedById: approverId },
  });
}

/** Mark an approved refund as completed (e.g. cash handed back, M-Pesa B2C sent). */
export async function completeRefund(refundId: string, opts?: { providerRef?: string | null }): Promise<void> {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    select: { id: true, orderId: true, paymentId: true, amount: true },
  });
  if (!refund) return;

  await prisma.$transaction(async (tx) => {
    await tx.refund.update({
      where: { id: refundId },
      data: { status: "completed", processedAt: new Date(), providerRef: opts?.providerRef ?? undefined },
    });
    await recordCommerceEvent(tx, {
      eventType: "refund_completed",
      entityType: "refund",
      entityId: refund.id,
      orderId: refund.orderId,
      actorId: null,
      amount: Number(refund.amount),
      metadata: { refundId: refund.id, paymentId: refund.paymentId },
    });
    await recomputeOrderFinancials(tx, refund.orderId);
  });
}

/** Total refunded amount for a payment (sum of completed + pending refunds). */
export async function totalRefundedForPayment(paymentId: string): Promise<number> {
  const row = await prisma.refund.aggregate({
    where: { paymentId, status: { in: ["completed", "approved", "pending"] } },
    _sum: { amount: true },
  });
  return Number(row._sum.amount ?? 0);
}

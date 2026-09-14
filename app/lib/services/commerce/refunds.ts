import "server-only";
import { syncRefundFeeCredit } from "./transaction-fees";

import { prisma } from "@/app/lib/db";
import { recordCommerceEvent } from "@/app/lib/services/commerce/events";
import { recomputeOrderFinancials } from "@/app/lib/services/commerce/pricing";

/**
 * Refund lifecycle (audit §14).
 *
 * Refunds are first-class records — never just `Payment.status = refunded`.
 * One payment may have multiple partial refunds; we always recompute the
 * parent Order's financials after a refund completes.
 *
 * Daraja refunds stay pending until Safaricom confirms the Reversal result.
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

  const provider = input.provider ?? (payment.provider === "daraja" ? "daraja" : "cash");
  if (provider === "daraja" && payment.provider !== "daraja") {
    return { ok: false, error: "Only a verified Daraja payment can be reversed through M-PESA." };
  }

  const alreadyRefunded = payment.refunds.reduce((s, r) => s + Number(r.amount || 0), 0);
  const maxRefundable = Number(payment.amount) - alreadyRefunded;
  if (input.amount > maxRefundable + 0.001) {
    return {
      ok: false,
      error: `Refund exceeds available amount. Max refundable: KES ${maxRefundable.toFixed(2)}.`,
    };
  }

  const markCompleted = Boolean(input.markCompleted && provider !== "daraja");
  const refund = await prisma.$transaction(async (tx) => {
    const r = await tx.refund.create({
      data: {
        paymentId: payment.id,
        orderId: payment.order.id,
        amount: input.amount,
        provider,
        providerRef: input.providerRef ?? null,
        reason: input.reason ?? null,
        status: markCompleted ? "completed" : "pending",
        createdById: input.createdById ?? null,
        approvedById: input.approvedById ?? null,
        processedAt: markCompleted ? new Date() : null,
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
      metadata: { refundId: r.id, reason: input.reason ?? null, provider },
    });

    if (markCompleted) {
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
      await syncRefundFeeCredit(tx, payment.order.id);
    }

    await recomputeOrderFinancials(tx, payment.order.id);

    if (markCompleted) {
      const completedRefunds = await tx.refund.aggregate({
        where: { paymentId: payment.id, status: "completed" },
        _sum: { amount: true },
      });
      const totalCompleted = Number(completedRefunds._sum.amount ?? 0);
      if (totalCompleted >= Number(payment.amount) - 0.001) {
        await tx.payment.update({ where: { id: payment.id }, data: { status: "refunded" } });
        await tx.order.update({ where: { id: payment.order.id }, data: { paymentStage: "refunded" } });
      } else {
        await tx.payment.update({ where: { id: payment.id }, data: { status: "completed" } });
        await tx.order.update({ where: { id: payment.order.id }, data: { paymentStage: "partially_refunded" } });
      }
    }
    return r;
  });

  if (provider === "daraja") {
    const { initiateDarajaRefund } = await import("@/app/lib/services/daraja-refunds");
    const reversal = await initiateDarajaRefund(refund.id);
    if (!reversal.ok) {
      await prisma.refund.update({ where: { id: refund.id }, data: { status: "failed" } }).catch(() => undefined);
      return { ok: false, error: reversal.error };
    }
  }

  return { ok: true, refundId: refund.id };
}

/** Approve a pending refund (if approval workflow is enabled). */
export async function approveRefund(refundId: string, approverId: string): Promise<void> {
  await prisma.refund.update({
    where: { id: refundId },
    data: { status: "approved", approvedById: approverId },
  });
}

/** Mark a provider-confirmed refund as completed. Idempotent. */
export async function completeRefund(refundId: string, opts?: { providerRef?: string | null }): Promise<void> {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    select: { id: true, orderId: true, paymentId: true, amount: true, status: true },
  });
  if (!refund || refund.status === "completed") return;

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
    await syncRefundFeeCredit(tx, refund.orderId);
    await recomputeOrderFinancials(tx, refund.orderId);

    const payment = await tx.payment.findUnique({ where: { id: refund.paymentId }, select: { amount: true } });
    if (!payment) return;
    const completed = await tx.refund.aggregate({
      where: { paymentId: refund.paymentId, status: "completed" },
      _sum: { amount: true },
    });
    const totalCompleted = Number(completed._sum.amount ?? 0);
    if (totalCompleted >= Number(payment.amount) - 0.001) {
      await tx.payment.update({ where: { id: refund.paymentId }, data: { status: "refunded" } });
      await tx.order.update({ where: { id: refund.orderId }, data: { paymentStage: "refunded" } });
    } else {
      await tx.payment.update({ where: { id: refund.paymentId }, data: { status: "completed" } });
      await tx.order.update({ where: { id: refund.orderId }, data: { paymentStage: "partially_refunded" } });
    }
  });
}

/** Total refunded amount for a payment (completed + money currently in-flight). */
export async function totalRefundedForPayment(paymentId: string): Promise<number> {
  const row = await prisma.refund.aggregate({
    where: { paymentId, status: { in: ["completed", "approved", "pending"] } },
    _sum: { amount: true },
  });
  return Number(row._sum.amount ?? 0);
}

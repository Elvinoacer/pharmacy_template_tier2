import "server-only";
import type { TxClient } from "@/app/lib/services/stock";
import { isPharmacyCommissionEnabled, transactionFeeCents } from "@/app/lib/transaction-fee";
/** Completed refunds reverse only the fee actually accrued; retries update one ledger entry. */
export async function syncRefundFeeCredit(tx: TxClient, orderId: string) {
  if (!isPharmacyCommissionEnabled()) return;
  const fee = await tx.usageRecord.findFirst({ where: { eventId: `sale-fee:${orderId}`, metric: "transaction_fee_cents" } });
  if (!fee) return;
  const refunds = await tx.refund.aggregate({ where: { orderId, status: "completed" }, _sum: { amount: true } });
  const credit = Math.min(fee.quantity, transactionFeeCents(Number(refunds._sum.amount || 0)));
  if (!credit) return;
  await tx.usageRecord.upsert({
    where: { pharmacyId_eventId: { pharmacyId: fee.pharmacyId, eventId: `refund-fee:${orderId}` } },
    create: { pharmacyId: fee.pharmacyId, eventId: `refund-fee:${orderId}`, metric: "transaction_fee_cents", unit: "KES_cent", quantity: -credit, period: new Date().toISOString().slice(0, 7), billable: false, meta: { orderId, reason: "Completed refund fee credit" } },
    update: { quantity: -credit },
  });
}

"use server";
import { randomUUID } from "crypto";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { withPharmacy } from "@/app/lib/tenant-context";
import { revalidatePath } from "next/cache";
import { billableFeeKes } from "@/app/lib/transaction-fee";
export async function createTransactionFeeStatement() {
  const user = await getSessionUser();
  if (!user) throw new Error("Sign in first.");
  const pharmacy = await prismaUnscoped.pharmacy.findFirst({ where: { ownerUserId: user.id, ...(user.activePharmacyId ? { id: user.activePharmacyId } : {}) }, orderBy: { createdAt: "desc" }, select: { id: true } });
  if (!pharmacy) throw new Error("Pharmacy owner access required.");
  await withPharmacy(pharmacy.id, () => prismaUnscoped.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM pharmacies WHERE id = ${pharmacy.id}::uuid FOR UPDATE`;
    const balance = await tx.usageRecord.aggregate({ where: { pharmacyId: pharmacy.id, metric: "transaction_fee_cents" }, _sum: { quantity: true } });
    const amount = billableFeeKes(balance._sum.quantity || 0);
    if (!amount) return;
    const now = new Date();
    const invoice = await tx.invoice.create({ data: { pharmacyId: pharmacy.id, number: `TXF-${randomUUID()}`, periodStart: now, periodEnd: now, subtotalKes: amount, totalKes: amount, dueAt: new Date(now.getTime() + 30 * 86400000), items: { create: { description: "1% pharmacy transaction fees · remaining cents carried forward", unitKes: amount, totalKes: amount } } } });
    await tx.usageRecord.create({ data: { pharmacyId: pharmacy.id, metric: "transaction_fee_cents", quantity: -amount * 100, unit: "KES_cent", eventId: `fee-statement:${invoice.id}`, period: now.toISOString().slice(0, 7), billable: false, meta: { invoiceId: invoice.id } } });
  }));
  revalidatePath("/onboard/billing");
}

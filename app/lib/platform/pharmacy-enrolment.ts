import "server-only";
import { withPharmacy } from "@/app/lib/tenant-context";
import { prismaUnscoped as db, withPlatformTx } from "@/app/lib/db";
import { VERIFICATION_FEE_KES, nextBillingMonth } from "./pricing";
import { ensureDefaultPlans, issueSubscriptionInvoice, syncEntitlementsFromPlan } from "./billing";

export async function claimPromotion(pharmacyId: string) {
  return withPlatformTx(async (tx) => {
    await tx.$queryRaw`SELECT id FROM pharmacies WHERE id = ${pharmacyId}::uuid FOR UPDATE`;
    const prior = await tx.pharmacyPromotionGrant.findUnique({ where: { pharmacyId } });
    if (prior) return prior;
    // Old applicants cannot take places reserved for newly joining pharmacies.
    const pharmacy = await tx.pharmacy.findUniqueOrThrow({ where: { id: pharmacyId } });
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM pharmacy_promotions WHERE active = true AND claimed < capacity
      AND created_at <= ${pharmacy.createdAt} ORDER BY created_at LIMIT 1 FOR UPDATE`;
    if (!rows[0]) return null;
    const promotion = await tx.pharmacyPromotion.findUniqueOrThrow({ where: { id: rows[0].id } });
    await tx.pharmacyPromotion.update({ where: { id: promotion.id }, data: { claimed: { increment: 1 } } });
    return tx.pharmacyPromotionGrant.create({ data: {
      pharmacyId, promotionId: promotion.id, verification: promotion.verification,
      recurringMonths: promotion.recurring ? promotion.recurringMonths : 0,
    } });
  });
}

export async function ensureVerificationInvoice(pharmacyId: string) {
  return withPharmacy(pharmacyId, async () => {
  const grant = await claimPromotion(pharmacyId);
  const total = grant?.verification ? 0 : VERIFICATION_FEE_KES;
  const pharmacy = await db.pharmacy.findUniqueOrThrow({ where: { id: pharmacyId } });
  return db.$transaction(async tx => {
  await tx.$queryRaw`SELECT id FROM pharmacies WHERE id = ${pharmacyId}::uuid FOR UPDATE`;
  return tx.invoice.upsert({
    where: { number: `KYP-${pharmacyId}` }, update: {},
    create: { pharmacyId, number: `KYP-${pharmacyId}`, periodStart: pharmacy.createdAt,
      periodEnd: pharmacy.createdAt, dueAt: new Date(), subtotalKes: VERIFICATION_FEE_KES,
      totalKes: total, status: total === 0 ? "paid" : "open", paidAt: total === 0 ? new Date() : null,
      items: { create: [
        { description: "One-time pharmacy verification", quantity: 1, unitKes: VERIFICATION_FEE_KES, totalKes: VERIFICATION_FEE_KES },
        ...(total === 0 ? [{ description: "Promotional verification waiver", quantity: 1, unitKes: -VERIFICATION_FEE_KES, totalKes: -VERIFICATION_FEE_KES }] : []),
      ] },
    },
  });
  });
  });
}

export async function startPharmacyService(pharmacyId: string) {
  return withPharmacy(pharmacyId, async () => {
  await ensureDefaultPlans();
  const plan = await db.plan.findUniqueOrThrow({ where: { slug: "starter" } });
  const sub = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM pharmacies WHERE id = ${pharmacyId}::uuid FOR UPDATE`;
    const existing = await tx.subscription.findFirst({ where: { pharmacyId, status: { not: "cancelled" } }, orderBy: { createdAt: "desc" } });
    if (existing) return existing;
    const start = new Date();
    return tx.subscription.create({ data: { pharmacyId, planId: plan.id, status: "past_due", startedAt: start, currentPeriodStart: start, currentPeriodEnd: nextBillingMonth(start) } });
  });
  await syncEntitlementsFromPlan(pharmacyId, plan.id);
  return issueSubscriptionInvoice(sub.id);
  });
}

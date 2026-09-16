import "server-only";
import { withPharmacy } from "@/app/lib/tenant-context";
import { prismaUnscoped as db, withPlatformTx } from "@/app/lib/db";
import { BUNDLE_FEE_KES, MONTHLY_FEE_KES, VERIFICATION_FEE_KES, nextBillingMonth } from "./pricing";
import { ensureDefaultPlans, issueSubscriptionInvoice, syncEntitlementsFromPlan } from "./billing";

export async function claimPromotion(pharmacyId: string, promoCode?: string | null) {
  return withPlatformTx(async (tx) => {
    await tx.$queryRaw`SELECT id FROM pharmacies WHERE id = ${pharmacyId}::uuid FOR UPDATE`;
    const prior = await tx.pharmacyPromotionGrant.findUnique({ where: { pharmacyId } });
    if (prior && !promoCode) return prior;

    const pharmacy = await tx.pharmacy.findUniqueOrThrow({ where: { id: pharmacyId } });

    // If a specific promo code was provided, look it up by code
    if (promoCode && promoCode.trim()) {
      const code = promoCode.trim();
      const promoByCode = await tx.pharmacyPromotion.findFirst({
        where: {
          active: true,
          code: { equals: code, mode: "insensitive" },
          claimed: { lt: db.pharmacyPromotion.fields.capacity },
        },
      });

      if (promoByCode) {
        if (prior) {
          if (prior.promotionId === promoByCode.id) return prior;
          await tx.pharmacyPromotion.update({
            where: { id: prior.promotionId },
            data: { claimed: { decrement: 1 } },
          }).catch(() => {});
        }
        await tx.pharmacyPromotion.update({
          where: { id: promoByCode.id },
          data: { claimed: { increment: 1 } },
        });
        return tx.pharmacyPromotionGrant.upsert({
          where: { pharmacyId },
          create: {
            pharmacyId,
            promotionId: promoByCode.id,
            verification: promoByCode.verification,
            recurringMonths: promoByCode.recurring ? promoByCode.recurringMonths : 0,
          },
          update: {
            promotionId: promoByCode.id,
            verification: promoByCode.verification,
            recurringMonths: promoByCode.recurring ? promoByCode.recurringMonths : 0,
          },
        });
      }
    }

    if (prior) return prior;

    // Automatic general promotion allocation (oldest eligible un-coded promotion)
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM pharmacy_promotions WHERE active = true AND claimed < capacity
      AND (code IS NULL OR code = '')
      AND created_at <= ${pharmacy.createdAt} ORDER BY created_at LIMIT 1 FOR UPDATE`;
    if (!rows[0]) return null;
    const promotion = await tx.pharmacyPromotion.findUniqueOrThrow({ where: { id: rows[0].id } });
    await tx.pharmacyPromotion.update({ where: { id: promotion.id }, data: { claimed: { increment: 1 } } });
    return tx.pharmacyPromotionGrant.create({
      data: {
        pharmacyId,
        promotionId: promotion.id,
        verification: promotion.verification,
        recurringMonths: promotion.recurring ? promotion.recurringMonths : 0,
      },
    });
  });
}

export async function applyPromoCode(pharmacyId: string, rawCode: string) {
  const code = rawCode.trim();
  if (!code) throw new Error("Please enter a promotional card or coupon code.");

  return withPlatformTx(async (tx) => {
    await tx.$queryRaw`SELECT id FROM pharmacies WHERE id = ${pharmacyId}::uuid FOR UPDATE`;
    const promotion = await tx.pharmacyPromotion.findFirst({
      where: {
        active: true,
        code: { equals: code, mode: "insensitive" },
      },
    });

    if (!promotion) {
      throw new Error(`Promotional code "${code}" was not found or is no longer active.`);
    }
    if (promotion.claimed >= promotion.capacity) {
      throw new Error(`Promotional code "${code}" has reached its maximum redemptions.`);
    }

    const prior = await tx.pharmacyPromotionGrant.findUnique({ where: { pharmacyId } });
    if (prior && prior.promotionId === promotion.id) {
      return { grant: prior, promotion, alreadyApplied: true };
    }

    if (prior) {
      await tx.pharmacyPromotion.update({
        where: { id: prior.promotionId },
        data: { claimed: { decrement: 1 } },
      }).catch(() => {});
    }

    await tx.pharmacyPromotion.update({
      where: { id: promotion.id },
      data: { claimed: { increment: 1 } },
    });

    const recurringMonths = promotion.recurring ? promotion.recurringMonths : 0;

    const grant = await tx.pharmacyPromotionGrant.upsert({
      where: { pharmacyId },
      create: {
        pharmacyId,
        promotionId: promotion.id,
        verification: promotion.verification,
        recurringMonths,
      },
      update: {
        promotionId: promotion.id,
        verification: promotion.verification,
        recurringMonths,
      },
    });

    // Update any existing open verification invoice
    if (promotion.verification) {
      await tx.invoice.updateMany({
        where: { pharmacyId, number: `KYP-${pharmacyId}`, status: "open" },
        data: { totalKes: 0, status: "paid", paidAt: new Date() },
      });
    }

    return { grant, promotion, alreadyApplied: false };
  });
}

export async function ensureVerificationInvoice(pharmacyId: string) {
  return withPharmacy(pharmacyId, async () => {
    const grant = await claimPromotion(pharmacyId);
    const total = grant?.verification ? 0 : VERIFICATION_FEE_KES;
    const pharmacy = await db.pharmacy.findUniqueOrThrow({ where: { id: pharmacyId } });
    return db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM pharmacies WHERE id = ${pharmacyId}::uuid FOR UPDATE`;
      return tx.invoice.upsert({
        where: { number: `KYP-${pharmacyId}` },
        update: {},
        create: {
          pharmacyId,
          number: `KYP-${pharmacyId}`,
          periodStart: pharmacy.createdAt,
          periodEnd: pharmacy.createdAt,
          dueAt: new Date(),
          subtotalKes: VERIFICATION_FEE_KES,
          totalKes: total,
          status: total === 0 ? "paid" : "open",
          paidAt: total === 0 ? new Date() : null,
          items: {
            create: [
              {
                description: "One-time pharmacy verification",
                quantity: 1,
                unitKes: VERIFICATION_FEE_KES,
                totalKes: VERIFICATION_FEE_KES,
              },
              ...(total === 0
                ? [
                    {
                      description: "Promotional verification waiver",
                      quantity: 1,
                      unitKes: -VERIFICATION_FEE_KES,
                      totalKes: -VERIFICATION_FEE_KES,
                    },
                  ]
                : []),
            ],
          },
        },
      });
    });
  });
}

export async function ensureBundleInvoice(pharmacyId: string) {
  return withPharmacy(pharmacyId, async () => {
    const grant = await claimPromotion(pharmacyId);
    const pharmacy = await db.pharmacy.findUniqueOrThrow({ where: { id: pharmacyId } });

    const verificationWaived = Boolean(grant?.verification);
    const recurringWaived = Boolean(grant?.recurringMonths && grant.recurringMonths > 0);

    let total = BUNDLE_FEE_KES;
    if (verificationWaived) total -= VERIFICATION_FEE_KES;
    if (recurringWaived) total -= MONTHLY_FEE_KES;
    total = Math.max(0, total);

    const isPaid = total === 0;

    return db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM pharmacies WHERE id = ${pharmacyId}::uuid FOR UPDATE`;
      const invoice = await tx.invoice.upsert({
        where: { number: `BUNDLE-${pharmacyId}` },
        update: {
          totalKes: total,
          status: isPaid ? "paid" : undefined,
          paidAt: isPaid ? new Date() : undefined,
        },
        create: {
          pharmacyId,
          number: `BUNDLE-${pharmacyId}`,
          periodStart: pharmacy.createdAt,
          periodEnd: nextBillingMonth(pharmacy.createdAt),
          dueAt: new Date(),
          subtotalKes: BUNDLE_FEE_KES,
          totalKes: total,
          status: isPaid ? "paid" : "open",
          paidAt: isPaid ? new Date() : null,
          items: {
            create: [
              {
                description: "One-time pharmacy verification (PPB check & anti-clone lock)",
                quantity: 1,
                unitKes: VERIFICATION_FEE_KES,
                totalKes: VERIFICATION_FEE_KES,
              },
              {
                description: "First month platform subscription (Storefront & AI intake)",
                quantity: 1,
                unitKes: MONTHLY_FEE_KES,
                totalKes: MONTHLY_FEE_KES,
              },
              ...(verificationWaived
                ? [
                    {
                      description: "Promotional verification waiver",
                      quantity: 1,
                      unitKes: -VERIFICATION_FEE_KES,
                      totalKes: -VERIFICATION_FEE_KES,
                    },
                  ]
                : []),
              ...(recurringWaived
                ? [
                    {
                      description: "Promotional monthly subscription waiver",
                      quantity: 1,
                      unitKes: -MONTHLY_FEE_KES,
                      totalKes: -MONTHLY_FEE_KES,
                    },
                  ]
                : []),
            ],
          },
        },
      });

      // If bundle is paid or waived, also mark the verification invoice as satisfied
      if (isPaid) {
        await tx.invoice.upsert({
          where: { number: `KYP-${pharmacyId}` },
          update: { status: "paid", paidAt: new Date(), totalKes: 0 },
          create: {
            pharmacyId,
            number: `KYP-${pharmacyId}`,
            periodStart: pharmacy.createdAt,
            periodEnd: pharmacy.createdAt,
            dueAt: new Date(),
            subtotalKes: VERIFICATION_FEE_KES,
            totalKes: 0,
            status: "paid",
            paidAt: new Date(),
            items: {
              create: [
                {
                  description: "One-time pharmacy verification (bundled)",
                  quantity: 1,
                  unitKes: VERIFICATION_FEE_KES,
                  totalKes: VERIFICATION_FEE_KES,
                },
                {
                  description: "Bundled verification waiver",
                  quantity: 1,
                  unitKes: -VERIFICATION_FEE_KES,
                  totalKes: -VERIFICATION_FEE_KES,
                },
              ],
            },
          },
        });
      }

      return invoice;
    });
  });
}

export async function startPharmacyService(pharmacyId: string) {
  return withPharmacy(pharmacyId, async () => {
    await ensureDefaultPlans();
    const plan = await db.plan.findUniqueOrThrow({ where: { slug: "starter" } });
    const sub = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM pharmacies WHERE id = ${pharmacyId}::uuid FOR UPDATE`;
      const existing = await tx.subscription.findFirst({
        where: { pharmacyId, status: { not: "cancelled" } },
        orderBy: { createdAt: "desc" },
      });
      if (existing) return existing;
      const start = new Date();
      return tx.subscription.create({
        data: {
          pharmacyId,
          planId: plan.id,
          status: "past_due",
          startedAt: start,
          currentPeriodStart: start,
          currentPeriodEnd: nextBillingMonth(start),
        },
      });
    });
    await syncEntitlementsFromPlan(pharmacyId, plan.id);
    return issueSubscriptionInvoice(sub.id);
  });
}

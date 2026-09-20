import "server-only";
import type { Prisma } from "@/app/generated/prisma/client";
import { withPharmacy } from "@/app/lib/tenant-context";
import { prismaUnscoped as db, withPlatformTx } from "@/app/lib/db";
import {
  BUNDLE_FEE_KES,
  clampFeeSubsidy,
  MONTHLY_FEE_KES,
  VERIFICATION_FEE_KES,
  nextBillingMonth,
} from "./pricing";
import {
  ensureDefaultPlans,
  handleBundleSettlement,
  issueSubscriptionInvoice,
  settleInvoice,
  syncEntitlementsFromPlan,
} from "./billing";

type FeeGrant = {
  verification: boolean;
  verificationDiscountKes?: Prisma.Decimal | number | null;
  recurringMonths: number;
  recurringDiscountKes?: Prisma.Decimal | number | null;
};

export function grantFeeDiscounts(grant?: FeeGrant | null) {
  const savedVerification = Number(grant?.verificationDiscountKes ?? 0);
  const savedMonthly = Number(grant?.recurringDiscountKes ?? 0);
  return clampFeeSubsidy({
    verificationKes: savedVerification || (grant?.verification ? VERIFICATION_FEE_KES : 0),
    monthlyKes: savedMonthly || ((grant?.recurringMonths ?? 0) > 0 ? MONTHLY_FEE_KES : 0),
  });
}

function promotionFeeDiscounts(promotion: {
  verification: boolean;
  verificationDiscountKes: Prisma.Decimal;
  recurring: boolean;
  recurringDiscountKes: Prisma.Decimal;
}) {
  return clampFeeSubsidy({
    verificationKes: Number(promotion.verificationDiscountKes) || (promotion.verification ? VERIFICATION_FEE_KES : 0),
    monthlyKes: Number(promotion.recurringDiscountKes) || (promotion.recurring ? MONTHLY_FEE_KES : 0),
  });
}

export async function syncGrantInvoices(
  tx: Prisma.TransactionClient,
  pharmacyId: string,
  grant: FeeGrant,
  actorId?: string | null,
) {
  const discounts = grantFeeDiscounts(grant);
  const invoices = await tx.invoice.findMany({
    where: { pharmacyId, status: "open" },
    include: { payments: { where: { status: { in: ["pending", "processing"] } }, select: { id: true } } },
  });
  if (invoices.some((invoice) => invoice.payments.length > 0)) {
    throw new Error("A payment is already being processed. Wait for its result before applying a voucher or waiver.");
  }

  const firstSubscription = grant.recurringMonths > 0
    ? await tx.subscription.findFirst({ where: { pharmacyId }, orderBy: { startedAt: "asc" }, select: { startedAt: true } })
    : null;
  let waiverEnd = firstSubscription?.startedAt ? new Date(firstSubscription.startedAt) : null;
  for (let month = 0; waiverEnd && month < grant.recurringMonths; month += 1) {
    waiverEnd = nextBillingMonth(waiverEnd);
  }

  for (const invoice of invoices) {
    let discountKes = 0;
    if (invoice.number === `KYP-${pharmacyId}`) discountKes = discounts.verificationKes;
    else if (invoice.number === `BUNDLE-${pharmacyId}`) discountKes = discounts.verificationKes + discounts.monthlyKes;
    else if (invoice.subscriptionId && waiverEnd && invoice.periodStart < waiverEnd) discountKes = discounts.monthlyKes;
    if (discountKes <= 0) continue;

    const totalKes = Math.max(0, Number(invoice.subtotalKes) + Number(invoice.taxKes) - discountKes);
    await tx.invoiceItem.deleteMany({
      where: { invoiceId: invoice.id, description: { startsWith: "Fee subsidy" } },
    });
    await tx.invoiceItem.create({
      data: { invoiceId: invoice.id, description: "Fee subsidy / voucher", quantity: 1, unitKes: -discountKes, totalKes: -discountKes },
    });
    await tx.invoice.update({ where: { id: invoice.id }, data: { totalKes } });
    if (totalKes === 0) {
      await settleInvoice(tx, invoice.id, actorId);
      if (invoice.number.startsWith("BUNDLE-")) await handleBundleSettlement(tx, invoice, actorId);
    }
  }
}

export async function syncPharmacyGrantInvoices(pharmacyId: string, actorId?: string | null) {
  return withPlatformTx(async (tx) => {
    await tx.$queryRaw`SELECT id FROM pharmacies WHERE id = ${pharmacyId}::uuid FOR UPDATE`;
    const grant = await tx.pharmacyPromotionGrant.findUniqueOrThrow({ where: { pharmacyId } });
    await syncGrantInvoices(tx, pharmacyId, grant, actorId);
    return grant;
  });
}

export function normalizePromotionCode(rawCode: string) {
  return rawCode
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u00A0\s]+/g, "")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .toUpperCase();
}

async function findPromotionByNormalizedCode(
  tx: Prisma.TransactionClient,
  code: string,
  activeOnly = true,
) {
  // pharmacy_promotions is FORCE-RLS/platform-only. Keep the exact-code lookup
  // inside the explicit platform transaction and resolve the row id with raw SQL.
  // This avoids relying on Prisma's case-insensitive filter translation at the
  // security boundary used by tenant onboarding.
  const rows = activeOnly
    ? await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM pharmacy_promotions
        WHERE active = true
          AND upper(code) = ${code}
        LIMIT 1
        FOR UPDATE
      `
    : await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM pharmacy_promotions
        WHERE upper(code) = ${code}
        LIMIT 1
        FOR UPDATE
      `;

  if (!rows[0]) return null;
  return tx.pharmacyPromotion.findUnique({ where: { id: rows[0].id } });
}

export async function assertPromotionCodeRedeemable(
  promotionId: string,
  rawCode: string,
) {
  const code = normalizePromotionCode(rawCode);
  return withPlatformTx(async (tx) => {
    const promotion = await findPromotionByNormalizedCode(tx, code, true);
    if (!promotion || promotion.id !== promotionId) {
      throw new Error(
        `Promotion code "${code}" was created but could not be read back as active. The promotion was not issued to pharmacies.`,
      );
    }
    return promotion;
  });
}

export async function claimPromotion(
  pharmacyId: string,
  promoCode?: string | null,
) {
  return withPlatformTx(async (tx) => {
    await tx.$queryRaw`SELECT id FROM pharmacies WHERE id = ${pharmacyId}::uuid FOR UPDATE`;
    const prior = await tx.pharmacyPromotionGrant.findUnique({
      where: { pharmacyId },
    });
    if (prior && !promoCode) return prior;

    const pharmacy = await tx.pharmacy.findUniqueOrThrow({
      where: { id: pharmacyId },
    });

    // If a specific promo code was provided, look it up by code
    if (promoCode && promoCode.trim()) {
      const code = normalizePromotionCode(promoCode);
      const promoByCode = await findPromotionByNormalizedCode(tx, code, true);

      if (promoByCode && promoByCode.claimed < promoByCode.capacity) {
        const discounts = promotionFeeDiscounts(promoByCode);
        if (prior) {
          if (prior.promotionId === promoByCode.id) return prior;
          await tx.pharmacyPromotion
            .update({
              where: { id: prior.promotionId },
              data: { claimed: { decrement: 1 } },
            })
            .catch(() => {});
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
            recurringMonths: promoByCode.recurring
              ? promoByCode.recurringMonths
              : 0,
            verificationDiscountKes: discounts.verificationKes,
            recurringDiscountKes: discounts.monthlyKes,
          },
          update: {
            promotionId: promoByCode.id,
            verification: promoByCode.verification,
            recurringMonths: promoByCode.recurring
              ? promoByCode.recurringMonths
              : 0,
            verificationDiscountKes: discounts.verificationKes,
            recurringDiscountKes: discounts.monthlyKes,
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
    const promotion = await tx.pharmacyPromotion.findUniqueOrThrow({
      where: { id: rows[0].id },
    });
    await tx.pharmacyPromotion.update({
      where: { id: promotion.id },
      data: { claimed: { increment: 1 } },
    });
    const discounts = promotionFeeDiscounts(promotion);
    return tx.pharmacyPromotionGrant.create({
      data: {
        pharmacyId,
        promotionId: promotion.id,
        verification: promotion.verification,
        recurringMonths: promotion.recurring ? promotion.recurringMonths : 0,
        verificationDiscountKes: discounts.verificationKes,
        recurringDiscountKes: discounts.monthlyKes,
      },
    });
  });
}

export async function applyPromoCode(pharmacyId: string, rawCode: string) {
  const code = normalizePromotionCode(rawCode);
  if (!code) throw new Error("Please enter a promotional card or coupon code.");

  return withPlatformTx(async (tx) => {
    await tx.$queryRaw`SELECT id FROM pharmacies WHERE id = ${pharmacyId}::uuid FOR UPDATE`;
    const promotion = await findPromotionByNormalizedCode(tx, code, true);

    if (!promotion) {
      const stoppedPromotion = await findPromotionByNormalizedCode(tx, code, false);
      if (stoppedPromotion) {
        throw new Error(
          `Promotional code "${code}" exists but has been stopped and can no longer be redeemed.`,
        );
      }
      throw new Error(
        `Promotional code "${code}" was not found. Ask the platform team to confirm that the code is listed as active before retrying.`,
      );
    }
    const prior = await tx.pharmacyPromotionGrant.findUnique({
      where: { pharmacyId },
    });
    if (prior && prior.promotionId === promotion.id) {
      await syncGrantInvoices(tx, pharmacyId, prior);
      return { grant: prior, promotion, alreadyApplied: true };
    }
    if (promotion.claimed >= promotion.capacity) {
      throw new Error(
        `Promotional code "${code}" has reached its maximum redemptions.`,
      );
    }

    if (prior) {
      await tx.pharmacyPromotion
        .update({
          where: { id: prior.promotionId },
          data: { claimed: { decrement: 1 } },
        })
        .catch(() => {});
    }

    await tx.pharmacyPromotion.update({
      where: { id: promotion.id },
      data: { claimed: { increment: 1 } },
    });

    const recurringMonths = promotion.recurring ? promotion.recurringMonths : 0;
    const discounts = promotionFeeDiscounts(promotion);

    const grant = await tx.pharmacyPromotionGrant.upsert({
      where: { pharmacyId },
      create: {
        pharmacyId,
        promotionId: promotion.id,
        verification: promotion.verification,
        recurringMonths,
        verificationDiscountKes: discounts.verificationKes,
        recurringDiscountKes: discounts.monthlyKes,
      },
      update: {
        promotionId: promotion.id,
        verification: promotion.verification,
        recurringMonths,
        verificationDiscountKes: discounts.verificationKes,
        recurringDiscountKes: discounts.monthlyKes,
      },
    });

    await syncGrantInvoices(tx, pharmacyId, grant);

    return { grant, promotion, alreadyApplied: false };
  });
}

export async function ensureVerificationInvoice(pharmacyId: string) {
  return withPharmacy(pharmacyId, async () => {
    const grant = await claimPromotion(pharmacyId);
    const verificationDiscountKes = grantFeeDiscounts(grant).verificationKes;
    const total = VERIFICATION_FEE_KES - verificationDiscountKes;
    if (grant) await syncPharmacyGrantInvoices(pharmacyId);
    const pharmacy = await db.pharmacy.findUniqueOrThrow({
      where: { id: pharmacyId },
    });
    return db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM pharmacies WHERE id = ${pharmacyId}::uuid FOR UPDATE`;
        const existing = await tx.invoice.findFirst({
          where: { number: `KYP-${pharmacyId}` },
        });
        if (existing) return existing;

        return tx.invoice.create({
          data: {
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
                ...(verificationDiscountKes > 0
                  ? [
                      {
                        description: "Fee subsidy / voucher",
                        quantity: 1,
                        unitKes: -verificationDiscountKes,
                        totalKes: -verificationDiscountKes,
                      },
                    ]
                  : []),
              ],
            },
          },
        });
      },
      { timeout: 30000, maxWait: 15000 },
    );
  });
}

export async function ensureBundleInvoice(pharmacyId: string) {
  return withPharmacy(pharmacyId, async () => {
    const grant = await claimPromotion(pharmacyId);
    const pharmacy = await db.pharmacy.findUniqueOrThrow({
      where: { id: pharmacyId },
    });

    const discounts = grantFeeDiscounts(grant);
    const verificationWaived = discounts.verificationKes > 0;
    const recurringWaived = discounts.monthlyKes > 0;

    let total = BUNDLE_FEE_KES;
    if (verificationWaived) total -= discounts.verificationKes;
    if (recurringWaived) total -= discounts.monthlyKes;
    total = Math.max(0, total);

    const isFree = total === 0;

    return db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM pharmacies WHERE id = ${pharmacyId}::uuid FOR UPDATE`;
        const invoice = await tx.invoice.upsert({
          where: { number: `BUNDLE-${pharmacyId}` },
          update: {
            totalKes: total,
          },
          create: {
            pharmacyId,
            number: `BUNDLE-${pharmacyId}`,
            periodStart: pharmacy.createdAt,
            periodEnd: nextBillingMonth(pharmacy.createdAt),
            dueAt: new Date(),
            subtotalKes: BUNDLE_FEE_KES,
            totalKes: total,
            status: "open",
            paidAt: null,
            items: {
              create: [
                {
                  description:
                    "One-time pharmacy verification (PPB check & anti-clone lock)",
                  quantity: 1,
                  unitKes: VERIFICATION_FEE_KES,
                  totalKes: VERIFICATION_FEE_KES,
                },
                {
                  description:
                    "First month platform subscription (Storefront & AI intake)",
                  quantity: 1,
                  unitKes: MONTHLY_FEE_KES,
                  totalKes: MONTHLY_FEE_KES,
                },
                ...(verificationWaived
                  ? [
                      {
                        description: "Fee subsidy / voucher — verification",
                        quantity: 1,
                        unitKes: -discounts.verificationKes,
                        totalKes: -discounts.verificationKes,
                      },
                    ]
                  : []),
                ...(recurringWaived
                  ? [
                      {
                        description: "Fee subsidy / voucher — monthly service",
                        quantity: 1,
                        unitKes: -discounts.monthlyKes,
                        totalKes: -discounts.monthlyKes,
                      },
                    ]
                  : []),
              ],
            },
          },
        });

        // If bundle is paid or waived, also mark the verification invoice as satisfied
        if (isFree) {
          await tx.invoice.upsert({
            where: { number: `KYP-${pharmacyId}` },
            update: { status: "paid", paidAt: new Date(), totalKes: 0 },
            create: {
              pharmacyId,
              number: `KYP-${pharmacyId}`,
              periodStart: pharmacy.createdAt,
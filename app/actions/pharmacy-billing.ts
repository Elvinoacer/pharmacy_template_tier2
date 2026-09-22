"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped as db, withPlatformTx } from "@/app/lib/db";
import { publicErrorMessage } from "@/app/lib/public-error";
import {
  cancelSubscription,
  collectInvoicePayment,
  createIntasendBillingCheckout,
  handleBundleSettlement,
  settleInvoice,
} from "@/app/lib/platform/billing";
import {
  applyPromoCode,
  assertPromotionCodeRedeemable,
  ensureBundleInvoice,
  ensureVerificationInvoice,
  grantFeeDiscounts,
  normalizePromotionCode,
  startPharmacyService,
  syncGrantInvoices,
} from "@/app/lib/platform/pharmacy-enrolment";
import { requirePlatformAction } from "@/app/lib/platform/policy";
import {
  cancelDarajaSubscriptionStandingOrder,
  createOrResumeDarajaSubscription,
  saveMpesaBillingPhone,
} from "@/app/lib/services/daraja-subscriptions";
import { loadPharmacySetup } from "@/app/lib/services/pharmacy-setup";
import { withPharmacy } from "@/app/lib/tenant-context";

export type BillingState = {
  error?: string;
  success?: string;
  checkoutUrl?: string;
  waived?: boolean;
  settled?: boolean;
  discount?: string;
  generatedCode?: string;
};

async function resolveOwnedBillingInvoice(pharmacyId: string, form: FormData) {
  const invoiceId = String(form.get("invoiceId") || "").trim();
  const invoiceNumber = String(form.get("invoiceNumber") || "").trim();
  const identifiers = [
    ...(invoiceId ? [{ id: invoiceId }] : []),
    ...(invoiceNumber ? [{ number: invoiceNumber }] : []),
  ];
  const exact = identifiers.length
    ? await withPharmacy(pharmacyId, () =>
        db.invoice.findFirst({ where: { pharmacyId, OR: identifiers } }),
      )
    : null;
  if (exact) return exact;

  const bundle = await withPharmacy(pharmacyId, () =>
    db.invoice.findFirst({
      where: { pharmacyId, number: `BUNDLE-${pharmacyId}`, status: "open" },
    }),
  );
  if (bundle) return bundle;

  const verification = await withPharmacy(pharmacyId, () =>
    db.invoice.findFirst({
      where: { pharmacyId, number: `KYP-${pharmacyId}`, status: "open" },
    }),
  );
  if (verification) return verification;

  const collectible = await withPharmacy(pharmacyId, () =>
    db.invoice.findMany({
      where: { pharmacyId, status: "open", totalKes: { gt: 0 } },
      orderBy: { createdAt: "desc" },
      take: 2,
    }),
  );
  return collectible.length === 1 ? collectible[0] : null;
}

async function ownedSubscription(pharmacyId: string) {
  return withPharmacy(pharmacyId, () =>
    db.subscription.findFirst({
      where: { pharmacyId, status: { not: "cancelled" } },
      orderBy: { createdAt: "desc" },
    }),
  );
}

function submittedPhone(form: FormData) {
  return String(form.get("mpesaPhone") || form.get("phone") || "").trim();
}

async function collectWithMpesa(input: {
  pharmacyId: string;
  invoiceId: string;
  phone: string;
  actorId: string;
}) {
  const phone = await saveMpesaBillingPhone(input.pharmacyId, input.phone);
  return withPharmacy(input.pharmacyId, () =>
    collectInvoicePayment(input.invoiceId, { phone, actorId: input.actorId }),
  );
}

export async function pharmacyBillingAction(
  _: BillingState,
  form: FormData,
): Promise<BillingState> {
  try {
    const user = await getSessionUser();
    if (!user) throw new Error("Sign in to continue.");

    const pharmacyId = String(form.get("pharmacyId") || "").trim();
    const pharmacy = await db.pharmacy.findUnique({
      where: { id: pharmacyId },
    });
    if (!pharmacy || pharmacy.ownerUserId !== user.id) {
      throw new Error("Only the pharmacy owner can manage billing.");
    }

    const intent = String(form.get("intent") || "");

    // 1. APPLY PROMO CARD / COUPON
    if (intent === "apply_promo") {
      const code = String(
        form.get("code") || form.get("promoCode") || "",
      ).trim();
      if (!code) throw new Error("Enter a promotion or coupon code.");
      const result = await applyPromoCode(pharmacyId, code, user.id);

      const promo = result.promotion;
      const discounts = grantFeeDiscounts(result.grant);
      const benefitParts: string[] = [];
      if (discounts.verificationKes)
        benefitParts.push(`KES ${discounts.verificationKes} off verification`);
      if (promo.recurring)
        benefitParts.push(
          `KES ${discounts.monthlyKes} off for ${promo.recurringMonths} monthly period${promo.recurringMonths === 1 ? "" : "s"}`,
        );
      const benefitText = benefitParts.join(" + ");

      // If verification is fully waived (KES 100), ensure verification invoice is satisfied immediately
      if (discounts.verificationKes >= 100) {
        await ensureVerificationInvoice(pharmacyId);
      }

      // If both verification and monthly are fully waived (KES 600 bundle), ensure bundle invoice is satisfied immediately
      if (discounts.verificationKes >= 100 && discounts.monthlyKes >= 500) {
        const bundleInvoice = await ensureBundleInvoice(pharmacyId);
        const creditEvent = await db.pharmacyOnboardingEvent.findFirst({
          where: { pharmacyId, type: "bundle_prepaid_credit_granted" },
        });
        if (bundleInvoice.status !== "paid" || !creditEvent) {
          await withPlatformTx(async (tx) => {
            if (bundleInvoice.status !== "paid") {
              await settleInvoice(tx, bundleInvoice.id, user.id);
            }
            await handleBundleSettlement(tx, bundleInvoice, user.id);
          });
        }
      }

      revalidatePath("/onboard/billing");
      revalidatePath("/admin/billing");
      revalidatePath("/onboard");
      revalidatePath("/admin/setup");

      const isVerificationWaived = discounts.verificationKes >= 100;
      const isBundleWaived = isVerificationWaived && discounts.monthlyKes >= 500;

      return {
        success: `Promotional voucher "${promo.name}" applied successfully! (${benefitText})`,
        discount: benefitText,
        waived: isVerificationWaived,
        settled: isVerificationWaived || isBundleWaived,
      };
    }

    // Old onboarding clients must never start a recurring bundle checkout.
    if (intent === "bundle_checkout") {
      return { error: "Onboarding now requires only the verification fee. Refresh to pay KES 100 or apply a voucher." };
    }

    // 3. VERIFICATION CHECKOUT (KES 100 or waived)
    if (intent === "verification_checkout") {
      const invoice = await ensureVerificationInvoice(pharmacyId);
      revalidatePath("/onboard/billing");
      revalidatePath("/admin/billing");
      revalidatePath("/onboard");

      if (Number(invoice.totalKes) === 0 || invoice.status === "paid") {
        if (invoice.status !== "paid") {
          await withPlatformTx(async (tx) => {
            await settleInvoice(tx, invoice.id, user.id);
          });
          revalidatePath("/onboard");
        }
        return {
          success: "Verification fee is already waived by promotion.",
          settled: true,
          waived: true,
        };
      }

      const checkout = await createIntasendBillingCheckout(
        pharmacyId,
        invoice.id,
        { actorId: user.id },
      );
      if (!checkout.ok)
        throw new Error(
          checkout.message || "Could not create IntaSend checkout.",
        );
      return {
        success: "Redirecting to IntaSend secure payment...",
        checkoutUrl: checkout.checkoutUrl,
      };
    }

    // 4. GENERAL INTASEND CHECKOUT FOR AN INVOICE
    if (intent === "intasend_checkout" || intent === "checkout") {
      const invoice = await resolveOwnedBillingInvoice(pharmacyId, form);
      if (!invoice)
        throw new Error(
          "This invoice is no longer available. Refresh the page and try again.",
        );

      if (Number(invoice.totalKes) === 0 || invoice.status === "paid") {
        return {
          success: "This invoice is already paid or waived.",
          settled: true,
        };
      }

      const checkout = await createIntasendBillingCheckout(
        pharmacyId,
        invoice.id,
        { actorId: user.id },
      );
      revalidatePath("/onboard/billing");
      revalidatePath("/admin/billing");
      if (!checkout.ok)
        throw new Error(
          checkout.message || "Could not create checkout session.",
        );
      return {
        success: "Redirecting to IntaSend...",
        checkoutUrl: checkout.checkoutUrl,
      };
    }

    // 5. CANCEL SUBSCRIPTION
    if (intent === "cancel") {
      const subscription = await ownedSubscription(pharmacyId);
      if (!subscription) throw new Error("No current subscription was found.");
      if (subscription.externalSubscriptionId?.startsWith("daraja_ratiba:")) {
        await cancelDarajaSubscriptionStandingOrder(
          subscription.externalSubscriptionId,
          user.id,
        );
      }
      await withPharmacy(pharmacyId, () =>
        cancelSubscription(subscription.id, true, user.id),
      );
      revalidatePath("/onboard/billing");
      revalidatePath("/admin/billing");
      revalidatePath("/admin/setup");
      return {
        success:
          "Auto-renewal cancellation requested. Your current paid period remains available until its end date.",
      };
    }

    // 6. ACTIVATE SERVICE
    if (intent === "activate") {
      if (!(await loadPharmacySetup(pharmacyId)).profileReady) {
        throw new Error(
          "Finish verification and storefront setup, then launch on the free plan. Premium can be added afterwards from Admin → Plans & billing.",
        );
      }
      const invoice = await startPharmacyService(pharmacyId);
      if (!invoice.subscriptionId)
        throw new Error(
          "Monthly billing could not be started. Please try again.",
        );
      revalidatePath("/onboard");
      revalidatePath("/onboard/billing");
      revalidatePath("/admin/billing");
      revalidatePath("/admin/setup");

      if (Number(invoice.totalKes) === 0 || invoice.status === "paid") {
        if (invoice.status !== "paid") {
          await withPlatformTx(async (tx) => {
            await settleInvoice(tx, invoice.id, user.id);
          });
          revalidatePath("/onboard");
          revalidatePath("/onboard/billing");
      revalidatePath("/admin/billing");
          revalidatePath("/admin/setup");
        }
        return {
          success:
            "Your promotional service period is active! No payment required.",
          settled: true,
          waived: true,
        };
      }

      const checkout = await createIntasendBillingCheckout(
        pharmacyId,
        invoice.id,
        { actorId: user.id },
      );
      if (!checkout.ok)
        throw new Error(checkout.message || "Could not start payment.");
      return {
        success: "Redirecting to IntaSend for first month renewal...",
        checkoutUrl: checkout.checkoutUrl,
      };
    }

    // 7. RETRY OVERDUE
    if (intent === "retry_overdue") {
      const invoice = await withPharmacy(pharmacyId, () =>
        db.invoice.findFirst({
          where: {
            pharmacyId,
            subscriptionId: { not: null },
            status: "open",
            totalKes: { gt: 0 },
          },
          orderBy: { dueAt: "asc" },
        }),
      );
      if (!invoice)
        throw new Error("There is no unpaid monthly invoice to collect.");
      const checkout = await createIntasendBillingCheckout(
        pharmacyId,
        invoice.id,
        {
          actorId: user.id,
          redirectPath: "/admin/billing?payment=returned",
        },
      );
      revalidatePath("/onboard/billing");
      revalidatePath("/admin/billing");
      revalidatePath("/admin/setup");
      if (!checkout.ok)
        throw new Error(checkout.message || "Could not start payment.");
      return {
        success: "Redirecting to IntaSend to settle overdue invoice...",
        checkoutUrl: checkout.checkoutUrl,
      };
    }

    // Legacy fallback intent: Daraja STK prompt if phone explicitly submitted
    const phone = submittedPhone(form);
    if (phone) {
      const invoice = await resolveOwnedBillingInvoice(pharmacyId, form);
      if (invoice) {
        const result = await collectWithMpesa({
          pharmacyId,
          invoiceId: invoice.id,
          phone,
          actorId: user.id,
        });
        revalidatePath("/onboard/billing");
      revalidatePath("/admin/billing");
        if (!result.ok)
          throw new Error(
            "Could not start payment. Confirm the number and try again.",
          );
        if (result.alreadyPaid)
          return { success: "This invoice is already paid." };
        return {
          success:
            "Payment prompt sent. Complete it on the phone; confirmation updates automatically.",
        };
      }
    }

    throw new Error(
      "That billing action is not available. Refresh the page and try again.",
    );
  } catch (error) {
    console.error("[billing][onboard] action failed", error);
    return {
      error: publicErrorMessage(
        error,
        "We couldn't complete that billing action right now. Please try again.",
      ),
    };
  }
}

const PROMOTION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function buildPromotionCode() {
  const bytes = new Uint32Array(8);
  crypto.getRandomValues(bytes);
  const token = Array.from(
    bytes,
    (value) => PROMOTION_CODE_ALPHABET[value % PROMOTION_CODE_ALPHABET.length],
  ).join("");
  return `AFY-${token.slice(0, 4)}-${token.slice(4)}`;
}

export async function promotionAction(
  _: BillingState,
  form: FormData,
): Promise<BillingState> {
  try {
    const actor = await requirePlatformAction(
      ["super_admin", "billing_admin"],
      { stepUp: true },
    );
    const intent = String(form.get("intent") || "");

    if (intent === "stop") {
      await withPlatformTx(async (tx) => {
        const id = String(form.get("promotionId") || "");
        await tx.pharmacyPromotion.update({
          where: { id },
          data: { active: false },
        });
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            action: "promotion.stop",
            entityType: "PharmacyPromotion",
            entityId: id,
          },
        });
      });
      revalidatePath("/platform/billing");
      return {
        success:
          "Promotion stopped. Existing allocated benefits are preserved.",
      };
    }

    const name = String(form.get("name") || "").trim();
    const submittedCode = normalizePromotionCode(
      String(form.get("code") || ""),
    );
    const capacity = Number(form.get("capacity"));
    const recurringMonths = Number(form.get("months"));
    const scope = String(form.get("scope"));
    const verificationDiscountKes =
      scope === "recurring" ? 0 : Number(form.get("verificationAmount"));
    const recurringDiscountKes =
      scope === "verification" ? 0 : Number(form.get("monthlyAmount"));

    if (
      name.length < 5 ||
      name.length > 150 ||
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 100000 ||
      !Number.isInteger(recurringMonths) ||
      recurringMonths < 1 ||
      recurringMonths > 120 ||
      !Number.isFinite(verificationDiscountKes) ||
      verificationDiscountKes < 0 ||
      verificationDiscountKes > 100 ||
      !Number.isFinite(recurringDiscountKes) ||
      recurringDiscountKes < 0 ||
      recurringDiscountKes > 500 ||
      verificationDiscountKes + recurringDiscountKes <= 0 ||
      !["verification", "recurring", "both"].includes(scope)
    ) {
      throw new Error(
        "Enter a name, valid capacity, scope, subsidy amount and 1–120 promotional months.",
      );
    }

    let activeCode = submittedCode;

    let createdPromotionId = "";

    await withPlatformTx(async (tx) => {
      if (activeCode) {
        const existing = await tx.pharmacyPromotion.findFirst({
          where: { code: { equals: activeCode, mode: "insensitive" } },
          select: { id: true },
        });
        if (existing) {
          throw new Error(
            `Promotional code "${activeCode}" already exists. Generate a new code.`,
          );
        }
      } else {
        // Generate on the server at the exact moment the promotion is created,
        // so a promotion can never be saved without a redeemable code.
        for (let attempt = 0; attempt < 12; attempt += 1) {
          const candidate = buildPromotionCode();
          const existing = await tx.pharmacyPromotion.findFirst({
            where: { code: { equals: candidate, mode: "insensitive" } },
            select: { id: true },
          });
          if (!existing) {
            activeCode = candidate;
            break;
          }
        }
        if (!activeCode) {
          throw new Error(
            "Could not allocate a unique promotional code. Please try again.",
          );
        }
      }

      const promotion = await tx.pharmacyPromotion.create({
        data: {
          name,
          code: activeCode,
          capacity,
          recurringMonths,
          verification: verificationDiscountKes > 0,
          verificationDiscountKes,
          recurring: recurringDiscountKes > 0,
          recurringDiscountKes,
          createdBy: actor.id,
        },
      });
      createdPromotionId = promotion.id;

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "promotion.create",
          entityType: "PharmacyPromotion",
          entityId: promotion.id,
        },
      });
    });

    // Never display or hand out a voucher merely because the INSERT returned.
    // Re-read it in a fresh platform transaction through the same lookup path
    // used by onboarding. This catches persistence/RLS visibility regressions
    // before an administrator distributes a dead code.
    await assertPromotionCodeRedeemable(createdPromotionId, activeCode);

    revalidatePath("/platform/billing");
    return {
      success: `Promotion created, verified and code ${activeCode} is active for redemption.`,
      generatedCode: activeCode,
    };
  } catch (error) {
    console.error("[billing][promotion] action failed", error);

    const authCode = error instanceof Error ? error.message : "";
    if (authCode === "STEP_UP_REQUIRED" || authCode === "MFA_REQUIRED") {
      return { error: authCode };
    }

    if ((error as { code?: string }).code === "P2002") {
      return {
        error:
          "That promotional code was just taken. Generate a new code and try again.",
      };
    }

    return {
      error: publicErrorMessage(
        error,
        "We couldn't save this promotion right now. Review the details and try again.",
      ),
    };
  }
}

export async function submitWaiverRequestAction(
  _: BillingState,
  form: FormData,
): Promise<BillingState> {
  try {
    const user = await getSessionUser();
    if (!user) throw new Error("Sign in to request a fee waiver.");
    const pharmacyId = String(form.get("pharmacyId") || "").trim();
    const pharmacy = await db.pharmacy.findFirst({
      where: { id: pharmacyId, ownerUserId: user.id },
      select: { id: true },
    });
    if (!pharmacy) throw new Error("Only the pharmacy owner can request a waiver.");

    const reason = String(form.get("reason") || "").trim();
    const rawAmount = String(form.get("requestedAmount") || "").trim();
    const requestedAmountKes = rawAmount ? Number(rawAmount) : null;
    if (reason.length < 20 || reason.length > 1000) {
      throw new Error("Briefly explain the need in 20–1,000 characters.");
    }
    if (requestedAmountKes !== null && (!Number.isFinite(requestedAmountKes) || requestedAmountKes <= 0 || requestedAmountKes > 60000)) {
      throw new Error("Enter a requested amount between KES 1 and KES 60,000, or leave it blank for a full waiver request.");
    }

    await withPharmacy(pharmacyId, async () => {
      const existing = await db.pharmacyWaiverRequest.findFirst({
        where: { pharmacyId, status: "pending" },
        select: { id: true },
      });
      if (existing) throw new Error("You already have a waiver request awaiting review.");
      await db.pharmacyWaiverRequest.create({
        data: { pharmacyId, reason, requestedAmountKes },
      });
    });
    revalidatePath("/onboard");
    revalidatePath("/onboard/billing");
      revalidatePath("/admin/billing");
    revalidatePath("/platform/billing");
    return { success: "Waiver request submitted. A platform billing admin will review it." };
  } catch (error) {
    return { error: publicErrorMessage(error, "We couldn't submit the waiver request right now.") };
  }
}

export async function waiverDecisionAction(
  _: BillingState,
  form: FormData,
): Promise<BillingState> {
  try {
    const actor = await requirePlatformAction(["super_admin", "billing_admin"], { stepUp: true });
    const requestId = String(form.get("requestId") || "").trim();
    const intent = String(form.get("intent") || "");
    const request = await withPlatformTx((tx) => tx.pharmacyWaiverRequest.findUnique({
      where: { id: requestId },
      include: { pharmacy: { select: { id: true, name: true } } },
    }));
    if (!request || request.status !== "pending") throw new Error("This waiver request has already been decided.");
    const decisionNote = String(form.get("decisionNote") || "").trim() || null;

    if (intent === "reject") {
      await withPlatformTx(async (tx) => {
        await tx.pharmacyWaiverRequest.update({
          where: { id: request.id },
          data: { status: "rejected", decisionNote, decidedBy: actor.id, decidedAt: new Date() },
        });
        await tx.auditLog.create({
          data: { actorId: actor.id, pharmacyId: request.pharmacyId, action: "billing.waiver.rejected", entityType: "PharmacyWaiverRequest", entityId: request.id },
        });
      });
      revalidatePath("/platform/billing");
      revalidatePath("/onboard/billing");
      revalidatePath("/admin/billing");
      return { success: "Waiver request declined." };
    }

    const verificationKes = Number(form.get("verificationAmount"));
    const monthlyKes = Number(form.get("monthlyAmount"));
    const months = monthlyKes > 0 ? Number(form.get("months")) : 0;
    if (
      !Number.isFinite(verificationKes) || verificationKes < 0 || verificationKes > 100 ||
      !Number.isFinite(monthlyKes) || monthlyKes < 0 || monthlyKes > 500 ||
      !Number.isInteger(months) || months < 0 || months > 120 ||
      (monthlyKes > 0 && months < 1) || verificationKes + monthlyKes <= 0
    ) {
      throw new Error("Enter up to KES 100 verification subsidy and KES 500 monthly subsidy for 1–120 months.");
    }

    await withPlatformTx(async (tx) => {
      await tx.$queryRaw`SELECT id FROM pharmacies WHERE id = ${request.pharmacyId}::uuid FOR UPDATE`;
      const prior = await tx.pharmacyPromotionGrant.findUnique({ where: { pharmacyId: request.pharmacyId } });
      if (prior) {
        await tx.pharmacyPromotion.updateMany({ where: { id: prior.promotionId, claimed: { gt: 0 } }, data: { claimed: { decrement: 1 } } });
      }
      const promotion = await tx.pharmacyPromotion.create({
        data: {
          name: `Approved waiver — ${request.pharmacy.name}`,
          capacity: 1,
          claimed: 1,
          verification: verificationKes > 0,
          verificationDiscountKes: verificationKes,
          recurring: monthlyKes > 0,
          recurringDiscountKes: monthlyKes,
          recurringMonths: Math.max(1, months),
          active: false,
          createdBy: actor.id,
        },
      });
      const grant = await tx.pharmacyPromotionGrant.upsert({
        where: { pharmacyId: request.pharmacyId },
        create: {
          pharmacyId: request.pharmacyId,
          promotionId: promotion.id,
          verification: verificationKes > 0,
          verificationDiscountKes: verificationKes,
          recurringMonths: months,
          recurringDiscountKes: monthlyKes,
        },
        update: {
          promotionId: promotion.id,
          verification: verificationKes > 0,
          verificationDiscountKes: verificationKes,
          recurringMonths: months,
          recurringDiscountKes: monthlyKes,
        },
      });
      await syncGrantInvoices(tx, request.pharmacyId, grant, actor.id);
      await tx.pharmacyWaiverRequest.update({
        where: { id: request.id },
        data: {
          status: "approved",
          decisionNote,
          approvedVerificationKes: verificationKes,
          approvedMonthlyKes: monthlyKes,
          approvedMonths: months,
          decidedBy: actor.id,
          decidedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: { actorId: actor.id, pharmacyId: request.pharmacyId, action: "billing.waiver.approved", entityType: "PharmacyWaiverRequest", entityId: request.id },
      });
    });
    revalidatePath("/platform/billing");
    revalidatePath("/onboard");
    revalidatePath("/onboard/billing");
      revalidatePath("/admin/billing");
    return { success: "Waiver approved and applied to the pharmacy's open invoices." };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "STEP_UP_REQUIRED" || code === "MFA_REQUIRED") return { error: code };
    return { error: publicErrorMessage(error, "We couldn't decide this waiver request right now.") };
  }
}
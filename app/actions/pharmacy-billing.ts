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
  ensureBundleInvoice,
  ensureVerificationInvoice,
  startPharmacyService,
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
    db.invoice.findFirst({ where: { pharmacyId, number: `BUNDLE-${pharmacyId}`, status: "open" } }),
  );
  if (bundle) return bundle;

  const verification = await withPharmacy(pharmacyId, () =>
    db.invoice.findFirst({ where: { pharmacyId, number: `KYP-${pharmacyId}`, status: "open" } }),
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

export async function pharmacyBillingAction(_: BillingState, form: FormData): Promise<BillingState> {
  try {
    const user = await getSessionUser();
    if (!user) throw new Error("Sign in to continue.");

    const pharmacyId = String(form.get("pharmacyId") || "").trim();
    const pharmacy = await db.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy || pharmacy.ownerUserId !== user.id) {
      throw new Error("Only the pharmacy owner can manage billing.");
    }

    const intent = String(form.get("intent") || "");

    // 1. APPLY PROMO CARD / COUPON
    if (intent === "apply_promo") {
      const code = String(form.get("code") || form.get("promoCode") || "").trim();
      if (!code) throw new Error("Enter a promotion or coupon code.");
      const result = await applyPromoCode(pharmacyId, code);
      revalidatePath("/onboard/billing");
      revalidatePath("/onboard");
      revalidatePath("/admin/setup");

      const promo = result.promotion;
      const benefitParts: string[] = [];
      if (promo.verification) benefitParts.push("verification fee waived");
      if (promo.recurring) benefitParts.push(`${promo.recurringMonths} free monthly period${promo.recurringMonths === 1 ? "" : "s"}`);
      const benefitText = benefitParts.join(" + ");

      return {
        success: `Promotional card "${promo.name}" applied successfully! (${benefitText})`,
        discount: benefitText,
        waived: promo.verification && promo.recurring,
      };
    }

    // 2. BUNDLE CHECKOUT (KES 600 or waived)
    if (intent === "bundle_checkout") {
      const invoice = await ensureBundleInvoice(pharmacyId);
      revalidatePath("/onboard/billing");
      revalidatePath("/onboard");

      if (Number(invoice.totalKes) === 0 || invoice.status === "paid") {
        if (invoice.status !== "paid") {
          await db.$transaction(async (tx) => {
            await settleInvoice(tx, invoice.id, user.id);
            await handleBundleSettlement(tx, invoice, user.id);
          });
          revalidatePath("/onboard");
        }
        return {
          success: "All fees waived by promotion! Your pharmacy verification and first month are active.",
          settled: true,
          waived: true,
        };
      }

      const checkout = await createIntasendBillingCheckout(pharmacyId, invoice.id, { actorId: user.id });
      if (!checkout.ok) throw new Error(checkout.message || "Could not create IntaSend checkout.");
      return {
        success: "Redirecting to IntaSend secure payment...",
        checkoutUrl: checkout.checkoutUrl,
      };
    }

    // 3. VERIFICATION CHECKOUT (KES 100 or waived)
    if (intent === "verification_checkout") {
      const invoice = await ensureVerificationInvoice(pharmacyId);
      revalidatePath("/onboard/billing");
      revalidatePath("/onboard");

      if (Number(invoice.totalKes) === 0 || invoice.status === "paid") {
        if (invoice.status !== "paid") {
          await db.$transaction(async (tx) => {
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

      const checkout = await createIntasendBillingCheckout(pharmacyId, invoice.id, { actorId: user.id });
      if (!checkout.ok) throw new Error(checkout.message || "Could not create IntaSend checkout.");
      return {
        success: "Redirecting to IntaSend secure payment...",
        checkoutUrl: checkout.checkoutUrl,
      };
    }

    // 4. GENERAL INTASEND CHECKOUT FOR AN INVOICE
    if (intent === "intasend_checkout" || intent === "checkout") {
      const invoice = await resolveOwnedBillingInvoice(pharmacyId, form);
      if (!invoice) throw new Error("This invoice is no longer available. Refresh the page and try again.");

      if (Number(invoice.totalKes) === 0 || invoice.status === "paid") {
        return {
          success: "This invoice is already paid or waived.",
          settled: true,
        };
      }

      const checkout = await createIntasendBillingCheckout(pharmacyId, invoice.id, { actorId: user.id });
      revalidatePath("/onboard/billing");
      if (!checkout.ok) throw new Error(checkout.message || "Could not create checkout session.");
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
        await cancelDarajaSubscriptionStandingOrder(subscription.externalSubscriptionId, user.id);
      }
      await withPharmacy(pharmacyId, () => cancelSubscription(subscription.id, true, user.id));
      revalidatePath("/onboard/billing");
      revalidatePath("/admin/setup");
      return {
        success: "Auto-renewal cancellation requested. Your current paid period remains available until its end date.",
      };
    }

    // 6. ACTIVATE SERVICE
    if (intent === "activate") {
      if (!(await loadPharmacySetup(pharmacyId)).profileReady) {
        throw new Error("Complete verification and your pharmacy profile before starting monthly billing.");
      }
      const invoice = await startPharmacyService(pharmacyId);
      if (!invoice.subscriptionId) throw new Error("Monthly billing could not be started. Please try again.");
      revalidatePath("/onboard");
      revalidatePath("/onboard/billing");
      revalidatePath("/admin/setup");

      if (Number(invoice.totalKes) === 0 || invoice.status === "paid") {
        if (invoice.status !== "paid") {
          await db.$transaction(async (tx) => {
            await settleInvoice(tx, invoice.id, user.id);
          });
          revalidatePath("/onboard");
          revalidatePath("/onboard/billing");
          revalidatePath("/admin/setup");
        }
        return {
          success: "Your promotional service period is active! No payment required.",
          settled: true,
          waived: true,
        };
      }

      const checkout = await createIntasendBillingCheckout(pharmacyId, invoice.id, { actorId: user.id });
      if (!checkout.ok) throw new Error(checkout.message || "Could not start payment.");
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
      if (!invoice) throw new Error("There is no unpaid monthly invoice to collect.");
      const checkout = await createIntasendBillingCheckout(pharmacyId, invoice.id, { actorId: user.id });
      revalidatePath("/onboard/billing");
      revalidatePath("/admin/setup");
      if (!checkout.ok) throw new Error(checkout.message || "Could not start payment.");
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
        const result = await collectWithMpesa({ pharmacyId, invoiceId: invoice.id, phone, actorId: user.id });
        revalidatePath("/onboard/billing");
        if (!result.ok) throw new Error("Could not start payment. Confirm the number and try again.");
        if (result.alreadyPaid) return { success: "This invoice is already paid." };
        return { success: "Payment prompt sent. Complete it on the phone; confirmation updates automatically." };
      }
    }

    throw new Error("That billing action is not available. Refresh the page and try again.");
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

export async function promotionAction(_: BillingState, form: FormData): Promise<BillingState> {
  try {
    const actor = await requirePlatformAction(["super_admin", "billing_admin"], { stepUp: true });
    if (form.get("intent") === "stop") {
      await withPlatformTx(async (tx) => {
        const id = String(form.get("promotionId") || "");
        await tx.pharmacyPromotion.update({ where: { id }, data: { active: false } });
        await tx.auditLog.create({
          data: { actorId: actor.id, action: "promotion.stop", entityType: "PharmacyPromotion", entityId: id },
        });
      });
    } else {
      const name = String(form.get("name") || "").trim();
      const code = String(form.get("code") || "").trim().toUpperCase() || null;
      const capacity = Number(form.get("capacity"));
      const recurringMonths = Number(form.get("months"));
      const scope = String(form.get("scope"));
      if (
        name.length < 5 ||
        name.length > 150 ||
        !Number.isInteger(capacity) ||
        capacity < 1 ||
        capacity > 100000 ||
        !Number.isInteger(recurringMonths) ||
        recurringMonths < 1 ||
        recurringMonths > 120 ||
        !["verification", "recurring", "both"].includes(scope)
      ) {
        throw new Error("Enter a name, valid capacity, scope and 1–120 promotional months.");
      }
      await withPlatformTx(async (tx) => {
        // Ensure unique code if provided
        if (code) {
          const existing = await tx.pharmacyPromotion.findFirst({ where: { code } });
          if (existing) {
            throw new Error(`Promotional code "${code}" already exists. Please choose a different code.`);
          }
        }

        const promotion = await tx.pharmacyPromotion.create({
          data: {
            name,
            code,
            capacity,
            recurringMonths,
            verification: scope !== "recurring",
            recurring: scope !== "verification",
            createdBy: actor.id,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            action: "promotion.create",
            entityType: "PharmacyPromotion",
            entityId: promotion.id,
          },
        });
      });
    }
    revalidatePath("/platform/billing");
    return { success: "Promotion saved. Existing allocated benefits are preserved." };
  } catch (error) {
    console.error("[billing][promotion] action failed", error);
    return {
      error: publicErrorMessage(
        error,
        "We couldn't save this promotion right now. Review the details and try again.",
      ),
    };
  }
}

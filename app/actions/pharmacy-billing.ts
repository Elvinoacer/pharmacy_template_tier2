"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped as db, withPlatformTx } from "@/app/lib/db";
import { publicErrorMessage } from "@/app/lib/public-error";
import { cancelSubscription } from "@/app/lib/platform/billing";
import { startPharmacyService } from "@/app/lib/platform/pharmacy-enrolment";
import { requirePlatformAction } from "@/app/lib/platform/policy";
import {
  cancelPaystackSubscription,
  createOrResumePaystackSubscription,
  createPaystackInvoiceCheckout,
  paystackManageSubscriptionLink,
} from "@/app/lib/services/paystack-billing";
import { retryPaystackOverdueInvoice } from "@/app/lib/services/paystack-dunning";
import { loadPharmacySetup } from "@/app/lib/services/pharmacy-setup";
import { withPharmacy } from "@/app/lib/tenant-context";

export type BillingState = { error?: string; success?: string; redirectUrl?: string };

async function resolveOwnedBillingInvoice(pharmacyId: string, form: FormData) {
  const invoiceId = String(form.get("invoiceId") || "").trim();
  const invoiceNumber = String(form.get("invoiceNumber") || "").trim();
  const identifiers = [
    ...(invoiceId ? [{ id: invoiceId }] : []),
    ...(invoiceNumber ? [{ number: invoiceNumber }] : []),
  ];
  const exact = identifiers.length
    ? await withPharmacy(pharmacyId, () => db.invoice.findFirst({ where: { pharmacyId, OR: identifiers } }))
    : null;
  if (exact) return exact;

  const verification = await withPharmacy(pharmacyId, () =>
    db.invoice.findFirst({ where: { pharmacyId, number: `KYP-${pharmacyId}`, status: "open" } }),
  );
  if (verification) return verification;

  const collectible = await withPharmacy(pharmacyId, () =>
    db.invoice.findMany({ where: { pharmacyId, status: "open", totalKes: { gt: 0 } }, orderBy: { createdAt: "desc" }, take: 2 }),
  );
  return collectible.length === 1 ? collectible[0] : null;
}

async function ownedSubscription(pharmacyId: string) {
  return withPharmacy(pharmacyId, () =>
    db.subscription.findFirst({ where: { pharmacyId, status: { not: "cancelled" } }, orderBy: { createdAt: "desc" } }),
  );
}

export async function pharmacyBillingAction(_: BillingState, form: FormData): Promise<BillingState> {
  try {
    const user = await getSessionUser();
    if (!user) throw new Error("Sign in to continue.");

    const pharmacyId = String(form.get("pharmacyId") || "");
    const pharmacy = await db.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy || pharmacy.ownerUserId !== user.id) throw new Error("Only the pharmacy owner can manage billing.");

    const intent = String(form.get("intent") || "");

    if (intent === "cancel") {
      const subscription = await ownedSubscription(pharmacyId);
      if (!subscription) throw new Error("No current subscription was found.");
      if (subscription.externalSubscriptionId?.startsWith("paystack:")) {
        await cancelPaystackSubscription(subscription.externalSubscriptionId);
      } else if (subscription.externalSubscriptionId) {
        throw new Error("This older subscription needs support assistance before it can be cancelled safely.");
      }
      await withPharmacy(pharmacyId, () => cancelSubscription(subscription.id, true, user.id));
      revalidatePath("/onboard/billing");
      return { success: "Auto-renewal cancelled. Your current paid period remains available until its end date." };
    }

    if (intent === "manage_card") {
      const subscription = await ownedSubscription(pharmacyId);
      if (!subscription?.externalSubscriptionId?.startsWith("paystack:")) {
        throw new Error("Finish card setup before managing your saved payment method.");
      }
      return { success: "Opening secure card management…", redirectUrl: await paystackManageSubscriptionLink(subscription.externalSubscriptionId) };
    }

    if (intent === "retry_overdue") {
      const result = await withPharmacy(pharmacyId, () => retryPaystackOverdueInvoice(pharmacyId));
      revalidatePath("/onboard/billing");
      revalidatePath("/admin/setup");
      const redirectUrl = "redirectUrl" in result ? result.redirectUrl : undefined;
      if (redirectUrl) {
        return { success: "Your bank needs a quick confirmation before this payment can be retried…", redirectUrl };
      }
      if (result.ok) return { success: "Payment confirmed. Your pharmacy billing is active again." };
      if (["retry_processing", "retry_confirming", "retry_already_processing"].includes(result.note)) {
        return { success: "The card retry is being confirmed. This page will update when processing finishes." };
      }
      throw new Error("The card could not be charged. Update the payment method and try again.");
    }

    if (intent === "activate") {
      if (!(await loadPharmacySetup(pharmacyId)).profileReady) {
        throw new Error("Complete verification and your pharmacy profile before starting monthly billing.");
      }
      const invoice = await startPharmacyService(pharmacyId);
      if (!invoice.subscriptionId) throw new Error("Monthly billing could not be started. Please try again.");
      const recurring = await createOrResumePaystackSubscription({ pharmacyId, subscriptionId: invoice.subscriptionId, actorId: user.id });
      revalidatePath("/onboard/billing");
      revalidatePath("/admin/setup");
      if (recurring.setupUrl && !recurring.active) {
        return { success: "Opening secure card setup for automatic monthly renewal…", redirectUrl: recurring.setupUrl };
      }
      if (recurring.deferred) {
        return { success: "Your free service period is active. Card authorization will be requested before the first paid month." };
      }
      return { success: "Recurring card billing is active." };
    }

    if (intent === "subscription_setup") {
      const subscription = await ownedSubscription(pharmacyId);
      if (!subscription) throw new Error("No monthly subscription was found. Start service first.");
      const recurring = await createOrResumePaystackSubscription({ pharmacyId, subscriptionId: subscription.id, actorId: user.id });
      revalidatePath("/onboard/billing");
      if (recurring.setupUrl && !recurring.active) {
        return { success: recurring.resumed ? "Resuming secure card setup…" : "Opening secure card setup…", redirectUrl: recurring.setupUrl };
      }
      if (recurring.deferred) return { success: "Your free period is active. No card charge is required yet." };
      return { success: "Recurring card billing is active." };
    }

    if (intent === "pay") throw new Error("Platform subscriptions are paid by card. Use the card billing option above.");
    if (intent !== "checkout") throw new Error("That billing action is not available. Refresh the page and try again.");

    const invoice = await resolveOwnedBillingInvoice(pharmacyId, form);
    if (!invoice) throw new Error("This billing page is out of date. Refresh it and try again.");
    if (invoice.subscriptionId) {
      throw new Error("This monthly invoice is collected automatically from the saved card. Use the recurring billing controls above.");
    }

    const result = await withPharmacy(pharmacyId, () => createPaystackInvoiceCheckout({ invoiceId: invoice.id, actorId: user.id }));
    revalidatePath("/onboard/billing");
    if (result.alreadyPaid) return { success: "This invoice is already paid." };
    if (!result.url) throw new Error("Secure checkout could not be opened. Please try again.");
    return { success: result.resumed ? "Resuming your secure checkout…" : "Opening secure checkout…", redirectUrl: result.url };
  } catch (error) {
    console.error("[billing][onboard] action failed", error);
    return {
      error: publicErrorMessage(
        error,
        "We couldn't complete that billing action right now. Your account was not changed. Please try again.",
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
        await tx.auditLog.create({ data: { actorId: actor.id, action: "promotion.stop", entityType: "PharmacyPromotion", entityId: id } });
      });
    } else {
      const name = String(form.get("name") || "").trim();
      const capacity = Number(form.get("capacity"));
      const recurringMonths = Number(form.get("months"));
      const scope = String(form.get("scope"));
      if (name.length < 5 || name.length > 150 || !Number.isInteger(capacity) || capacity < 1 || capacity > 100000 || !Number.isInteger(recurringMonths) || recurringMonths < 1 || recurringMonths > 120 || !["verification", "recurring", "both"].includes(scope)) {
        throw new Error("Enter a name, valid capacity, scope and 1–120 promotional months.");
      }
      await withPlatformTx(async (tx) => {
        const promotion = await tx.pharmacyPromotion.create({ data: { name, capacity, recurringMonths, verification: scope !== "recurring", recurring: scope !== "verification", createdBy: actor.id } });
        await tx.auditLog.create({ data: { actorId: actor.id, action: "promotion.create", entityType: "PharmacyPromotion", entityId: promotion.id } });
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

"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped as db, withPlatformTx } from "@/app/lib/db";
import { cancelSubscription } from "@/app/lib/platform/billing";
import { startPharmacyService } from "@/app/lib/platform/pharmacy-enrolment";
import { requirePlatformAction } from "@/app/lib/platform/policy";
import {
  cancelPaystackSubscription,
  createOrResumePaystackSubscription,
  createPaystackInvoiceCheckout,
  paystackManageSubscriptionLink,
} from "@/app/lib/services/paystack-billing";
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
      if (!subscription) throw new Error("No current subscription found.");
      if (subscription.externalSubscriptionId?.startsWith("paystack:")) {
        await cancelPaystackSubscription(subscription.externalSubscriptionId);
      } else if (subscription.externalSubscriptionId) {
        throw new Error("This is a legacy billing subscription. Contact support before cancelling so the old provider can be disabled safely.");
      }
      await withPharmacy(pharmacyId, () => cancelSubscription(subscription.id, true, user.id));
      revalidatePath("/onboard/billing");
      return { success: "Auto-renewal cancelled. Your current paid period remains available until its end date." };
    }

    if (intent === "manage_card") {
      const subscription = await ownedSubscription(pharmacyId);
      if (!subscription?.externalSubscriptionId?.startsWith("paystack:")) throw new Error("Finish Paystack card setup first.");
      return { success: "Opening secure card management…", redirectUrl: await paystackManageSubscriptionLink(subscription.externalSubscriptionId) };
    }

    if (intent === "activate") {
      if (!(await loadPharmacySetup(pharmacyId)).profileReady) {
        throw new Error("Complete verification and your pharmacy profile before starting monthly billing.");
      }
      const invoice = await startPharmacyService(pharmacyId);
      if (!invoice.subscriptionId) throw new Error("Monthly subscription was not created correctly.");
      const recurring = await createOrResumePaystackSubscription({ pharmacyId, subscriptionId: invoice.subscriptionId, actorId: user.id });
      revalidatePath("/onboard/billing");
      revalidatePath("/admin/setup");
      if (recurring.setupUrl && !recurring.active) {
        return { success: "Opening Paystack secure card setup for automatic monthly renewal…", redirectUrl: recurring.setupUrl };
      }
      if (recurring.deferred) {
        return { success: "Your free service period is active. Card authorization will be requested before the first paid month." };
      }
      return { success: "Recurring Paystack card billing is active." };
    }

    if (intent === "subscription_setup") {
      const subscription = await ownedSubscription(pharmacyId);
      if (!subscription) throw new Error("No monthly subscription found. Start service first.");
      const recurring = await createOrResumePaystackSubscription({ pharmacyId, subscriptionId: subscription.id, actorId: user.id });
      revalidatePath("/onboard/billing");
      if (recurring.setupUrl && !recurring.active) {
        return { success: recurring.resumed ? "Resuming Paystack secure card setup…" : "Opening Paystack secure card setup…", redirectUrl: recurring.setupUrl };
      }
      if (recurring.deferred) return { success: "Your free period is active. No card charge is required yet." };
      return { success: "Recurring Paystack card billing is active." };
    }

    if (intent === "pay") throw new Error("M-Pesa STK Push is not used for Aether platform subscription billing. Use Paystack card billing.");
    if (intent !== "checkout") throw new Error("Unknown billing action.");

    const invoice = await resolveOwnedBillingInvoice(pharmacyId, form);
    if (!invoice) throw new Error("This billing page was stale and the invoice could not be resolved safely. Refresh and try again.");
    if (invoice.subscriptionId) {
      throw new Error("Monthly service invoices are collected by the Paystack recurring-card subscription. Use recurring card setup above.");
    }

    const result = await withPharmacy(pharmacyId, () => createPaystackInvoiceCheckout({ invoiceId: invoice.id, actorId: user.id }));
    revalidatePath("/onboard/billing");
    if (result.alreadyPaid) return { success: "This invoice is already paid." };
    if (!result.url) throw new Error("Secure checkout did not return a payment page.");
    return { success: result.resumed ? "Resuming your Paystack checkout…" : "Opening Paystack secure checkout…", redirectUrl: result.url };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not process billing.";
    console.error("[billing][onboard] action failed", { message });
    return { error: message };
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
    return { error: error instanceof Error ? error.message : "Could not save promotion." };
  }
}

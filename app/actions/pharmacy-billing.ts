"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped as db, withPlatformTx } from "@/app/lib/db";
import { cancelSubscription } from "@/app/lib/platform/billing";
import { startPharmacyService } from "@/app/lib/platform/pharmacy-enrolment";
import { requirePlatformAction } from "@/app/lib/platform/policy";
import { createIntaSendBillingCheckout } from "@/app/lib/services/intasend-checkout";
import {
  cancelIntaSendSubscription,
  createOrResumeIntaSendSubscription,
} from "@/app/lib/services/intasend-subscriptions";
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
    ? await withPharmacy(pharmacyId, () =>
        db.invoice.findFirst({ where: { pharmacyId, OR: identifiers } }),
      )
    : null;
  if (exact) return exact;

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

export async function pharmacyBillingAction(_: BillingState, form: FormData): Promise<BillingState> {
  try {
    const user = await getSessionUser();
    if (!user) throw new Error("Sign in to continue.");

    const pharmacyId = String(form.get("pharmacyId") || "");
    const pharmacy = await db.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy || pharmacy.ownerUserId !== user.id) {
      throw new Error("Only the pharmacy owner can manage billing.");
    }

    const intent = String(form.get("intent") || "");

    if (intent === "cancel") {
      const subscription = await ownedSubscription(pharmacyId);
      if (!subscription) throw new Error("No current subscription found.");

      // Stop the provider first. We only schedule the local cancellation after
      // IntaSend confirms that future recurring card deductions are disabled.
      if (subscription.externalSubscriptionId) {
        await cancelIntaSendSubscription(subscription.externalSubscriptionId);
      }
      await withPharmacy(pharmacyId, () => cancelSubscription(subscription.id, true, user.id));
      revalidatePath("/onboard/billing");
      return {
        success:
          "Auto-renewal cancelled. Your current paid period remains available until its end date; no further IntaSend card charges will be scheduled.",
      };
    }

    if (intent === "activate") {
      if (!(await loadPharmacySetup(pharmacyId)).profileReady) {
        throw new Error("Complete verification and your pharmacy profile before starting monthly billing.");
      }
      const invoice = await startPharmacyService(pharmacyId);
      if (!invoice.subscriptionId) throw new Error("Monthly subscription was not created correctly.");
      const recurring = await createOrResumeIntaSendSubscription({
        pharmacyId,
        subscriptionId: invoice.subscriptionId,
        actorId: user.id,
      });
      revalidatePath("/onboard/billing");
      revalidatePath("/admin/setup");
      if (recurring.setupUrl && !recurring.active) {
        return {
          success: "Opening IntaSend secure card setup for automatic monthly renewal…",
          redirectUrl: recurring.setupUrl,
        };
      }
      return { success: "Recurring card subscription is already active." };
    }

    if (intent === "subscription_setup") {
      const subscription = await ownedSubscription(pharmacyId);
      if (!subscription) throw new Error("No monthly subscription found. Start service first.");
      const recurring = await createOrResumeIntaSendSubscription({
        pharmacyId,
        subscriptionId: subscription.id,
        actorId: user.id,
      });
      revalidatePath("/onboard/billing");
      if (recurring.setupUrl && !recurring.active) {
        return {
          success: recurring.resumed
            ? "Resuming IntaSend secure recurring-card setup…"
            : "Opening IntaSend secure recurring-card setup…",
          redirectUrl: recurring.setupUrl,
        };
      }
      return { success: "Recurring card subscription is active." };
    }

    if (intent === "pay") {
      throw new Error(
        "M-Pesa STK Push is no longer used for Aether platform subscription billing. Use the secure IntaSend card flow instead.",
      );
    }

    if (intent !== "checkout") throw new Error("Unknown billing action.");

    const invoice = await resolveOwnedBillingInvoice(pharmacyId, form);
    if (!invoice) {
      throw new Error("This billing page was stale and the invoice could not be resolved safely. Refresh the page and try once more.");
    }
    if (invoice.subscriptionId) {
      throw new Error(
        "Monthly service invoices are collected automatically by the IntaSend recurring-card subscription. Use recurring card setup instead of a one-time checkout.",
      );
    }

    const result = await withPharmacy(pharmacyId, () =>
      createIntaSendBillingCheckout({
        invoiceId: invoice.id,
        email: pharmacy.email,
        actorId: user.id,
      }),
    );
    revalidatePath("/onboard/billing");
    if (result.alreadyPaid) return { success: "This invoice is already paid." };
    if (!result.url) throw new Error("Secure checkout did not return a payment page.");
    return {
      success: result.resumed ? "Resuming your secure card checkout…" : "Opening secure card checkout…",
      redirectUrl: result.url,
    };
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
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            action: "promotion.stop",
            entityType: "PharmacyPromotion",
            entityId: id,
          },
        });
      });
    } else {
      const name = String(form.get("name") || "").trim();
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
        const promotion = await tx.pharmacyPromotion.create({
          data: {
            name,
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
    return { error: error instanceof Error ? error.message : "Could not save promotion." };
  }
}

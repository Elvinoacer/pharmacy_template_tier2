"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped as db, withPlatformTx } from "@/app/lib/db";
import { publicErrorMessage } from "@/app/lib/public-error";
import { cancelSubscription, collectInvoicePayment } from "@/app/lib/platform/billing";
import { startPharmacyService } from "@/app/lib/platform/pharmacy-enrolment";
import { requirePlatformAction } from "@/app/lib/platform/policy";
import {
  cancelDarajaSubscriptionStandingOrder,
  createOrResumeDarajaSubscription,
  saveMpesaBillingPhone,
} from "@/app/lib/services/daraja-subscriptions";
import { loadPharmacySetup } from "@/app/lib/services/pharmacy-setup";
import { withPharmacy } from "@/app/lib/tenant-context";

export type BillingState = { error?: string; success?: string };

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

    if (intent === "subscription_setup") {
      const subscription = await ownedSubscription(pharmacyId);
      if (!subscription) throw new Error("No monthly subscription was found. Start service first.");
      const phone = submittedPhone(form);
      if (!phone) throw new Error("Enter the Safaricom number that should authorize M-PESA Ratiba.");
      const recurring = await createOrResumeDarajaSubscription({
        pharmacyId,
        subscriptionId: subscription.id,
        phone,
        actorId: user.id,
      });
      revalidatePath("/onboard/billing");
      if (recurring.active) return { success: "Automatic monthly M-PESA billing is already active." };
      return {
        success: "Ratiba authorization has been requested. Complete the M-PESA authorization on the phone; this page will update after Safaricom confirms it.",
      };
    }

    if (intent === "retry_overdue") {
      const phone = submittedPhone(form);
      if (!phone) throw new Error("Enter the Safaricom number that should receive the M-PESA prompt.");
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
      const result = await collectWithMpesa({ pharmacyId, invoiceId: invoice.id, phone, actorId: user.id });
      revalidatePath("/onboard/billing");
      revalidatePath("/admin/setup");
      if (!result.ok) throw new Error("M-PESA could not start this payment. Confirm the number and try again.");
      if (result.alreadyPaid) return { success: "This invoice is already paid." };
      return { success: "M-PESA prompt sent. Complete it on the phone; payment will be confirmed automatically." };
    }

    if (intent === "activate") {
      if (!(await loadPharmacySetup(pharmacyId)).profileReady) {
        throw new Error("Complete verification and your pharmacy profile before starting monthly billing.");
      }
      const phone = submittedPhone(form);
      if (!phone) throw new Error("Enter the Safaricom number that should receive the M-PESA prompt.");
      const invoice = await startPharmacyService(pharmacyId);
      if (!invoice.subscriptionId) throw new Error("Monthly billing could not be started. Please try again.");
      await saveMpesaBillingPhone(pharmacyId, phone);
      revalidatePath("/onboard/billing");
      revalidatePath("/admin/setup");

      if (Number(invoice.totalKes) === 0) {
        return {
          success: "Your promotional service period is active. You can authorize M-PESA Ratiba now for automatic collection when the first paid month begins.",
        };
      }

      const result = await collectWithMpesa({ pharmacyId, invoiceId: invoice.id, phone, actorId: user.id });
      if (!result.ok) throw new Error("M-PESA could not start this payment. Confirm the number and try again.");
      return {
        success: "M-PESA prompt sent for the first month. Complete it on the phone, then authorize Ratiba for future automatic monthly renewals.",
      };
    }

    if (intent !== "checkout") {
      throw new Error("That billing action is not available. Refresh the page and try again.");
    }

    const invoice = await resolveOwnedBillingInvoice(pharmacyId, form);
    if (!invoice) throw new Error("This billing page is out of date. Refresh it and try again.");
    const phone = submittedPhone(form);
    if (!phone) throw new Error("Enter the Safaricom number that should receive the M-PESA prompt.");
    const result = await collectWithMpesa({ pharmacyId, invoiceId: invoice.id, phone, actorId: user.id });
    revalidatePath("/onboard/billing");
    if (!result.ok) throw new Error("M-PESA could not start this payment. Confirm the number and try again.");
    if (result.alreadyPaid) return { success: "This invoice is already paid." };
    return { success: "M-PESA prompt sent. Complete it on the phone; Aether will confirm the payment automatically." };
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
        await tx.auditLog.create({
          data: { actorId: actor.id, action: "promotion.stop", entityType: "PharmacyPromotion", entityId: id },
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
    console.error("[billing][promotion] action failed", error);
    return {
      error: publicErrorMessage(
        error,
        "We couldn't save this promotion right now. Review the details and try again.",
      ),
    };
  }
}

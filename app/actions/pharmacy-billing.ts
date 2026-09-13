"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped as db, withPlatformTx } from "@/app/lib/db";
import { cancelSubscription, collectInvoicePayment } from "@/app/lib/platform/billing";
import { resolveDarajaCredentials } from "@/app/lib/platform/integrations";
import { startPharmacyService } from "@/app/lib/platform/pharmacy-enrolment";
import { requirePlatformAction } from "@/app/lib/platform/policy";
import { createIntaSendBillingCheckout } from "@/app/lib/services/intasend-checkout";
import { loadPharmacySetup } from "@/app/lib/services/pharmacy-setup";
import { withPharmacy } from "@/app/lib/tenant-context";

export type BillingState = { error?: string; success?: string; redirectUrl?: string };

const BILLING_STK_RETRY_AFTER_MS = 90_000;

async function clearExpiredBillingStk(invoiceId: string, pharmacyId: string) {
  const pending = await withPharmacy(pharmacyId, () =>
    db.billingPayment.findFirst({
      where: {
        invoiceId,
        pharmacyId,
        status: { in: ["pending", "processing"] },
      },
      orderBy: { createdAt: "desc" },
    }),
  );

  if (!pending) return;

  const ageMs = Date.now() - pending.createdAt.getTime();
  if (ageMs >= BILLING_STK_RETRY_AFTER_MS) {
    await withPharmacy(pharmacyId, () =>
      db.billingPayment.updateMany({
        where: {
          id: pending.id,
          pharmacyId,
          status: { in: ["pending", "processing"] },
        },
        data: {
          status: "failed",
          failureReason: "Previous STK request expired before confirmation; superseded by retry.",
        },
      }),
    );
    return;
  }

  const remainingSeconds = Math.max(1, Math.ceil((BILLING_STK_RETRY_AFTER_MS - ageMs) / 1000));
  throw new Error(
    `A previous M-Pesa request is still active. Wait about ${remainingSeconds}s, then retry if no prompt appears.`,
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
      const subscription = await withPharmacy(pharmacyId, () =>
        db.subscription.findFirst({
          where: { pharmacyId, status: { not: "cancelled" } },
          orderBy: { createdAt: "desc" },
        }),
      );
      if (!subscription) throw new Error("No current subscription found.");
      await withPharmacy(pharmacyId, () => cancelSubscription(subscription.id, true, user.id));
      revalidatePath("/onboard/billing");
      return {
        success:
          "Renewal cancelled. Service ends at the end of your current period; existing invoices remain payable.",
      };
    }

    if (intent === "activate") {
      if (!(await loadPharmacySetup(pharmacyId)).profileReady) {
        throw new Error("Complete verification and your pharmacy profile before starting monthly billing.");
      }
      await startPharmacyService(pharmacyId);
      revalidatePath("/onboard/billing");
      revalidatePath("/admin/setup");
      return { success: "Monthly service invoice created. Any promotion has been applied." };
    }

    const invoiceId = String(form.get("invoiceId") || "");
    const invoice = await withPharmacy(pharmacyId, () =>
      db.invoice.findFirst({ where: { id: invoiceId, pharmacyId } }),
    );
    if (!invoice) throw new Error("Invoice not found.");

    if (intent === "checkout") {
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
        success: result.resumed ? "Resuming your secure checkout…" : "Opening secure checkout…",
        redirectUrl: result.url,
      };
    }

    if (intent !== "pay") throw new Error("Unknown billing action.");

    const phone = String(form.get("phone") || "")
      .replace(/[\s+]/g, "")
      .replace(/^0/, "254");
    if (!/^254[17]\d{8}$/.test(phone)) {
      throw new Error("Enter a valid Kenyan M-Pesa number.");
    }

    // A successful STK initiation is stored as `processing` until Safaricom's
    // callback settles it. If a callback never arrives (common while switching
    // sandbox/live credentials), that row used to block every future retry
    // forever. Expire only old attempts; recent attempts remain protected from
    // accidental double prompts.
    await clearExpiredBillingStk(invoice.id, pharmacyId);

    const result = await withPharmacy(pharmacyId, () =>
      collectInvoicePayment(invoice.id, { phone, actorId: user.id }),
    );
    if (!result.ok) {
      console.error("[billing][daraja] STK initiation failed", {
        pharmacyId,
        invoiceId: invoice.id,
        error: result.error,
      });
      throw new Error(result.error);
    }

    const daraja = await resolveDarajaCredentials(null);
    console.info("[billing][daraja] STK accepted", {
      pharmacyId,
      invoiceId: invoice.id,
      checkoutRequestId: result.checkoutRequestId,
      environment: daraja?.env ?? "unknown",
    });

    revalidatePath("/onboard/billing");
    revalidatePath("/admin/setup");

    if (daraja?.env === "sandbox") {
      return {
        success:
          `Daraja sandbox accepted the STK request (CheckoutRequestID ${result.checkoutRequestId}). ` +
          "Sandbox verifies the API request path; switch only the Daraja environment/credentials to production when testing a real handset prompt.",
      };
    }

    return {
      success:
        `M-Pesa prompt accepted by Safaricom Daraja (CheckoutRequestID ${result.checkoutRequestId}). ` +
        "Approve it on your phone; this page will confirm the result automatically.",
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

"use server";
import { withPharmacy } from "@/app/lib/tenant-context";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped as db, withPlatformTx } from "@/app/lib/db";
import { requirePlatformAction } from "@/app/lib/platform/policy";
import { collectInvoicePayment, cancelSubscription } from "@/app/lib/platform/billing";
import { startPharmacyService } from "@/app/lib/platform/pharmacy-enrolment";
import { loadPharmacySetup } from "@/app/lib/services/pharmacy-setup";
export type BillingState = { error?: string; success?: string };

export async function pharmacyBillingAction(_: BillingState, form: FormData): Promise<BillingState> {
  try {
    const user = await getSessionUser();
    if (!user) throw new Error("Sign in to continue.");
    const pharmacyId = String(form.get("pharmacyId") || "");
    const pharmacy = await db.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy || pharmacy.ownerUserId !== user.id) throw new Error("Only the pharmacy owner can manage billing.");
    if (form.get("intent") === "cancel") {
      const subscription = await withPharmacy(pharmacyId, () => db.subscription.findFirst({ where: { pharmacyId, status: { not: "cancelled" } }, orderBy: { createdAt: "desc" } }));
      if (!subscription) throw new Error("No current subscription found.");
      await withPharmacy(pharmacyId, () => cancelSubscription(subscription.id, true, user.id));
      revalidatePath("/onboard/billing");
      return { success: "Renewal cancelled. Service ends at the end of your current period; existing invoices remain payable." };
    }
    if (form.get("intent") === "activate") {
      if (!(await loadPharmacySetup(pharmacyId)).profileReady) throw new Error("Complete verification and your pharmacy profile before starting monthly billing.");
      await startPharmacyService(pharmacyId);
    } else {
      const invoiceId = String(form.get("invoiceId") || "");
      const invoice = await withPharmacy(pharmacyId, () => db.invoice.findFirst({ where: { id: invoiceId, pharmacyId } }));
      if (!invoice) throw new Error("Invoice not found.");
      const phone = String(form.get("phone") || "").replace(/[\s+]/g, "").replace(/^0/, "254");
      if (!/^254[17]\d{8}$/.test(phone)) throw new Error("Enter a valid Kenyan M-Pesa number.");
      const result = await withPharmacy(pharmacyId, () => collectInvoicePayment(invoice.id, { phone, actorId: user.id }));
      if (!result.ok) throw new Error(result.error);
    }
    revalidatePath("/onboard/billing");
    revalidatePath("/admin/setup");
    return { success: form.get("intent") === "activate" ? "Monthly service invoice created. Any promotion has been applied." : "Check your phone. We will confirm payment after M-Pesa verification. Refresh to see the latest status." };
  } catch (error) { return { error: error instanceof Error ? error.message : "Could not process billing." }; }
}

export async function promotionAction(_: BillingState, form: FormData): Promise<BillingState> {
  try {
    const actor = await requirePlatformAction(["super_admin", "billing_admin"], { stepUp: true });
    if (form.get("intent") === "stop") {
      await withPlatformTx(async tx => {
        const id = String(form.get("promotionId") || "");
        await tx.pharmacyPromotion.update({ where: { id }, data: { active: false } });
        await tx.auditLog.create({ data: { actorId: actor.id, action: "promotion.stop", entityType: "PharmacyPromotion", entityId: id } });
      });
    } else {
      const name = String(form.get("name") || "").trim();
      const capacity = Number(form.get("capacity"));
      const recurringMonths = Number(form.get("months"));
      const scope = String(form.get("scope"));
      if (name.length < 5 || name.length > 150 || !Number.isInteger(capacity) || capacity < 1 || capacity > 100000 || !Number.isInteger(recurringMonths) || recurringMonths < 1 || recurringMonths > 120 || !["verification", "recurring", "both"].includes(scope)) throw new Error("Enter a name, valid capacity, scope and 1–120 promotional months.");
      await withPlatformTx(async tx => {
        const promotion = await tx.pharmacyPromotion.create({ data: { name, capacity, recurringMonths, verification: scope !== "recurring", recurring: scope !== "verification", createdBy: actor.id } });
        await tx.auditLog.create({ data: { actorId: actor.id, action: "promotion.create", entityType: "PharmacyPromotion", entityId: promotion.id } });
      });
    }
    revalidatePath("/platform/billing");
    return { success: "Promotion saved. Existing allocated benefits are preserved." };
  } catch (error) { return { error: error instanceof Error ? error.message : "Could not save promotion." }; }
}

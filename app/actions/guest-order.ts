"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/db";
import { checkRateLimit } from "@/app/lib/rate-limit";
import { getSessionUser } from "@/app/lib/auth";

export type GuestOrderState = {
  error?: string;
  success?: string;
  orderId?: string;
};

/**
 * Public OTC hold/order for visitors — no account required.
 * Creates a pending order (source=website), deducts stock atomically,
 * and notifies staff. Customer can collect & pay in store or pay later via portal.
 */
export async function guestCreateOrderAction(
  _prev: GuestOrderState,
  formData: FormData,
): Promise<GuestOrderState> {
  const medicationId = String(formData.get("medicationId") || "").trim();
  const quantity = Math.max(1, Math.min(20, Number(formData.get("quantity") || 1)));
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const notes = String(formData.get("notes") || "").trim();
  const pickupPreference = String(formData.get("pickupPreference") || "pickup");

  if (!medicationId) return { error: "Please select a product." };
  if (!fullName || fullName.length < 2) return { error: "Your name is required." };
  if (!phone || phone.replace(/\D/g, "").length < 9) {
    return { error: "A valid phone number is required so we can confirm your order." };
  }

  const rateKey = `guest-order:${phone.replace(/\D/g, "").slice(-9)}`;
  const rl = checkRateLimit(rateKey, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) {
    return {
      error: `Too many orders from this number. Try again in ${rl.retryAfterSeconds}s, or call the pharmacy.`,
    };
  }

  const med = await prisma.pharmacyInventory.findFirst({
    where: {
      id: medicationId,
      active: true,
      overTheCounter: true,
      publicListing: true,
    },
    include: { medicationMaster: { select: { name: true } } },
  });
  if (!med) {
    return { error: "This product is not available for online guest order." };
  }
  if (med.currentStock < quantity) {
    return { error: `Only ${med.currentStock} unit(s) in stock right now.` };
  }

  // Link to existing customer if email/phone matches a profile (optional).
  const session = await getSessionUser().catch(() => null);
  let customerId: string | null = session?.customerId ?? null;
  if (!customerId && email) {
    const byEmail = await prisma.customerProfile.findFirst({
      where: { user: { email } },
      select: { id: true },
    });
    customerId = byEmail?.id ?? null;
  }
  if (!customerId && phone) {
    const digits = phone.replace(/\D/g, "");
    const byPhone = await prisma.customerProfile.findFirst({
      where: { phone: { contains: digits.slice(-9) } },
      select: { id: true },
    });
    customerId = byPhone?.id ?? null;
  }

  const unitPrice = Number(med.price);
  const total = Math.max(0, unitPrice * quantity);
  const orderNotes = [
    `Guest OTC order`,
    `Name: ${fullName}`,
    `Phone: ${phone}`,
    email ? `Email: ${email}` : null,
    `Preference: ${pickupPreference}`,
    notes || null,
  ]
    .filter(Boolean)
    .join("\n");

  const {
    applyStockChange,
    notifyStockThreshold,
    InsufficientStockError,
  } = await import("@/app/lib/services/stock");

  let orderId = "";
  try {
    const { order, stockResult } = await prisma.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          customerId,
          source: "website",
          status: "pending",
          total,
          notes: orderNotes,
          items: {
            create: {
              medicationId,
              name: med.medicationMaster.name,
              quantity,
              unitPrice,
            },
          },
        },
      });
      const stockResult = await applyStockChange(tx, {
        inventoryId: medicationId,
        quantityDelta: -quantity,
        reason: "sale",
        notes: `Guest website order × ${quantity} (${fullName})`,
        relatedType: "order",
        relatedId: o.id,
        actorId: session?.id ?? null,
      });
      return { order: o, stockResult };
    });
    orderId = order.id;
    await notifyStockThreshold(stockResult);
  } catch (e) {
    if (e instanceof InsufficientStockError) {
      return { error: `Only ${e.available} unit(s) in stock right now.` };
    }
    console.error("[guestCreateOrderAction]", e);
    return { error: "Could not place order. Please try again or call the pharmacy." };
  }

  const { recordAdminNotification } = await import("@/app/lib/services/admin-notifications");
  await recordAdminNotification({
    type: "enquiry_new",
    title: "New guest OTC order",
    body: `${fullName} (${phone}) ordered ${quantity}× ${med.medicationMaster.name} — KES ${total}`,
    severity: "info",
    relatedType: "order",
    relatedId: orderId,
  });

  const { dispatchPushToStaff } = await import("@/app/lib/services/push");
  await dispatchPushToStaff({
    title: "Guest OTC order",
    body: `${fullName}: ${quantity}× ${med.medicationMaster.name}`,
    url: "/admin/orders",
    data: { tag: `order-${orderId}`, orderId },
  }).catch(() => {});

  if (customerId) {
    const { addTimelineEvent } = await import("@/app/lib/auth");
    await addTimelineEvent(
      customerId,
      session?.id ?? null,
      "order_placed",
      "Guest OTC order",
      `${med.medicationMaster.name} × ${quantity} — KES ${total}`,
      { orderId },
      session?.id,
    ).catch(() => {});
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/medications");
  revalidatePath("/medicines");
  revalidatePath("/admin/inventory");

  return {
    success: `Order reserved. Reference ${orderId.slice(0, 8).toUpperCase()}. We'll confirm on ${phone}. Collect in store or we'll call about delivery.`,
    orderId,
  };
}

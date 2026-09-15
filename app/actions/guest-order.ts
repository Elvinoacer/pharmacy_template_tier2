"use server";
import { issueOrderAccessToken } from "@/app/lib/services/payments";

import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/db";
import { checkRateLimitAsync } from "@/app/lib/rate-limit";
import { getSessionUser } from "@/app/lib/auth";
import { formatMpesaPhone } from "@/app/lib/services/daraja";

export type GuestOrderState = {
  error?: string;
  success?: string;
  orderId?: string;
  accessToken?: string;
  /** Phone normalized for guest M-Pesa pay authz */
  phone?: string;
  total?: number;
  /** Soft prompt after success — account is optional */
  suggestAccount?: boolean;
};

/**
 * Public OTC hold/order for visitors — no account required.
 * Creates a pending reservation (source=website, fulfillment=reserve),
 * deducts stock atomically, notifies staff.
 *
 * Guest can pay later via M-Pesa (phone match) or at collection.
 * Account creation is optional — only soft-nudged for dose reminders.
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
  const reason = String(formData.get("reason") || "").trim();
  const pickupPreference = String(formData.get("pickupPreference") || "pickup");
  // pay_now is a client preference only — order is always created as reservation;
  // client opens STK panel after success when payNow is set.
  const payNow = formData.get("payNow") === "on" || formData.get("payNow") === "true";

  if (!medicationId) return { error: "Please select a product." };
  if (!fullName || fullName.length < 2) return { error: "Your name is required." };
  if (!phone || phone.replace(/\D/g, "").length < 9) {
    return { error: "A valid phone number is required so we can confirm your order." };
  }
  if (!reason) {
    return { error: "Please tell us why you need this medication so our pharmacist can review." };
  }

  const rateKey = `guest-order:${phone.replace(/\D/g, "").slice(-9)}`;
  const rl = await checkRateLimitAsync(rateKey, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
    failClosed: true,
  });
  if (!rl.allowed) {
    return {
      error: rl.degraded
        ? "Security service temporarily unavailable. Please try again shortly."
        : `Too many orders from this number. Try again in ${rl.retryAfterSeconds}s, or call the pharmacy.`,
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

  // Link to existing customer if session/email/phone matches (optional — never block).
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
  const mpesaPhone = formatMpesaPhone(phone);
  const fulfillment = pickupPreference === "delivery" ? "delivery" : "reserve";
  // Logistics envelope only — clinical reason is stored on Order.reason
  // so staff can query/filter it and it is never overwritten by contact lines.
  const orderNotes = [
    `Guest OTC reservation`,
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
      const unitCost = Number(med.purchasePrice ?? 0);
      const grossAmount = unitPrice * quantity;
      const netAmount = Math.max(0, grossAmount);
      const grossProfit = netAmount - unitCost * quantity;
      // 48-hour reservation TTL for website orders (audit §10).
      const expiresAt = new Date(Date.now() + 48 * 3600 * 1000);

      const o = await tx.order.create({
        data: {
          pharmacyId: med.pharmacyId,
          customerId,
          source: "website",
          status: "pending",
          total,
          // ── Commerce ledger extension (audit §8, §9, §10, §16) ──
          type: "RESERVATION",
          lifecycleStatus: "active",
          paymentStage: "unpaid",
          fulfillmentStage: fulfillment === "delivery" ? "reserved" : "reserved",
          currency: "KES",
          subtotal: grossAmount,
          discountTotal: 0,
          taxTotal: 0,
          netTotal: netAmount,
          amountPaid: 0,
          amountRefunded: 0,
          amountDue: netAmount,
          reservedAt: new Date(),
          expiresAt,
          notes: orderNotes,
          reason,
          guestName: fullName,
          guestPhone: mpesaPhone,
          guestEmail: email || null,
          fulfillment,
          items: {
            create: {
              medicationId,
              name: med.medicationMaster.name,
              quantity,
              unitPrice,
              // Commerce snapshots (audit §17)
              unitCostSnapshot: unitCost,
              grossAmount,
              netAmount,
              grossProfit,
              taxAmount: 0,
              currency: "KES",
              pricingRule: "catalogue",
            },
          },
        },
      });

      // Reservation lifecycle: create InventoryReservation + reservation_create stock movement.
      const { createReservation } = await import("@/app/lib/services/commerce/reservations");
      const { recordCommerceEvent } = await import("@/app/lib/services/commerce/events");
      const r = await createReservation(tx, {
        orderId: o.id,
        inventoryId: medicationId,
        quantity,
        createdById: session?.id ?? null,
        expiresAt,
      });
      await recordCommerceEvent(tx, {
        eventType: "order_created",
        entityType: "order",
        entityId: o.id,
        orderId: o.id,
        customerId: customerId ?? null,
        actorId: session?.id ?? null,
        amount: netAmount,
        metadata: { source: "website", type: "RESERVATION", quantity, medicationId },
      });
      await recordCommerceEvent(tx, {
        eventType: "order_reserved",
        entityType: "order",
        entityId: o.id,
        orderId: o.id,
        customerId: customerId ?? null,
        actorId: session?.id ?? null,
        amount: netAmount,
        metadata: { expiresAt },
      });

      return { order: o, stockResult: null };
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
    title: "New guest OTC reservation",
    body: `${fullName} (${phone}) reserved ${quantity}× ${med.medicationMaster.name} — KES ${total}${payNow ? " (wants to pay now)" : ""}`,
    severity: "info",
    relatedType: "order",
    relatedId: orderId,
  });

  const { dispatchPushToStaff } = await import("@/app/lib/services/push");
  await dispatchPushToStaff({
    title: "Guest OTC reservation",
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
      "Guest OTC reservation",
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
    success: payNow
      ? `Reserved. Complete M-Pesa below — stock is held under ref ${orderId.slice(0, 8).toUpperCase()}.`
      : `Reserved under ${orderId.slice(0, 8).toUpperCase()}. Pay with M-Pesa now or at collection. We'll confirm on ${phone}.`,
    orderId,
    accessToken: await issueOrderAccessToken(orderId),
    phone: mpesaPhone,
    total,
    suggestAccount: !session?.customerId,
  };
}

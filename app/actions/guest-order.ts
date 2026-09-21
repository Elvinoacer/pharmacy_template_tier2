"use server";
import { z } from "zod";
import { getPharmacyPaymentCapability } from "@/app/lib/platform/integrations";
import { issueOrderAccessToken } from "@/app/lib/services/payments";

import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/db";
import { checkRateLimitAsync } from "@/app/lib/rate-limit";
import { getSessionUser } from "@/app/lib/auth";
import { formatMpesaPhone } from "@/app/lib/services/daraja";
import { pharmacySupportsDelivery, sellableAvailable } from "@/app/lib/inventory-availability";
import { buildPublicInventoryWhere } from "@/app/lib/services/public-medication-visibility";

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
  onlinePaymentsEnabled?: boolean;
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
  const submittedPharmacyId = String(formData.get("pharmacyId") || "").trim();
  const submittedPharmacySlug = String(formData.get("pharmacySlug") || "").trim().toLowerCase();
  const quantity = Number(formData.get("quantity") || 1);
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const notes = String(formData.get("notes") || "").trim();
  const reason = String(formData.get("reason") || "").trim();
  const pickupPreference = String(formData.get("pickupPreference") || "pickup");
  // pay_now is a client preference only — order is always created as reservation;
  // client opens STK panel after success when payNow is set.
  const payNow = formData.get("payNow") === "on" || formData.get("payNow") === "true";

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return { error: "Choose a whole quantity between 1 and 20." };
  if (!/^254[17]\d{8}$/.test(formatMpesaPhone(phone))) return { error: "Enter a valid Kenyan mobile number." };
  if (email && !z.email().max(254).safeParse(email).success) return { error: "Enter a valid email address." };
  if (!["pickup", "delivery"].includes(pickupPreference)) return { error: "Choose pickup or delivery." };
  if (fullName.length > 120 || notes.length > 1500 || reason.length > 1500) return { error: "Please shorten your order details." };
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

  // Resolve trusted pharmacy context: reassert tenant authority so inventory from
  // another pharmacy cannot be ordered under this storefront.
  const { getTenant, findPharmacyById, findPharmacyBySlug } = await import("@/app/lib/tenant");
  const { loadStorefront } = await import("@/app/components/StorefrontGate");
  const tenant = await getTenant().catch(() => ({ pharmacyId: null, slug: null }));
  const storefrontPharmacy = await loadStorefront().catch(() => null);

  let trustedPharmacyId = tenant.pharmacyId || storefrontPharmacy?.id || null;
  let trustedPharmacySlug = tenant.slug || storefrontPharmacy?.slug || null;

  if (!trustedPharmacyId && submittedPharmacyId) {
    const verifiedRow = await findPharmacyById(submittedPharmacyId);
    if (verifiedRow && verifiedRow.status === "active" && verifiedRow.listed) {
      trustedPharmacyId = verifiedRow.id;
      trustedPharmacySlug = verifiedRow.slug;
    }
  } else if (!trustedPharmacyId && submittedPharmacySlug) {
    const verifiedRow = await findPharmacyBySlug(submittedPharmacySlug);
    if (verifiedRow && verifiedRow.status === "active" && verifiedRow.listed) {
      trustedPharmacyId = verifiedRow.id;
      trustedPharmacySlug = verifiedRow.slug;
    }
  }

  if (!trustedPharmacyId) {
    return { error: "Please select a pharmacy before placing your order." };
  }

  // Cross-tenant verification: if client submitted a different pharmacy, fail closed
  if (submittedPharmacyId && submittedPharmacyId !== trustedPharmacyId) {
    return { error: "The selected product does not belong to the active pharmacy storefront." };
  }
  if (submittedPharmacySlug && trustedPharmacySlug && submittedPharmacySlug.toLowerCase() !== trustedPharmacySlug.toLowerCase()) {
    return { error: "The selected product does not belong to the active pharmacy storefront." };
  }

  const med = await prisma.pharmacyInventory.findFirst({
    where: {
      ...buildPublicInventoryWhere({ id: medicationId, pharmacyId: trustedPharmacyId }),
      overTheCounter: true,
      prescriptionRequired: false,
    },
    include: {
      medicationMaster: { select: { name: true } },
      pharmacy: {
        select: {
          id: true,
          slug: true,
          settings: { select: { deliveryNotes: true, deliveryRadiusKm: true } },
        },
      },
    },
  });
  if (!med) {
    return { error: "This product is not available for online guest order from the selected pharmacy." };
  }
  if (med.pharmacyId !== trustedPharmacyId) {
    return { error: "This product does not belong to the selected pharmacy." };
  }
  if (trustedPharmacySlug && med.pharmacy?.slug && med.pharmacy.slug !== trustedPharmacySlug) {
    return { error: "This product does not belong to the selected pharmacy." };
  }

  const reservedAgg = await prisma.inventoryReservation.aggregate({
    where: { inventoryId: medicationId, status: "active" },
    _sum: { quantity: true },
  });
  const reservedCount = reservedAgg._sum.quantity ?? 0;
  const availableStock = sellableAvailable(med.currentStock, reservedCount);

  if (availableStock < quantity) {
    return {
      error:
        availableStock > 0
          ? `Only ${availableStock} unit(s) available right now.`
          : "This product is currently out of stock.",
    };
  }

  if (pickupPreference === "delivery") {
    const supportsDelivery = pharmacySupportsDelivery(med.pharmacy?.settings);
    if (!supportsDelivery) {
      return {
        error: "Home delivery is not currently offered by this pharmacy. Please choose in-store pickup.",
      };
    }
  }

  // Never infer account ownership from public contact details. Email and phone
  // are identifiers, not authentication factors. Only an authenticated customer
  // session may attach an order to that account.
  const session = await getSessionUser().catch(() => null);
  const customerId: string | null = session?.customerId ?? null;

  const capability = await getPharmacyPaymentCapability(trustedPharmacyId);
  const unitPrice = Number(med.price);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) return { error: "This product has no valid selling price. Please contact the pharmacy." };
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
    if (e instanceof InsufficientStockError || (e instanceof Error && e.name === "InsufficientStockError")) {
      const avail = (e as any).available ?? 0;
      return {
        error:
          avail > 0
            ? `Only ${avail} unit(s) available right now.`
            : "This product was just reserved by another customer and is now out of stock.",
      };
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
  }).catch(() => {});

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
    onlinePaymentsEnabled: capability.onlinePaymentsEnabled,
    success: !capability.onlinePaymentsEnabled
      ? `Reserved under ${orderId.slice(0, 8).toUpperCase()}. The pharmacy will contact you on ${phone} to confirm ${pickupPreference === "delivery" ? "delivery and payment arrangements" : "collection and payment"}.`
      : payNow
      ? `Reserved. Complete M-Pesa below — stock is held under ref ${orderId.slice(0, 8).toUpperCase()}.`
      : `Reserved under ${orderId.slice(0, 8).toUpperCase()}. Pay with M-Pesa now or at collection. We'll confirm on ${phone}.`,
    orderId,
    accessToken: await issueOrderAccessToken(orderId),
    phone: mpesaPhone,
    total,
    suggestAccount: !session?.customerId,
  };
}

export type GuestOtcOption = {
  id: string;
  name: string;
  price: number;
  stockQty: number;
  slug: string;
};

export async function searchGuestOtcAction(
  pharmacyId: string,
  query: string,
): Promise<GuestOtcOption[]> {
  const q = query.trim().slice(0, 80);
  if (!pharmacyId) return [];

  const rows = await prisma.pharmacyInventory.findMany({
    where: {
      ...buildPublicInventoryWhere({
        pharmacyId,
        inStock: true,
        searchQuery: q || null,
      }),
      overTheCounter: true,
    },
    include: {
      medicationMaster: { select: { name: true } },
      reservations: { where: { status: "active" }, select: { quantity: true } },
    },
    orderBy: { medicationMaster: { name: "asc" } },
    take: 40,
  });

  return rows
    .map((row) => ({
      id: row.id,
      name: row.medicationMaster.name,
      price: Number(row.price),
      stockQty: sellableAvailable(
        row.currentStock,
        row.reservations.reduce((sum, reservation) => sum + reservation.quantity, 0),
      ),
      slug: row.slug,
    }))
    .filter((row) => row.stockQty > 0);
}

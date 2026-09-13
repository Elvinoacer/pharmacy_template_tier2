import "server-only";

import { prisma } from "@/app/lib/db";
import { formatDateTime, formatDate } from "@/app/lib/time";
import { sendDelivery } from "@/app/lib/services/delivery";

export type PharmacyReceiptItem = {
  id: string;
  name: string;
  genericName?: string | null;
  strengthDisplay?: string | null;
  dosageForm?: string | null;
  batchNumber?: string | null;
  expiryDate?: string | null;
  quantity: number;
  billingUnit: string;
  unitPrice: number;
  discountApplied: number;
  totalPrice: number;
  dosageInstructions?: string | null;
};

export type PharmacyReceiptData = {
  receiptNumber: string;
  orderId: string;
  fillId?: string | null;
  orderType: string;
  status: string;
  createdAt: string;
  paidAt?: string | null;
  dispatchedAt?: string | null;

  // Pharmacy Details — always sourced from the order's tenant records.
  pharmacy: {
    name: string;
    branch: string;
    phone: string;
    email: string;
    whatsapp: string;
    address: string;
    taxPin: string;
  };

  // Patient / Customer Details
  customer: {
    id?: string | null;
    fullName: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    isWalkIn: boolean;
  };

  // Line items
  items: PharmacyReceiptItem[];

  // Financial totals
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  netTotal: number;
  amountPaid: number;
  amountDue: number;
  currency: string;

  // Payment details
  paymentMethod: string;
  paymentRef?: string | null;
  mpesaReceipt?: string | null;

  // Dispenser / Staff details
  dispensedBy?: {
    name: string;
    email: string;
    role: string;
  } | null;
  dispenserNote?: string | null;
  prescriber?: string | null;
};

/**
 * Fetch and construct complete receipt data for an order or prescription fill.
 * Pharmacy identity is resolved from the order's Pharmacy/PharmacySettings/
 * PharmacyBranch records. No static demo pharmacy data is permitted here.
 */
export async function getReceiptData(orderId: string): Promise<PharmacyReceiptData | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      pharmacy: {
        select: {
          name: true,
          email: true,
          phone: true,
          whatsapp: true,
          city: true,
          county: true,
          country: true,
          kraPin: true,
          settings: {
            select: {
              displayName: true,
              phone: true,
              email: true,
              whatsapp: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              state: true,
              zip: true,
              country: true,
            },
          },
        },
      },
      branch: {
        select: {
          name: true,
          phone: true,
          email: true,
          addressLine1: true,
          city: true,
          county: true,
        },
      },
      customer: {
        include: {
          user: { select: { email: true, role: true } },
        },
      },
      items: {
        include: {
          medication: {
            include: {
              medicationMaster: {
                include: { dosageForm: true },
              },
              lots: {
                where: { active: true },
                orderBy: { expiryDate: "asc" },
                take: 1,
              },
            },
          },
          allocations: {
            include: {
              inventoryLot: true,
            },
          },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      prescriptionFill: {
        include: {
          prescription: true,
          dispensedBy: { select: { email: true, role: true } },
        },
      },
      dispenserNoteBy: { select: { email: true, role: true } },
    },
  });

  if (!order) return null;

  const pharmacy = order.pharmacy;
  const settings = pharmacy.settings;
  const branch = order.branch;

  const pharmacyName = settings?.displayName?.trim() || pharmacy.name;
  const pharmacyPhone = settings?.phone?.trim() || pharmacy.phone || "";
  const pharmacyEmail = settings?.email?.trim() || pharmacy.email || "";
  const pharmacyWhatsapp =
    settings?.whatsapp?.trim() || pharmacy.whatsapp || pharmacyPhone;
  const pharmacyAddress = [
    settings?.addressLine1?.trim(),
    settings?.addressLine2?.trim(),
    settings?.city?.trim() || pharmacy.city,
    settings?.state?.trim() || pharmacy.county,
    settings?.zip?.trim(),
    settings?.country?.trim() || pharmacy.country,
  ]
    .filter(Boolean)
    .join(", ");

  const latestPayment = order.payments[0];
  const customerProfile = order.customer;

  const dateStr = formatDate(order.createdAt).replace(/[^0-9]/g, "");
  const receiptNumber = `REC-${dateStr}-${order.id.slice(0, 8).toUpperCase()}`;

  const items: PharmacyReceiptItem[] = order.items.map((item) => {
    const med = item.medication;
    const master = med?.medicationMaster;

    // Resolve lot and expiry from allocations or active lot
    let batchNumber: string | null = null;
    let expiryDate: string | null = null;

    if (item.allocations && item.allocations.length > 0) {
      batchNumber = item.allocations.map((a) => a.inventoryLot.batchNumber).join(", ");
      expiryDate = item.allocations[0]?.inventoryLot.expiryDate
        ? formatDate(item.allocations[0].inventoryLot.expiryDate)
        : null;
    } else if (med?.lots && med.lots.length > 0) {
      batchNumber = med.lots[0].batchNumber;
      expiryDate = formatDate(med.lots[0].expiryDate);
    }

    const unitPrice = Number(item.unitPrice);
    const discount = Number(item.discountApplied);
    const totalPrice = Math.max(0, unitPrice * item.quantity - discount);

    return {
      id: item.id,
      name: item.name,
      genericName: master?.genericName || null,
      strengthDisplay: master?.strengthDisplay || null,
      dosageForm: master?.dosageForm?.value || null,
      batchNumber,
      expiryDate,
      quantity: item.quantity,
      billingUnit: String(item.billingUnit || "UNIT"),
      unitPrice,
      discountApplied: discount,
      totalPrice,
      dosageInstructions: master?.dosage || null,
    };
  });

  const paymentMethod = latestPayment?.provider
    ? latestPayment.provider.toUpperCase()
    : order.status === "waived"
      ? "WAIVED"
      : "CASH";

  const mpesaReceipt =
    latestPayment?.providerRef?.startsWith("CASH-") ||
    latestPayment?.providerRef?.startsWith("WAIVE-")
      ? null
      : latestPayment?.providerRef || null;

  // Dispenser info
  let dispenserInfo: { name: string; email: string; role: string } | null = null;
  if (order.prescriptionFill?.dispensedBy) {
    dispenserInfo = {
      name: order.prescriptionFill.dispensedBy.email
        .split("@")[0]
        .replace(".", " ")
        .toUpperCase(),
      email: order.prescriptionFill.dispensedBy.email,
      role: order.prescriptionFill.dispensedBy.role,
    };
  } else if (order.dispenserNoteBy) {
    dispenserInfo = {
      name: order.dispenserNoteBy.email.split("@")[0].replace(".", " ").toUpperCase(),
      email: order.dispenserNoteBy.email,
      role: order.dispenserNoteBy.role,
    };
  }

  const prescriber = order.prescriptionFill?.prescription?.prescriber || null;

  return {
    receiptNumber,
    orderId: order.id,
    fillId: order.prescriptionFill?.id || null,
    orderType: order.type ? order.type.replace(/_/g, " ") : "PHARMACY SALE",
    status: order.status,
    createdAt: formatDateTime(order.createdAt),
    paidAt: order.paidAt ? formatDateTime(order.paidAt) : null,
    dispatchedAt: order.dispatchedAt ? formatDateTime(order.dispatchedAt) : null,
    pharmacy: {
      name: pharmacyName,
      branch: branch?.name || "",
      phone: branch?.phone || pharmacyPhone,
      email: branch?.email || pharmacyEmail,
      whatsapp: pharmacyWhatsapp,
      address:
        [branch?.addressLine1, branch?.city, branch?.county].filter(Boolean).join(", ") ||
        pharmacyAddress,
      taxPin: pharmacy.kraPin || "",
    },
    customer: {
      id: customerProfile?.id || null,
      fullName: customerProfile?.fullName || order.guestName || "Walk-in Customer",
      phone: customerProfile?.phone || order.guestPhone || null,
      email: customerProfile?.user?.email || order.guestEmail || null,
      address:
        [customerProfile?.addressLine1, customerProfile?.city].filter(Boolean).join(", ") ||
        null,
      isWalkIn: !customerProfile,
    },
    items,
    subtotal: Number(order.subtotal || order.total),
    discountTotal: Number(order.discountTotal || 0),
    taxTotal: Number(order.taxTotal || 0),
    netTotal: Number(order.netTotal || order.total),
    amountPaid: Number(
      order.amountPaid ||
        (order.status === "paid" || order.status === "fulfilled" ? order.total : 0),
    ),
    amountDue: Number(order.amountDue || 0),
    currency: order.currency || "KES",
    paymentMethod,
    paymentRef: latestPayment?.providerRef || null,
    mpesaReceipt,
    dispensedBy: dispenserInfo,
    dispenserNote: order.dispenserNote,
    prescriber,
  };
}

/**
 * Send official electronic dispensing receipt via Email.
 */
export async function sendReceiptEmail(
  orderId: string,
  recipientEmail?: string,
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const receipt = await getReceiptData(orderId);
  if (!receipt) return { ok: false, error: "Order not found." };

  const targetEmail = recipientEmail || receipt.customer.email;
  if (!targetEmail) {
    return { ok: false, error: "No customer email available to send receipt." };
  }

  const emailBodyMarkdown = `
# Official Dispensing & Sales Receipt

**Receipt No:** \`${receipt.receiptNumber}\`  
**Date:** ${receipt.createdAt}  
**Customer / Patient:** ${receipt.customer.fullName}  
${receipt.prescriber ? `**Prescriber:** ${receipt.prescriber}  ` : ""}
${receipt.dispensedBy ? `**Dispensed By:** ${receipt.dispensedBy.name} (${receipt.dispensedBy.role})  ` : ""}

---

### Items Dispensed:
${receipt.items.map((i) => `- **${i.name}** × ${i.quantity} ${i.billingUnit} — **KES ${i.totalPrice.toLocaleString()}**${i.batchNumber ? ` (Batch: ${i.batchNumber})` : ""}`).join("\n")}

---

**Subtotal:** KES ${receipt.subtotal.toLocaleString()}  
${receipt.discountTotal > 0 ? `**Discount:** -KES ${receipt.discountTotal.toLocaleString()}  \n` : ""}
**Total Paid:** **KES ${receipt.amountPaid.toLocaleString()}** (${receipt.paymentMethod}${receipt.mpesaReceipt ? ` - Ref: ${receipt.mpesaReceipt}` : ""})

${receipt.dispenserNote ? `\n> **Pharmacist Note / Counselling:**\n> ${receipt.dispenserNote}\n` : ""}

---

**${receipt.pharmacy.name}**  
${receipt.pharmacy.branch ? `${receipt.pharmacy.branch}  \n` : ""}${receipt.pharmacy.address ? `${receipt.pharmacy.address}  \n` : ""}${receipt.pharmacy.phone ? `Helpline: ${receipt.pharmacy.phone}` : ""}${receipt.pharmacy.whatsapp ? ` | WhatsApp: ${receipt.pharmacy.whatsapp}` : ""}
`;

  try {
    const res = await sendDelivery({
      channel: "email",
      purpose: "transactional",
      recipient: { email: targetEmail },
      subject: `Receipt ${receipt.receiptNumber} — ${receipt.pharmacy.name}`,
      body: emailBodyMarkdown,
    });

    if (res.status === "failed") {
      return { ok: false, error: res.error || "Email delivery failed." };
    }

    return { ok: true, message: `Receipt emailed to ${targetEmail}.` };
  } catch (err) {
    console.error("[sendReceiptEmail] Error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to send email." };
  }
}

/**
 * Send concise SMS or WhatsApp receipt notification.
 */
export async function sendReceiptSmsOrWhatsapp(
  orderId: string,
  recipientPhone?: string,
  channel: "sms" | "whatsapp" = "sms",
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const receipt = await getReceiptData(orderId);
  if (!receipt) return { ok: false, error: "Order not found." };

  const targetPhone = recipientPhone || receipt.customer.phone;
  if (!targetPhone) {
    return { ok: false, error: "No customer phone number available." };
  }

  const itemsSummary = receipt.items.map((i) => `${i.quantity}x ${i.name}`).join(", ");
  const textBody =
    `Receipt from ${receipt.pharmacy.name}\n` +
    `No: ${receipt.receiptNumber}\n` +
    `Items: ${itemsSummary}\n` +
    `Total: KES ${receipt.netTotal.toLocaleString()} (${receipt.paymentMethod}${receipt.mpesaReceipt ? ` Ref: ${receipt.mpesaReceipt}` : ""})\n` +
    `Thank you for trusting us with your health.${receipt.pharmacy.phone ? ` Help: ${receipt.pharmacy.phone}` : ""}`;

  try {
    const res = await sendDelivery({
      channel,
      purpose: "transactional",
      recipient: { phone: targetPhone },
      body: textBody,
    });

    if (res.status === "failed") {
      return { ok: false, error: res.error || `${channel.toUpperCase()} delivery failed.` };
    }

    return { ok: true, message: `Receipt sent via ${channel.toUpperCase()} to ${targetPhone}.` };
  } catch (err) {
    console.error("[sendReceiptSmsOrWhatsapp] Error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to send SMS/WhatsApp." };
  }
}

import "server-only";

import { prisma } from "@/app/lib/db";
import { formatDateTime, formatDate } from "@/app/lib/time";
import { addTimelineEvent, writeAuditLog } from "@/app/lib/auth";

export type DispensingRecord = {
  id: string;
  orderId?: string | null;
  fillId?: string | null;
  prescriptionId?: string | null;
  rxReference?: string | null;
  date: string;
  rawDate: Date;
  
  // Patient Details
  patientName: string;
  patientId?: string | null;
  patientPhone?: string | null;
  patientEmail?: string | null;
  isWalkIn: boolean;

  // Medicine Details
  medicineName: string;
  genericName: string;
  strengthDisplay?: string | null;
  dosageForm?: string | null;
  quantity: number;
  billingUnit: string;
  batchNumber?: string | null;
  expiryDate?: string | null;

  // Prescriber & Directions
  prescriber?: string | null;
  prescriberLicense?: string | null;
  dosageInstructions?: string | null;
  schedule?: string | null;

  // Clinical & Controlled Drug
  isControlled: boolean;
  controlledSchedule?: string | null;
  dispenserNote?: string | null;

  // Substitution Details
  isSubstituted: boolean;
  originalMedicineName?: string | null;
  substitutionReason?: string | null;

  // Dispenser / Staff Details
  dispensedByName: string;
  dispensedByEmail?: string | null;
  dispensedByRole?: string | null;
  dispensedById?: string | null;

  // Financials
  unitPrice: number;
  totalPrice: number;
  paymentMethod: string;
  paymentStatus: string;
  paymentRef?: string | null;
};

export type DispensingRegisterFilter = {
  page?: number;
  pageSize?: number;
  q?: string;
  startDate?: string;
  endDate?: string;
  customerId?: string;
  dispenserId?: string;
  controlledOnly?: boolean;
  substitutionsOnly?: boolean;
};

export type DispensingRegisterResult = {
  records: DispensingRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  metrics: {
    totalDispensed: number;
    rxFillsCount: number;
    controlledCount: number;
    substitutionsCount: number;
    totalValueKes: number;
  };
};

/**
 * Fetch regulatory dispensing register unifying PrescriptionFills, Orders, and Refill dispatches.
 */
export async function getDispensingRegister(
  filters: DispensingRegisterFilter = {}
): Promise<DispensingRegisterResult> {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(5, filters.pageSize || 25));

  const start = filters.startDate ? new Date(filters.startDate) : undefined;
  const end = filters.endDate ? new Date(filters.endDate + "T23:59:59.999Z") : undefined;

  // 1. Fetch Prescription Fills
  const fillsWhere: any = {
    ...(start || end
      ? {
          createdAt: {
            ...(start ? { gte: start } : {}),
            ...(end ? { lte: end } : {}),
          },
        }
      : {}),
    ...(filters.dispenserId ? { dispensedById: filters.dispenserId } : {}),
  };

  const [fills, allFillsForMetrics, orders, allOrdersForMetrics] = await Promise.all([
    prisma.prescriptionFill.findMany({
      where: fillsWhere,
      include: {
        prescription: {
          include: {
            customer: { include: { user: { select: { email: true } } } },
            medication: {
              include: {
                medicationMaster: {
                  include: { dosageForm: true },
                },
                lots: { where: { active: true }, take: 1 },
              },
            },
          },
        },
        order: {
          include: {
            payments: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
        dispensedBy: { select: { id: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.prescriptionFill.findMany({
      where: fillsWhere,
      select: {
        id: true,
        netAmount: true,
        prescription: {
          select: {
            medication: {
              select: {
                medicationMaster: {
                  select: { controlledDrug: true },
                },
              },
            },
          },
        },
      },
    }),
    // 2. Fetch OTC and Counter Orders (fulfilled / dispatched)
    prisma.order.findMany({
      where: {
        status: { in: ["paid", "fulfilled"] },
        dispatchedAt: { not: null },
        ...(start || end
          ? {
              createdAt: {
                ...(start ? { gte: start } : {}),
                ...(end ? { lte: end } : {}),
              },
            }
          : {}),
        ...(filters.dispenserId ? { dispatchedById: filters.dispenserId } : {}),
      },
      include: {
        customer: { include: { user: { select: { email: true } } } },
        items: {
          include: {
            medication: {
              include: {
                medicationMaster: {
                  include: { dosageForm: true },
                },
                lots: { where: { active: true }, take: 1 },
              },
            },
            allocations: { include: { inventoryLot: true } },
          },
        },
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
        dispenserNoteBy: { select: { id: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.order.findMany({
      where: {
        status: { in: ["paid", "fulfilled"] },
        dispatchedAt: { not: null },
        ...(start || end
          ? {
              createdAt: {
                ...(start ? { gte: start } : {}),
                ...(end ? { lte: end } : {}),
              },
            }
          : {}),
      },
      select: {
        id: true,
        netTotal: true,
        total: true,
      },
    }),
  ]);

  const rawRecords: DispensingRecord[] = [];

  // Convert PrescriptionFills
  for (const fill of fills) {
    const rx = fill.prescription;
    const med = rx.medication;
    const master = med?.medicationMaster;
    const cust = rx.customer;

    const isControlled = Boolean(master?.controlledDrug);
    const schedule = master?.controlledDrugSchedule || null;

    let batch = null;
    let exp = null;
    if (med?.lots && med.lots.length > 0) {
      batch = med.lots[0].batchNumber;
      exp = formatDate(med.lots[0].expiryDate);
    }

    const dispensedByEmail = fill.dispensedBy?.email || null;
    const dispensedByName = dispensedByEmail
      ? dispensedByEmail.split("@")[0].replace(".", " ").toUpperCase()
      : "Pharmacy Staff";

    const payment = fill.order?.payments[0];

    rawRecords.push({
      id: fill.id,
      fillId: fill.id,
      orderId: fill.orderId,
      prescriptionId: rx.id,
      rxReference: rx.rxReference || `RX-${rx.id.slice(0, 8).toUpperCase()}`,
      date: formatDateTime(fill.createdAt),
      rawDate: fill.createdAt,
      patientName: cust.fullName,
      patientId: cust.id,
      patientPhone: cust.phone,
      patientEmail: cust.user.email,
      isWalkIn: false,
      medicineName: fill.medicationName || master?.name || rx.medicineName,
      genericName: master?.genericName || rx.medicineName,
      strengthDisplay: master?.strengthDisplay || null,
      dosageForm: master?.dosageForm?.value || null,
      quantity: fill.quantity,
      billingUnit: String(fill.billingUnit || "UNIT"),
      batchNumber: batch,
      expiryDate: exp,
      prescriber: rx.prescriber || "Licensed Prescriber",
      prescriberLicense: "KMPDC-REG",
      dosageInstructions: rx.dosage || rx.schedule || "As directed",
      schedule: rx.schedule,
      isControlled,
      controlledSchedule: schedule,
      dispenserNote: fill.notes,
      isSubstituted: Boolean(fill.medicationName && rx.medicineName && fill.medicationName !== rx.medicineName),
      originalMedicineName: rx.medicineName,
      substitutionReason: fill.notes?.includes("Substituted") ? fill.notes : null,
      dispensedByName,
      dispensedByEmail,
      dispensedByRole: fill.dispensedBy?.role || "pharmacist",
      dispensedById: fill.dispensedById,
      unitPrice: Number(fill.unitPriceSnapshot),
      totalPrice: Number(fill.netAmount),
      paymentMethod: payment?.provider?.toUpperCase() || "CASH",
      paymentStatus: payment?.status || "completed",
      paymentRef: payment?.providerRef,
    });
  }

  // Convert Dispatched Orders (excluding orders that already represent a PrescriptionFill)
  const existingFillOrderIds = new Set(fills.map((f) => f.orderId).filter(Boolean));

  for (const order of orders) {
    if (order.id && existingFillOrderIds.has(order.id)) continue;

    const cust = order.customer;
    const payment = order.payments[0];
    const dispensedByEmail = order.dispenserNoteBy?.email || null;
    const dispensedByName = dispensedByEmail
      ? dispensedByEmail.split("@")[0].replace(".", " ").toUpperCase()
      : "Pharmacy Staff";

    for (const item of order.items) {
      const med = item.medication;
      const master = med?.medicationMaster;
      const isControlled = Boolean(master?.controlledDrug);

      let batch = null;
      let exp = null;
      if (item.allocations && item.allocations.length > 0) {
        batch = item.allocations.map((a) => a.inventoryLot.batchNumber).join(", ");
        exp = formatDate(item.allocations[0].inventoryLot.expiryDate);
      } else if (med?.lots && med.lots.length > 0) {
        batch = med.lots[0].batchNumber;
        exp = formatDate(med.lots[0].expiryDate);
      }

      rawRecords.push({
        id: `${order.id}-${item.id}`,
        orderId: order.id,
        date: formatDateTime(order.dispatchedAt || order.createdAt),
        rawDate: order.dispatchedAt || order.createdAt,
        patientName: cust?.fullName || order.guestName || "Walk-in Customer",
        patientId: cust?.id || null,
        patientPhone: cust?.phone || order.guestPhone || null,
        patientEmail: cust?.user?.email || order.guestEmail || null,
        isWalkIn: !cust,
        medicineName: item.name,
        genericName: master?.genericName || item.name,
        strengthDisplay: master?.strengthDisplay || null,
        dosageForm: master?.dosageForm?.value || null,
        quantity: item.quantity,
        billingUnit: String(item.billingUnit || "UNIT"),
        batchNumber: batch,
        expiryDate: exp,
        prescriber: null,
        dosageInstructions: master?.dosage || null,
        isControlled,
        controlledSchedule: master?.controlledDrugSchedule || null,
        dispenserNote: order.dispenserNote,
        isSubstituted: false,
        dispensedByName,
        dispensedByEmail,
        dispensedByRole: order.dispenserNoteBy?.role || "staff",
        dispensedById: order.dispatchedById,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.netAmount || (Number(item.unitPrice) * item.quantity)),
        paymentMethod: payment?.provider?.toUpperCase() || (order.status === "waived" ? "WAIVED" : "CASH"),
        paymentStatus: payment?.status || "completed",
        paymentRef: payment?.providerRef,
      });
    }
  }

  // Filter in memory for refined queries
  let filtered = rawRecords;

  if (filters.q && filters.q.trim()) {
    const qLower = filters.q.toLowerCase().trim();
    filtered = filtered.filter(
      (r) =>
        r.patientName.toLowerCase().includes(qLower) ||
        r.medicineName.toLowerCase().includes(qLower) ||
        r.genericName.toLowerCase().includes(qLower) ||
        (r.rxReference && r.rxReference.toLowerCase().includes(qLower)) ||
        (r.batchNumber && r.batchNumber.toLowerCase().includes(qLower)) ||
        (r.prescriber && r.prescriber.toLowerCase().includes(qLower))
    );
  }

  if (filters.controlledOnly) {
    filtered = filtered.filter((r) => r.isControlled);
  }

  if (filters.substitutionsOnly) {
    filtered = filtered.filter((r) => r.isSubstituted);
  }

  if (filters.customerId) {
    filtered = filtered.filter((r) => r.patientId === filters.customerId);
  }

  // Sort by date descending
  filtered.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const pagedRecords = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Compute metrics
  const controlledCount = filtered.filter((r) => r.isControlled).length;
  const substitutionsCount = filtered.filter((r) => r.isSubstituted).length;
  const rxFillsCount = filtered.filter((r) => Boolean(r.prescriptionId)).length;
  const totalValueKes = filtered.reduce((sum, r) => sum + r.totalPrice, 0);

  return {
    records: pagedRecords,
    total,
    page,
    pageSize,
    totalPages,
    metrics: {
      totalDispensed: total,
      rxFillsCount,
      controlledCount,
      substitutionsCount,
      totalValueKes,
    },
  };
}

/**
 * Generate CSV export of the Dispensing Register for regulatory audits (PPB Kenya).
 */
export async function exportDispensingRegisterCsv(
  filters: DispensingRegisterFilter = {}
): Promise<string> {
  const result = await getDispensingRegister({
    ...filters,
    page: 1,
    pageSize: 5000, // Export up to 5000 records
  });

  const headers = [
    "Dispensing Date",
    "Receipt / Ref",
    "Rx Reference",
    "Patient Name",
    "Patient Phone",
    "Patient Email",
    "Medicine Dispensed",
    "Generic Name",
    "Strength / Form",
    "Quantity",
    "Unit",
    "Batch / Lot No",
    "Expiry Date",
    "Prescriber",
    "Controlled Substance",
    "Schedule",
    "Generic Substituted",
    "Dispensing Pharmacist",
    "Dispenser Notes",
    "Total Price (KES)",
    "Payment Method",
    "Payment Ref",
  ];

  const escapeCsv = (val: any) => {
    if (val == null) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = result.records.map((r) => [
    escapeCsv(r.date),
    escapeCsv(r.orderId ? `REC-${r.orderId.slice(0, 8).toUpperCase()}` : r.id),
    escapeCsv(r.rxReference || "OTC"),
    escapeCsv(r.patientName),
    escapeCsv(r.patientPhone || "—"),
    escapeCsv(r.patientEmail || "—"),
    escapeCsv(r.medicineName),
    escapeCsv(r.genericName),
    escapeCsv([r.strengthDisplay, r.dosageForm].filter(Boolean).join(" · ") || "—"),
    escapeCsv(r.quantity),
    escapeCsv(r.billingUnit),
    escapeCsv(r.batchNumber || "—"),
    escapeCsv(r.expiryDate || "—"),
    escapeCsv(r.prescriber || "—"),
    escapeCsv(r.isControlled ? "YES" : "NO"),
    escapeCsv(r.controlledSchedule || "—"),
    escapeCsv(r.isSubstituted ? `YES (Orig: ${r.originalMedicineName})` : "NO"),
    escapeCsv(r.dispensedByName),
    escapeCsv(r.dispenserNote || "—"),
    escapeCsv(r.totalPrice.toFixed(2)),
    escapeCsv(r.paymentMethod),
    escapeCsv(r.paymentRef || "—"),
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Execute legal pharmacist generic / brand substitution for a prescription.
 */
export async function substitutePrescription(input: {
  prescriptionId: string;
  newMedicationId: string;
  reason: string;
  actorId: string;
}): Promise<{ ok: boolean; message?: string; error?: string }> {
  const rx = await prisma.prescription.findUnique({
    where: { id: input.prescriptionId },
    include: {
      medication: {
        include: { medicationMaster: true },
      },
      customer: true,
    },
  });
  if (!rx) return { ok: false, error: "Prescription not found." };

  const newMed = await prisma.pharmacyInventory.findUnique({
    where: { id: input.newMedicationId },
    include: { medicationMaster: true },
  });
  if (!newMed) return { ok: false, error: "Replacement medication not found." };

  const originalName = rx.medicineName;
  const newName = newMed.medicationMaster.name;
  const newPrice = Number(newMed.price);

  await prisma.prescription.update({
    where: { id: input.prescriptionId },
    data: {
      medicationId: newMed.id,
      medicineName: newName,
      unitPrice: newPrice,
      notes: [
        rx.notes,
        `[Substituted by pharmacist on ${formatDate(new Date())}]: Prescribed "${originalName}" → Dispensed generic "${newName}". Reason: ${input.reason}`,
      ]
        .filter(Boolean)
        .join("\n"),
    },
  });

  await addTimelineEvent(
    rx.customerId,
    input.actorId,
    "generic_substitution",
    "Generic Medication Substituted",
    `Pharmacist substituted "${originalName}" with "${newName}". Reason: ${input.reason}`,
    {
      prescriptionId: rx.id,
      originalMedicine: originalName,
      substitutedMedicine: newName,
      reason: input.reason,
    },
    input.actorId
  );

  await writeAuditLog(input.actorId, "prescription_substituted", "prescription", rx.id, {
    originalMedicine: originalName,
    substitutedMedicine: newName,
    reason: input.reason,
  });

  return {
    ok: true,
    message: `Successfully substituted "${originalName}" with generic "${newName}".`,
  };
}

/**
 * Generate formatted container dispensing label for thermal sticker printing (50x30mm or 70x35mm).
 */
export function generateDispensingLabel(input: {
  patientName: string;
  medicineName: string;
  strengthDisplay?: string | null;
  dosageInstructions: string;
  auxiliaryWarnings?: string[];
  batchNumber?: string | null;
  expiryDate?: string | null;
  quantity: number;
  billingUnit: string;
  prescriber?: string | null;
  dispensedDate: string;
  dispenserName: string;
  pharmacyName: string;
  pharmacyPhone: string;
}) {
  return {
    pharmacyHeader: input.pharmacyName,
    pharmacyContact: input.pharmacyPhone,
    patientName: input.patientName,
    date: input.dispensedDate,
    drugLine: `${input.medicineName} ${input.strengthDisplay || ""}`.trim(),
    directions: input.dosageInstructions,
    warnings: input.auxiliaryWarnings || ["Keep out of reach of children."],
    meta: `Qty: ${input.quantity} ${input.billingUnit} | Lot: ${input.batchNumber || "N/A"}${input.expiryDate ? ` | Exp: ${input.expiryDate}` : ""}`,
    prescriberLine: input.prescriber ? `Dr: ${input.prescriber}` : null,
    dispenserLine: `Dispensed by: ${input.dispenserName}`,
  };
}

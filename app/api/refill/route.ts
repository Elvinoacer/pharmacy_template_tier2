import { acceptsCareRequests } from "@/app/lib/services/care-request-availability";
import { medicineDisplayName } from "@/app/lib/prescription-discovery";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import {
  findPharmacyBySlug,
  isActiveListed,
  withPharmacy,
  getTenant,
} from "@/app/lib/tenant";
import { findAvailableInventory } from "@/app/lib/services/available-inventory";
import { createRefillRequest } from "@/app/lib/services/crm";
import { checkRateLimitAsync } from "@/app/lib/rate-limit";
import { formatMpesaPhone } from "@/app/lib/services/daraja";
import { createRefillTrackingToken } from "@/app/lib/refill-tracking";

const RefillSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(9).max(24),
  medicine: z.string().trim().min(2).max(1500),
  pickupDate: z.string().trim().min(8).max(32),
  rxReference: z.string().trim().max(80).optional(),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  pickupPreference: z.enum(["pickup", "delivery"]),
  preferredTime: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(1500).optional(),
  prescriptionPhoto: z.string().optional(),
});

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

function publicReference(id: string) {
  return `RF-${id.replaceAll("-", "").slice(0, 10).toUpperCase()}`;
}

export async function POST(request: Request) {
  const rl = await checkRateLimitAsync(`public-refill:${clientIp(request)}`, {
    limit: 8,
    windowMs: 10 * 60_000,
    failClosed: true,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many refill requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const raw = (await request.json()) as Record<string, unknown>;

    // Honeypot. Do not tell bots why their request was ignored.
    if (raw.website) return NextResponse.json({ ok: true });

    if (raw.inventoryIds !== undefined) {
      const ids = z
        .array(z.string().uuid())
        .min(1)
        .max(12)
        .safeParse(raw.inventoryIds);
      if (!ids.success)
        return NextResponse.json(
          {
            error:
              "Please return to availability and review the medicine listings.",
          },
          { status: 400 },
        );
      const uniqueIds = [...new Set(ids.data)];
      const rows = await findAvailableInventory(uniqueIds);
      if (
        rows.length !== uniqueIds.length ||
        new Set(rows.map((row) => row.pharmacy.id)).size !== 1
      ) {
        return NextResponse.json(
          {
            error:
              "Availability has changed. Return to the medicine search to check the latest stock before sending your request.",
          },
          { status: 409 },
        );
      }
      const pharmacy = rows[0].pharmacy;
      return await withPharmacy(
        pharmacy.id,
        () =>
          submitRefill({
            ...raw,
            medicine: rows.map((row) => medicineDisplayName(row.medicationMaster.name, row.medicationMaster.strengthDisplay)).join("\n"),
          }),
        pharmacy.slug,
      );
    }
    if (typeof raw.pharmacySlug === "string") {
      const pharmacy = await findPharmacyBySlug(raw.pharmacySlug);
      if (!pharmacy || !isActiveListed(pharmacy)) {
        return NextResponse.json(
          { error: "This pharmacy is no longer accepting public requests." },
          { status: 409 },
        );
      }
      return await withPharmacy(
        pharmacy.id,
        () => submitRefill(raw),
        pharmacy.slug,
      );
    }
    return NextResponse.json({ error: "Open an available medicine listing to continue your request." }, { status: 409 });
  } catch (err) {
    console.error("[refill]", err instanceof Error ? err.name : "unknown");
    if (err instanceof SyntaxError)
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    return NextResponse.json(
      { error: "Could not submit refill request" },
      { status: 500 },
    );
  }
}

async function submitRefill(raw: Record<string, unknown>) {
  const tenant = await getTenant();
  if (!tenant.pharmacyId || tenant.bypass) {
    return NextResponse.json(
      { error: "Find an available medicine before submitting your request" },
      { status: 409 },
    );
  }

  if (!(await acceptsCareRequests(tenant.pharmacyId))) {
    return NextResponse.json({ error: "This pharmacy is no longer accepting requests." }, { status: 409 });
  }

  const session = await getSessionUser();
  const parsed = RefillSchema.safeParse({
    fullName: raw.fullName,
    phone: raw.phone,
    medicine: raw.medicine ?? raw.medicineName,
    pickupDate: raw.pickupDate ?? raw.preferredDate,
    rxReference: raw.rxNumber ?? raw.rxReference,
    email: raw.email ?? session?.email ?? "",
    pickupPreference:
      raw.delivery === "yes" || raw.pickupPreference === "delivery"
        ? "delivery"
        : "pickup",
    preferredTime: raw.preferredTime,
    notes: raw.notes,
    prescriptionPhoto: typeof raw.prescriptionPhoto === "string" ? raw.prescriptionPhoto : undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "validation_failed",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const phone = formatMpesaPhone(parsed.data.phone);
  if (!/^254\d{9}$/.test(phone)) {
    return NextResponse.json(
      {
        error: "validation_failed",
        fields: { phone: ["Enter a valid Kenyan phone number."] },
      },
      { status: 400 },
    );
  }

  const preferredDate = new Date(`${parsed.data.pickupDate}T00:00:00`);
  if (Number.isNaN(preferredDate.getTime())) {
    return NextResponse.json(
      {
        error: "validation_failed",
        fields: { pickupDate: ["Enter a valid pickup date."] },
      },
      { status: 400 },
    );
  }
  const earliest = new Date();
  earliest.setHours(0, 0, 0, 0);
  if (preferredDate < earliest) {
    return NextResponse.json(
      {
        error: "validation_failed",
        fields: { pickupDate: ["Pickup date cannot be in the past."] },
      },
      { status: 400 },
    );
  }

  // A double click, browser retry, or impatient re-submit should not create a
  // second operational task for staff. Deduplicate the same pharmacy/phone/
  // medicine within a short window and return the original tracking reference.
  const duplicateCutoff = new Date(Date.now() - 15 * 60_000);
  const duplicate = await prisma.refillRequest.findFirst({
    where: {
      pharmacyId: tenant.pharmacyId,
      phone,
      medicineName: { equals: parsed.data.medicine, mode: "insensitive" },
      status: { not: "cancelled" },
      createdAt: { gte: duplicateCutoff },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      reference: publicReference(duplicate.id),
      trackingToken: createRefillTrackingToken(duplicate.id, tenant.pharmacyId),
    });
  }

  let prescriptionId: string | undefined = undefined;
  if (parsed.data.prescriptionPhoto) {
    let targetCustomerId = session?.customerId ?? null;
    if (!targetCustomerId) {
      const byPhone = await prisma.customerProfile.findFirst({
        where: { phone: { contains: phone.slice(-9) } },
        select: { id: true },
      });
      if (byPhone) {
        targetCustomerId = byPhone.id;
      } else {
        const u = await prisma.user.create({
          data: {
            email: parsed.data.email && parsed.data.email.length > 3 ? parsed.data.email : `guest-${Date.now()}@pharmacy.internal`,
            role: "customer",
            emailVerified: false,
          },
        });
        const prof = await prisma.customerProfile.create({
          data: {
            userId: u.id,
            fullName: parsed.data.fullName,
            phone,
          },
        });
        targetCustomerId = prof.id;
      }
    }

    const { PrescriptionIntakeChannel, PrescriptionLifecycleStatus } = await import(
      "@/app/generated/prisma/enums"
    );
    const createdRx = await prisma.prescription.create({
      data: {
        pharmacyId: tenant.pharmacyId,
        customerId: targetCustomerId,
        medicineName: parsed.data.medicine,
        rxReference: parsed.data.rxReference || `RX-${Date.now().toString(36).toUpperCase()}`,
        attachmentUrls: [parsed.data.prescriptionPhoto],
        intakeChannel: PrescriptionIntakeChannel.patient_upload,
        lifecycleStatus: PrescriptionLifecycleStatus.received,
        notes: parsed.data.notes || null,
        status: "active",
      },
    });
    prescriptionId = createdRx.id;
  }

  const refill = await createRefillRequest({
    customerId: session?.customerId ?? null,
    prescriptionId,
    medicineName: parsed.data.medicine,
    rxReference: parsed.data.rxReference || undefined,
    customerName: parsed.data.fullName,
    phone,
    email: parsed.data.email || undefined,
    pickupPreference: parsed.data.pickupPreference,
    preferredDate: parsed.data.pickupDate,
    preferredTime: parsed.data.preferredTime || undefined,
    notes: parsed.data.notes || undefined,
    source: session?.customerId ? "portal" : "website",
  });

  return NextResponse.json({
    ok: true,
    duplicate: false,
    reference: publicReference(refill.id),
    trackingToken: createRefillTrackingToken(refill.id, tenant.pharmacyId),
  });
}

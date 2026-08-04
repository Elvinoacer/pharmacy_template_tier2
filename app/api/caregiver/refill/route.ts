import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { requireCanRequestRefills } from "@/app/lib/services/caregiver-permissions";
import { createRefillRequest } from "@/app/lib/services/crm";
import { addTimelineEvent, writeAuditLog } from "@/app/lib/auth";

export const runtime = "nodejs";

const Body = z.object({
  customerId: z.string().uuid(),
  prescriptionId: z.string().uuid(),
  pickupPreference: z.enum(["pickup", "delivery"]).default("pickup"),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Submit a refill request on behalf of a patient.
 *
 * The caregiver must:
 *   - Be logged in
 *   - Have an active caregiver link to the patient
 *   - Have `canRequestRefills` granted by the patient
 *
 * The refill enters the same workflow as if the patient submitted it. The
 * caregiver never approves the refill.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  let link;
  try {
    link = await requireCanRequestRefills(user, parsed.customerId);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "forbidden" },
      { status: 403 },
    );
  }

  // Verify the prescription belongs to the patient and is active.
  const rx = await prisma.prescription.findFirst({
    where: {
      id: parsed.prescriptionId,
      customerId: parsed.customerId,
      status: "active",
    },
  });
  if (!rx) {
    return NextResponse.json({ error: "prescription_not_found" }, { status: 404 });
  }
  if ((rx.refillsRemaining ?? 0) <= 0) {
    return NextResponse.json(
      { error: "This prescription has no refills remaining. The patient should contact their doctor for a renewal." },
      { status: 400 },
    );
  }

  // Submit the refill — uses the same createRefillRequest helper as the patient portal.
  const refill = await createRefillRequest({
    customerId: parsed.customerId,
    medicineName: rx.medicineName,
    rxReference: rx.rxReference || undefined,
    customerName: link.customer.fullName,
    phone: link.customer.phone || undefined,
    email: link.customer.user.email,
    pickupPreference: parsed.pickupPreference,
    preferredDate: parsed.preferredDate,
    preferredTime: parsed.preferredTime,
    notes: parsed.notes ? `[Caregiver ${link.caregiverName}] ${parsed.notes}` : `[Submitted by caregiver ${link.caregiverName}]`,
    prescriptionId: rx.id,
    source: "portal",
  });

  await addTimelineEvent(
    parsed.customerId,
    user.id,
    "caregiver_refill_requested",
    "Caregiver requested refill",
    `${link.caregiverName} requested a refill for ${rx.medicineName} on behalf of ${link.customer.fullName}.`,
    { refillId: refill.id, prescriptionId: rx.id, caregiverId: link.id },
    user.id,
  );

  await writeAuditLog(user.id, "caregiver_refill_requested", "refill_request", refill.id, {
    customerId: parsed.customerId,
    prescriptionId: rx.id,
    caregiverId: link.id,
  });

  return NextResponse.json({ ok: true, refillId: refill.id });
}

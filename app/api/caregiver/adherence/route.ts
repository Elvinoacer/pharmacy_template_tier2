import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, addTimelineEvent, writeAuditLog } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { requireCanLogAdherence } from "@/app/lib/services/caregiver-permissions";
import { logDose, markReminderAnswered } from "@/app/lib/services/adherence";

export const runtime = "nodejs";

const Body = z.object({
  customerId: z.string().uuid(),
  prescriptionId: z.string().uuid(),
  status: z.enum(["taken", "missed", "skipped", "late"]),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  scheduleId: z.string().uuid().nullable().optional(),
  reminderId: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
});

/**
 * Log a medication dose on behalf of a patient.
 *
 * The caregiver must:
 *   - Be logged in
 *   - Have an active caregiver link to the patient
 *   - Have `canLogAdherence` granted by the patient
 *
 * Writes a DoseLog (granular) and updates the PrescriptionAdherence summary.
 * If a reminderId is provided, the reminder is marked as answered.
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
    link = await requireCanLogAdherence(user, parsed.customerId);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "forbidden" },
      { status: 403 },
    );
  }

  // Verify the prescription belongs to the patient.
  const rx = await prisma.prescription.findFirst({
    where: { id: parsed.prescriptionId, customerId: parsed.customerId },
  });
  if (!rx) {
    return NextResponse.json({ error: "prescription_not_found" }, { status: 404 });
  }

  const scheduledDate = parsed.scheduledDate
    ? new Date(parsed.scheduledDate + "T00:00:00Z")
    : undefined;

  const result = await logDose({
    customerId: parsed.customerId,
    prescriptionId: parsed.prescriptionId,
    status: parsed.status,
    scheduledDate,
    scheduledTime: parsed.scheduledTime ?? null,
    scheduleId: parsed.scheduleId ?? null,
    notes: parsed.notes,
    recordedBy: "caregiver",
    caregiverId: link.id,
  });

  if (parsed.reminderId) {
    await markReminderAnswered(parsed.reminderId);
  }

  await addTimelineEvent(
    parsed.customerId,
    user.id,
    "caregiver_adherence_logged",
    "Caregiver logged dose",
    `${link.caregiverName} logged ${rx.medicineName} as ${parsed.status} on behalf of ${link.customer.fullName}.`,
    { doseLogId: result.doseLogId, prescriptionId: rx.id, status: parsed.status },
    user.id,
  );

  await writeAuditLog(user.id, "caregiver_adherence_logged", "dose_log", result.doseLogId, {
    customerId: parsed.customerId,
    prescriptionId: rx.id,
    status: parsed.status,
    caregiverId: link.id,
  });

  return NextResponse.json({ ok: true, doseLogId: result.doseLogId });
}

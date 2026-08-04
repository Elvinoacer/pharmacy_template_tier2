import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { logDose, markReminderAnswered } from "@/app/lib/services/adherence";

export const runtime = "nodejs";

const Body = z.object({
  prescriptionId: z.string().uuid(),
  status: z.enum(["taken", "missed", "skipped", "late"]),
  takenOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  notes: z.string().optional(),
  /// Optional schedule slot time (HH:mm) when tied to a MedicationSchedule row.
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  scheduleId: z.string().uuid().nullable().optional(),
  /// When this log answers a reminder, the reminder is marked "answered".
  reminderId: z.string().uuid().nullable().optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user?.customerId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // Verify the prescription belongs to this customer.
  const rx = await prisma.prescription.findFirst({
    where: { id: parsed.prescriptionId, customerId: user.customerId },
  });
  if (!rx) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Use the unified logDose helper — writes both DoseLog (granular) and
  // PrescriptionAdherence (daily summary).
  const result = await logDose({
    customerId: user.customerId,
    prescriptionId: parsed.prescriptionId,
    status: parsed.status,
    scheduledDate: new Date(parsed.takenOn + "T00:00:00Z"),
    scheduledTime: parsed.scheduledTime ?? null,
    scheduleId: parsed.scheduleId ?? null,
    notes: parsed.notes,
    recordedBy: "customer",
  });

  if (parsed.reminderId) {
    await markReminderAnswered(parsed.reminderId);
  }

  return NextResponse.json({ ok: true, doseLogId: result.doseLogId });
}

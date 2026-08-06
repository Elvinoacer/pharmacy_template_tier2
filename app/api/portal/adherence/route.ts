import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { logDose, markReminderAnswered } from "@/app/lib/services/adherence";
import { formatTime, toLocalDateInputValue } from "@/app/lib/time";

export const runtime = "nodejs";

const Body = z.object({
  prescriptionId: z.string().uuid().optional(),
  status: z.enum(["taken", "missed", "skipped", "late", "snooze"]).optional(),
  takenOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
  notes: z.string().optional(),
  /// Optional schedule slot time (HH:mm) when tied to a MedicationSchedule row.
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  scheduleId: z.string().uuid().nullable().optional(),
  /// When this log answers a reminder, the reminder is marked "answered".
  reminderId: z.string().uuid().nullable().optional(),
  /// Explicit action from notification buttons (snooze re-schedules the reminder).
  action: z.enum(["snooze"]).optional(),
});

const SNOOZE_MINUTES = 10;
/** Hard cap — after this many snoozes the patient must confirm or skip. */
const MAX_SNOOZES = 2;

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

  const isSnooze = parsed.action === "snooze" || parsed.status === "snooze";

  // ── Snooze: re-schedule the same reminder instead of logging a dose ──
  if (isSnooze) {
    if (!parsed.reminderId) {
      return NextResponse.json({ error: "reminder_required_for_snooze" }, { status: 400 });
    }

    const reminder = await prisma.reminder.findFirst({
      where: {
        id: parsed.reminderId,
        customerId: user.customerId,
        type: "medication_dose",
      },
    });
    if (!reminder) {
      return NextResponse.json({ error: "reminder_not_found" }, { status: 404 });
    }

    // Cap snoozes so patients can't loop reminders forever.
    const priorSnoozes = await prisma.adherenceEscalation.count({
      where: { reminderId: reminder.id, action: "snoozed" },
    });
    if (priorSnoozes >= MAX_SNOOZES) {
      return NextResponse.json(
        {
          error: "snooze_limit_reached",
          message: "You've snoozed this dose twice. Please confirm Taken, Late, or Skip.",
          maxSnoozes: MAX_SNOOZES,
        },
        { status: 429 },
      );
    }

    const nextAt = new Date(Date.now() + SNOOZE_MINUTES * 60 * 1000);
    await prisma.reminder.update({
      where: { id: reminder.id },
      data: {
        status: "scheduled",
        scheduledFor: nextAt,
        sentAt: null,
        // Keep title/body so processDueReminders re-fires with the same content.
      },
    });

    // Audit the snooze for the cap + escalation visibility.
    // Titles may be legacy ("Dose 08:00: Med") or luxury ("Evening · Med · 08:00").
    const fromTitle =
      reminder.title.match(/(?:·|Dose)\s*(\d{2}:\d{2})\b/i) ||
      reminder.title.match(/\b(\d{2}:\d{2})\b/);
    const slotTime = fromTitle?.[1] ?? formatTime(reminder.scheduledFor);
    const dateStr = toLocalDateInputValue(reminder.scheduledFor);

    await prisma.adherenceEscalation.create({
      data: {
        prescriptionId: reminder.relatedId || "00000000-0000-0000-0000-000000000000",
        customerId: user.customerId,
        reminderId: reminder.id,
        scheduledDate: new Date(dateStr + "T00:00:00Z"),
        scheduledTime: slotTime,
        step: 1,
        action: "snoozed",
      },
    }).catch(() => null);

    return NextResponse.json({
      ok: true,
      snoozed: true,
      snoozeMinutes: SNOOZE_MINUTES,
      snoozeCount: priorSnoozes + 1,
      maxSnoozes: MAX_SNOOZES,
      nextAt: nextAt.toISOString(),
    });
  }

  if (!parsed.prescriptionId || !parsed.status || !parsed.takenOn) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (parsed.status === "snooze") {
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

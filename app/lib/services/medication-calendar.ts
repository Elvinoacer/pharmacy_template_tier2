import "server-only";

import { prisma } from "@/app/lib/db";
import { PROJECT_TIMEZONE, toLocalDateInputValue, formatTime } from "@/app/lib/time";
import { parseDosageFormula } from "@/app/lib/services/medication-schedule";

export type CalendarDoseSlot = {
  scheduleId?: string;
  prescriptionId: string;
  medicineName: string;
  dosage: string | null;
  timeOfDay: string;
  label?: string | null;
  status: "taken" | "late" | "missed" | "skipped" | "pending" | "unknown";
  recordedBy?: string | null;
  notes?: string | null;
  confirmedAt?: Date | null;
};

export type CalendarRefillEvent = {
  prescriptionId: string;
  medicineName: string;
  rxReference?: string | null;
  type: "refill_due" | "refill_ready" | "refill_pickup";
  status: string;
};

export type CalendarDayData = {
  dateStr: string; // YYYY-MM-DD
  dayOfMonth: number;
  dayOfWeek: number; // 0 (Sun) - 6 (Sat)
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  doses: CalendarDoseSlot[];
  refills: CalendarRefillEvent[];
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  adherencePercentage: number | null; // null if no doses scheduled
};

export type MedicationCalendarMonthView = {
  customerId: string;
  customerName: string;
  year: number;
  month: number; // 1-12
  monthLabel: string;
  days: CalendarDayData[];
  overallMonthAdherence: number;
  totalScheduledMonth: number;
  totalTakenMonth: number;
  totalMissedMonth: number;
};

/**
 * Returns structured monthly calendar data for a patient's medication schedule.
 */
export async function getMedicationCalendarData(
  customerId: string,
  year?: number,
  month?: number, // 1-12
): Promise<MedicationCalendarMonthView | null> {
  const customer = await prisma.customerProfile.findUnique({
    where: { id: customerId },
    select: { id: true, fullName: true },
  });
  if (!customer) return null;

  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month || (now.getMonth() + 1); // 1-indexed

  const monthStartStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
  const monthStart = new Date(`${monthStartStr}T00:00:00Z`);

  // Last day of month
  const lastDayNumber = new Date(targetYear, targetMonth, 0).getDate();
  const monthEndStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(lastDayNumber).padStart(2, "0")}`;
  const monthEnd = new Date(`${monthEndStr}T23:59:59Z`);

  // Fetch active prescriptions with schedules and doseLogs within this month
  const [prescriptions, doseLogs, refillRequests] = await Promise.all([
    prisma.prescription.findMany({
      where: {
        customerId,
        status: { in: ["active", "on_hold"] },
      },
      include: {
        doseSchedule: {
          where: { active: true },
          orderBy: { timeOfDay: "asc" },
        },
      },
    }),
    prisma.doseLog.findMany({
      where: {
        customerId,
        scheduledDate: { gte: monthStart, lte: monthEnd },
      },
      select: {
        prescriptionId: true,
        scheduleId: true,
        scheduledDate: true,
        scheduledTime: true,
        status: true,
        recordedBy: true,
        notes: true,
        confirmedAt: true,
      },
    }),
    prisma.refillRequest.findMany({
      where: {
        customerId,
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      select: {
        id: true,
        prescriptionId: true,
        medicineName: true,
        rxReference: true,
        status: true,
        createdAt: true,
        preferredDate: true,
      },
    }),
  ]);

  const todayStr = toLocalDateInputValue(now);
  const nowTime = formatTime(now);

  const days: CalendarDayData[] = [];
  let totalScheduledMonth = 0;
  let totalTakenMonth = 0;
  let totalMissedMonth = 0;

  for (let d = 1; d <= lastDayNumber; d++) {
    const dateStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayDateObj = new Date(`${dateStr}T00:00:00Z`);
    const dayOfWeek = dayDateObj.getUTCDay();

    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;
    const isFuture = dateStr > todayStr;

    const dailyDoseSlots: CalendarDoseSlot[] = [];

    for (const rx of prescriptions) {
      const rxStartStr = rx.startDate ? toLocalDateInputValue(rx.startDate) : toLocalDateInputValue(rx.createdAt);
      const rxEndStr = rx.endDate ? toLocalDateInputValue(rx.endDate) : null;

      // Skip if prescription hadn't started or already ended
      if (dateStr < rxStartStr) continue;
      if (rxEndStr && dateStr > rxEndStr) continue;

      // Get slots for this prescription
      const slots = rx.doseSchedule.length > 0
        ? rx.doseSchedule.map((s) => ({ scheduleId: s.id, timeOfDay: s.timeOfDay, label: s.label }))
        : parseDosageFormula(rx.dosage, rx.schedule).slots.map((s) => ({ scheduleId: undefined, timeOfDay: s.timeOfDay, label: s.label }));

      for (const slot of slots) {
        // Find existing dose log for this slot on this date
        const matchingLog = doseLogs.find((l) => {
          const lDateStr = toLocalDateInputValue(l.scheduledDate);
          return (
            l.prescriptionId === rx.id &&
            lDateStr === dateStr &&
            (l.scheduledTime === slot.timeOfDay || (!l.scheduledTime && slot.timeOfDay === "08:00"))
          );
        });

        let slotStatus: CalendarDoseSlot["status"] = "pending";
        if (matchingLog) {
          slotStatus = (matchingLog.status as CalendarDoseSlot["status"]) || "taken";
        } else if (isPast) {
          slotStatus = "missed";
        } else if (isToday && slot.timeOfDay <= nowTime) {
          slotStatus = "missed";
        } else {
          slotStatus = "pending";
        }

        dailyDoseSlots.push({
          scheduleId: slot.scheduleId,
          prescriptionId: rx.id,
          medicineName: rx.medicineName,
          dosage: rx.dosage,
          timeOfDay: slot.timeOfDay,
          label: slot.label,
          status: slotStatus,
          recordedBy: matchingLog?.recordedBy,
          notes: matchingLog?.notes,
          confirmedAt: matchingLog?.confirmedAt,
        });
      }
    }

    // Sort doses chronologically
    dailyDoseSlots.sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay));

    // Refill events for this day
    const refills: CalendarRefillEvent[] = [];
    for (const rx of prescriptions) {
      if (rx.nextRefillDue) {
        const refillDueStr = toLocalDateInputValue(rx.nextRefillDue);
        if (refillDueStr === dateStr) {
          refills.push({
            prescriptionId: rx.id,
            medicineName: rx.medicineName,
            rxReference: rx.rxReference,
            type: "refill_due",
            status: "due",
          });
        }
      }
    }

    for (const req of refillRequests) {
      const reqDateStr = req.preferredDate ? toLocalDateInputValue(req.preferredDate) : toLocalDateInputValue(req.createdAt);
      if (reqDateStr === dateStr && req.prescriptionId) {
        refills.push({
          prescriptionId: req.prescriptionId,
          medicineName: req.medicineName,
          rxReference: req.rxReference,
          type: req.status === "ready_for_pickup" ? "refill_ready" : "refill_pickup",
          status: req.status,
        });
      }
    }

    const taken = dailyDoseSlots.filter((s) => s.status === "taken" || s.status === "late").length;
    const missed = dailyDoseSlots.filter((s) => s.status === "missed").length;
    const expected = isFuture ? 0 : dailyDoseSlots.length;
    const dayAdherence = expected > 0 ? Math.round((taken / expected) * 100) : null;

    if (!isFuture) {
      totalScheduledMonth += expected;
      totalTakenMonth += taken;
      totalMissedMonth += missed;
    }

    days.push({
      dateStr,
      dayOfMonth: d,
      dayOfWeek,
      isToday,
      isPast,
      isFuture,
      doses: dailyDoseSlots,
      refills,
      totalDoses: dailyDoseSlots.length,
      takenDoses: taken,
      missedDoses: missed,
      adherencePercentage: dayAdherence,
    });
  }

  const overallMonthAdherence = totalScheduledMonth > 0
    ? Math.min(100, Math.round((totalTakenMonth / totalScheduledMonth) * 100))
    : 100;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return {
    customerId,
    customerName: customer.fullName,
    year: targetYear,
    month: targetMonth,
    monthLabel: `${monthNames[targetMonth - 1]} ${targetYear}`,
    days,
    overallMonthAdherence,
    totalScheduledMonth,
    totalTakenMonth,
    totalMissedMonth,
  };
}

/**
 * Generates an RFC 5545 iCalendar (.ics) file content containing recurring
 * alarms and events for all active prescribed medications.
 */
export async function generateIcsCalendar(customerId: string): Promise<string> {
  const customer = await prisma.customerProfile.findUnique({
    where: { id: customerId },
    include: {
      prescriptions: {
        where: { status: "active" },
        include: { doseSchedule: { where: { active: true } } },
      },
    },
  });

  if (!customer) throw new Error("Customer not found");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aether Pharmacy//Medication Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Medications - ${customer.fullName}`,
    "X-WR-TIMEZONE:Africa/Nairobi",
  ];

  const nowStamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  for (const rx of customer.prescriptions) {
    const slots = rx.doseSchedule.length > 0
      ? rx.doseSchedule.map((s) => ({ timeOfDay: s.timeOfDay, label: s.label }))
      : parseDosageFormula(rx.dosage, rx.schedule).slots.map((s) => ({ timeOfDay: s.timeOfDay, label: s.label }));

    const start = rx.startDate || rx.createdAt;
    const startStr = toLocalDateInputValue(start).replace(/-/g, "");

    for (const slot of slots) {
      const [hh, mm] = slot.timeOfDay.split(":");
      const dtStart = `${startStr}T${hh}${mm}00`;
      const uid = `med-dose-${rx.id}-${slot.timeOfDay.replace(":", "")}@aetherpharmacy.com`;

      const summary = slot.label
        ? `💊 Dose: ${rx.medicineName} (${slot.label})`
        : `💊 Dose: ${rx.medicineName}`;

      const description = [
        `Medication: ${rx.medicineName}`,
        rx.dosage ? `Dosage: ${rx.dosage}` : null,
        rx.prescriber ? `Prescriber: ${rx.prescriber}` : null,
        "Aether Pharmacy Medication Adherence Reminder",
      ].filter(Boolean).join("\\n");

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${nowStamp}`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`RRULE:FREQ=DAILY`);
      lines.push(`SUMMARY:${summary}`);
      lines.push(`DESCRIPTION:${description}`);
      lines.push("BEGIN:VALARM");
      lines.push("TRIGGER:-PT5M");
      lines.push("ACTION:DISPLAY");
      lines.push(`DESCRIPTION:Time to take ${rx.medicineName}`);
      lines.push("END:VALARM");
      lines.push("END:VEVENT");
    }

    // Also add Refill Due event if scheduled
    if (rx.nextRefillDue) {
      const refillDueStr = toLocalDateInputValue(rx.nextRefillDue).replace(/-/g, "");
      const refillUid = `refill-due-${rx.id}@aetherpharmacy.com`;

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${refillUid}`);
      lines.push(`DTSTAMP:${nowStamp}`);
      lines.push(`DTSTART;VALUE=DATE:${refillDueStr}`);
      lines.push(`SUMMARY:🔄 Refill Due: ${rx.medicineName}`);
      lines.push(`DESCRIPTION:Prescription refill due for ${rx.medicineName}. Order via Aether Pharmacy portal.`);
      lines.push("BEGIN:VALARM");
      lines.push("TRIGGER:-P2D"); // 2 days before
      lines.push("ACTION:DISPLAY");
      lines.push(`DESCRIPTION:Refill due soon for ${rx.medicineName}`);
      lines.push("END:VALARM");
      lines.push("END:VEVENT");
    }
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

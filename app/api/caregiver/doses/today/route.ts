import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { getActiveCaregiverLinks } from "@/app/lib/services/caregiver-permissions";
import { getTodaysDosesForCustomer } from "@/app/lib/services/medication-schedule";

export const runtime = "nodejs";

/**
 * Get today's scheduled doses for all patients the caregiver supports.
 * Used by the caregiver dashboard "today's dose checklist" widget.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const links = await getActiveCaregiverLinks(user.id);

  // For each patient, fetch today's doses + flag whether caregiver can log adherence.
  const result = await Promise.all(
    links.map(async (link) => {
      const doses = await getTodaysDosesForCustomer(link.customerId);
      return {
        customerId: link.customerId,
        customerName: link.customer.fullName,
        relationship: link.relationship,
        canLogAdherence: link.canLogAdherence,
        canRequestRefills: link.canRequestRefills,
        canReceivePickupNotifications: link.canReceivePickupNotifications,
        doses,
      };
    }),
  );

  // Also include reminders due in the next 24h for these patients.
  const customerIds = links.map((l) => l.customerId);
  const since = new Date();
  const until = new Date();
  until.setHours(until.getHours() + 24);

  const reminders = customerIds.length
    ? await prisma.reminder.findMany({
        where: {
          customerId: { in: customerIds },
          scheduledFor: { gte: since, lte: until },
          status: { in: ["scheduled", "sent"] },
        },
        include: {
          customer: { select: { fullName: true } },
        },
        orderBy: { scheduledFor: "asc" },
        take: 30,
      })
    : [];

  return NextResponse.json({ patients: result, reminders });
}

import { NextResponse } from "next/server";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { getTenant } from "@/app/lib/tenant";
import { sendDirectRefillReminder } from "@/app/lib/services/refills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const customerId = String(body.customerId || "");
    const prescriptionId = String(body.prescriptionId || "");
    const channel = body.channel || "whatsapp";
    const message = String(body.message || "").trim();
    const notifyCaregivers = body.notifyCaregivers === true;

    if (!customerId || !prescriptionId || !message) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const tenant = await getTenant().catch(() => ({ pharmacyId: null as string | null }));
    const pharmacyId = user.activePharmacyId || tenant.pharmacyId;
    if (!pharmacyId) {
      return NextResponse.json({ error: "no_active_pharmacy" }, { status: 400 });
    }

    const res = await sendDirectRefillReminder({
      customerId,
      prescriptionId,
      channel,
      customSubject: "Clinical Adherence Follow-up from Aether Pharmacy",
      customBody: message,
      actorId: user.id,
    });

    if (notifyCaregivers) {
      const caregivers = await prisma.caregiver.findMany({
        where: { customerId, status: "active" },
        include: { caregiverUser: { select: { id: true } } },
      });
      for (const cg of caregivers) {
        if (cg.caregiverUser?.id) {
          await prisma.notification.create({
            data: {
              userId: cg.caregiverUser.id,
              channel: "in_app",
              type: "refill",
              title: "Patient Refill Follow-up Alert",
              body: `A clinical adherence follow-up was initiated for your dependent's maintenance medication.`,
              status: "delivered",
              sentAt: new Date(),
            },
          }).catch(() => {});
        }
      }
    }

    await prisma.customerNote.create({
      data: {
        pharmacyId,
        customerId,
        authorId: user.id,
        body: `[Non-Adherence Intervention] Sent ${channel.toUpperCase()} follow-up regarding missed refill. Message: "${message}"`,
      },
    });

    return NextResponse.json({ ok: true, data: res });
  } catch (err) {
    return NextResponse.json(
      { error: "intervention_failed", message: err instanceof Error ? err.message : "unknown error" },
      { status: 500 },
    );
  }
}

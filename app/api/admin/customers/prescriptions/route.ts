import { NextResponse } from "next/server";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { computeRefillScheduleMetrics } from "@/app/lib/services/refills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");
  if (!customerId) {
    return NextResponse.json({ error: "missing_customer_id" }, { status: 400 });
  }

  const prescriptions = await prisma.prescription.findMany({
    where: {
      customerId,
      status: "active",
    },
    include: {
      medication: {
        select: {
          id: true,
          currentStock: true,
          price: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const formatted = prescriptions.map((rx) => {
    const metrics = computeRefillScheduleMetrics(rx);
    return {
      id: rx.id,
      medicineName: rx.medicineName,
      rxReference: rx.rxReference,
      dosage: rx.dosage,
      schedule: rx.schedule,
      refillsRemaining: rx.refillsRemaining ?? 0,
      daysSupply: metrics.effectiveDaysSupply,
      nextRefillDue: rx.nextRefillDue || metrics.projectedDueDate,
      daysRemaining: metrics.daysRemaining,
      statusLabel: metrics.statusLabel,
      currentStock: rx.medication?.currentStock ?? null,
      unitPrice: Number(rx.unitPrice ?? rx.medication?.price ?? 0),
    };
  });

  return NextResponse.json({ ok: true, prescriptions: formatted });
}

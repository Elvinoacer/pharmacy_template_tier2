import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  prescriptionId: z.string().uuid(),
  status: z.enum(["taken", "missed", "skipped", "late"]),
  takenOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  notes: z.string().optional(),
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

  // Upsert the adherence log (one per prescription per day).
  const takenOn = new Date(parsed.takenOn + "T00:00:00Z");
  const existing = await prisma.prescriptionAdherence.findUnique({
    where: { prescriptionId_takenOn: { prescriptionId: parsed.prescriptionId, takenOn } },
  });

  if (existing) {
    await prisma.prescriptionAdherence.update({
      where: { id: existing.id },
      data: { status: parsed.status, notes: parsed.notes ?? existing.notes },
    });
    return NextResponse.json({ ok: true, updated: true });
  }

  await prisma.prescriptionAdherence.create({
    data: {
      customerId: user.customerId,
      prescriptionId: parsed.prescriptionId,
      takenOn,
      status: parsed.status,
      notes: parsed.notes,
    },
  });
  return NextResponse.json({ ok: true, created: true });
}

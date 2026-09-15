import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || !user.platformAdmin) {
    return NextResponse.json({ error: "forbidden", message: "Platform admin access required." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const status = searchParams.get("status") || undefined;

  if (!q) {
    return NextResponse.json({ items: [] });
  }

  const items = await prismaUnscoped.medicationMaster.findMany({
    where: {
      status: status || undefined,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { genericName: { contains: q, mode: "insensitive" } },
        { brandName: { contains: q, mode: "insensitive" } },
        { barcode: { contains: q } },
      ],
    },
    take: 10,
    select: {
      id: true,
      name: true,
      genericName: true,
      brandName: true,
      strengthDisplay: true,
      barcode: true,
      status: true,
      dosageForm: { select: { value: true } },
      manufacturer: { select: { name: true } },
      _count: { select: { pharmacyInventory: true } },
    },
  });

  return NextResponse.json({
    items: items.map((c) => ({
      id: c.id,
      name: c.name,
      genericName: c.genericName,
      brandName: c.brandName,
      strengthDisplay: c.strengthDisplay,
      dosageForm: c.dosageForm,
      manufacturer: c.manufacturer,
      barcode: c.barcode,
      status: c.status,
      pharmacyCount: c._count.pharmacyInventory,
    })),
  });
}

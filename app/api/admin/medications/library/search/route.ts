import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";

const Query = z.object({
  q: z.string().min(1).max(200),
});

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json(
      { error: "forbidden", message: "You do not have permission to search the medication library." },
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ ok: true, results: [] });

  try {
    Query.parse({ q });

    const existingInv = await prisma.pharmacyInventory.findMany({
      select: { medicationMasterId: true },
    });
    const stockedMasterIds = new Set(existingInv.map((i) => i.medicationMasterId));

    const results = await prisma.medicationMaster.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { genericName: { contains: q, mode: "insensitive" } },
          { brandName: { contains: q, mode: "insensitive" } },
          { barcode: { contains: q, mode: "insensitive" } },
        ],
      },
      include: {
        dosageForm: { select: { value: true } },
        manufacturer: { select: { name: true } },
        activeIngredients: { include: { activeIngredient: { select: { name: true } } } },
      },
      orderBy: [{ name: "asc" }],
      take: 25,
    });

    return NextResponse.json({
      ok: true,
      results: results.map((m) => ({
        id: m.id,
        name: m.name,
        genericName: m.genericName,
        brandName: m.brandName,
        strengthDisplay: m.strengthDisplay,
        dosageForm: m.dosageForm?.value ?? null,
        manufacturer: m.manufacturer?.name ?? null,
        barcode: m.barcode,
        category: m.category,
        imageUrl: m.imageUrl,
        enrichmentScore: m.enrichmentScore,
        alreadyStocked: stockedMasterIds.has(m.id),
        activeIngredients: m.activeIngredients.map((ai) => ({
          name: ai.activeIngredient.name,
          amount: ai.amount,
          unit: ai.unit,
        })),
      })),
    });
  } catch (e) {
    console.error("[library search GET]", e);
    return NextResponse.json(
      {
        error: "search_failed",
        message: "We couldn't search the medication library right now. Please try again.",
      },
      { status: 500 },
    );
  }
}

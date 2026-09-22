import { NextResponse } from "next/server";
import { AuthError, getSessionUser, isStaff } from "@/app/lib/auth";
import { requireMedicationReadContext } from "@/app/lib/services/medication-access";
import { withPharmacy } from "@/app/lib/tenant-context";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || (!isStaff(user.role) && !user.platformAdmin)) {
    return NextResponse.json(
      { error: "forbidden", message: "You do not have permission to look up medications." },
      { status: 403 },
    );
  }

  let pharmacyId: string;
  try {
    pharmacyId = await requireMedicationReadContext(user);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 403;
    return NextResponse.json(
      {
        error: "forbidden",
        message: status === 409
          ? "Choose an active pharmacy workspace before looking up inventory."
          : "You do not have permission to inspect this pharmacy inventory.",
      },
      { status },
    );
  }

  const url = new URL(req.url);
  const barcode = (url.searchParams.get("barcode") || "").trim();
  if (!barcode) {
    return NextResponse.json(
      { error: "missing_barcode", message: "Scan a barcode or enter one to continue." },
      { status: 400 },
    );
  }

  try {
    const result = await withPharmacy(pharmacyId, async () => {
      const master = await prisma.medicationMaster.findUnique({
      where: { barcode },
      include: {
        dosageForm: { select: { value: true } },
        manufacturer: { select: { name: true } },
        pregnancyCategory: { select: { value: true } },
        activeIngredients: { include: { activeIngredient: { select: { name: true } } } },
      },
    });

      if (!master) {
        return { found: false as const };
      }

    const existingInv = await prisma.pharmacyInventory.findFirst({
      where: { medicationMasterId: master.id },
      select: { id: true, slug: true, currentStock: true },
    });

      return {
        found: true as const,
        master: {
          id: master.id,
          name: master.name,
          genericName: master.genericName,
          brandName: master.brandName,
          strengthDisplay: master.strengthDisplay,
          dosageForm: master.dosageForm?.value ?? null,
          manufacturer: master.manufacturer?.name ?? null,
          barcode: master.barcode,
          category: master.category,
          imageUrl: master.imageUrl,
          indications: master.indications,
          sideEffects: master.sideEffects,
          contraindications: master.contraindications,
          storage: master.storage,
          dosage: master.dosage,
          controlledDrug: master.controlledDrug,
          controlledDrugSchedule: master.controlledDrugSchedule,
          pediatricUse: master.pediatricUse,
          requiresRefrigeration: master.requiresRefrigeration,
          pregnancyCategory: master.pregnancyCategory?.value ?? null,
        },
        alreadyStocked: existingInv
          ? { id: existingInv.id, slug: existingInv.slug, currentStock: existingInv.currentStock }
          : null,
      };
    });

    if (!result.found) {
      return NextResponse.json({ ok: true, found: false, barcode }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[library lookup GET]", e);
    return NextResponse.json(
      {
        error: "lookup_failed",
        message: "We couldn't look up that medication right now. Please try again.",
      },
      { status: 500 },
    );
  }
}

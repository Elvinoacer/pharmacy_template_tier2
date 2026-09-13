import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isStaff, writeAuditLog } from "@/app/lib/auth";
import { addSharedMasterToPharmacy } from "@/app/lib/services/shared-medication-library";

export const runtime = "nodejs";

const Body = z.object({
  medicationMasterId: z.string().uuid(),
  // Slug is optional: the server derives a tenant-safe slug from the canonical
  // medicine name when clients (such as the shared-library picker) omit it.
  slug: z.string().min(1).max(200).optional().nullable(),
  sku: z.string().max(100).optional().nullable(),
  price: z.coerce.number().min(0).default(0),
  purchasePrice: z.coerce.number().min(0).optional().nullable(),
  currentStock: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(10),
  supplier: z.string().max(200).optional().nullable(),
  shelfLocation: z.string().max(200).optional().nullable(),
  promotions: z.string().optional().nullable(),
  overTheCounter: z.boolean().default(false),
  prescriptionRequired: z.boolean().optional(),
  publicListing: z.boolean().default(false),
  active: z.boolean().default(true),
});

/**
 * Add an existing network-wide MedicationMaster to the current pharmacy.
 * Only PharmacyInventory is created; the canonical clinical record is never cloned.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (error) {
    return NextResponse.json(
      { error: "invalid_body", message: error instanceof Error ? error.message : "Invalid request." },
      { status: 400 },
    );
  }

  try {
    const result = await addSharedMasterToPharmacy(body.medicationMasterId, body);

    await writeAuditLog(user.id, "shared_medication_reused", "medication_master", result.masterId, {
      inventoryId: result.inventoryId,
      alreadyStocked: result.alreadyStocked,
      acquisitionMethod: "shared_library",
    });

    return NextResponse.json({
      ok: true,
      inventoryId: result.inventoryId,
      masterId: result.masterId,
      alreadyStocked: result.alreadyStocked,
      reusedSharedMaster: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add medicine to inventory.";
    if (message === "SHARED_MEDICATION_NOT_FOUND") {
      return NextResponse.json({ error: "not_found", message: "Shared medicine no longer exists." }, { status: 404 });
    }
    if (message.includes("Unique constraint") || message.includes("P2002")) {
      return NextResponse.json(
        { error: "inventory_conflict", message: "That SKU or medicine is already in this pharmacy inventory." },
        { status: 409 },
      );
    }
    console.error("[library add POST]", error);
    return NextResponse.json({ error: "add_failed", message }, { status: 500 });
  }
}

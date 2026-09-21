import { listingLimitMessage } from "@/app/lib/platform/plan-policy";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isStaff, writeAuditLog } from "@/app/lib/auth";
import { addSharedMasterToPharmacy } from "@/app/lib/services/shared-medication-library";

export const runtime = "nodejs";

const Body = z.object({
  medicationMasterId: z.string().uuid(),
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

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json(
      { error: "forbidden", message: "You do not have permission to add medications to this inventory." },
      { status: 403 },
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (error) {
    const issues = error instanceof z.ZodError
      ? error.issues.slice(0, 12).map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }))
      : undefined;
    return NextResponse.json(
      {
        error: "invalid_request",
        message: "Some inventory details are missing or invalid. Review them and try again.",
        issues,
      },
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
    const limit = listingLimitMessage(error);
    if (limit) return NextResponse.json({ error: "upgrade_required", message: limit }, { status: 402 });
    const message = error instanceof Error ? error.message : "";
    if (message === "SHARED_MEDICATION_NOT_FOUND") {
      return NextResponse.json(
        { error: "not_found", message: "This shared medication is no longer available. Refresh the library and choose another result." },
        { status: 404 },
      );
    }
    if (message.includes("Unique constraint") || message.includes("P2002")) {
      return NextResponse.json(
        { error: "inventory_conflict", message: "That medicine or SKU is already in this pharmacy inventory." },
        { status: 409 },
      );
    }
    console.error("[library add POST]", error);
    return NextResponse.json(
      {
        error: "add_failed",
        message: "We couldn't add this medication to inventory right now. Your existing inventory was not changed. Please try again.",
      },
      { status: 500 },
    );
  }
}

import { listingLimitMessage } from "@/app/lib/platform/plan-policy";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthError, getSessionUser, isStaff, writeAuditLog } from "@/app/lib/auth";
import { requireMedicationWriteContext } from "@/app/lib/services/medication-access";
import { addSharedMasterToPharmacy } from "@/app/lib/services/shared-medication-library";
import { withPharmacy } from "@/app/lib/tenant-context";

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
  if (!user || (!isStaff(user.role) && !user.platformAdmin)) {
    return NextResponse.json(
      { error: "forbidden", message: "You do not have permission to add medications to this inventory." },
      { status: 403 },
    );
  }

  let pharmacyId: string;
  try {
    pharmacyId = await requireMedicationWriteContext(user);
  } catch (error) {
    const status =
      error instanceof AuthError
        ? error.status
        : Number((error as { status?: number })?.status || 403);
    const code = error instanceof Error ? error.message : "forbidden";
    const message =
      code === "PHARMACY_BILLING_SUSPENDED"
        ? "This pharmacy workspace is paused because billing needs attention."
        : code === "PHARMACY_WORKSPACE_PAUSED"
          ? "This pharmacy workspace is paused. Restore access before changing inventory."
          : code.includes("permission")
            ? "You do not have permission to add medications to this inventory."
            : "Choose an active pharmacy workspace before adding medicine to inventory.";
    return NextResponse.json({ error: code, message }, { status });
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
    const result = await withPharmacy(pharmacyId, async () => {
      const added = await addSharedMasterToPharmacy(body.medicationMasterId, body);

      await writeAuditLog(user.id, "shared_medication_reused", "medication_master", added.masterId, {
        inventoryId: added.inventoryId,
        alreadyStocked: added.alreadyStocked,
        acquisitionMethod: "shared_library",
      });

      return added;
    });

    revalidatePath("/admin/medications");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/medications/library");

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

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isStaff, writeAuditLog } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  medicationMasterId: z.string().uuid(),
  slug: z.string().min(1).max(200),
  sku: z.string().max(100).optional().nullable(),
  price: z.coerce.number().min(0).default(0),
  purchasePrice: z.coerce.number().min(0).optional().nullable(),
  currentStock: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(10),
  supplier: z.string().max(200).optional().nullable(),
  shelfLocation: z.string().max(200).optional().nullable(),
  promotions: z.string().optional().nullable(),
  overTheCounter: z.boolean().default(false),
  prescriptionRequired: z.boolean().default(true),
  publicListing: z.boolean().default(false),
  active: z.boolean().default(true),
});

/**
 * Phase 3.1 — "Add to Pharmacy" action.
 * Creates a new PharmacyInventory row pointing at an EXISTING MedicationMaster.
 * Does NOT create or modify the master — that's the whole point of the shared library.
 *
 * Decision D22: lightweight confirm step (no full validation review) since the master
 * is already vetted. Only checks SKU uniqueness (DB-level unique index backs this up).
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "invalid_body", message: e instanceof Error ? e.message : "Invalid body." }, { status: 400 });
  }

  try {
    const master = await prisma.medicationMaster.findUnique({
      where: { id: parsed.medicationMasterId },
      select: { id: true, name: true },
    });
    if (!master) {
      return NextResponse.json({ error: "master_not_found" }, { status: 404 });
    }

    // Prevent duplicate stock entries for the same master (single-tenant — one inventory row per master).
    const existing = await prisma.pharmacyInventory.findFirst({
      where: { medicationMasterId: parsed.medicationMasterId },
      select: { id: true, slug: true },
    });
    if (existing) {
      return NextResponse.json({
        ok: false,
        error: "already_stocked",
        message: `You already stock this medication (inventory row "${existing.slug}"). Edit it instead.`,
        inventoryId: existing.id,
      }, { status: 409 });
    }

    const inv = await prisma.pharmacyInventory.create({
      data: {
        medicationMasterId: parsed.medicationMasterId,
        slug: parsed.slug,
        sku: parsed.sku || null,
        price: parsed.price,
        purchasePrice: parsed.purchasePrice ?? null,
        currentStock: parsed.currentStock,
        lowStockThreshold: parsed.lowStockThreshold,
        supplier: parsed.supplier ?? null,
        shelfLocation: parsed.shelfLocation ?? null,
        promotions: parsed.promotions ?? null,
        overTheCounter: parsed.overTheCounter,
        prescriptionRequired: parsed.prescriptionRequired,
        publicListing: parsed.publicListing,
        active: parsed.active,
      },
    });

    await writeAuditLog(user.id, "medication_added_to_pharmacy", "medication_master", parsed.medicationMasterId, {
      inventoryId: inv.id,
      acquisitionMethod: "shared_library",
      slug: parsed.slug,
    });

    return NextResponse.json({ ok: true, inventoryId: inv.id, masterId: parsed.medicationMasterId });
  } catch (e) {
    console.error("[library add POST]", e);
    const message = e instanceof Error ? e.message : "Could not add medication to pharmacy.";
    // Prisma unique-constraint violation on slug/sku → friendly message.
    if (message.includes("slug") || message.includes("sku")) {
      return NextResponse.json({ error: "duplicate", message: "The slug or SKU is already in use. Pick another." }, { status: 409 });
    }
    return NextResponse.json({ error: "failed", message }, { status: 400 });
  }
}

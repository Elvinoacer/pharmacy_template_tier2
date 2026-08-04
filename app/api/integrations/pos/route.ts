import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { recordAdminNotification } from "@/app/lib/services/admin-notifications";

export const runtime = "nodejs";

/**
 * POS sync endpoint — accepts a list of medications from the pharmacy's
 * external POS system and upserts them into our `medications` table.
 *
 * Auth: requires `POS_API_KEY` env var, sent as `Authorization: Bearer <key>`.
 *
 * Body shape:
 * {
 *   "medications": [
 *     { "sku": "PARA-500", "name": "Paracetamol 500mg", "category": "pain-relief",
 *       "price": 25.00, "stockQty": 120, "imageUrl": "...", "description": "..." }
 *   ]
 * }
 */

const MedicationInput = z.object({
  sku: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().optional(),
  category: z.string().default("general"),
  description: z.string().optional(),
  indications: z.string().optional(),
  dosage: z.string().optional(),
  sideEffects: z.string().optional(),
  contraindications: z.string().optional(),
  storage: z.string().optional(),
  price: z.coerce.number().min(0).default(0),
  stockQty: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(10),
  imageUrl: z.string().optional(),
  overTheCounter: z.boolean().default(false),
  publicListing: z.boolean().default(false),
  prescriptionRequired: z.boolean().default(true),
  active: z.boolean().default(true),
});

const Body = z.object({
  medications: z.array(MedicationInput).min(1).max(1000),
});

function authorized(req: Request) {
  const secret = process.env.POS_API_KEY?.trim();
  if (!secret) return false; // POS sync disabled until key is set.
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "invalid_body", detail: e instanceof Error ? e.message : undefined }, { status: 400 });
  }

  let upserted = 0;
  let lowStockAlerts = 0;
  for (const m of parsed.medications) {
    const slug = m.slug || m.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    // Find by SKU (preferred) or slug.
    const existing = m.sku
      ? await prisma.medication.findUnique({ where: { sku: m.sku } }).catch(() => null)
      : await prisma.medication.findUnique({ where: { slug } }).catch(() => null);

    if (existing) {
      await prisma.medication.update({
        where: { id: existing.id },
        data: {
          price: m.price,
          stockQty: m.stockQty,
          lowStockThreshold: m.lowStockThreshold,
          syncedAt: new Date(),
        },
      });
    } else {
      await prisma.medication.create({
        data: {
          name: m.name,
          slug,
          sku: m.sku || null,
          category: m.category,
          description: m.description || null,
          indications: m.indications || null,
          dosage: m.dosage || null,
          sideEffects: m.sideEffects || null,
          contraindications: m.contraindications || null,
          storage: m.storage || null,
          price: m.price,
          stockQty: m.stockQty,
          lowStockThreshold: m.lowStockThreshold,
          imageUrl: m.imageUrl || null,
          overTheCounter: m.overTheCounter,
          publicListing: m.publicListing,
          prescriptionRequired: m.prescriptionRequired,
          active: m.active,
          syncedAt: new Date(),
        },
      });
    }
    upserted++;
    if (m.stockQty <= m.lowStockThreshold) lowStockAlerts++;
  }

  if (lowStockAlerts > 0) {
    await recordAdminNotification({
      type: "stock_low",
      title: `${lowStockAlerts} medications are low on stock`,
      body: `${lowStockAlerts} of ${upserted} synced medications are at or below their low-stock threshold.`,
      severity: "warning",
      relatedType: "medication",
    });
  }

  return NextResponse.json({ ok: true, upserted, lowStockAlerts });
}
